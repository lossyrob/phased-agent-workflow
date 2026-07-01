import { after, describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { assertToolCalls } from "../../lib/assertions.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";

describe("paw-init control-state workflow context", { timeout: 480_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  it("writes pending statuses for enabled optional review flows", async () => {
    const workflowContext = await runInitCase({
      contexts,
      workId: "test-init-control-state",
      workflowIdentity: "paw",
      workflowMode: "full",
      reviewPolicy: "planning-only",
      finalAgentReview: "enabled",
      finalReviewMode: "society-of-thought",
      planningDocsReview: "enabled",
      planningReviewMode: "society-of-thought",
    });

    assert.match(workflowContext, /## Control State/);
    assert.match(workflowContext, /TODO Mirror:\s*active-required-items/i);
    assert.match(workflowContext, /Reconciliation:\s*not_run/i);
    assert.match(workflowContext, /### Required Workflow Items/);
    assert.match(workflowContext, /`planning-docs-review` \| `pending` \| `activity`/);
    assert.match(workflowContext, /`final-review` \| `pending` \| `activity`/);
    assert.match(workflowContext, /### Gate Items/);
    assert.match(workflowContext, /`transition:after-plan-review` \| `pending` \| `transition`/);
    assert.match(workflowContext, /`transition:after-planning-docs-review` \| `pending` \| `transition`/);
    assert.match(workflowContext, /`transition:after-final-review` \| `pending` \| `transition`/);
    assert.match(workflowContext, /### Configured Procedure Items/);
    assert.match(workflowContext, /`procedure:planning-review` \| `pending` \| `procedure`/);
    assert.match(workflowContext, /`procedure:final-review` \| `pending` \| `procedure`/);
  });

  it("writes not_applicable for disabled optional review flows", async () => {
    const workflowContext = await runInitCase({
      contexts,
      workId: "test-init-disabled-review-flows",
      workflowIdentity: "paw",
      workflowMode: "full",
      reviewPolicy: "planning-only",
      finalAgentReview: "disabled",
      finalReviewMode: "multi-model",
      planningDocsReview: "disabled",
      planningReviewMode: "multi-model",
    });

    assert.match(workflowContext, /## Control State/);
    assert.match(workflowContext, /`planning-docs-review` \| `not_applicable` \| `activity`/);
    assert.match(workflowContext, /`final-review` \| `not_applicable` \| `activity`/);
    assert.match(workflowContext, /`transition:after-planning-docs-review` \| `not_applicable` \| `transition`/);
    assert.match(workflowContext, /`transition:after-final-review` \| `not_applicable` \| `transition`/);
    assert.match(workflowContext, /`procedure:planning-review` \| `not_applicable` \| `procedure`/);
    assert.match(workflowContext, /`procedure:final-review` \| `not_applicable` \| `procedure`/);
  });

  it("writes not_applicable for spec-stage items in minimal mode", async () => {
    const workflowContext = await runInitCase({
      contexts,
      workId: "test-init-minimal-mode",
      workflowIdentity: "paw",
      workflowMode: "minimal",
      reviewPolicy: "planning-only",
      finalAgentReview: "disabled",
      finalReviewMode: "multi-model",
      planningDocsReview: "disabled",
      planningReviewMode: "multi-model",
    });

    assert.match(workflowContext, /`spec` \| `not_applicable` \| `activity`/);
    assert.match(workflowContext, /`spec-review` \| `not_applicable` \| `activity`/);
    assert.match(workflowContext, /`transition:after-spec-review` \| `not_applicable` \| `transition`/);
    assert.match(workflowContext, /`code-research` \| `pending` \| `activity`/);
    assert.match(workflowContext, /`planning` \| `pending` \| `activity`/);
  });

  it("writes the lite control-state profile when workflow identity is paw-lite", async () => {
    const workflowContext = await runInitCase({
      contexts,
      workId: "test-init-paw-lite",
      workflowIdentity: "paw-lite",
      workflowMode: "custom",
      reviewPolicy: "final-pr-only",
      finalAgentReview: "enabled",
      finalReviewMode: "multi-model",
      planningDocsReview: "disabled",
      planningReviewMode: "multi-model",
    });

    assert.match(workflowContext, /Workflow Identity:\s*paw-lite/i);
    assert.match(workflowContext, /Workflow Mode:\s*custom/i);
    assert.match(workflowContext, /Review Policy:\s*final-pr-only/i);
    assert.match(workflowContext, /Planning Docs Review:\s*disabled/i);
    assert.match(workflowContext, /## Control State/);
    assert.match(workflowContext, /`planning` \| `pending` \| `activity`/);
    assert.match(workflowContext, /`implementation` \| `pending` \| `activity`/);
    assert.match(workflowContext, /`final-review` \| `pending` \| `activity`/);
    assert.match(workflowContext, /`procedure:final-review` \| `pending` \| `procedure`/);
    assert.doesNotMatch(workflowContext, /`spec` \|/);
    assert.doesNotMatch(workflowContext, /### Gate Items/);
    assert.doesNotMatch(workflowContext, /procedure:planning-review/);
  });
});

async function runInitCase(opts: {
  contexts: TestContext[];
  workId: string;
  workflowIdentity: "paw" | "paw-lite";
  workflowMode: "full" | "minimal" | "custom";
  reviewPolicy: "planning-only" | "final-pr-only";
  finalAgentReview: "enabled" | "disabled";
  finalReviewMode: "single-model" | "multi-model" | "society-of-thought";
  planningDocsReview: "enabled" | "disabled";
  planningReviewMode: "single-model" | "multi-model" | "society-of-thought";
}): Promise<string> {
  const initSkill = extractSection(
    await loadSkill("paw-init"),
    "### WorkflowContext.md",
    "### Execution Contract",
  );

  const answerer = new RuleBasedAnswerer([
    (req) => req.choices?.[0] ?? "yes",
  ], false);

  const ctx = await createTestContext({
    fixtureName: "minimal-ts",
    skillOrAgent: `paw-init-${opts.workId}`,
    systemPrompt: buildInitPrompt(initSkill, opts.workId),
    answerer,
    excludedTools: ["skill", "sql"],
  });
  opts.contexts.push(ctx);

  await ctx.session.sendAndWait({
    prompt: [
      "Initialize the workflow context for this test work item.",
      "",
      `Write only .paw/work/${opts.workId}/WorkflowContext.md and its parent directories.`,
      "Do not create branches, commits, PRs, or any other artifacts.",
      "Do not ask the user questions.",
      "",
      "Use this configuration exactly:",
      "Work Title: Control State Test",
      `Work ID: ${opts.workId}`,
      "Base Branch: main",
      `Target Branch: feature/${opts.workId}`,
      "Execution Mode: current-checkout",
      `Workflow Identity: ${opts.workflowIdentity}`,
      `Workflow Mode: ${opts.workflowMode}`,
      "Review Strategy: local",
      `Review Policy: ${opts.reviewPolicy}`,
      "Session Policy: continuous",
      `Final Agent Review: ${opts.finalAgentReview}`,
      `Final Review Mode: ${opts.finalReviewMode}`,
      "Final Review Interactive: false",
      "Final Review Models: none",
      "Final Review Specialists: all",
      "Final Review Interaction Mode: parallel",
      "Final Review Specialist Models: none",
      "Final Review Perspectives: none",
      "Final Review Perspective Cap: 2",
      "Implementation Model: none",
      "Plan Generation Mode: single-model",
      "Plan Generation Models: none",
      `Planning Docs Review: ${opts.planningDocsReview}`,
      `Planning Review Mode: ${opts.planningReviewMode}`,
      "Planning Review Interactive: false",
      "Planning Review Models: none",
      "Planning Review Specialists: all",
      "Planning Review Interaction Mode: parallel",
      "Planning Review Specialist Models: none",
      "Planning Review Perspectives: none",
      "Planning Review Perspective Cap: 2",
      "Custom Workflow Instructions: none",
      "Initial Prompt: Create workflow context only",
      "Issue URL: none",
      "Artifact Lifecycle: commit-and-persist",
    ].join("\n"),
  }, 120_000);

  const workflowContext = await readFile(
    join(ctx.fixture.workDir, ".paw/work", opts.workId, "WorkflowContext.md"), "utf-8",
  );

  assert.doesNotMatch(workflowContext, /- add `phase:<n>:<slug>` items after planning defines named implementation phases/i);
  assertToolCalls(ctx.toolLog, {
    forbidden: ["git_push"],
    bashMustNotInclude: [/git push/, /gh\s+pr\s+create/],
  });

  return workflowContext;
}

function buildInitPrompt(skillContent: string, workId: string): string {
  return [
    "You are a focused paw-init workflow-context test agent.",
    "",
    "CRITICAL RULES:",
    `- Write .paw/work/${workId}/WorkflowContext.md by following the paw-init reference below`,
    "- Preserve the control-state template structure and item IDs from the reference",
    "- Create only the requested file and its parent directories",
    "- Do not create branches, commits, PRs, or any other artifacts",
    "- Do NOT ask the user questions",
    "- Do not invoke the skill tool or use SQL",
    "",
    "paw-init WorkflowContext reference:",
    skillContent,
  ].join("\n");
}

function extractSection(content: string, startMarker: string, endMarker: string): string {
  const start = content.indexOf(startMarker);
  if (start === -1) {
    return content;
  }

  const end = content.indexOf(endMarker, start);
  return content.slice(start, end === -1 ? undefined : end).trim();
}
