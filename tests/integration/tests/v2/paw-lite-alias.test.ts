/**
 * PAW v2 compatibility: the `paw-lite` skill is an alias for `paw-workflow` with the
 * `lite` preset.
 *
 * A cheap check: the user asks for PAW Lite by skill name and stops the run after setup.
 * The host must load `paw-lite`, then `paw-workflow`, and record the lite preset and its
 * settings in WorkflowContext.md; the full lite run is covered by preset-lite.test.ts.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { REMOVED_SKILLS } from "../../lib/skills.js";
import type { TodoGraph } from "../../lib/todos.js";
import { ENABLED, RUN_TIMEOUT, WORKFLOW_SKILL, hostSkillLoads, hostTasks, prCreates, readArtifact, runScenario } from "../../lib/v2-scenarios.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-lite skill for this task. For now, do setup only: write WorkflowContext.md and create the todo graph,",
  "then stop and tell me the resolved configuration. Do not start planning; I will tell you when to continue.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

describe("PAW v2: paw-lite resolves to the lite preset", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    ({ ctx, todos, runError } = await runScenario({ name: "v2-paw-lite-alias", hostInstructions: HOST_INSTRUCTIONS, task: TASK }));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("the host loads paw-lite, then paw-workflow, and no removed v1 skill", () => {
    const lite = hostSkillLoads(ctx, "paw-lite");
    const workflow = hostSkillLoads(ctx, WORKFLOW_SKILL);
    assert.ok(lite.length >= 1, `paw-lite not loaded: ${JSON.stringify(ctx.events.skillsInvoked())}`);
    assert.ok(workflow.length >= 1 && workflow[0] > lite[0], `paw-workflow not loaded after paw-lite: ${JSON.stringify(ctx.events.skillsInvoked())}`);
    assert.deepStrictEqual(ctx.events.skillsInvoked().filter((s) => REMOVED_SKILLS.includes(s)), []);
  });

  it("WorkflowContext.md records the lite preset and its resolved settings", async () => {
    const wc = await readArtifact(ctx, "WorkflowContext.md");
    console.log("[v2] WorkflowContext.md:\n" + wc);
    assert.match(wc, /preset:\s*`?lite\b/i);
    assert.match(wc, /plan_review:[^:]{0,20}mode:\s*single-model/);
    assert.match(wc, /final_review:[^:]{0,20}mode:\s*single-model/);
    assert.match(wc, /phases:\s*single\b/);
    assert.match(wc, /spec:\s*off\b/);
    assert.match(wc, /research:\s*inline\b/);
  });

  it("the todo graph has the lite nodes only", () => {
    const ids = todos.nodes.map((n) => n.id);
    for (const id of ["setup", "plan", "plan-review", "expand-plan", "final-review", "final-pr"]) {
      assert.ok(ids.includes(id), `Missing ${id}\n${todos.describe()}`);
    }
    for (const id of ["shape", "specify", "research", "plan-checkpoint"]) {
      assert.ok(!ids.includes(id), `Unexpected ${id}\n${todos.describe()}`);
    }
  });

  it("stops after setup as asked: no implementation and no PR", () => {
    assert.deepStrictEqual(hostTasks(ctx, /^Activity:\s*implement\b/im).map((t) => t.prompt.slice(0, 80)), []);
    assert.deepStrictEqual(prCreates(ctx), []);
  });
});
