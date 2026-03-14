import { after, describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { assertToolCalls } from "../../lib/assertions.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { createCallerAndExecution } from "../../lib/multi-checkout.js";
import { loadSkill } from "../../lib/skills.js";
import { ToolPolicy } from "../../lib/tool-policy.js";

const LIVE_MODEL = process.env.PAW_TEST_LIVE_MODEL ?? "claude-sonnet-4.6";
const LIVE_TURN_TIMEOUT = 180_000;

type CheckoutSnapshot = {
  branch: string;
  head: string;
  status: string;
};

class PushToOriginPolicy extends ToolPolicy {
  override check(call: { toolName: string; input: unknown }) {
    const input = typeof call.input === "string"
      ? (() => {
        try {
          return JSON.parse(call.input) as Record<string, unknown>;
        } catch {
          return {};
        }
      })()
      : ((call.input as Record<string, unknown> | null) ?? {});

    const command = String(input.command ?? "");
    if (call.toolName === "bash" && /\bgit\s+push\b/i.test(command)) {
      if (/\bgh\s+(pr|issue)\s+create\b/i.test(command)) {
        return { action: "deny" as const, reason: "GitHub CLI writes disabled in tests" };
      }
      if (!/\bgit\s+push(?:\s+-u)?\s+origin\b/i.test(command)) {
        return { action: "deny" as const, reason: "Only pushes to origin are allowed in this test" };
      }
      return { action: "allow" as const };
    }
    return super.check(call);
  }
}

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
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Worktree PR Strategy Test",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: ${targetBranch}`,
    "Execution Mode: worktree",
    "Repository Identity: lossyrob/phased-agent-workflow:test-root",
    `Execution Binding: worktree:${workId}:${targetBranch}`,
    "Workflow Mode: full",
    "Review Strategy: prs",
    "Review Policy: final-pr-only",
    "Session Policy: continuous",
    "Final Agent Review: enabled",
    "Remote: origin",
    "Artifact Paths: auto-derived",
    "",
  ].join("\n"));
}

async function setupLocalOrigin(checkouts: Awaited<ReturnType<typeof createCallerAndExecution>>, targetBranch: string): Promise<void> {
  const originPath = join(checkouts.fixture.workspaceDir, "origin.git");
  await simpleGit().raw(["init", "--bare", originPath]);
  await checkouts.caller.git.addRemote("origin", originPath);
  await checkouts.caller.git.push(["-u", "origin", "main"]);
  await checkouts.execution.git.push(["-u", "origin", targetBranch]);
}

function buildPrompt(skillContent: string, workId: string, targetBranch: string): string {
  return [
    "You are a focused worktree PR-strategy git test agent.",
    "",
    "CRITICAL RULES:",
    `- Read .paw/work/${workId}/WorkflowContext.md before any git mutation`,
    `- Treat ${targetBranch} as the execution checkout target branch`,
    "- Operate only in the current execution checkout and never mutate the caller checkout",
    "- Follow the PRs branch naming mechanics from the git operations skill",
    "- For each review branch, start from the target branch before branching off",
    "- Create only the requested branch-specific artifacts",
    "- Stage only the requested files for each commit",
    "- Push the created branches to origin, but do NOT run gh pr create",
    "- Do not create or update session workspace files such as plan.md",
    "- Do not run tests, builds, lint, or cleanup commands unless explicitly asked",
    "- Stop after the requested branches are prepared and report the branch names",
    "- Do NOT ask the user questions",
    "",
    "Git operations skill reference:",
    skillContent,
  ].join("\n");
}

describe("worktree PR strategy branch behavior", { timeout: 240_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  it("creates and pushes planning, phase, and docs branches from the execution checkout only", async () => {
    const gitOpsSkill = await loadSkill("paw-git-operations");
    const workId = "test-worktree-pr-strategy";
    const targetBranch = "feature/test-worktree-pr-strategy";
    const planBranch = `${targetBranch}_plan`;
    const phaseBranch = `${targetBranch}_phase1`;
    const docsBranch = `${targetBranch}_docs`;
    const checkouts = await createCallerAndExecution("minimal-ts", workId, targetBranch);

    await setupLocalOrigin(checkouts, targetBranch);
    await seedWorkflowContext(checkouts.execution.path, workId, targetBranch);
    const callerBefore = await captureCheckoutSnapshot(checkouts.caller);

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixture: checkouts.fixture,
      executionPath: checkouts.execution.path,
      skillOrAgent: "worktree-pr-strategy",
      systemPrompt: buildPrompt(gitOpsSkill, workId, targetBranch),
      answerer,
      model: LIVE_MODEL,
      toolPolicy: new PushToOriginPolicy(checkouts.execution.path, [checkouts.fixture.workDir]),
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    await ctx.session.sendAndWait({
      prompt: [
        `1. Read .paw/work/${workId}/WorkflowContext.md and confirm you are operating from the execution checkout for ${targetBranch}.`,
        `2. Create planning branch ${planBranch} from ${targetBranch}, add .paw/work/${workId}/ImplementationPlan.md with a heading and one sentence, commit only that file with message 'Add planning artifact', and push the branch to origin.`,
        `3. Return to ${targetBranch}, create phase branch ${phaseBranch}, add src/worktree-pr-proof.ts containing \`export const worktreePrProof = true;\`, commit only that file with message 'Add worktree PR phase proof', and push the branch to origin.`,
        `4. Return to ${targetBranch}, create docs branch ${docsBranch}, add .paw/work/${workId}/Docs.md with a heading and one sentence, commit only that file with message 'Add worktree docs artifact', and push the branch to origin.`,
        "5. Do not run gh pr create, tests, builds, lint, cleanup commands, or create session workspace files.",
        "6. Report the branches you prepared and the branch you ended on.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    const callerAfter = await captureCheckoutSnapshot(checkouts.caller);
    assert.deepStrictEqual(callerAfter, callerBefore, "caller checkout should remain unchanged");

    assert.strictEqual(await checkouts.caller.exists(`.paw/work/${workId}/ImplementationPlan.md`), false);
    assert.strictEqual(await checkouts.caller.exists(`.paw/work/${workId}/Docs.md`), false);
    assert.strictEqual(await checkouts.caller.exists("src/worktree-pr-proof.ts"), false);

    const remoteHeads = await checkouts.execution.git.raw(["ls-remote", "--heads", "origin"]);
    assert.match(remoteHeads, new RegExp(`refs/heads/${planBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(remoteHeads, new RegExp(`refs/heads/${phaseBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(remoteHeads, new RegExp(`refs/heads/${docsBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

    const planContent = await checkouts.execution.git.raw(["show", `${planBranch}:.paw/work/${workId}/ImplementationPlan.md`]);
    assert.match(planContent, /implementation plan|plan/i, "planning branch should contain ImplementationPlan artifact");

    const phaseContent = await checkouts.execution.git.raw(["show", `${phaseBranch}:src/worktree-pr-proof.ts`]);
    assert.match(phaseContent, /worktreePrProof/, "phase branch should contain proof source file");

    const docsContent = await checkouts.execution.git.raw(["show", `${docsBranch}:.paw/work/${workId}/Docs.md`]);
    assert.match(docsContent, /docs/i, "docs branch should contain Docs artifact");

    assertToolCalls(ctx.toolLog, {
      bashMustInclude: [
        new RegExp(`git push(?: -u)? origin ${planBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
        new RegExp(`git push(?: -u)? origin ${phaseBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
        new RegExp(`git push(?: -u)? origin ${docsBranch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      ],
      bashMustNotInclude: [/gh\s+pr\s+create/, /\bnpm test\b/, /\bnpm run build\b/, /\brm -rf dist\b/],
    });
  });
});
