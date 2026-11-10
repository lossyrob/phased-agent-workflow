/**
 * PAW v2 scenario: `spec: on` and `research: dedicated`.
 *
 * The graph gains `specify` and `research` nodes ahead of `plan`; each runs as
 * its own subagent and leaves its artifact; the plan is built from them. The
 * specify subagent is persistent, so it must be started in background mode.
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
  RESEARCH_ACTIVITY,
  RUN_TIMEOUT,
  SPECIFY_ACTIVITY,
  hostTasks,
  notBackground,
  prCreates,
  readArtifact,
  runScenario,
  todo,
} from "../../lib/v2-scenarios.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  "Configuration: spec on, research dedicated, plan review single-model, final review single-model, everything else default.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

describe("PAW v2: spec and dedicated research", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    ({ ctx, todos, runError } = await runScenario({ name: "v2-spec-research", hostInstructions: HOST_INSTRUCTIONS, task: TASK }));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("W1/W2: specify and research todos exist in order setup → specify → research → plan", () => {
    const setup = todo(todos, "setup", /^setup$/);
    const specify = todo(todos, "specify", /^spec/i);
    const research = todo(todos, "research", /research/i);
    const plan = todo(todos, "plan", /^plan$/);
    assert.ok(setup && specify && research && plan, `Missing nodes\n${todos.describe()}`);
    assert.ok(todos.isBlockedBy(specify, setup), `specify must depend on setup\n${todos.describe()}`);
    assert.ok(todos.isBlockedBy(research, specify), `research must depend on specify\n${todos.describe()}`);
    assert.ok(todos.isBlockedBy(plan, research), `plan must depend on research\n${todos.describe()}`);
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("Spec.md and CodeResearch.md exist with real content", async () => {
    const spec = await readArtifact(ctx, "Spec.md");
    const research = await readArtifact(ctx, "CodeResearch.md");
    assert.match(spec, /FR-\d+/, "Spec.md should enumerate requirements");
    assert.match(research, /[\w./-]+\.(ts|json):\d+/, "CodeResearch.md should carry file:line references");
  });

  it("specify and research ran as subagents before the plan; specify in background mode", () => {
    const specify = hostTasks(ctx, SPECIFY_ACTIVITY);
    const research = hostTasks(ctx, RESEARCH_ACTIVITY);
    const plan = hostTasks(ctx, PLAN_ACTIVITY);
    assert.ok(specify.length >= 1 && research.length >= 1 && plan.length >= 1, `specify=${specify.length} research=${research.length} plan=${plan.length}`);
    assert.ok(specify[0].index < research[0].index && research[0].index < plan[0].index, "Order must be specify, research, plan");
    assert.deepStrictEqual(notBackground([...specify, ...plan]), []);
  });

  it("the plan is built from the spec and the research", async () => {
    const planBrief = hostTasks(ctx, PLAN_ACTIVITY)[0]?.prompt ?? "";
    assert.match(planBrief, /Spec\.md/);
    assert.match(planBrief, /CodeResearch\.md/);
    const plan = await readArtifact(ctx, "ImplementationPlan.md");
    assert.match(plan, /Spec\.md/);
    assert.match(plan, /CodeResearch\.md/);
    assert.match(plan, /FR-\d+/, "Plan units should name the requirements they deliver");
  });

  it("one PR by the host, and the feature works", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent);
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
    execSync("npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
  });
});
