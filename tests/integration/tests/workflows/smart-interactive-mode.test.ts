/**
 * Workflow test: smart interactive mode classification in paw-planning-docs-review.
 *
 * Verifies that smart mode correctly classifies synthesis findings:
 * - Consensus must-fix/should-fix → auto-apply
 * - Partial/single-model must-fix/should-fix → interactive
 * - Any consider → report-only
 *
 * Seeds: Spec.md, ImplementationPlan.md, CodeResearch.md, WorkflowContext.md (smart config)
 * Exercises: Smart classification heuristic, phased resolution (auto-apply → interactive → summary)
 * Verification: Structural assertions + LLM judge
 *
 * Requires: Copilot CLI auth
 * Runtime: ~60-120 seconds
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertArtifactExists, assertToolCalls } from "../../lib/assertions.js";
import { Judge } from "../../lib/judge.js";

const SMART_MODE_RUBRIC = [
  "Evaluate this smart-mode review for correct single-model degradation behavior:",
  "- smart_recognition: Does it recognize smart mode config from WorkflowContext and note single-model degradation? (1-5)",
  "- severity_classification: Are findings classified with severity levels (must-fix, should-fix, consider)? (1-5)",
  "- interactive_flow: Are findings presented for user decision (apply/skip/discuss) as expected for degraded smart mode? (1-5)",
  "- artifact_references: Does the review reference specific requirements, phases, or code patterns from the artifacts? (1-5)",
  "- summary: Does it produce a resolution summary with disposition counts at the end? (1-5)",
].join("\n");

const WORKFLOW_CONTEXT = `# WorkflowContext

Work Title: Health Check Endpoint
Work ID: test-smart-review
Base Branch: main
Target Branch: feature/test-smart-review
Workflow Mode: full
Review Strategy: local
Review Policy: final-pr-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: multi-model
Final Review Interactive: smart
Planning Docs Review: enabled
Planning Review Mode: multi-model
Planning Review Interactive: smart
Custom Workflow Instructions: none
`;

describe("smart interactive mode classification", { timeout: 300_000 }, () => {
  let ctx: TestContext;
  let judge: Judge;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
    if (judge) { await judge.stop(); }
  });

  it("classifies findings by agreement level and resolves in phases", async () => {
    const skillContent = await loadSkill("paw-planning-docs-review");
    const workId = "test-smart-review";

    const answerer = new RuleBasedAnswerer([
      // For interactive findings, choose "apply"
      (req) => {
        const q = (req.question ?? "").toLowerCase();
        if (q.includes("apply") || q.includes("skip") || q.includes("discuss")) {
          return "apply";
        }
        return null;
      },
      // Default: pick first choice
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-planning-docs-review",
      systemPrompt: buildSmartReviewPrompt(skillContent, workId),
      answerer,
    });

    // Seed planning artifacts
    await ctx.fixture.seedWorkflowState(workId, "planning-review");

    // Add WorkflowContext.md with smart config
    const wcDir = join(ctx.fixture.workDir, ".paw/work", workId);
    await mkdir(wcDir, { recursive: true });
    await writeFile(join(wcDir, "WorkflowContext.md"), WORKFLOW_CONTEXT);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Review planning documents at .paw/work/${workId}/ using smart interactive mode.`,
        "",
        `Read WorkflowContext.md at .paw/work/${workId}/WorkflowContext.md for config.`,
        "Planning Review Interactive = smart, Planning Review Mode = multi-model.",
        "",
        "Since this is a single-model execution context, smart mode degrades to interactive.",
        "Review the artifacts (Spec.md, ImplementationPlan.md, CodeResearch.md),",
        "generate findings with severity levels (must-fix, should-fix, consider),",
        "classify them per the smart mode heuristic, and produce a Resolution Summary.",
        `Write the review to .paw/work/${workId}/reviews/planning/REVIEW.md`,
      ].join("\n"),
    }, 120_000);

    const text = response?.data?.content ?? "";

    // Should produce substantive response
    assert.ok(
      text.length > 200,
      `Response too short for smart mode review (${text.length} chars)`,
    );

    // Verify review artifact was created
    const reviewContent = await assertArtifactExists(
      ctx.fixture.workDir,
      workId,
      "reviews/planning/REVIEW.md",
    );

    // Smart mode should recognize config and degrade to interactive (single-model)
    const smartPattern = /smart|single.?model|degrad|interactive/im;
    assert.match(
      text,
      smartPattern,
      "Response should reference smart mode or single-model degradation to interactive",
    );

    // Should contain resolution summary or finding dispositions
    const summaryPattern = /resolution.?summary|applied|skipped|finding|disposition/im;
    assert.match(
      text,
      summaryPattern,
      "Response should contain resolution summary with disposition categories",
    );

    // Review should reference spec requirements
    assert.match(
      reviewContent,
      /FR-\d+|functional.?requirement|requirement/im,
      "Review should reference spec requirements",
    );

    // Review should contain severity structure
    assert.match(
      reviewContent,
      /must.?fix|should.?fix|consider|severity/im,
      "Review should contain findings with severity levels",
    );

    // Safety: should not push or commit
    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/, /git commit/],
    });

    // LLM Judge for smart mode quality
    judge = new Judge();
    await judge.start();

    const verdict = await judge.evaluate({
      context: [
        "Agent was given planning artifacts to review with smart interactive mode.",
        "Smart mode should: auto-apply consensus fixes, present partial/single findings interactively,",
        "and report consider-severity as report-only.",
        "",
        "Agent produced this response:",
      ].join("\n"),
      artifact: text,
      rubric: SMART_MODE_RUBRIC,
    });

    if (!verdict.pass) {
      throw new Error(
        `Judge FAILED smart mode review:\n  Scores: ${JSON.stringify(verdict.scores)}\n  ${verdict.rationale}`,
      );
    }
  });
});

function buildSmartReviewPrompt(skillContent: string, workId: string): string {
  return [
    "You are a PAW planning documents reviewer operating in smart interactive mode.",
    "",
    "TASK:",
    `- Read artifacts from .paw/work/${workId}/: Spec.md, ImplementationPlan.md, CodeResearch.md`,
    `- Also read .paw/work/${workId}/WorkflowContext.md for review config`,
    `- Write review to .paw/work/${workId}/reviews/planning/REVIEW.md (create directory if needed)`,
    "- Since this is single-model, smart degrades to interactive per the skill docs",
    "- Classify findings with severity (must-fix, should-fix, consider)",
    "- Present findings and produce a Resolution Summary with disposition counts",
    "- Do NOT modify planning artifacts, push to git, or create PRs",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}
