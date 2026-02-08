import { CopilotClient } from "@github/copilot-sdk";

export interface UserInputRequest {
  question: string;
  choices?: string[];
  allowFreeform?: boolean;
}

export interface AnswerResult {
  answer: string;
  wasFreeform: boolean;
}

export interface Answerer {
  answer(req: UserInputRequest): AnswerResult | Promise<AnswerResult>;
  readonly log: Array<{ question: string; answer: string }>;
}

export type AnswerRule = (req: UserInputRequest) => string | null;

/**
 * Rule-based auto-answerer for ask_user calls.
 * Fail-closed: throws on unmatched questions unless failOnUnmatched is false.
 */
export class RuleBasedAnswerer implements Answerer {
  readonly log: Array<{ question: string; answer: string }> = [];

  constructor(
    private rules: AnswerRule[],
    private failOnUnmatched = true,
  ) {}

  answer(req: UserInputRequest): AnswerResult {
    for (const rule of this.rules) {
      const a = rule(req);
      if (a != null) {
        this.log.push({ question: req.question, answer: a });
        return { answer: a, wasFreeform: !req.choices?.includes(a) };
      }
    }

    if (this.failOnUnmatched) {
      throw new Error(
        `Unmatched ask_user in test:\n` +
        `  Question: ${req.question}\n` +
        `  Choices: ${JSON.stringify(req.choices)}\n` +
        `Add a rule to the answerer or update the test.`,
      );
    }

    const answer = req.choices?.[0] ?? "proceed";
    this.log.push({ question: req.question, answer });
    return { answer, wasFreeform: !req.choices };
  }
}

/**
 * Hybrid answerer: tries deterministic rules first, falls back to an LLM session.
 * The LLM can also choose to fail the test by responding with REJECT.
 */
export class HybridAnswerer implements Answerer {
  readonly log: Array<{ question: string; answer: string; source: "rule" | "llm" }> = [];
  private client: CopilotClient | undefined;
  private session: Awaited<ReturnType<CopilotClient["createSession"]>> | undefined;

  constructor(
    private rules: AnswerRule[],
    private context: string,
    private model?: string,
  ) {}

  async start(): Promise<void> {
    const useLoggedInUser = process.env.PAW_TEST_PROVIDER !== "azure";
    this.client = new CopilotClient({ useLoggedInUser });
    await this.client.start();

    this.session = await this.client.createSession({
      sessionId: `answerer-${Date.now()}`,
      ...(this.model ? { model: this.model } : {}),
      systemMessage: { content: this.buildSystemPrompt() },
    });
  }

  async stop(): Promise<void> {
    try { await this.session?.destroy(); } catch { /* best effort */ }
    try { await this.client?.stop(); } catch { /* best effort */ }
    this.session = undefined;
    this.client = undefined;
  }

  async answer(req: UserInputRequest): Promise<AnswerResult> {
    // Try deterministic rules first
    for (const rule of this.rules) {
      const a = rule(req);
      if (a != null) {
        this.log.push({ question: req.question, answer: a, source: "rule" });
        return { answer: a, wasFreeform: !req.choices?.includes(a) };
      }
    }

    // Fall back to LLM
    if (!this.session) {
      throw new Error("HybridAnswerer not started — call start() before use");
    }

    const prompt = this.formatQuestion(req);
    const response = await this.session.sendAndWait({ prompt });
    const raw = response?.data?.content?.trim() ?? "";

    if (raw.startsWith("REJECT")) {
      const reason = raw.slice(6).trim() || "LLM answerer rejected the question";
      throw new Error(
        `LLM answerer rejected question:\n` +
        `  Question: ${req.question}\n` +
        `  Choices: ${JSON.stringify(req.choices)}\n` +
        `  Reason: ${reason}`,
      );
    }

    // Extract answer — if choices provided, match against them
    let answer = raw;
    let wasFreeform = true;
    if (req.choices?.length) {
      const match = req.choices.find(
        (c) => raw.toLowerCase().includes(c.toLowerCase()),
      );
      if (match) {
        answer = match;
        wasFreeform = false;
      }
    }

    this.log.push({ question: req.question, answer, source: "llm" });
    return { answer, wasFreeform };
  }

  private buildSystemPrompt(): string {
    return [
      "You answer questions on behalf of a user during an automated PAW workflow test.",
      "You will receive questions that a PAW skill is asking the user.",
      "",
      "Test context:",
      this.context,
      "",
      "Rules:",
      "- If the question has choices, respond with EXACTLY one of the choices (copy it verbatim).",
      "- If the question needs freeform input, respond with just the answer text.",
      "- If the question seems wrong, dangerous, or unrelated to the test context, respond with REJECT followed by a brief reason.",
      "- Keep responses minimal — just the answer, no explanation.",
    ].join("\n");
  }

  private formatQuestion(req: UserInputRequest): string {
    const parts = [`Question: ${req.question}`];
    if (req.choices?.length) {
      parts.push(`Choices:\n${req.choices.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}`);
    }
    if (req.allowFreeform === false) {
      parts.push("(Must pick from choices — freeform not allowed)");
    }
    return parts.join("\n");
  }
}

/** Common PAW decision rules for workflow initialization questions. */
export function pawCommonRules(ctx: { workId: string; branch: string }): AnswerRule[] {
  return [
    (req) => {
      if (/workflow mode/i.test(req.question)) {
        return req.choices?.find((c) => /minimal/i.test(c)) ?? null;
      }
      return null;
    },
    (req) => {
      if (/review strategy/i.test(req.question)) {
        return req.choices?.find((c) => /local/i.test(c)) ?? null;
      }
      return null;
    },
    (req) => {
      if (/work.?id/i.test(req.question)) { return ctx.workId; }
      if (/branch/i.test(req.question)) { return ctx.branch; }
      return null;
    },
    // Default: pick first choice for any multiple-choice question
    (req) => {
      if (req.choices?.length) { return req.choices[0]; }
      return null;
    },
  ];
}
