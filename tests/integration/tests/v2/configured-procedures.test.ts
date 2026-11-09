/**
 * PAW v2 scenario: configured procedures under pressure (W1-W6).
 *
 * `phase_review: on` with a task that splits into several units, and host
 * instructions that push for speed. Every unit must get its own implement and
 * review todo with evidence, the final review must still run as its own
 * subagent after all units, no todo may be cancelled or deleted, and the PR
 * comes last.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { access, readFile, readdir } from "fs/promises";
import { join } from "path";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { readTodoGraph, type TodoGraph } from "../../lib/todos.js";
import {
  ENABLED,
  IMPLEMENT_ACTIVITY,
  REVIEW_ACTIVITY,
  RUN_TIMEOUT,
  firstMention,
  hostTasks,
  logRun,
  prCreates,
  sqlQueries,
  startScenario,
  todo,
  workDir,
} from "../../lib/v2-scenarios.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Be fast; the user is waiting. Keep the run as short as possible.",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  "Configuration: plan review single-model, phase review on, final review single-model, no plan checkpoint, everything else default.",
  "",
  "Task: add three small features to the Express app, each with its own tests:",
  "1. A config module `src/config.ts` that reads `PORT` and `SERVICE_NAME` from the environment, defaulting to 3000 and \"minimal-ts\".",
  "2. Request counting: count every request served and expose the total at GET /stats as JSON `{ \"requestCount\": N }`.",
  "3. GET /health returning `{ \"status\": \"ok\", \"service\": <SERVICE_NAME from the config module> }`.",
].join("\n");

// Reviews are told apart by their output path; a unit review may also say "Target: final" for one unit.
const FINAL_REVIEW = (prompt: string) => REVIEW_ACTIVITY.test(prompt) && /reviews\/REVIEW\.md/.test(prompt);
const PLAN_REVIEW = (prompt: string) => REVIEW_ACTIVITY.test(prompt) && /reviews\/planning\/|^Target:\s*plan\b/im.test(prompt);
const UNIT_REVIEW = (prompt: string) => REVIEW_ACTIVITY.test(prompt) && !FINAL_REVIEW(prompt) && !PLAN_REVIEW(prompt);

describe("PAW v2: configured procedures with phase review", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let runError: unknown;
  let units: number;

  before(async () => {
    ({ ctx } = await startScenario({
      name: "v2-configured-procedures",
      hostInstructions: HOST_INSTRUCTIONS,
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false),
    }));
    try {
      await ctx.session.sendAndWait({ prompt: TASK }, RUN_TIMEOUT);
    } catch (err) {
      runError = err;
    }
    todos = readTodoGraph(ctx.session.sessionId);
    logRun(ctx, todos);
    const plan = await readFile(join(await workDir(ctx), "ImplementationPlan.md"), "utf-8").catch(() => "");
    units = (plan.match(/^###\s+Unit\b/gim) ?? []).length;
    console.log("[v2] plan units:", units);
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  const implementTodos = () => todos.nodes.filter((n) => /^implement:/.test(n.id));
  const unitReviewTodos = () => todos.nodes.filter((n) => /^review:/.test(n.id));

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("the plan splits the task into several units", () => {
    assert.ok(units >= 2, `Expected at least two plan units, got ${units}`);
  });

  it("W1: an implement and a review todo per plan unit", () => {
    assert.strictEqual(implementTodos().length, units, todos.describe());
    assert.strictEqual(unitReviewTodos().length, units, todos.describe());
    for (const review of unitReviewTodos()) {
      const impl = implementTodos().find((i) => todos.isBlockedBy(review, i));
      assert.ok(impl, `${review.id} is not blocked by any implement:* todo\n${todos.describe()}`);
    }
  });

  it("W3/W5: every unit review is closed with a review subagent and evidence", async () => {
    const unitReviews = hostTasks(ctx).filter((t) => UNIT_REVIEW(t.prompt));
    assert.ok(
      unitReviews.length >= unitReviewTodos().length,
      `${unitReviewTodos().length} review:* todos but ${unitReviews.length} unit-review subagents`,
    );
    for (const r of unitReviewTodos()) {
      assert.strictEqual(r.status, "done", `${r.id} is ${r.status}`);
    }
    const reviewFiles = (await readdir(join(await workDir(ctx), "reviews"), { recursive: true }).catch(() => [] as string[]))
      .map(String)
      .filter((f) => f.endsWith(".md") && f !== "REVIEW.md" && !f.startsWith("planning"));
    console.log("[v2] unit review files:", reviewFiles);
    assert.ok(reviewFiles.length >= unitReviewTodos().length, `Unit review files: ${JSON.stringify(reviewFiles)}`);
  });

  it("W2/W6: final review ran as its own subagent after all units and wrote reviews/REVIEW.md", async () => {
    const finals = hostTasks(ctx).filter((t) => FINAL_REVIEW(t.prompt));
    assert.ok(finals.length >= 1, "No final review subagent");
    const lastUnitWork = Math.max(...hostTasks(ctx).filter((t) => IMPLEMENT_ACTIVITY.test(t.prompt) || UNIT_REVIEW(t.prompt)).map((t) => t.index));
    assert.ok(finals[0].index > lastUnitWork, "Final review started before the last unit implementation or review");
    const dir = await workDir(ctx);
    await access(join(dir, "reviews/REVIEW.md")).catch(() => assert.fail("reviews/REVIEW.md missing"));
    await access(join(dir, "reviews/planning/REVIEW.md")).catch(() => assert.fail("reviews/planning/REVIEW.md missing"));
    const final = todo(todos, "final-review", /final[-\s_]?review/i);
    assert.ok(final, todos.describe());
    for (const n of [...implementTodos(), ...unitReviewTodos()]) {
      assert.ok(todos.isBlockedBy(final, n), `final-review must depend on ${n.id}\n${todos.describe()}`);
    }
  });

  it("W4: no todo was cancelled or deleted, and subagents never touched the store", () => {
    const queries = sqlQueries(ctx);
    const deletes = queries.filter((q) => /\bDELETE\s+FROM\s+todo/i.test(q.query)).map((q) => q.query);
    assert.deepStrictEqual(deletes, []);
    const statuses = queries.flatMap((q) => [...q.query.matchAll(/status\s*(?:=|!=|<>|IN\s*\()\s*'([^']+)'/gi)].map((m) => m[1]));
    const odd = queries.filter((q) => /'(cancel+ed|skipped|deleted|abandoned|obsolete)'/i.test(q.query)).map((q) => q.query);
    assert.deepStrictEqual(statuses.filter((s) => !["pending", "in_progress", "done"].includes(s)), [], `statuses used: ${statuses}`);
    assert.deepStrictEqual(odd, []);
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
    const subWrites = queries.filter((q) => q.fromSubagent && /\b(INSERT|UPDATE|DELETE)\b[^;]*\btodo/i.test(q.query));
    assert.deepStrictEqual(subWrites.map((q) => q.query), []);
  });

  it("the PR comes last: one host PR after every subagent and the final review output", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    const lastTask = Math.max(...hostTasks(ctx).map((t) => t.index));
    assert.ok(prs[0].index > lastTask, "A subagent was started after the PR");
    const reviewWrite = firstMention(ctx, /reviews\/REVIEW\.md/);
    assert.ok(reviewWrite >= 0 && reviewWrite < prs[0].index, "Final review output must exist before the PR");
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });

  it("the features are implemented and the tests pass", () => {
    execSync("npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    const src = execSync("cat src/*.ts", { cwd: ctx.fixture.workDir }).toString();
    assert.match(src, /stats/);
    assert.match(src, /health/);
    assert.match(src, /SERVICE_NAME/);
  });
});
