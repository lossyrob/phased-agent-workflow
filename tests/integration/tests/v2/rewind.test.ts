/**
 * PAW v2 scenario: rewind to the plan after a unit is implemented (G11, G12).
 *
 * The repository holds work item `request-stats` on its target branch (checked
 * out): a committed two-unit plan and a committed Unit 1 (`src/requestCounter.ts`).
 * A fresh session is asked to continue, but first to go back to the plan with a
 * change that alters Unit 1: the counter moves to `src/metrics.ts` and GET /stats
 * itself is not counted.
 *
 * The host must preview the rewind and get confirmation before changing anything
 * (G11), revise the plan through a plan subagent, redo Unit 1 with new commits on
 * top of the seeded ones (G12), implement Unit 2, and open one PR.
 *
 * The user is reached through ask_user if the host uses it; if the host pauses by
 * ending its turn, the test sends the confirmation as a follow-up prompt.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { access, readFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import type { Answerer, AnswerResult, UserInputRequest } from "../../lib/answerer.js";
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
  sqlQueries,
  startScenario,
  taskHeads,
  todo,
} from "../../lib/v2-scenarios.js";
import {
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
  "- Work autonomously. Do not ask the user questions unless you are blocked or the workflow requires a confirmation.",
].join("\n");

const TASK = [
  `Use the paw-workflow skill to continue the PAW work item \`${SEED_WORK_ID}\` through to the final pull request.`,
  "",
  "Before continuing, go back to the plan. Two changes: requests to GET /stats itself must not be counted, and the",
  "counter must live in `src/metrics.ts` instead of `src/requestCounter.ts`. Unit 1 is already implemented; it has to change.",
].join("\n");

/** A plan subagent, including one the host labels as a revision ("Activity: plan (revision)"). */
const PLAN_TASK = /^Activity:\s*plan\b/im;

const CONFIRM = "Yes, I confirm the rewind. Go ahead and continue through to the final pull request.";

interface Snapshot {
  head: string;
  plan: string;
  counterExists: boolean;
  subagents: number;
}

/** Confirms any question once, recording repository state at the moment it is asked. */
class ConfirmingUser implements Answerer {
  readonly log: Array<{ question: string; answer: string }> = [];
  snapshot?: Snapshot;
  constructor(private readonly take: () => Snapshot) {}

  answer(req: UserInputRequest): AnswerResult {
    this.snapshot ??= this.take();
    const choice = req.choices?.find((c) => /confirm|yes|proceed|go ahead|continue/i.test(c));
    const answer = choice ?? CONFIRM;
    this.log.push({ question: req.question, answer });
    return { answer, wasFreeform: !choice };
  }
}

describe("PAW v2: rewind to the plan after a unit is implemented", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let seed: SeededWork;
  let user: ConfirmingUser;
  let todos: TodoGraph;
  let runError: unknown;
  let followUps = 0;

  before(async () => {
    let dir = "";
    const take = (): Snapshot => ({
      head: execSync("git rev-parse HEAD", { cwd: dir }).toString().trim(),
      plan: execSync(`cat ${SEED_PLAN_PATH}`, { cwd: dir }).toString(),
      counterExists: execSync("ls src", { cwd: dir }).toString().includes("requestCounter.ts"),
      subagents: ctx ? hostTasks(ctx, PLAN_TASK).length + hostTasks(ctx, IMPLEMENT_ACTIVITY).length : 0,
    });
    user = new ConfirmingUser(take);
    ({ ctx } = await startScenario({
      name: "v2-rewind",
      hostInstructions: HOST_INSTRUCTIONS,
      answerer: user,
      prepare: async (fixture) => {
        dir = fixture.workDir;
        seed = await seedInProgressWork(fixture, "target");
      },
    }));
    const deadline = Date.now() + RUN_TIMEOUT;
    try {
      await ctx.session.sendAndWait({ prompt: TASK }, RUN_TIMEOUT);
      // The host asked for confirmation by ending its turn rather than through ask_user.
      if (!user.snapshot && prCreates(ctx).length === 0) {
        user.snapshot = take();
        followUps += 1;
        await ctx.session.sendAndWait({ prompt: CONFIRM }, Math.max(60_000, deadline - Date.now()));
      }
    } catch (err) {
      runError = err;
    }
    todos = readTodoGraph(ctx.session.sessionId);
    console.log("[v2] follow-ups:", followUps, "ask_user:", JSON.stringify(user.log));
    console.log("[v2] snapshot at confirmation:", JSON.stringify({ ...user.snapshot, plan: user.snapshot?.plan.length }));
    logRun(ctx, todos);
    const log = await simpleGit(ctx.fixture.workDir).raw(["log", "--format=%h %s", `${seed.baseHead}..HEAD`, "--name-status"]).catch(() => "");
    console.log("[v2] target branch since base:\n" + log);
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

  it("G11: the host asked for confirmation before changing anything", () => {
    const s = user.snapshot;
    assert.ok(s, "The host never paused for confirmation");
    assert.strictEqual(s.head, seed.seedHead, "Commits were made before confirmation");
    assert.strictEqual(s.plan, seed.planText, "The plan changed before confirmation");
    assert.ok(s.counterExists, "src/requestCounter.ts was removed before confirmation");
    assert.strictEqual(s.subagents, 0, "Plan or implement subagents started before confirmation");
  });

  it("the plan was revised through a plan subagent and committed in a new commit", async () => {
    assert.ok(hostTasks(ctx, PLAN_TASK).length >= 1, `No plan subagent:\n${taskHeads(ctx)}`);
    const plan = await readFile(join(ctx.fixture.workDir, SEED_PLAN_PATH), "utf-8");
    assert.match(plan, /src\/metrics\.ts/);
    const planCommits = (await git().raw(["log", "--format=%h %s", `${seed.seedHead}..HEAD`, "--", SEED_PLAN_PATH])).trim();
    assert.ok(planCommits.split("\n").some((l) => l && !/stop tracking/i.test(l)), `No commit revised the plan:\n${planCommits}`);
  });

  it("G12: the seeded commits are still in history and no command rewrote history", async () => {
    assert.ok(await isAncestor(ctx.fixture.workDir, seed.planCommit, "HEAD"), "Plan commit was rewritten away");
    assert.ok(await isAncestor(ctx.fixture.workDir, seed.unit1Commit, "HEAD"), "Unit 1 commit was rewritten away");
    assert.ok(await isAncestor(ctx.fixture.workDir, seed.unit1Commit, `origin/${SEED_TARGET}`), "Pushed branch lacks Unit 1 commit");
    const bad = bashCalls(ctx).filter((c) => REWRITE_COMMAND.test(c.command));
    assert.deepStrictEqual(bad.map((c) => c.command.slice(0, 200)), []);
  });

  it("Unit 1 was redone with new commits: counter in src/metrics.ts, src/requestCounter.ts removed", async () => {
    assert.ok(hostTasks(ctx, IMPLEMENT_ACTIVITY).length >= 1, `No implement subagent:\n${taskHeads(ctx)}`);
    await access(join(ctx.fixture.workDir, "src/metrics.ts")).catch(() => assert.fail("src/metrics.ts missing"));
    const tracked = (await git().raw(["ls-files", "src/requestCounter.ts"])).trim();
    assert.strictEqual(tracked, "", "src/requestCounter.ts is still tracked");
    const removal = (await git().raw(["log", "--format=%h %s", "--diff-filter=D", `${seed.seedHead}..HEAD`, "--", "src/requestCounter.ts"])).trim();
    assert.ok(removal, "No new commit removed src/requestCounter.ts");
  });

  it("the revised behaviour holds: GET /stats is not counted, and the tests pass", async () => {
    execSync("npm run build --silent --if-present && npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    const results = (await probeApp(ctx.fixture.workDir, ["/", "/", "/stats", "/stats"])) as Array<Record<string, unknown>>;
    assert.deepStrictEqual(results[3], { requestCount: 2 }, `Responses: ${JSON.stringify(results)}`);
  });

  it("todos were reopened or added, never deleted, and all are closed", () => {
    const deletes = sqlQueries(ctx).filter((q) => /\bDELETE\s+FROM\s+todo/i.test(q.query));
    assert.deepStrictEqual(deletes.map((q) => q.query), [], "Todos were deleted");
    assert.ok(todo(todos, "plan", /^plan$/), todos.describe());
    assert.ok(todos.nodes.filter((n) => /^implement[:-]/.test(n.id)).length >= 2, todos.describe());
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("one PR, opened by the host", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });
});
