/**
 * PAW v2 behavioural suite: one autonomous run, many invariants.
 *
 * A plain host agent (no PAW custom agent) loads the workflow skill through the
 * runtime's skill system and takes a scoped task to a final pull request. The run
 * happens once; each test asserts one invariant from
 * docs/specification/v2/invariants.md against the recorded trace, TODO graph,
 * git state and artifacts.
 *
 * Skipped unless PAW_TEST_V2=1: the v2 workflow skill does not exist yet, and a
 * run costs several minutes of model time. Run with `npm run test:v2`.
 *
 * Requires a Copilot CLI with multi-turn subagents; set PAW_TEST_CLI_PATH to the
 * installed CLI's index.js (the SDK's bundled CLI is too old).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { readdir } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { getRepoRoot } from "../../lib/skills.js";
import type { TodoGraph } from "../../lib/todos.js";
import {
  COMMIT_TRAILER,
  HOST_INSTRUCTIONS,
  OTHER_WORK_ID,
  RUN_TIMEOUT,
  SOURCE_EDIT_TOOLS,
  TASK_DESCRIPTION,
  allBash as allBashFor,
  runV2Task,
} from "../../lib/v2-run.js";
import { BROAD_STAGING, REWRITE_COMMAND, gitCmd } from "../../lib/shell-match.js";

const ENABLED = process.env.PAW_TEST_V2 === "1";

const WORKFLOW_SKILL = "paw-workflow";

const TASK = [
  `Use the ${WORKFLOW_SKILL} skill to take this task through to a final pull request.`,
  "",
  "Configuration: plan review single-model, final review single-model, no plan checkpoint, everything else default.",
  "",
  TASK_DESCRIPTION,
].join("\n");

function argText(args: Record<string, unknown>): string {
  return JSON.stringify(args);
}

describe("PAW v2: autonomous default run", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let baseHead: string;
  let runError: unknown;

  before(async () => {
    ({ ctx, todos, baseHead, runError } = await runV2Task({
      label: "v2",
      systemPrompt: HOST_INSTRUCTIONS,
      skillDirectories: [join(getRepoRoot(), "skills")],
      task: TASK,
    }));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  const git = () => simpleGit(ctx.fixture.workDir);
  const allBash = () => allBashFor(ctx);

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("host loads the workflow skill through the runtime, without the PAW agent", () => {
    assert.ok(
      ctx.events.skillsInvoked().includes(WORKFLOW_SKILL),
      `Expected skill.invoked for ${WORKFLOW_SKILL}; saw ${JSON.stringify(ctx.events.skillsInvoked())}`,
    );
  });

  it("W8/autonomy: asks the user no questions", () => {
    assert.strictEqual(ctx.answerer.log.length, 0, `Host asked the user: ${JSON.stringify(ctx.answerer.log)}`);
    // user.message events are not counted: the runtime also emits one for each
    // background-subagent completion notice. The test itself sends a single prompt.
  });

  it("W1: the TODO graph contains every configured activity", () => {
    for (const pattern of [/\bplan\b/i, /plan[-\s_]?review/i, /implement/i, /final[-\s_]?review/i, /final[-\s_]?pr|pull request/i]) {
      assert.ok(todos.find(pattern), `No TODO node matching ${pattern}\n${todos.describe()}`);
    }
  });

  it("W2: the final PR is blocked by final review, which is blocked by implementation", () => {
    const pr = todos.find(/final[-\s_]?pr|pull request/i);
    const review = todos.find(/final[-\s_]?review/i);
    const implement = todos.find(/implement/i);
    assert.ok(pr && review && implement, `Missing nodes\n${todos.describe()}`);
    assert.ok(todos.isBlockedBy(pr, review), "final PR must depend on final review");
    assert.ok(todos.isBlockedBy(review, implement), "final review must depend on implementation");
  });

  it("W3: no required TODO is left open, and reviews left evidence", async () => {
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], "Open TODOs remain at end of run");
    const workRoot = join(ctx.fixture.workDir, ".paw/work");
    const workIds = (await readdir(workRoot)).filter((d) => d !== OTHER_WORK_ID);
    assert.strictEqual(workIds.length, 1, `Expected one new work directory, got ${JSON.stringify(workIds)}`);
    const reviews = await readdir(join(workRoot, workIds[0], "reviews")).catch(() => [] as string[]);
    assert.ok(reviews.some((f) => /^REVIEW.*\.md$/.test(f)), `No final review output in reviews/: ${JSON.stringify(reviews)}`);
  });

  it("context isolation: the host does not edit source files itself", () => {
    const hostEdits = ctx.events
      .hostToolStarts()
      .filter((t) => SOURCE_EDIT_TOOLS.has(t.toolName))
      .map((t) => String(t.arguments.path ?? ""))
      .filter((p) => /\/(src|tests)\//.test(p));
    assert.deepStrictEqual(hostEdits, [], "Implementation edits must happen in subagents");
    // Shell writes count too: redirects, tee, in-place sed and patch into src/ or tests/.
    const hostShellWrites = allBash()
      .filter((c) => !c.fromSubagent)
      .map((c) => c.command)
      .filter((cmd) => /(>{1,2}|\btee\b(\s+-a)?)\s*["']?(\.\/)?(src|tests)\//.test(cmd) || /\b(sed\s+-i|patch\b|git\s+apply\b)[^\n]*(src|tests)\//.test(cmd));
    assert.deepStrictEqual(hostShellWrites, [], "Host must not write source files through the shell");
    assert.ok(ctx.events.subagentsStarted().length >= 2, "Expected planning and implementation subagents");
  });

  it("D1: no subagent loads the workflow skill", () => {
    const loads = ctx.events
      .subagentToolStarts()
      .filter((t) => t.toolName === "skill" && argText(t.arguments).includes(WORKFLOW_SKILL));
    assert.strictEqual(loads.length, 0, "A subagent loaded the workflow skill");
  });

  it("D5: subagents never push, open PRs or change artifact tracking", () => {
    const bad = allBash().filter(
      (c) => c.fromSubagent && (gitCmd("push\\b").test(c.command) || /\bgh"?\s+pr\s+create\b/.test(c.command) || gitCmd("rm\\b[^\\n]*\\.paw").test(c.command)),
    );
    assert.deepStrictEqual(bad.map((c) => c.command), []);
  });

  it("G1: staging is always selective", () => {
    const bad = allBash().filter((c) => BROAD_STAGING.test(c.command));
    assert.deepStrictEqual(bad.map((c) => c.command), []);
  });

  it("G12: commits are never rewritten", () => {
    const bad = allBash().filter((c) => REWRITE_COMMAND.test(c.command));
    assert.deepStrictEqual(bad.map((c) => c.command.slice(0, 200)), []);
  });

  it("G2: the user's uncommitted change is neither committed nor reverted", async () => {
    const status = (await git().raw(["status", "--short", "README.md"])).trim();
    assert.match(status, /^\s?M\s+README\.md$/, `README.md should still be modified and unstaged, got "${status}"`);
    const committed = (await git().raw(["log", "--format=%H", `${baseHead}..HEAD`, "--", "README.md"])).trim();
    assert.strictEqual(committed, "", "README.md must not appear in any workflow commit");
  });

  it("G3: other work directories are untouched", async () => {
    const tracked = (await git().raw(["ls-files", `.paw/work/${OTHER_WORK_ID}`])).trim();
    assert.strictEqual(tracked, `.paw/work/${OTHER_WORK_ID}/ImplementationPlan.md`);
    const unscoped = allBash().filter((c) => gitCmd("rm\\b").test(c.command) && !/\.paw\/work\/[\w.-]+/.test(c.command));
    assert.deepStrictEqual(unscoped.map((c) => c.command), [], "git rm must be scoped to one work directory");
  });

  it("G4/G9: the host opens exactly one PR, after the final review", async () => {
    const calls = ctx.events.toolStarts();
    const prIdx = calls.map((t, i) => ({ t, i })).filter(({ t }) => t.toolName === "bash" && /\bgh"?\s+pr\s+create\b(?!\s+--help)/.test(String(t.arguments.command ?? "")));
    assert.strictEqual(prIdx.length, 1, `Expected one gh pr create, saw ${prIdx.length}`);
    assert.ok(!prIdx[0].t.parentToolCallId, "PR must be created by the host");
    const reviewWrite = calls.findIndex((t) => /reviews\/REVIEW/.test(argText(t.arguments)));
    assert.ok(reviewWrite >= 0 && reviewWrite < prIdx[0].i, "Final review output must exist before PR creation");
    const created = (await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create"));
    assert.strictEqual(created.length, 1, "The stub gh should record exactly one pr create");
  });

  it("host instructions stay effective: every workflow commit carries the project trailer", async () => {
    const log = (await git().raw(["log", "--format=%H%x00%B%x01", `${baseHead}..HEAD`])).split("\x01").map((s) => s.trim()).filter(Boolean);
    assert.ok(log.length > 0, "Expected workflow commits");
    // The Copilot runtime itself appends a `Co-authored-by: Copilot` trailer, so the project
    // trailer is checked as a line of the trailer block rather than as the last line.
    const missing = log
      .filter((entry) => !entry.split("\x00")[1].split("\n").some((line) => line.trim() === COMMIT_TRAILER))
      .map((e) => e.slice(0, 8));
    assert.deepStrictEqual(missing, [], "Commits missing the project trailer");
  });

  it("G5: artifacts are not tracked on the pushed branch (commit-and-clean)", async () => {
    const branch = (await git().branch()).current;
    const remoteFiles = (await git().raw(["ls-tree", "-r", "--name-only", `origin/${branch}`])).split("\n");
    const leaked = remoteFiles.filter((f) => f.startsWith(".paw/work/") && !f.startsWith(`.paw/work/${OTHER_WORK_ID}/`));
    assert.deepStrictEqual(leaked, [], "Workflow artifacts must be untracked before the PR");
    assert.ok(remoteFiles.includes("src/app.ts"), "The pushed branch should contain the implementation");
  });

  it("the feature is implemented and its tests pass", () => {
    execSync("npm run build --silent --if-present && npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    const app = execSync("cat src/app.ts", { cwd: ctx.fixture.workDir }).toString();
    assert.match(app, /stats/i);
  });
});
