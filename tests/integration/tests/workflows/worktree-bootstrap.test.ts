import { after, describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { assertArtifactExists, assertToolCalls } from "../../lib/assertions.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { createCallerAndExecution } from "../../lib/multi-checkout.js";
import { ToolPolicy } from "../../lib/tool-policy.js";

const LIVE_MODEL = process.env.PAW_TEST_LIVE_MODEL ?? "claude-sonnet-4.6";
const LIVE_TURN_TIMEOUT = 180_000;

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
    "- Read WorkflowContext.md from the execution checkout before any git mutation",
    `- Treat ${targetBranch} as the required target branch for this work item`,
    "- In current-checkout mode, the current working directory is the execution checkout",
    "- In worktree mode, operate only in the proven execution checkout and never mutate the caller checkout",
    "- In worktree mode, the current working directory may differ from the execution checkout. Prove the execution checkout before any git mutation; if no execution checkout can be proven, STOP and give recovery guidance mentioning `git worktree list`, locating or reopening the execution checkout, or re-initializing",
    "- Create only the files requested by the user prompt",
    "- Stage only the requested files and commit locally when asked",
    "- Do not create or update session workspace files such as plan.md",
    "- Do not run tests, builds, lint, or cleanup commands unless the user explicitly asks for them",
    "- Once the requested files are committed, stop and report the branch used",
    "- Never push or create PRs",
    "- Do not invoke the skill tool or use SQL",
    "- Do NOT ask the user questions",
  ].join("\n");
}

describe("worktree execution bootstrap behavior", { timeout: 240_000 }, () => {
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
      model: LIVE_MODEL,
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
        "6. Do not run tests, builds, lint, cleanup commands, or create session workspace files.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    assert.strictEqual(ctx.workingDirectory, checkouts.execution.path);
    await assertArtifactExists(checkouts.execution.path, workId, "Spec.md");

    const executionFile = await checkouts.execution.read("src/worktree-proof.ts");
    assert.match(executionFile, /worktreeProof/, "execution checkout should contain the proof file");
    assert.strictEqual(await checkouts.caller.exists(`.paw/work/${workId}/Spec.md`), false);
    assert.strictEqual(await checkouts.caller.exists("src/worktree-proof.ts"), false);

    const callerAfter = await captureCheckoutSnapshot(checkouts.caller);
    assert.deepStrictEqual(callerAfter, callerBefore, "caller checkout should remain unchanged");

    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/, /\bnpm test\b/, /\bnpm run build\b/, /\brm -rf dist\b/],
    });
  });

  it("can operate on a proven execution checkout from outside its directory", async () => {
    const workId = "test-worktree-outside-cwd";
    const targetBranch = "feature/test-worktree-outside-cwd";
    const checkouts = await createCallerAndExecution("minimal-ts", workId, targetBranch);
    const callerBefore = await captureCheckoutSnapshot(checkouts.caller);

    await seedWorkflowContext(checkouts.execution.path, workId, targetBranch, "worktree");

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixture: checkouts.fixture,
      skillOrAgent: "worktree-bootstrap-outside-cwd",
      systemPrompt: buildExecutionPrompt(workId, targetBranch),
      answerer,
      model: LIVE_MODEL,
      excludedTools: ["skill", "sql"],
      toolPolicy: new ToolPolicy(checkouts.caller.path, [checkouts.execution.path]),
    });
    contexts.push(ctx);

    await ctx.session.sendAndWait({
      prompt: [
        `1. Use \`git worktree list\` and the known execution checkout path ${checkouts.execution.path} to prove which checkout is bound to work item ${workId}.`,
        `2. Read ${checkouts.execution.path}/.paw/work/${workId}/WorkflowContext.md and confirm the target branch is ${targetBranch}.`,
        `3. Create ${checkouts.execution.path}/.paw/work/${workId}/Spec.md with a heading and one overview paragraph.`,
        `4. Create ${checkouts.execution.path}/src/worktree-outside-cwd-proof.ts containing \`export const worktreeOutsideCwdProof = true;\``,
        `5. Stage only those two files from ${checkouts.execution.path}, commit them locally with message 'Add out-of-checkout worktree proof', and report the branch you used.`,
        `6. Do not edit, stage, or commit anything in ${checkouts.caller.path}.`,
        "7. Do not run tests, builds, lint, cleanup commands, or create session workspace files.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    assert.strictEqual(ctx.workingDirectory, checkouts.caller.path);
    await assertArtifactExists(checkouts.execution.path, workId, "Spec.md");

    const executionFile = await checkouts.execution.read("src/worktree-outside-cwd-proof.ts");
    assert.match(executionFile, /worktreeOutsideCwdProof/, "execution checkout should contain the proof file");
    assert.strictEqual(await checkouts.caller.exists(`.paw/work/${workId}/Spec.md`), false);
    assert.strictEqual(await checkouts.caller.exists("src/worktree-outside-cwd-proof.ts"), false);

    const callerAfter = await captureCheckoutSnapshot(checkouts.caller);
    assert.deepStrictEqual(callerAfter, callerBefore, "caller checkout should remain unchanged");

    assertToolCalls(ctx.toolLog, {
      bashMustInclude: [/git worktree list/],
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/, /\bnpm test\b/, /\bnpm run build\b/, /\brm -rf dist\b/],
    });
  });

  it("fails fast with recovery guidance when no execution checkout can be proven", async () => {
    const workId = "test-worktree-wrong-checkout";
    const targetBranch = "feature/test-worktree-wrong-checkout";
    const checkouts = await createCallerAndExecution("minimal-ts", workId, targetBranch);
    const alternateBranch = `${targetBranch}-alternate`;

    await seedWorkflowContext(checkouts.caller.path, workId, targetBranch, "worktree");
    await checkouts.execution.git.raw(["switch", "-c", alternateBranch]);
    const callerBefore = await captureCheckoutSnapshot(checkouts.caller);
    const executionBefore = await captureCheckoutSnapshot(checkouts.execution);

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixture: checkouts.fixture,
      skillOrAgent: "worktree-bootstrap-wrong-checkout",
      systemPrompt: buildExecutionPrompt(workId, targetBranch),
      answerer,
      model: LIVE_MODEL,
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Read .paw/work/${workId}/WorkflowContext.md and determine whether a dedicated execution checkout for ${targetBranch} can be proven from this session.`,
        "If no execution checkout can be proven, stop immediately and give recovery guidance.",
        "Do not create, edit, stage, or commit any files in that case.",
        "Do not run tests, builds, lint, cleanup commands, or create session workspace files.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    const content = response?.data?.content ?? "";
    assert.match(
      content,
      /git worktree list|locate the execution checkout|reopen the execution checkout|re-?initialize/i,
      `Expected recovery guidance in response.\nResponse: ${content.slice(0, 500)}`,
    );

    const callerAfter = await captureCheckoutSnapshot(checkouts.caller);
    assert.deepStrictEqual(callerAfter, callerBefore, "caller checkout should remain unchanged");
    const executionAfter = await captureCheckoutSnapshot(checkouts.execution);
    assert.deepStrictEqual(executionAfter, executionBefore, "execution checkout should remain unchanged when proof fails");

    assertToolCalls(ctx.toolLog, {
      forbidden: ["create", "edit"],
      bashMustNotInclude: [/git checkout/, /git switch/, /git add/, /git commit/, /git push/],
    });
  });
});
