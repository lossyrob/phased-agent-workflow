/**
 * Workflow test: paw-planning-docs-review reviews planning artifacts holistically.
 *
 * Seeds: Spec.md, ImplementationPlan.md, CodeResearch.md
 * Exercises: Cross-artifact review, finding generation, structured output
 * Verification: Structural assertions + LLM judge
 *
 * Requires: Copilot CLI auth
 * Runtime: ~60-90 seconds
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertArtifactExists, assertToolCalls } from "../../lib/assertions.js";
import { Judge } from "../../lib/judge.js";

const REVIEW_RUBRIC = [
  "Evaluate this cross-artifact planning review:",
  "- coverage: Does it check Spec↔Plan traceability, assumption consistency, and scope alignment? (1-5)",
  "- structure: Are findings organized with severity, affected artifacts, and suggested resolutions? (1-5)",
  "- specificity: Does it reference concrete FRs, phases, or sections from the artifacts? (1-5)",
  "- actionability: Are findings clear enough that a developer could act on them? (1-5)",
  "- balance: Does it identify both issues and strengths (not just nitpicks)? (1-5)",
].join("\n");

describe("paw-planning-docs-review workflow", { timeout: 180_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("reviews planning artifacts and produces structured findings", async () => {
    const skillContent = await loadSkill("paw-planning-docs-review");
    const workId = "test-planning-review";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-planning-docs-review",
      systemPrompt: buildReviewPrompt(skillContent, workId),
      answerer,
    });

    // Seed all three planning artifacts
    await ctx.fixture.seedWorkflowState(workId, "planning-review");

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Review the planning documents at .paw/work/${workId}/`,
        "",
        "Artifacts to review as a holistic bundle:",
        `- Spec.md: .paw/work/${workId}/Spec.md`,
        `- ImplementationPlan.md: .paw/work/${workId}/ImplementationPlan.md`,
        `- CodeResearch.md: .paw/work/${workId}/CodeResearch.md`,
        "",
        "Focus on cross-artifact consistency issues.",
        "Write your review to .paw/work/" + workId + "/reviews/planning/REVIEW.md",
      ].join("\n"),
    }, 120_000);

    const text = response?.data?.content ?? "";

    // Should produce substantive review content
    assert.ok(
      text.length > 100,
      `Review response too short (${text.length} chars)`,
    );

    // Verify review artifact was created
    const reviewContent = await assertArtifactExists(
      ctx.fixture.workDir,
      workId,
      "reviews/planning/REVIEW.md",
    );

    // Review should reference the actual spec requirements
    assert.match(
      reviewContent,
      /FR-\d+|functional.?requirement|requirement/im,
      "Review should reference spec requirements",
    );

    // Review should reference the plan
    assert.match(
      reviewContent,
      /phase|implementation.?plan/im,
      "Review should reference the implementation plan",
    );

    // Review should contain severity or finding structure
    assert.match(
      reviewContent,
      /must.?fix|should.?fix|consider|finding|severity/im,
      "Review should contain structured findings with severity",
    );

    // Safety: should not modify code or push
    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/, /git commit/],
    });

    // LLM Judge for quality
    const specContent = await assertArtifactExists(ctx.fixture.workDir, workId, "Spec.md");
    const planContent = await assertArtifactExists(ctx.fixture.workDir, workId, "ImplementationPlan.md");

    judge = new Judge();
    await judge.start();

    const verdict = await judge.evaluate({
      context: [
        "Agent was given these planning artifacts to review holistically:",
        `\nSpec:\n${specContent}`,
        `\nPlan:\n${planContent}`,
        "\nAnd produced this cross-artifact review:",
      ].join("\n"),
      artifact: reviewContent,
      rubric: REVIEW_RUBRIC,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED review:\n  Scores: ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildReviewPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW planning documents reviewer. Review planning artifacts holistically for cross-artifact consistency.",
    "",
    "IMPORTANT RULES:",
    `- Read ALL artifacts from .paw/work/${workId}/: Spec.md, ImplementationPlan.md, CodeResearch.md`,
    `- Write review to .paw/work/${workId}/reviews/planning/REVIEW.md`,
    "- Create the reviews/planning/ directory if needed",
    "- Focus on cross-artifact issues: Spec↔Plan traceability, assumption consistency, scope alignment",
    "- Each finding must have: severity (must-fix, should-fix, consider), affected artifact(s), description",
    "- Do NOT modify the planning artifacts — only review them",
    "- Do NOT push to git or create PRs",
    "- Do NOT ask the user questions — use your best judgment",
    "",
    "Reference skill documentation:",
    skillContent,
  ].join("\n");
}
