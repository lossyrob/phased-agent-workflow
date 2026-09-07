import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "./answerer.js";
import { createTestContext, type TestContext } from "./harness.js";
import { loadSkill } from "./skills.js";

export interface PawLiteWorkConfig {
  planningDocsReview?: "enabled" | "disabled";
  planningReviewMode?: "single-model" | "multi-model" | "society-of-thought";
  reviewPolicy?: "every-stage" | "milestones" | "planning-only" | "final-pr-only";
  finalAgentReview?: "enabled" | "disabled";
  finalReviewMode?: "single-model" | "multi-model" | "society-of-thought";
  finalReviewModels?: string;
  finalReviewSpecialists?: string;
  finalReviewInteractionMode?: "parallel" | "debate";
}

export async function createPawLiteBoundaryContext(label: string): Promise<TestContext> {
  const pawLiteSkill = await loadSkill("paw-lite");
  const answerer = new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false);

  return createTestContext({
    fixtureName: "minimal-ts",
    skillOrAgent: `paw-lite-boundary-${label}`,
    systemPrompt: [
      "You are executing PAW-Lite deterministic boundary evaluation tests.",
      "When given a work ID and boundary name, read .paw/work/<work-id>/WorkflowContext.md and artifacts as needed.",
      "Use PAW-Lite's named-boundary behavior: return the boundary brief and TODO guidance without advancing unrelated stages.",
      "Do not edit files, commit, push, create PRs, or ask the user questions.",
      "",
      "PAW-Lite skill documentation:",
      pawLiteSkill,
    ].join("\n"),
    answerer,
  });
}

export async function seedPawLiteWork(
  workDir: string,
  workId: string,
  config: PawLiteWorkConfig = {},
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(join(dir, "reviews"), { recursive: true });

  const planningDocsReview = config.planningDocsReview ?? "enabled";
  const planningReviewMode = config.planningReviewMode ?? "multi-model";
  const reviewPolicy = config.reviewPolicy ?? "planning-only";
  const finalAgentReview = config.finalAgentReview ?? "enabled";
  const finalReviewMode = config.finalReviewMode ?? "multi-model";
  const finalReviewModels = config.finalReviewModels ?? "gpt-5.5, claude-opus-4.7-xhigh";
  const finalReviewSpecialists = config.finalReviewSpecialists ?? "all";
  const finalReviewInteractionMode = config.finalReviewInteractionMode ?? "parallel";

  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Boundary Runtime",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: feature/${workId}`,
    "Workflow Mode: full",
    "Review Strategy: local",
    `Review Policy: ${reviewPolicy}`,
    "Session Policy: continuous",
    `Planning Docs Review: ${planningDocsReview}`,
    `Planning Review Mode: ${planningReviewMode}`,
    `Final Agent Review: ${finalAgentReview}`,
    `Final Review Mode: ${finalReviewMode}`,
    `Final Review Models: ${finalReviewModels}`,
    `Final Review Specialists: ${finalReviewSpecialists}`,
    `Final Review Interaction Mode: ${finalReviewInteractionMode}`,
    "Final Review Specialist Models: none",
    "Final Review Perspectives: auto",
    "Artifact Lifecycle: commit-and-clean",
    "Artifact Paths: auto-derived",
    "",
  ].join("\n"));

  await writeFile(join(dir, "Plan.md"), [
    "# Plan",
    "",
    "## Work Items",
    "- Add boundary test fixture.",
    "",
    "## Success Criteria",
    "- Boundary guidance is emitted.",
    "",
  ].join("\n"));

  await writeFile(join(dir, "reviews/REVIEW-SYNTHESIS.md"), [
    "# Final Review Synthesis",
    "",
    "All findings resolved or intentionally carried forward.",
    "",
  ].join("\n"));
}

export async function evaluatePawLiteBoundary(
  ctx: TestContext,
  workId: string,
  boundaryName: string,
  extraInstructions = "",
): Promise<string> {
  const response = await ctx.session.sendAndWait({
    prompt: [
      `Evaluate named PAW-Lite boundary: ${boundaryName}`,
      `Work ID: ${workId}`,
      "",
      "Return a compact boundary brief with these labels: completed stage, next activity, required gate/procedure, configured value, incorrect shortcut, next TODOs.",
      "Use exact boundary and TODO names where applicable.",
      "Do not modify files or advance unrelated stages.",
      extraInstructions,
    ].filter(Boolean).join("\n"),
  }, 120_000);

  return response?.data?.content ?? "";
}
