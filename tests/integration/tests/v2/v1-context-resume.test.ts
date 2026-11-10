/**
 * PAW v2 compatibility: resume a work item that PAW v1 left in progress.
 *
 * The seeded work item (lib/v2-seed.ts, format "v1") has a v1 WorkflowContext.md
 * (`Workflow Mode: full`, `Review Strategy: prs`, `Review Policy: milestones`,
 * single-model final review, planning docs review disabled), Spec.md, CodeResearch.md
 * and a v1 plan with Phase 1 committed. The user's checkout is on the base branch with
 * an uncommitted README change.
 *
 * v2 must convert the context once through the mapping (spec on, dedicated research,
 * plan checkpoint on, plan review off, single-model final review, one final PR), close
 * the existing artifacts from evidence, implement only Phase 2 and open one PR from
 * the target branch, without re-planning.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { appendFile, readdir, readFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { REMOVED_SKILLS } from "../../lib/skills.js";
import { readTodoGraph, type TodoGraph } from "../../lib/todos.js";
import {
  ENABLED,
  IMPLEMENT_ACTIVITY,
  REWRITE_COMMAND,
  RESEARCH_ACTIVITY,
  RUN_TIMEOUT,
  SPECIFY_ACTIVITY,
  bashCalls,
  hostTasks,
  logRun,
  prCreates,
  startScenario,
  taskHeads,
  todo,
} from "../../lib/v2-scenarios.js";
import { SEED_PLAN_PATH, SEED_TARGET, SEED_WORK_ID, isAncestor, probeApp, seedInProgressWork, type SeededWork } from "../../lib/v2-seed.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = `Use the paw-workflow skill to continue the PAW work item \`${SEED_WORK_ID}\` through to the final pull request.`;
const WORK = `.paw/work/${SEED_WORK_ID}`;

/** Plan text with checkbox state normalized: ticking a v1 progress box is not re-planning. */
const unticked = (plan: string) => plan.replace(/- \[[xX ]\]/g, "- [ ]");

describe("PAW v2: resume a v1 work item", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let seed: SeededWork;
  let todos: TodoGraph;
  let runError: unknown;
  let seededSpec: string;
  let seededResearch: string;

  before(async () => {
    ({ ctx } = await startScenario({
      name: "v2-v1-context-resume",
      hostInstructions: HOST_INSTRUCTIONS,
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false),
      prepare: async (fixture) => {
        seed = await seedInProgressWork(fixture, "base", "v1");
        const git = simpleGit(fixture.workDir);
        seededSpec = await git.show([`${SEED_TARGET}:${WORK}/Spec.md`]);
        seededResearch = await git.show([`${SEED_TARGET}:${WORK}/CodeResearch.md`]);
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
    console.log("[v2] questions asked:", JSON.stringify(ctx.answerer.log));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  const git = () => simpleGit(ctx.fixture.workDir);
  const wc = () => readFile(join(ctx.fixture.workDir, WORK, "WorkflowContext.md"), "utf-8").catch(() => "");

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("no removed v1 skill is loaded", () => {
    assert.deepStrictEqual(ctx.events.skillsInvoked().filter((s) => REMOVED_SKILLS.includes(s)), []);
  });

  it("the v1 context is converted once to the v2 format with the mapped configuration", async () => {
    const text = await wc();
    console.log("[v2] WorkflowContext.md:\n" + text);
    assert.match(text, /^## Configuration/m, "WorkflowContext.md should be in the v2 format");
    assert.doesNotMatch(text, /^(Review Strategy|Review Policy|Session Policy|Workflow Mode):/m, "v1 fields should be gone");
    assert.match(text, /^\s*spec:\s*on\b/m, "full mode → spec: on");
    assert.match(text, /^\s*research:\s*dedicated\b/m, "full mode → research: dedicated");
    assert.match(text, /^\s*plan_checkpoint:\s*on\b/m, "milestones → plan_checkpoint: on");
    assert.match(text, /plan_review:[^:]{0,20}mode:\s*off\b/, "planning docs review disabled → plan_review off");
    assert.match(text, /final_review:[^:]{0,20}mode:\s*single-model\b/, "final review mode carried over");
    assert.match(text, /artifact_lifecycle:\s*commit-and-clean\b/);
  });

  it("does not re-specify, re-research or re-plan", async () => {
    for (const [name, re] of [["specify", SPECIFY_ACTIVITY], ["research", RESEARCH_ACTIVITY], ["plan", /^Activity:\s*plan\b/im]] as const) {
      assert.deepStrictEqual(hostTasks(ctx, re).map((t) => t.prompt.slice(0, 120)), [], `A ${name} subagent ran`);
    }
    const plan = await readFile(join(ctx.fixture.workDir, SEED_PLAN_PATH), "utf-8");
    assert.strictEqual(unticked(plan), unticked(seed.planText), "The v1 plan was rewritten");
    assert.strictEqual(await readFile(join(ctx.fixture.workDir, WORK, "Spec.md"), "utf-8"), seededSpec);
    assert.strictEqual(await readFile(join(ctx.fixture.workDir, WORK, "CodeResearch.md"), "utf-8"), seededResearch);
  });

  it("reconstruction: existing artifacts close from evidence, both phases are units, nothing open", () => {
    for (const [id, re] of [
      ["setup", /^setup$/],
      ["specify", /^specify$/],
      ["research", /^research$/],
      ["plan", /^plan$/],
      ["plan-checkpoint", /plan[-\s_]?checkpoint/i],
      ["final-review", /final[-\s_]?review/i],
      ["final-pr", /final[-\s_]?pr/i],
    ] as const) {
      assert.ok(todo(todos, id, re), `Missing ${id}\n${todos.describe()}`);
    }
    assert.ok(!todos.nodes.some((n) => n.id === "plan-review"), `plan review is off\n${todos.describe()}`);
    const units = todos.nodes.filter((n) => /^implement[:-]/.test(n.id));
    assert.ok(units.length >= 2, `Expected an implement todo per v1 phase\n${todos.describe()}`);
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("does not redo Phase 1: implements Phase 2 only", async () => {
    assert.ok(hostTasks(ctx, IMPLEMENT_ACTIVITY).length >= 1, `No implement subagent:\n${taskHeads(ctx)}`);
    const touched = (await git().raw(["log", "--format=%h %s", `${seed.seedHead}..${SEED_TARGET}`, "--", "src/requestCounter.ts", "tests/requestCounter.test.js"])).trim();
    assert.strictEqual(touched, "", "Phase 1 files were changed after the seed");
  });

  it("PRs strategy maps to one final PR from the target branch; no plan, phase or docs branches", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    assert.doesNotMatch(prs[0].command, /_(plan|phase\d*|docs)\b/, prs[0].command);
    const remote = (await git().raw(["ls-remote", "--heads", "origin"])).split("\n").map((l) => l.split("refs/heads/")[1]).filter(Boolean);
    assert.deepStrictEqual(remote.filter((b) => /_(plan|phase\d*|docs)$/.test(b)), [], `Intermediate branches pushed: ${remote}`);
    assert.ok(remote.includes(SEED_TARGET), `Target branch not pushed: ${remote}`);
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });

  it("final review ran single-model", async () => {
    const files = await readdir(join(ctx.fixture.workDir, WORK, "reviews")).catch(() => [] as string[]);
    assert.ok(files.includes("REVIEW.md"), `No single-model review output in reviews/: ${JSON.stringify(files)}`);
    assert.ok(!files.includes("REVIEW-SYNTHESIS.md"), "No synthesis under single-model");
  });

  it("G7/G12: new commits only on the target branch, seeded history intact, nothing rewritten", async () => {
    assert.strictEqual((await git().raw(["rev-parse", seed.baseBranch])).trim(), seed.baseHead, "Base branch moved");
    assert.ok(await isAncestor(ctx.fixture.workDir, seed.unit1Commit, SEED_TARGET));
    const elsewhere = (await git().raw(["log", "--all", "--format=%h %D %s", `^${SEED_TARGET}`, `^${seed.baseHead}`])).trim();
    assert.strictEqual(elsewhere, "", "Commits exist outside the target branch");
    assert.deepStrictEqual(bashCalls(ctx).filter((c) => REWRITE_COMMAND.test(c.command)).map((c) => c.command.slice(0, 200)), []);
  });

  it("G2: the user's uncommitted README change is still uncommitted", async () => {
    const status = (await git().raw(["status", "--short", "README.md"])).trim();
    assert.match(status, /^\s?M\s+README\.md$/, `README.md should still be modified and unstaged, got "${status}"`);
  });

  it("G5: the pushed target branch carries no artifacts of this work item", async () => {
    const files = (await git().raw(["ls-tree", "-r", "--name-only", `origin/${SEED_TARGET}`])).split("\n");
    assert.deepStrictEqual(files.filter((f) => f.startsWith(`${WORK}/`)), []);
  });

  it("Phase 2 works: GET /stats returns the count and the tests pass", async () => {
    execSync("npm run build --silent --if-present && npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    const [, , stats] = (await probeApp(ctx.fixture.workDir, ["/", "/", "/stats"])) as Array<Record<string, unknown>>;
    assert.ok(typeof stats?.requestCount === "number" && stats.requestCount >= 2, `GET /stats returned ${JSON.stringify(stats)}`);
  });
});
