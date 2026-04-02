import { after, describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { assertToolCalls } from "../../lib/assertions.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";

describe("paw-init hardened-state workflow context", { timeout: 180_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("seeds the hardened-state template into WorkflowContext.md", async () => {
    const initSkill = extractSection(
      await loadSkill("paw-init"),
      "### WorkflowContext.md",
      "### Execution Contract",
    );
    const workId = "test-init-hardened-state";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-init-hardened-state",
      systemPrompt: buildInitPrompt(initSkill, workId),
      answerer,
      excludedTools: ["skill", "sql"],
    });

    await ctx.session.sendAndWait({
      prompt: [
        "Initialize the workflow context for this test work item.",
        "",
        `Write only .paw/work/${workId}/WorkflowContext.md and its parent directories.`,
        "Do not create branches, commits, PRs, or any other artifacts.",
        "Do not ask the user questions.",
        "",
        "Use this configuration exactly:",
        "Work Title: Hardened State Test",
        `Work ID: ${workId}`,
        "Base Branch: main",
        `Target Branch: feature/${workId}`,
        "Execution Mode: current-checkout",
        "Workflow Mode: full",
        "Review Strategy: local",
        "Review Policy: planning-only",
        "Session Policy: continuous",
        "Final Agent Review: enabled",
        "Final Review Mode: society-of-thought",
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
        "Planning Docs Review: society-of-thought",
        "Planning Review Mode: society-of-thought",
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
        "Artifact Lifecycle: tracked",
      ].join("\n"),
    }, 120_000);

    const workflowContext = await readFile(
      join(ctx.fixture.workDir, ".paw/work", workId, "WorkflowContext.md"), "utf-8",
    );

    assert.match(workflowContext, /## Hardened State/);
    assert.match(workflowContext, /TODO Mirror:\s*active-required-items/i);
    assert.match(workflowContext, /Reconciliation:\s*not_run/i);
    assert.match(workflowContext, /### Required Workflow Items/);
    assert.match(workflowContext, /`planning-docs-review` \| `pending` \| `activity`/);
    assert.match(workflowContext, /### Gate Items/);
    assert.match(workflowContext, /`transition:after-plan-review` \| `pending` \| `transition`/);
    assert.match(workflowContext, /### Configured Procedure Items/);
    assert.match(workflowContext, /`procedure:planning-review` \| `pending` \| `procedure`/);
    assert.match(workflowContext, /`procedure:final-review` \| `pending` \| `procedure`/);

    assertToolCalls(ctx.toolLog, {
      forbidden: ["git_push"],
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/],
    });
  });
});

function buildInitPrompt(skillContent: string, workId: string): string {
  return [
    "You are a focused paw-init workflow-context test agent.",
    "",
    "CRITICAL RULES:",
    `- Write .paw/work/${workId}/WorkflowContext.md by following the paw-init reference below`,
    "- Preserve the hardened-state template structure and item IDs from the reference",
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
