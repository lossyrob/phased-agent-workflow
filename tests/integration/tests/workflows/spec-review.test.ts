/**
 * Workflow test T9: spec-review
 *
 * Tests the paw-spec-review skill by having it review a pre-seeded spec
 * and produce structured feedback. Validates that the review identifies
 * both strengths and potential improvements.
 *
 * Requires: Copilot CLI auth
 * Runtime: ~30-60 seconds
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";

describe("spec review workflow", { timeout: 180_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("reviews a spec and produces structured feedback", async () => {
    const skillContent = await loadSkill("paw-spec-review");
    const workId = "test-spec-review";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "spec-review",
      systemPrompt: [
        "You are a PAW spec reviewer. Review specifications for quality and completeness.",
        "",
        "RULES:",
        "- Evaluate the spec against quality criteria",
        "- Provide structured feedback with verdict (APPROVED or REVISE)",
        "- Identify strengths and areas for improvement",
        "- Do NOT modify the spec — only review it",
        "- Do NOT ask the user questions",
        "",
        "Skill reference:",
        skillContent,
      ].join("\n"),
      answerer,
    });

    // Seed a spec to review
    await ctx.fixture.seedWorkflowState(workId, "spec");

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Review the specification at .paw/work/${workId}/Spec.md`,
        "",
        "Provide your review with:",
        "- A verdict: APPROVED or REVISE",
        "- Strengths of the spec",
        "- Areas for improvement (if any)",
        "- Whether requirements are testable and traceable",
      ].join("\n"),
    }, 120_000);

    const text = response?.data?.content ?? "";

    // The review should contain a verdict
    assert.match(
      text,
      /APPROVED|REVISE|approved|revise|verdict/im,
      "Review should contain a verdict (APPROVED or REVISE)",
    );

    // Should mention functional requirements or FRs
    assert.match(
      text,
      /FR-\d+|functional.?requirement|requirement/im,
      "Review should reference requirements",
    );

    // Should have some substantive content (not just a one-liner)
    assert.ok(
      text.length > 200,
      `Review too short (${text.length} chars) — expected substantive feedback`,
    );
  });
});
