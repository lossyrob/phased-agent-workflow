/**
 * Workflow test: paw-planning multi-model mode creates competing plans and synthesizes.
 *
 * Seeds: Spec.md (health endpoint) + WorkflowContext.md with multi-model config
 * Exercises: Multi-model plan generation, per-model artifacts, synthesis
 * Verification: Structural assertions on final plan + per-model drafts
 *
 * Requires: Copilot CLI auth
 * Runtime: ~120-180 seconds (spawns parallel subagents)
 */
import { describe, it, after } from "node:test";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertPlanStructure, assertArtifactExists, assertToolCalls } from "../../lib/assertions.js";
import { Judge, RUBRICS } from "../../lib/judge.js";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert";

describe("paw-planning multi-model workflow", { timeout: 300_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("generates plan with multi-model synthesis", async () => {
    const skillContent = await loadSkill("paw-planning");
    const workId = "test-multi-plan";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes", // auto-confirm model selection
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-planning",
      systemPrompt: buildMultiModelPlanPrompt(skillContent, workId),
      answerer,
    });

    // Seed the spec artifact
    await ctx.fixture.seedWorkflowState(workId, "spec");

    // Seed WorkflowContext.md with multi-model config
    const wcDir = join(ctx.fixture.workDir, ".paw/work", workId);
    await mkdir(wcDir, { recursive: true });
    await writeFile(join(wcDir, "WorkflowContext.md"), [
      "# WorkflowContext",
      "",
      `Work ID: ${workId}`,
      "Work Title: Multi-model Planning Test",
      "Base Branch: main",
      "Target Branch: feature/multi-plan-test",
      "Workflow Mode: greenfield",
      "Review Strategy: local",
      "Review Policy: milestones",
      "Session Policy: per-stage",
      "Final Agent Review: enabled",
      "Final Review Mode: single-model",
      "Final Review Interactive: smart",
      "Final Review Models: latest GPT, latest Gemini, latest Claude Opus",
      "Plan Generation Mode: multi-model",
      "Plan Generation Models: latest GPT, latest Gemini, latest Claude Opus",
      "Planning Docs Review: disabled",
      "Planning Review Mode: single-model",
      "Planning Review Interactive: smart",
      "Planning Review Models: latest GPT, latest Gemini, latest Claude Opus",
    ].join("\n"));

    await ctx.session.sendAndWait({
      prompt: [
        `The specification is at .paw/work/${workId}/Spec.md — read it first.`,
        `WorkflowContext.md is at .paw/work/${workId}/WorkflowContext.md — check Plan Generation Mode.`,
        `Then create an implementation plan at .paw/work/${workId}/ImplementationPlan.md`,
        "",
        "Follow the multi-model plan generation flow from the skill documentation.",
        "This is a simple Express app — keep the plan appropriately scoped.",
      ].join("\n"),
    }, 240_000);

    // Verify final synthesized plan exists and is structurally valid
    await assertPlanStructure(ctx.fixture.workDir, workId, {
      minPhases: 1,
      hasSuccessCriteria: true,
    });

    const planContent = await assertArtifactExists(ctx.fixture.workDir, workId, "ImplementationPlan.md");

    // Verify per-model plan drafts were created
    const planningDir = join(ctx.fixture.workDir, ".paw/work", workId, "planning");
    const draftFiles = await readdir(planningDir).catch(() => []);
    const planDrafts = (draftFiles as string[]).filter((f: string) => f.startsWith("PLAN-") && f.endsWith(".md"));
    assert.ok(planDrafts.length >= 2, `Expected at least 2 per-model PLAN-*.md drafts, found ${planDrafts.length}`);

    // Safety: no git push
    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/],
    });

    // LLM Judge
    judge = new Judge();
    await judge.start();

    const specContent = await assertArtifactExists(ctx.fixture.workDir, workId, "Spec.md");
    const verdict = await judge.evaluate({
      context: `Agent was given this spec:\n${specContent}\n\nUsing multi-model plan generation, it produced this plan:`,
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

function buildMultiModelPlanPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW implementation planner. Create a phased implementation plan using multi-model generation.",
    "",
    "IMPORTANT RULES:",
    `- Read WorkflowContext.md from .paw/work/${workId}/WorkflowContext.md`,
    `- Read the spec from .paw/work/${workId}/Spec.md`,
    `- Write the final plan to .paw/work/${workId}/ImplementationPlan.md`,
    "- Plan Generation Mode is multi-model — follow the multi-model flow",
    "- Save per-model plan drafts to the planning/ subfolder",
    "- Synthesize the best elements into the final plan",
    "- Plan MUST have: phases (## Phase N: <name>), each with Success Criteria",
    "- Each phase should be independently verifiable",
    "- Do NOT push to git or create PRs",
    "- Do NOT ask the user questions — use your best judgment",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
