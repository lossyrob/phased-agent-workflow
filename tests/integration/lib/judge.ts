import { CopilotClient } from "@github/copilot-sdk";

const DEBUG = !!process.env.PAW_TEST_DEBUG;

type Session = Awaited<ReturnType<CopilotClient["createSession"]>>;

export interface JudgeVerdict {
  pass: boolean;
  scores: Record<string, number>;
  rationale: string;
}

/**
 * LLM-as-judge for qualitative artifact evaluation.
 * Creates a separate SDK session to score artifacts against a rubric.
 */
export class Judge {
  private client: CopilotClient | undefined;
  private session: Session | undefined;

  async start(): Promise<void> {
    const useLoggedInUser = process.env.PAW_TEST_PROVIDER !== "azure";
    this.client = new CopilotClient({ useLoggedInUser });
    await this.client.start();

    this.session = await this.client.createSession({
      sessionId: `judge-${Date.now()}`,
      systemMessage: { content: JUDGE_SYSTEM_PROMPT },
    });
  }

  async stop(): Promise<void> {
    try { await this.session?.destroy(); } catch { /* best effort */ }
    try { await this.client?.stop(); } catch { /* best effort */ }
  }

  /** Evaluate an artifact against a rubric. */
  async evaluate(opts: {
    context: string;
    artifact: string;
    rubric: string;
    timeout?: number;
  }): Promise<JudgeVerdict> {
    if (!this.session) {
      throw new Error("Judge not started — call start() before evaluate()");
    }

    const prompt = [
      `## Context\n${opts.context}`,
      `## Artifact\n\`\`\`\n${opts.artifact}\n\`\`\``,
      `## Rubric\n${opts.rubric}`,
      "",
      "Evaluate the artifact and respond in EXACTLY this format:",
      "VERDICT: PASS or FAIL",
      "SCORES: dimension1=N, dimension2=N, ... (1-5 each)",
      "RATIONALE: Brief explanation for any score < 4",
    ].join("\n\n");

    const response = await this.session.sendAndWait({ prompt }, opts.timeout ?? 120_000);
    const text = response?.data?.content ?? "";

    if (DEBUG) {
      console.log(`[judge] ${text.slice(0, 200)}`);
    }

    return parseVerdict(text);
  }
}

function parseVerdict(text: string): JudgeVerdict {
  const passMatch = /VERDICT:\s*(PASS|FAIL)/i.exec(text);
  const pass = passMatch ? passMatch[1].toUpperCase() === "PASS" : false;

  const scores: Record<string, number> = {};
  const scoresMatch = /SCORES:\s*(.+)/i.exec(text);
  if (scoresMatch) {
    for (const pair of scoresMatch[1].split(",")) {
      const [key, val] = pair.split("=").map((s) => s.trim());
      if (key && val) { scores[key] = parseInt(val, 10) || 0; }
    }
  }

  const rationaleMatch = /RATIONALE:\s*([\s\S]*)/i.exec(text);
  const rationale = rationaleMatch?.[1]?.trim() ?? text;

  return { pass, scores, rationale };
}

const JUDGE_SYSTEM_PROMPT = `You are a quality judge for PAW (Phased Agent Workflow) artifacts.
You evaluate artifacts produced by AI agents against specific rubrics.

Rules:
- Score each dimension 1-5 (1=terrible, 3=acceptable, 5=excellent)
- PASS if ALL dimensions >= 3
- FAIL if ANY dimension < 3
- Be strict but fair — this is for automated testing
- Respond in the exact format requested`;

/** Pre-built rubrics for common artifact types. */
export const RUBRICS = {
  spec: [
    "Evaluate this specification artifact:",
    "- completeness: Does it cover all aspects of the feature brief? (1-5)",
    "- structure: Does it have Overview, FR-xxx requirements, and SC-xxx criteria? (1-5)",
    "- traceability: Are FRs linked to SCs? (1-5)",
    "- separation: No implementation details (file paths, code, design patterns)? (1-5)",
    "- clarity: Are requirements unambiguous and independently testable? (1-5)",
  ].join("\n"),

  plan: [
    "Evaluate this implementation plan artifact:",
    "- completeness: Does it cover all spec requirements? (1-5)",
    "- structure: Does it have phases with success criteria? (1-5)",
    "- feasibility: Are the phases logically ordered and independently verifiable? (1-5)",
    "- specificity: Are changes concrete (file paths, function names)? (1-5)",
    "- clarity: Is the plan unambiguous and actionable? (1-5)",
  ].join("\n"),

  implementation: [
    "Evaluate this implementation result:",
    "- completeness: Were all planned changes made? (1-5)",
    "- correctness: Does the code look functionally correct? (1-5)",
    "- quality: Is the code clean, well-structured? (1-5)",
    "- testing: Were tests created or updated? (1-5)",
    "- safety: No destructive operations, no secrets, no unintended side effects? (1-5)",
  ].join("\n"),
};
