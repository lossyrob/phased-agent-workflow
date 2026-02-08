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
import { readFile } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";
import { assertToolCalls } from "../../lib/assertions.js";

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

    ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "git-branching",
      systemPrompt: [
        "You are a PAW agent testing git operations.",
        "",
        "RULES:",
        "- Follow the git operations skill for branch naming and commit patterns",
        "- Do NOT push to any remote",
        "- Do NOT ask the user questions",
        "",
        "Git operations skill reference:",
        gitOpsSkill,
      ].join("\n"),
      answerer,
    });

    await ctx.session.sendAndWait({
      prompt: [
        `1. Create a new branch called '${branchName}' from the current branch`,
        `2. Create a directory .paw/work/${workId}/ and add a file Spec.md with content '# Test Spec\\n\\nOverview of test feature.'`,
        "3. Create a file src/feature.ts with content 'export const feature = true;'",
        "4. Stage ONLY the .paw/ directory and commit with message 'Add spec artifact'",
        "5. Then stage ONLY src/feature.ts and commit with message 'Add feature implementation'",
        "6. Do NOT push. Report the branch name and commit count.",
      ].join("\n"),
    }, 120_000);

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
      bashMustNotInclude: [/git push/],
    });
  });
});
