import { after, describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { assertArtifactExists, assertToolCalls } from "../../lib/assertions.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { createCallerAndExecution } from "../../lib/multi-checkout.js";

const describeLiveWorktreeScenarios = process.env.PAW_TEST_ENABLE_LIVE_WORKTREE_SCENARIOS === "1"
  ? describe
  : describe.skip;

type CheckoutSnapshot = {
  branch: string;
  head: string;
  status: string;
};

async function captureCheckoutSnapshot(checkout: {
  branch(): Promise<string>;
  head(): Promise<string>;
  status(): Promise<string>;
}): Promise<CheckoutSnapshot> {
  return {
    branch: await checkout.branch(),
    head: await checkout.head(),
    status: await checkout.status(),
  };
}

async function seedWorkflowContext(
  workDir: string,
  workId: string,
  targetBranch: string,
  executionMode: "worktree" | "current-checkout",
  reviewStrategy: "local" | "prs" = "local",
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Worktree Test",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: ${targetBranch}`,
    "Workflow Mode: minimal",
    `Review Strategy: ${reviewStrategy}`,
    "Review Policy: final-pr-only",
    "Session Policy: continuous",
    "Final Agent Review: enabled",
    "Remote: origin",
    "Artifact Paths: auto-derived",
    `Execution Mode: ${executionMode}`,
    "Repository Identity: lossyrob/phased-agent-workflow:test-root",
    `Execution Binding: worktree:${workId}:${targetBranch}`,
    "",
  ].join("\n"));
}

function buildExecutionPrompt(workId: string, targetBranch: string): string {
  return [
    "You are a focused execution-checkout test agent.",
    "",
    "CRITICAL RULES:",
    `- Read WorkflowContext.md from .paw/work/${workId}/WorkflowContext.md before any git mutation`,
    `- Treat ${targetBranch} as the required target branch for this work item`,
    "- In current-checkout mode, the current working directory is the execution checkout",
    "- In worktree mode, operate only in the current execution checkout and never mutate the caller checkout",
    "- If Execution Mode is worktree and this checkout cannot be proven to be the execution checkout, STOP and give recovery guidance mentioning `git worktree list`, reopening the execution checkout, or re-initializing",
    "- Create only the files requested by the user prompt",
    "- Stage only the requested files and commit locally when asked",
    "- Never push or create PRs",
    "- Do not invoke the skill tool or use SQL",
    "- Do NOT ask the user questions",
  ].join("\n");
}

// TODO: Enable by default once the Copilot SDK supports protocol v3 permission requests in this harness.
describeLiveWorktreeScenarios("worktree execution bootstrap behavior", { timeout: 240_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  it("writes artifacts in the execution checkout and preserves the caller checkout", async () => {
    const workId = "test-worktree-bootstrap";
    const targetBranch = "feature/test-worktree-bootstrap";
    const checkouts = await createCallerAndExecution("minimal-ts", workId, targetBranch);
    const callerBefore = await captureCheckoutSnapshot(checkouts.caller);

    await seedWorkflowContext(checkouts.execution.path, workId, targetBranch, "worktree");

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixture: checkouts.fixture,
      executionPath: checkouts.execution.path,
      skillOrAgent: "worktree-bootstrap",
      systemPrompt: buildExecutionPrompt(workId, targetBranch),
      answerer,
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    await ctx.session.sendAndWait({
      prompt: [
        `1. Read .paw/work/${workId}/WorkflowContext.md and confirm you are operating on target branch ${targetBranch}.`,
        `2. Create .paw/work/${workId}/Spec.md with a heading and one overview paragraph.`,
        "3. Create src/worktree-proof.ts containing `export const worktreeProof = true;`",
        "4. Stage only those two files and commit them locally with message 'Add worktree execution proof'.",
        "5. Report the branch you used.",
      ].join("\n"),
    }, 120_000);

    assert.strictEqual(ctx.workingDirectory, checkouts.execution.path);
    await assertArtifactExists(checkouts.execution.path, workId, "Spec.md");

    const executionFile = await checkouts.execution.read("src/worktree-proof.ts");
    assert.match(executionFile, /worktreeProof/, "execution checkout should contain the proof file");
    assert.strictEqual(await checkouts.caller.exists(`.paw/work/${workId}/Spec.md`), false);
    assert.strictEqual(await checkouts.caller.exists("src/worktree-proof.ts"), false);

    const callerAfter = await captureCheckoutSnapshot(checkouts.caller);
    assert.deepStrictEqual(callerAfter, callerBefore, "caller checkout should remain unchanged");

    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/],
    });
  });

  it("fails fast with recovery guidance when run from the caller checkout", async () => {
    const workId = "test-worktree-wrong-checkout";
    const targetBranch = "feature/test-worktree-wrong-checkout";
    const checkouts = await createCallerAndExecution("minimal-ts", workId, targetBranch);
    const callerBefore = await captureCheckoutSnapshot(checkouts.caller);

    await seedWorkflowContext(checkouts.caller.path, workId, targetBranch, "worktree");

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixture: checkouts.fixture,
      skillOrAgent: "worktree-bootstrap-wrong-checkout",
      systemPrompt: buildExecutionPrompt(workId, targetBranch),
      answerer,
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Read .paw/work/${workId}/WorkflowContext.md and determine whether git work can proceed from this checkout.`,
        "If the execution checkout cannot be proven, stop immediately and give recovery guidance.",
        "Do not create, edit, stage, or commit any files in that case.",
      ].join("\n"),
    }, 120_000);

    const content = response?.data?.content ?? "";
    assert.match(
      content,
      /git worktree list|reopen the execution checkout|re-?initialize/i,
      `Expected recovery guidance in response.\nResponse: ${content.slice(0, 500)}`,
    );

    const callerAfter = await captureCheckoutSnapshot(checkouts.caller);
    assert.deepStrictEqual(callerAfter, callerBefore, "caller checkout should remain unchanged");

    assertToolCalls(ctx.toolLog, {
      forbidden: ["create", "edit"],
      bashMustNotInclude: [/git checkout/, /git switch/, /git add/, /git commit/, /git push/],
    });
  });
});
