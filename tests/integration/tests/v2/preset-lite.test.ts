/**
 * PAW v2 scenario: the `lite` preset under time pressure.
 *
 * "Use the lite preset" must resolve to single-unit implementation and
 * single-model plan and final reviews, recorded in WorkflowContext.md. The host
 * instructions push for speed; the plan subagent must still be started in
 * background mode so it can take revisions, and `setup` must be closed before
 * any activity starts.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import type { TodoGraph } from "../../lib/todos.js";
import {
  ENABLED,
  PLAN_ACTIVITY,
  REVIEW_ACTIVITY,
  RUN_TIMEOUT,
  hostSkillLoads,
  hostTasks,
  markedDoneAt,
  notBackground,
  prCreateTime,
  prCreates,
  readArtifact,
  reviewFiles,
  runScenario,
} from "../../lib/v2-scenarios.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Be fast; the user is waiting. Keep the run as short as possible.",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill with the lite preset to take this task through to a final pull request.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

describe("PAW v2: lite preset", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    ({ ctx, todos, runError } = await runScenario({ name: "v2-preset-lite", hostInstructions: HOST_INSTRUCTIONS, task: TASK }));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("WorkflowContext.md records the lite preset and its resolved settings", async () => {
    const wc = await readArtifact(ctx, "WorkflowContext.md");
    console.log("[v2] WorkflowContext.md:\n" + wc);
    assert.match(wc, /preset:\s*`?lite\b/i);
    assert.match(wc, /plan_review:[^:]{0,20}mode:\s*single-model/);
    assert.match(wc, /final_review:[^:]{0,20}mode:\s*single-model/);
    assert.match(wc, /phases:\s*single\b/);
    assert.match(wc, /spec:\s*off\b/);
  });

  it("W1: the graph has the lite nodes only, with a single implement unit", async () => {
    const ids = todos.nodes.map((n) => n.id);
    for (const id of ["setup", "plan", "plan-review", "expand-plan", "final-review", "final-pr"]) {
      assert.ok(ids.includes(id), `Missing ${id}\n${todos.describe()}`);
    }
    for (const id of ["shape", "specify", "research", "plan-checkpoint"]) {
      assert.ok(!ids.includes(id), `Unexpected ${id}\n${todos.describe()}`);
    }
    assert.strictEqual(ids.filter((id) => /^implement\b/.test(id)).length, 1, todos.describe());
    assert.ok(!ids.some((id) => /^review\b/.test(id)), "Phase review is off in lite");
    const plan = await readArtifact(ctx, "ImplementationPlan.md");
    assert.strictEqual((plan.match(/^###\s+Unit\b/gim) ?? []).length, 1, "Plan should have one unit");
  });

  it("W5: plan and final review ran single-model", async () => {
    assert.deepStrictEqual(hostSkillLoads(ctx, "paw-sot"), [], "paw-sot must not run under lite");
    const reviews = hostTasks(ctx, REVIEW_ACTIVITY);
    assert.ok(reviews.length >= 2, `Expected plan and final review subagents, got ${reviews.length}`);
    const final = (await reviewFiles(ctx)).map((f) => f.name);
    const planning = (await reviewFiles(ctx, "planning")).map((f) => f.name);
    assert.ok(final.includes("REVIEW.md"), `reviews/: ${JSON.stringify(final)}`);
    assert.ok(planning.includes("REVIEW.md"), `reviews/planning/: ${JSON.stringify(planning)}`);
    assert.ok(!final.includes("REVIEW-SYNTHESIS.md") && !planning.includes("REVIEW-SYNTHESIS.md"), "No synthesis under single-model");
  });

  it("persistent plan subagent: started in background mode despite the speed instruction", () => {
    const plans = hostTasks(ctx, PLAN_ACTIVITY);
    assert.ok(plans.length >= 1, "No plan subagent");
    assert.deepStrictEqual(notBackground(plans), []);
  });

  it("setup is marked done before the first subagent starts, and no todo is left open", () => {
    const firstTask = hostTasks(ctx)[0];
    const setupDone = markedDoneAt(ctx, "setup");
    assert.ok(firstTask, "No subagent started");
    assert.ok(setupDone >= 0 && setupDone < firstTask.index, `setup marked done at ${setupDone}, first task at ${firstTask.index}`);
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("one PR, opened by the host after the final review file was written", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    const review = (await reviewFiles(ctx)).find((f) => f.name === "REVIEW.md");
    const prAt = prCreateTime(ctx);
    assert.ok(prAt, "No host gh pr create in the trace");
    assert.ok(review && review.createdMs < prAt, `REVIEW.md created at ${review?.createdMs}, PR at ${prAt}`);
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });

  it("the feature is implemented and the tests pass", () => {
    execSync("npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    assert.match(execSync("cat src/*.ts", { cwd: ctx.fixture.workDir }).toString(), /stats/);
  });
});
