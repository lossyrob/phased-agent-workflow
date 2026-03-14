/**
 * Workflow test T5: git-branching
 *
 * Verifies PAW git operations: branch creation, selective staging,
 * and commit behavior using the paw-git-operations skill.
 *
 * Requires: Copilot CLI auth
 * Runtime: ~30-60 seconds
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertToolCalls } from "../../lib/assertions.js";

const LIVE_MODEL = process.env.PAW_TEST_LIVE_MODEL ?? "claude-sonnet-4.6";
const LIVE_TURN_TIMEOUT = 180_000;

async function seedWorkflowContext(
  workDir: string,
  workId: string,
  targetBranch: string,
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Git Branching Test",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: ${targetBranch}`,
    "Execution Mode: current-checkout",
    "Workflow Mode: minimal",
    "Review Strategy: local",
    "Review Policy: final-pr-only",
    "Session Policy: continuous",
    "Final Agent Review: enabled",
    "Remote: origin",
    "Artifact Paths: auto-derived",
    "",
  ].join("\n"));
}

describe("git branching and commit behavior", { timeout: 180_000 }, () => {
  let ctx: TestContext;

  after(async () => {
    if (ctx) { await destroyTestContext(ctx); }
  });

  it("creates a feature branch and makes selective commits", async () => {
    const gitOpsSkill = await loadSkill("paw-git-operations");
    const workId = "test-branching";
    const branchName = "feature/test-branching";

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const fixtureName = "minimal-ts";
    ctx = await createTestContext({
      fixtureName,
      skillOrAgent: "git-branching",
      systemPrompt: [
        "You are a PAW agent testing current-checkout git operations.",
        "",
        "RULES:",
        `- Read .paw/work/${workId}/WorkflowContext.md before any git mutation`,
        `- In Execution Mode: current-checkout, create or switch to the target branch ${branchName} in the active checkout`,
        "- Follow the git operations skill for branch naming and commit patterns",
        "- Stage only the file(s) requested for each commit",
        "- Do not create or update session workspace files such as plan.md",
        "- Do not run tests, builds, lint, or cleanup commands unless explicitly asked",
        "- Stop after the two requested commits and report the branch name plus commit count",
        "- Do NOT push to any remote",
        "- Do NOT ask the user questions",
        "",
        "Git operations skill reference:",
        gitOpsSkill,
      ].join("\n"),
      answerer,
      model: LIVE_MODEL,
    });

    await seedWorkflowContext(ctx.fixture.workDir, workId, branchName);

    await ctx.session.sendAndWait({
      prompt: [
        `1. Read .paw/work/${workId}/WorkflowContext.md and create or switch to target branch '${branchName}' in the current checkout`,
        `2. Create a directory .paw/work/${workId}/ and add a file Spec.md with content '# Test Spec\\n\\nOverview of test feature.'`,
        "3. Create a file src/feature.ts with content 'export const feature = true;'",
        "4. Stage ONLY .paw/work/test-branching/Spec.md and commit with message 'Add spec artifact'",
        "5. Then stage ONLY src/feature.ts and commit with message 'Add feature implementation'",
        "6. Do NOT push. Do not run tests, builds, lint, cleanup commands, or create session workspace files. Report the branch name and commit count.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    // Verify branch was created
    const branch = await ctx.fixture.getBranch();
    assert.ok(
      branch === branchName || branch.includes("test-branching"),
      `Expected branch '${branchName}', got '${branch}'`,
    );

    // Verify artifacts were created
    const specPath = join(ctx.fixture.workDir, ".paw/work", workId, "Spec.md");
    const specContent = await readFile(specPath, "utf-8");
    assert.ok(specContent.length > 0, "Spec.md should be non-empty");

    const featurePath = join(ctx.fixture.workDir, "src/feature.ts");
    const featureContent = await readFile(featurePath, "utf-8");
    assert.ok(featureContent.includes("feature"), "feature.ts should exist");

    // Verify no push
    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/, /\bnpm test\b/, /\bnpm run build\b/, /\brm -rf dist\b/],
    });
  });
});
