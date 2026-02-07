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
  answer(req: UserInputRequest): AnswerResult;
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
