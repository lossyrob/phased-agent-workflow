/**
 * PAW v2 scenario: final review configured as multi-model.
 *
 * The host itself launches one review subagent per configured model, with the
 * per-call `model` argument set; each writes REVIEW-<model>.md, then a synthesis
 * REVIEW-SYNTHESIS.md is written, and the PR follows the synthesis.
 *
 * Models: two cheap models enabled in Copilot CLI 1.0.108 (from `listModels`).
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
  REVIEW_ACTIVITY,
  RUN_TIMEOUT,
  hostSkillLoads,
  hostTasks,
  prCreateTime,
  prCreates,
  reviewFiles,
  runScenario,
  todo,
} from "../../lib/v2-scenarios.js";

const MODELS = ["claude-haiku-5.5", "gpt-6-luna"];

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  `Configuration: plan review single-model; final review multi-model with models ${MODELS.join(" and ")}; everything else default.`,
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("PAW v2: multi-model final review", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    ({ ctx, todos, runError } = await runScenario({ name: "v2-multi-model", hostInstructions: HOST_INSTRUCTIONS, task: TASK }));
    console.log("[v2] reviews/:", JSON.stringify((await reviewFiles(ctx).catch(() => [])).map((f) => f.name)));
    console.log("[v2] host review tasks:", JSON.stringify(hostTasks(ctx, REVIEW_ACTIVITY).map((t) => ({ model: t.arguments.model, mode: t.arguments.mode }))));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("W5: the host launched one review subagent per model, with the model argument set", () => {
    const reviews = hostTasks(ctx, REVIEW_ACTIVITY);
    for (const model of MODELS) {
      const own = reviews.filter((t) => t.arguments.model === model && new RegExp(`REVIEW-${escape(model)}\\.md`, "i").test(t.prompt));
      assert.strictEqual(own.length >= 1, true, `No host review subagent with model=${model} writing REVIEW-${model}.md`);
    }
    assert.deepStrictEqual(hostSkillLoads(ctx, "paw-sot"), [], "multi-model must not run through paw-sot");
  });

  it("W5: REVIEW-<model>.md per model and REVIEW-SYNTHESIS.md after them; no single REVIEW.md", async () => {
    const files = await reviewFiles(ctx);
    const names = files.map((f) => f.name);
    const perModel = MODELS.map((m) => files.find((f) => f.name.toLowerCase() === `review-${m}.md`));
    assert.ok(perModel.every((f) => f && f.size > 0), `Per-model reviews missing: ${JSON.stringify(names)}`);
    const synthesis = files.find((f) => f.name === "REVIEW-SYNTHESIS.md");
    assert.ok(synthesis && synthesis.size > 0, `Missing REVIEW-SYNTHESIS.md: ${JSON.stringify(names)}`);
    assert.ok(perModel.every((f) => f!.mtimeMs <= synthesis.mtimeMs), "Synthesis must follow the per-model reviews");
    assert.ok(!names.includes("REVIEW.md"), "A single-model review replaced the configured multi-model review");
  });

  it("W3: the final-review todo names the provider and is closed", () => {
    const final = todo(todos, "final-review", /final[-\s_]?review/i);
    assert.ok(final, todos.describe());
    assert.match(`${final.title} ${final.description}`, /multi-model/i);
    assert.strictEqual(final.status, "done");
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("one PR, opened by the host after the synthesis", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent);
    const synthesis = (await reviewFiles(ctx)).find((f) => f.name === "REVIEW-SYNTHESIS.md");
    const prAt = prCreateTime(ctx);
    assert.ok(prAt, "No host gh pr create in the trace");
    assert.ok(synthesis && synthesis.createdMs < prAt, `REVIEW-SYNTHESIS.md created at ${synthesis?.createdMs}, PR at ${prAt}`);
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
    execSync("npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
  });
});
