import { CopilotClient } from "@github/copilot-sdk";
import { TestFixture } from "./fixtures.js";
import { ToolCallLog } from "./trace.js";
import { ToolPolicy } from "./tool-policy.js";
import type { Answerer } from "./answerer.js";

const DEBUG = !!process.env.PAW_TEST_DEBUG;
const KEEP_WORKSPACE = !!process.env.PAW_TEST_KEEP_WORKSPACE;
const TIMEOUT = parseInt(process.env.PAW_TEST_TIMEOUT || "120000", 10);

type Session = Awaited<ReturnType<CopilotClient["createSession"]>>;

export interface TestContext {
  client: CopilotClient;
  session: Session;
  fixture: TestFixture;
  toolLog: ToolCallLog;
  answerer: Answerer;
  timeout: number;
}

function getProviderConfig() {
  if (process.env.PAW_TEST_PROVIDER === "azure") {
    return {
      type: "azure" as const,
      baseUrl: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_KEY!,
      azure: { apiVersion: "2024-05-01-preview" },
    };
  }
  return undefined;
}

/** Create an isolated test context with SDK session, temp fixture, and hooks. */
export async function createTestContext(opts: {
  fixtureName: string;
  skillOrAgent: string;
  systemPrompt: string;
  answerer: Answerer;
  toolPolicy?: ToolPolicy;
  model?: string;
}): Promise<TestContext> {
  const fixture = await TestFixture.clone(opts.fixtureName);
  const toolLog = new ToolCallLog();
  const policy = opts.toolPolicy ?? new ToolPolicy(fixture.workDir);

  const useLoggedInUser = process.env.PAW_TEST_PROVIDER !== "azure";
  const client = new CopilotClient({ useLoggedInUser });
  await client.start();

  const provider = getProviderConfig();
  const model = opts.model || process.env.PAW_TEST_MODEL || undefined;

  const session = await client.createSession({
    sessionId: `test-${opts.skillOrAgent}-${Date.now()}`,
    ...(model ? { model } : {}),
    ...(provider ? { provider } : {}),
    systemMessage: { content: opts.systemPrompt },

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
          return { permissionDecision: "allow" as const, modifiedArgs: decision.result };
        }
        return { permissionDecision: "allow" as const };
      },
      onPostToolUse: async (input) => {
        const call = toolLog.findPending(input.toolName);
        if (call) {
          toolLog.end(call, input.toolResult);
        }
        return {};
      },
    },
  });

  if (DEBUG) {
    console.log(`[harness] Session created: test-${opts.skillOrAgent}`);
    console.log(`[harness] Workspace: ${fixture.workDir}`);
  }

  return { client, session, fixture, toolLog, answerer: opts.answerer, timeout: TIMEOUT };
}

/** Clean up test context. */
export async function destroyTestContext(ctx: TestContext): Promise<void> {
  try {
    await ctx.session.destroy();
  } catch {
    // Session may already be destroyed
  }
  await ctx.client.stop();

  if (KEEP_WORKSPACE) {
    console.log(`[harness] Workspace preserved: ${ctx.fixture.workDir}`);
  } else {
    await ctx.fixture.cleanup();
  }
}
