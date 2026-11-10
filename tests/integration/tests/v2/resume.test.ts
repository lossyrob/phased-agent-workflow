/**
 * PAW v2 scenario: resume an in-progress work item in a new session (reconstruction, G7).
 *
 * The repository holds work item `request-stats` on branch `feature/request-stats`:
 * a committed two-unit plan and a committed Unit 1. The user's checkout is on the
 * base branch with an uncommitted README change, and an unrelated work item is
 * tracked on the base branch. A fresh session is asked to continue the work item.
 *
 * The host must rebuild the todo graph from the artifacts and git, switch to the
 * target branch before committing, implement only Unit 2, and finish with one PR,
 * without re-planning or touching Unit 1, the base branch or the other work item.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { appendFile, readFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { readTodoGraph, type TodoGraph } from "../../lib/todos.js";
import {
  ENABLED,
  IMPLEMENT_ACTIVITY,
  REWRITE_COMMAND,
  RUN_TIMEOUT,
  bashCalls,
  hostTasks,
  logRun,
  prCreates,
  startScenario,
  taskHeads,
  todo,
} from "../../lib/v2-scenarios.js";
import {
  SEED_OTHER_WORK_ID,
  SEED_PLAN_PATH,
  SEED_TARGET,
  SEED_WORK_ID,
  isAncestor,
  probeApp,
  seedInProgressWork,
  type SeededWork,
} from "../../lib/v2-seed.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = `Use the paw-workflow skill to continue the PAW work item \`${SEED_WORK_ID}\` through to the final pull request.`;

describe("PAW v2: resume an in-progress work item", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let seed: SeededWork;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    ({ ctx } = await startScenario({
      name: "v2-resume",
      hostInstructions: HOST_INSTRUCTIONS,
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false),
      prepare: async (fixture) => {
        seed = await seedInProgressWork(fixture, "base");
        await appendFile(join(fixture.workDir, "README.md"), "\nUser note: do not commit this line.\n");
      },
    }));
    try {
      await ctx.session.sendAndWait({ prompt: TASK }, RUN_TIMEOUT);
    } catch (err) {
      runError = err;
    }
    todos = readTodoGraph(ctx.session.sessionId);
    logRun(ctx, todos);
    const log = await simpleGit(ctx.fixture.workDir).raw(["log", "--all", "--format=%h %D | %s", `^${seed.baseHead}`]).catch(() => "");
    console.log("[v2] commits since base:\n" + log);
    console.log("[v2] host tasks:\n" + taskHeads(ctx));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  const git = () => simpleGit(ctx.fixture.workDir);

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("does not re-plan: no plan subagent, and the plan on disk is the seeded plan", async () => {
    assert.deepStrictEqual(hostTasks(ctx, /^Activity:\s*plan\b/im).map((t) => t.prompt.slice(0, 120)), []);
    const plan = await readFile(join(ctx.fixture.workDir, SEED_PLAN_PATH), "utf-8");
    assert.strictEqual(plan, seed.planText);
    const planCommits = (await git().raw(["log", "--format=%h %s", `${seed.seedHead}..${SEED_TARGET}`, "--", SEED_PLAN_PATH])).trim();
    // The stop-tracking commit removes the plan from the index; nothing else may touch it.
    const edits = planCommits.split("\n").filter((l) => l && !/stop tracking/i.test(l));
    assert.deepStrictEqual(edits, [], "Commits after the seed changed the plan");
  });

  it("does not redo Unit 1: no commit after the seed touches Unit 1's files", async () => {
    assert.ok(hostTasks(ctx, IMPLEMENT_ACTIVITY).length >= 1, `No implement subagent for Unit 2:\n${taskHeads(ctx)}`);
    const touched = (await git().raw(["log", "--format=%h %s", `${seed.seedHead}..${SEED_TARGET}`, "--", "src/requestCounter.ts", "tests/requestCounter.test.js"])).trim();
    assert.strictEqual(touched, "", "Unit 1 files were changed after the seed");
  });

  it("reconstruction: the graph has both units, plan and setup closed from evidence, and nothing open", () => {
    const units = todos.nodes.filter((n) => /^implement[:-]/.test(n.id));
    assert.ok(units.length >= 2, `Expected an implement todo per plan unit\n${todos.describe()}`);
    for (const [id, re] of [["setup", /^setup$/], ["plan", /^plan$/], ["final-review", /final[-\s_]?review/i], ["final-pr", /final[-\s_]?pr/i]] as const) {
      assert.ok(todo(todos, id, re), `Missing ${id}\n${todos.describe()}`);
    }
    const pr = todo(todos, "final-pr", /final[-\s_]?pr/i)!;
    const review = todo(todos, "final-review", /final[-\s_]?review/i)!;
    assert.ok(todos.isBlockedBy(pr, review), `final-pr must depend on final-review\n${todos.describe()}`);
    for (const u of units) {
      assert.ok(todos.isBlockedBy(review, u), `final-review must depend on ${u.id}\n${todos.describe()}`);
    }
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("G7: every new commit is on the target branch; the base branch is unchanged", async () => {
    assert.strictEqual((await git().raw(["rev-parse", seed.baseBranch])).trim(), seed.baseHead, "Base branch moved");
    assert.ok(await isAncestor(ctx.fixture.workDir, seed.seedHead, SEED_TARGET), "Seeded commits are no longer on the target branch");
    const added = (await git().raw(["log", "--format=%h", `${seed.seedHead}..${SEED_TARGET}`])).trim();
    assert.ok(added, "No new commits on the target branch");
    const elsewhere = (await git().raw(["log", "--all", "--format=%h %D %s", `^${SEED_TARGET}`, `^${seed.baseHead}`])).trim();
    assert.strictEqual(elsewhere, "", "Commits exist outside the target branch");
  });

  it("G12: seeded history is intact and no command rewrote history", async () => {
    assert.ok(await isAncestor(ctx.fixture.workDir, seed.unit1Commit, SEED_TARGET));
    const bad = bashCalls(ctx).filter((c) => REWRITE_COMMAND.test(c.command));
    assert.deepStrictEqual(bad.map((c) => c.command.slice(0, 200)), []);
  });

  it("G2: the user's uncommitted README change is still uncommitted", async () => {
    const status = (await git().raw(["status", "--short", "README.md"])).trim();
    assert.match(status, /^\s?M\s+README\.md$/, `README.md should still be modified and unstaged, got "${status}"`);
    const committed = (await git().raw(["log", "--all", "--format=%h", `^${seed.baseHead}`, "--", "README.md"])).trim();
    assert.strictEqual(committed, "", "README.md must not appear in any commit");
  });

  it("G3: the other work item is still tracked and unchanged", async () => {
    const path = `.paw/work/${SEED_OTHER_WORK_ID}/ImplementationPlan.md`;
    assert.strictEqual((await git().raw(["ls-files", path])).trim(), path);
    const changed = (await git().raw(["log", "--all", "--format=%h", `^${seed.baseHead}`, "--", `.paw/work/${SEED_OTHER_WORK_ID}`])).trim();
    assert.strictEqual(changed, "", "A commit touched the other work item");
  });

  it("G5: the pushed target branch carries no artifacts of this work item", async () => {
    const files = (await git().raw(["ls-tree", "-r", "--name-only", `origin/${SEED_TARGET}`])).split("\n");
    assert.deepStrictEqual(files.filter((f) => f.startsWith(`.paw/work/${SEED_WORK_ID}/`)), []);
    assert.ok(files.includes("src/requestCounter.ts"), "Pushed branch lacks Unit 1");
  });

  it("Unit 2 works: GET /stats returns the count and the tests pass", async () => {
    execSync("npm run build --silent --if-present && npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    const [, , stats] = (await probeApp(ctx.fixture.workDir, ["/", "/", "/stats"])) as Array<Record<string, unknown>>;
    assert.ok(typeof stats?.requestCount === "number" && stats.requestCount >= 2, `GET /stats returned ${JSON.stringify(stats)}`);
  });

  it("one PR, opened by the host from the target branch", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });
});
