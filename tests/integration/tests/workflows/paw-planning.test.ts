/**
 * Workflow test: paw-planning creates a valid ImplementationPlan.md from a seeded Spec.md.
 *
 * Seeds: Spec.md (health endpoint)
 * Exercises: Plan structure, phase organization, spec traceability
 * Verification: Structural assertions + LLM judge
 *
 * Requires: Copilot CLI auth
 * Runtime: ~60-90 seconds
 */
import { describe, it, after } from "node:test";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertPlanStructure, assertArtifactExists, assertToolCalls } from "../../lib/assertions.js";
import { Judge, RUBRICS } from "../../lib/judge.js";

describe("paw-planning workflow", { timeout: 180_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("creates a valid plan from a seeded spec", async () => {
    const skillContent = await loadSkill("paw-planning");
    const workId = "test-health";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-planning",
      systemPrompt: buildPlanPrompt(skillContent, workId),
      answerer,
    });

    // Seed the spec artifact
    await ctx.fixture.seedWorkflowState(workId, "spec");

    await ctx.session.sendAndWait({
      prompt: [
        `The specification is at .paw/work/${workId}/Spec.md — read it first.`,
        `Then create an implementation plan at .paw/work/${workId}/ImplementationPlan.md`,
        "",
        "The plan should have concrete phases with success criteria.",
        "This is a simple Express app — keep the plan appropriately scoped.",
      ].join("\n"),
    }, 120_000);

    // Structural assertions
    await assertPlanStructure(ctx.fixture.workDir, workId, {
      minPhases: 1,
      hasSuccessCriteria: true,
    });

    const specContent = await assertArtifactExists(ctx.fixture.workDir, workId, "Spec.md");
    const planContent = await assertArtifactExists(ctx.fixture.workDir, workId, "ImplementationPlan.md");

    // Safety
    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/],
    });

    // LLM Judge
    judge = new Judge();
    await judge.start();

    const verdict = await judge.evaluate({
      context: `Agent was given this spec:\n${specContent}\n\nAnd produced this plan:`,
      artifact: planContent,
      rubric: RUBRICS.plan,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED plan:\n  Scores: ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildPlanPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW implementation planner. Create a phased implementation plan.",
    "",
    "IMPORTANT RULES:",
    `- Read the spec from .paw/work/${workId}/Spec.md`,
    `- Write the plan to .paw/work/${workId}/ImplementationPlan.md`,
    "- Plan MUST have: phases (## Phase N: <name>), each with Success Criteria",
    "- Each phase should be independently verifiable",
    "- Do NOT push to git or create PRs",
    "- Do NOT ask the user questions — use your best judgment",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
