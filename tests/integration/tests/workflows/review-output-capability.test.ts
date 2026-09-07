import { describe, it } from "node:test";
import assert from "node:assert";
import {
  createTestContext,
  destroyTestContext,
  type TestContext,
} from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { TestFixture } from "../../lib/fixtures.js";
import { ToolPolicy } from "../../lib/tool-policy.js";

class DecisionOnlyPolicy extends ToolPolicy {
  override check(call: { toolName: string; input: unknown }) {
    if (call.toolName === "report_intent") {
      return { action: "allow" as const };
    }
    return { action: "deny" as const, reason: "Output preflight test is decision-only" };
  }
}

describe("PAW Review output capability workflow", { timeout: 300_000 }, () => {
  it("derives Azure DevOps output from tools and authorization", async () => {
    const workflow = await loadSkill("paw-review-workflow");
    const fixture = await TestFixture.clone("minimal-ts");
    const answerer = new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false);
    let ctx: TestContext | undefined;

    try {
      ctx = await createTestContext({
        fixture,
        skillOrAgent: "paw-review-output-capability",
        systemPrompt: [
          "You are evaluating PAW Review authorization preflight.",
          "Apply the workflow skill exactly.",
          "Treat the supplied tool catalogs as authoritative capability declarations.",
          "Do not call tools, mutate external state, write files, or ask questions.",
          "Return one concise line per CASE identifier.",
          "",
          workflow,
        ].join("\n"),
        answerer,
        toolPolicy: new DecisionOnlyPolicy(fixture.workDir),
      });

      const response = await ctx.session.sendAndWait(
        { prompt: outputCapabilityCases() },
        240_000,
      );
      const text = response?.data?.content ?? "";

      assertCase(text, "CASE-A", /may execute|executable|available/i, /authorized|revalidation/i);
      assertCase(text, "CASE-B", /authorization|non-mutating|artifact-only/i);
      assertCase(text, "CASE-C", /unavailable|blocked|capability missing|conflict/i);
      assertCase(text, "CASE-D", /artifact-only|no executable/i);

      for (const call of ctx.toolLog.calls) {
        if (call.name !== "report_intent") {
          assert.strictEqual(call.denied, true, `Unexpected tool call was not denied: ${call.name}`);
        }
      }
    } finally {
      if (ctx) {
        await destroyTestContext(ctx);
      }
    }
  });
});

function outputCapabilityCases(): string {
  return [
    "Evaluate these independent Azure DevOps review cases:",
    "",
    "CASE-A",
    "- Available tools declare `ado_post_review_comment` for a specific PR target.",
    "- The user explicitly authorizes `post-review-comment` for repository example/repo, PR 42, head abc123, with finalized comment resource comment-1.",
    "",
    "CASE-B",
    "- The same `ado_post_review_comment` tool is available.",
    "- The user has not authorized an external mutation.",
    "",
    "CASE-C",
    "- The user explicitly requests `post-review-comment`.",
    "- Available tools expose Azure DevOps reads only; no output mutation operation is declared.",
    "",
    "CASE-D",
    "- Azure DevOps read tools are available.",
    "- No output mutation tool is declared and no mutation is requested.",
    "",
    "For each case, state the resolved output capability/action and whether mutation may execute.",
  ].join("\n");
}

function assertCase(text: string, caseId: string, ...patterns: RegExp[]): void {
  const line = text.split(/\r?\n/).find((candidate) => candidate.includes(caseId));
  assert.ok(line, `Missing output for ${caseId}`);
  for (const pattern of patterns) {
    assert.match(line, pattern);
  }
}
