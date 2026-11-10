/**
 * PAW v2 scenario: `execution_mode: worktree` (G8).
 *
 * One autonomous run started from the caller checkout, which has an uncommitted
 * user change. All work happens in a separate worktree on the target branch; the
 * caller checkout keeps its branch, HEAD and working tree exactly as they were.
 *
 * File tools may write anywhere under the fixture's temp workspace (the worktree
 * goes next to the caller checkout); git state is what the assertions check.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { appendFile, readdir } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { readTodoGraph, type TodoGraph } from "../../lib/todos.js";
import { ENABLED, REWRITE_COMMAND, RUN_TIMEOUT, bashCalls, logRun, prCreates, startScenario } from "../../lib/v2-scenarios.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  "Configuration: execution mode worktree, plan review off, final review single-model; everything else default.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

interface Worktree {
  path: string;
  branch: string;
}

describe("PAW v2: worktree execution mode", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let baseHead: string;
  let callerBranch: string;
  let callerStatus: string;
  let todos: TodoGraph;
  let runError: unknown;
  let worktrees: Worktree[] = [];

  before(async () => {
    ({ ctx, baseHead } = await startScenario({
      name: "v2-worktree",
      hostInstructions: HOST_INSTRUCTIONS,
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false),
      prepare: async (fixture) => {
        await appendFile(join(fixture.workDir, "README.md"), "\nUser note: do not commit this line.\n");
      },
      writableRoots: (fixture) => [fixture.workspaceDir],
    }));
    const caller = simpleGit(ctx.fixture.workDir);
    callerBranch = (await caller.branch()).current;
    callerStatus = (await caller.raw(["status", "--porcelain", "--untracked-files=normal"])).trim();
    try {
      await ctx.session.sendAndWait({ prompt: TASK }, RUN_TIMEOUT);
    } catch (err) {
      runError = err;
    }
    todos = readTodoGraph(ctx.session.sessionId);
    logRun(ctx, todos);
    const list = await caller.raw(["worktree", "list", "--porcelain"]);
    worktrees = list
      .split("\n\n")
      .map((block) => ({
        path: /^worktree (.+)$/m.exec(block)?.[1] ?? "",
        branch: (/^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? "").trim(),
      }))
      .filter((w) => w.path && w.branch && w.branch !== callerBranch);
    console.log("[v2] worktrees:", JSON.stringify(worktrees));
    const wt = worktrees[0];
    if (wt) {
      console.log("[v2] worktree commits:\n" + (await simpleGit(wt.path).raw(["log", "--format=%h %s", `${baseHead}..HEAD`])));
    }
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
    // TestFixture.cleanup removes the temp workspace, worktree included.
  });

  const caller = () => simpleGit(ctx.fixture.workDir);

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("G8: the caller checkout keeps its branch, HEAD and working tree", async () => {
    assert.strictEqual((await caller().branch()).current, callerBranch);
    assert.strictEqual((await caller().raw(["rev-parse", "HEAD"])).trim(), baseHead);
    const status = (await caller().raw(["status", "--porcelain", "--untracked-files=normal"])).trim();
    assert.strictEqual(status, callerStatus, "The caller checkout's working tree changed");
    const paw = await readdir(join(ctx.fixture.workDir, ".paw")).catch(() => [] as string[]);
    assert.deepStrictEqual(paw, [], "Workflow files were written into the caller checkout");
  });

  it("G8: one worktree on the target branch holds the work, outside the caller checkout", async () => {
    assert.strictEqual(worktrees.length, 1, `Expected one extra worktree, got ${JSON.stringify(worktrees)}`);
    const wt = worktrees[0];
    assert.ok(!wt.path.startsWith(ctx.fixture.workDir + "/"), "The worktree is inside the caller checkout");
    const commits = (await simpleGit(wt.path).raw(["log", "--format=%h %s", `${baseHead}..HEAD`])).trim();
    assert.ok(commits, "No commits in the worktree");
    const readme = (await simpleGit(wt.path).raw(["log", "--format=%h", `${baseHead}..HEAD`, "--", "README.md"])).trim();
    assert.strictEqual(readme, "", "The caller's README change leaked into a workflow commit");
    execSync("npm install --silent && npm test --silent", { cwd: wt.path, stdio: "pipe" });
  });

  it("G7/G8: the caller's branch did not move and the PR comes from the worktree's branch", async () => {
    const wt = worktrees[0];
    assert.ok(wt, "No worktree");
    assert.strictEqual((await caller().raw(["rev-parse", callerBranch])).trim(), baseHead);
    const pushed = (await caller().raw(["ls-remote", "--heads", "origin", wt.branch])).trim();
    assert.ok(pushed, `Target branch ${wt.branch} was not pushed`);
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
  });

  it("G12: no command rewrote history", () => {
    const bad = bashCalls(ctx).filter((c) => REWRITE_COMMAND.test(c.command));
    assert.deepStrictEqual(bad.map((c) => c.command.slice(0, 200)), []);
  });

  it("no todo is left open", () => {
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });
});
