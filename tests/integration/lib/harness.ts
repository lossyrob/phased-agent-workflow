import { CopilotClient } from "@github/copilot-sdk";
import { TestFixture } from "./fixtures.js";
import { ToolCallLog } from "./trace.js";
import { ToolPolicy } from "./tool-policy.js";
import type { Answerer } from "./answerer.js";

const DEBUG = !!process.env.PAW_TEST_DEBUG;
const KEEP_WORKSPACE = !!process.env.PAW_TEST_KEEP_WORKSPACE;
const TIMEOUT = parseInt(process.env.PAW_TEST_TIMEOUT || "120000", 10);
const PROTOCOL_MISMATCH_RE = /SDK protocol version mismatch: SDK expects version (\d+), but server reports version (\d+)/;

type Session = Awaited<ReturnType<CopilotClient["createSession"]>>;
type ClientOptions = ConstructorParameters<typeof CopilotClient>[0];
type ProtocolAwareClient = {
  ping(message?: string): Promise<{ protocolVersion?: number }>;
  verifyProtocolVersion(): Promise<void>;
};

export interface TestContext {
  client: CopilotClient;
  session: Session;
  fixture: TestFixture;
  toolLog: ToolCallLog;
  answerer: Answerer;
  timeout: number;
  workingDirectory: string;
}

function parseProtocolMismatch(error: unknown): { expected: number; server: number } | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(PROTOCOL_MISMATCH_RE);
  if (!match) {
    return null;
  }

  return {
    expected: Number(match[1]),
    server: Number(match[2]),
  };
}

export function isForwardCompatibleProtocolMismatch(error: unknown): boolean {
  const mismatch = parseProtocolMismatch(error);
  return mismatch !== null && mismatch.server === mismatch.expected + 1;
}

async function startCopilotClient(options: ClientOptions): Promise<CopilotClient> {
  let client = new CopilotClient(options);

  try {
    await client.start();
    return client;
  } catch (error) {
    const mismatch = parseProtocolMismatch(error);
    if (!mismatch || mismatch.server !== mismatch.expected + 1) {
      throw error;
    }

    try {
      await client.stop();
    } catch {
      // Best effort; a fresh client is created below either way.
    }

    client = new CopilotClient(options);
    const protocolAwareClient = client as unknown as ProtocolAwareClient;
    protocolAwareClient.verifyProtocolVersion = async () => {
      const pingResult = await protocolAwareClient.ping();
      const serverVersion = pingResult.protocolVersion;

      if (serverVersion === undefined) {
        throw new Error(
          `SDK protocol version mismatch: SDK expects version ${mismatch.expected}, but server does not report a protocol version. Please update your server to ensure compatibility.`,
        );
      }

      if (serverVersion < mismatch.expected || serverVersion > mismatch.server) {
        throw new Error(
          `SDK protocol version mismatch: SDK expects version ${mismatch.expected}, but server reports version ${serverVersion}. Please update your SDK or server to ensure compatibility.`,
        );
      }
    };

    await client.start();
    return client;
  }
}

function getProviderConfig() {
  if (process.env.PAW_TEST_PROVIDER === "azure") {
    const baseUrl = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error("PAW_TEST_PROVIDER=azure requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY");
    }
    return {
      type: "azure" as const,
      baseUrl,
      apiKey,
      azure: { apiVersion: "2024-05-01-preview" },
    };
  }
  return undefined;
}

/** Create an isolated test context with SDK session, temp fixture, and hooks. */
export async function createTestContext(opts: {
  fixtureName?: string;
  fixture?: TestFixture;
  skillOrAgent: string;
  systemPrompt: string;
  answerer: Answerer;
  toolPolicy?: ToolPolicy;
  model?: string;
  executionPath?: string;
  availableTools?: string[];
  excludedTools?: string[];
}): Promise<TestContext> {
  const fixture = opts.fixture ?? (opts.fixtureName ? await TestFixture.clone(opts.fixtureName) : undefined);
  if (!fixture) {
    throw new Error("createTestContext requires either fixtureName or fixture");
  }

  const workingDirectory = opts.executionPath ?? fixture.workDir;
  let client: CopilotClient | undefined;

  try {
    const toolLog = new ToolCallLog();
    const extraRoots = workingDirectory === fixture.workDir ? [] : [fixture.workDir];
    const policy = opts.toolPolicy ?? new ToolPolicy(workingDirectory, extraRoots);

    const useLoggedInUser = process.env.PAW_TEST_PROVIDER !== "azure";
    client = await startCopilotClient({ useLoggedInUser });

    const provider = getProviderConfig();
    const model = opts.model || process.env.PAW_TEST_MODEL || undefined;

      const session = await client.createSession({
      sessionId: `test-${opts.skillOrAgent}-${Date.now()}`,
      ...(model ? { model } : {}),
      ...(provider ? { provider } : {}),
      systemMessage: { content: opts.systemPrompt },
      ...(opts.availableTools ? { availableTools: opts.availableTools } : {}),
      ...(opts.excludedTools ? { excludedTools: opts.excludedTools } : {}),
      workingDirectory,

        onPermissionRequest: async (request) => {
          if (DEBUG) {
            console.log(`[permission] ${request.kind} ${JSON.stringify(request)}`);
          }

          const policyInput = request.kind === "shell"
            ? { command: String(request.command ?? "") }
            : request.kind === "write" || request.kind === "read"
              ? { path: String(request.path ?? "") }
              : request.kind === "url"
                ? { url: String(request.url ?? "") }
                : request.kind === "mcp"
                  ? { command: String(request.command ?? "") }
                  : {};

          const toolName = request.kind === "shell"
            ? "bash"
            : request.kind === "write"
              ? "create"
              : request.kind === "read"
                ? "view"
                : request.kind;

          const decision = policy.check({ toolName, input: policyInput });
          if (decision.action === "allow") {
            return { kind: "approved" as const };
          }
          if (decision.action === "deny") {
            return { kind: "denied-by-rules" as const, rules: [decision.reason] };
          }
          return { kind: "denied-by-rules" as const, rules: ["stubbed"] };
        },

        onUserInputRequest: async (req) => {
          if (DEBUG) {
            console.log(`[ask_user] ${req.question}`);
          if (req.choices) { console.log(`  choices: ${req.choices.join(", ")}`); }
        }
        return opts.answerer.answer(req);
      },

      hooks: {
        onPreToolUse: async (input) => {
          const call = toolLog.start(input.toolName, input.toolArgs);
          const decision = policy.check({ toolName: input.toolName, input: input.toolArgs });

          if (DEBUG) {
            console.log(`[tool] ${input.toolName}${decision.action !== "allow" ? ` → ${decision.action}` : ""}`);
          }

          if (decision.action === "deny") {
            call.denied = true;
            toolLog.end(call, { denied: true, reason: decision.reason });
            return { permissionDecision: "deny" as const, permissionDecisionReason: decision.reason };
          }
          if (decision.action === "stub") {
            call.stubbed = true;
            toolLog.end(call, decision.result);
            return { permissionDecision: "deny" as const, permissionDecisionReason: "stubbed" };
          }
          return { permissionDecision: "allow" as const };
        },
        onPostToolUse: async (input) => {
          const call = toolLog.findPending(input.toolName, input.toolArgs);
          if (call) {
            toolLog.end(call, input.toolResult);
          }
          return {};
        },
      },
    });

    if (DEBUG) {
      console.log(`[harness] Session created: test-${opts.skillOrAgent}`);
      console.log(`[harness] Workspace: ${workingDirectory}`);
    }

    return { client, session, fixture, toolLog, answerer: opts.answerer, timeout: TIMEOUT, workingDirectory };
  } catch (err) {
    if (client) {
      try { await client.stop(); } catch { /* best effort */ }
    }
    await fixture.cleanup();
    throw err;
  }
}

/** Clean up test context. */
export async function destroyTestContext(ctx: TestContext): Promise<void> {
  try {
    await ctx.session.destroy();
  } catch {
    // Session may already be destroyed
  }
  try {
    await ctx.client.stop();
  } catch {
    // Client may already be stopped
  }

  if (KEEP_WORKSPACE) {
    console.log(`[harness] Workspace preserved: ${ctx.fixture.workDir}`);
  } else {
    try {
      await ctx.fixture.cleanup();
    } catch {
      // Best effort cleanup; don't mask test failures
    }
  }
}
