/**
 * PAW v2 compatibility: a session started through the `PAW` agent.
 *
 * The host's prompt is the rendered `agents/PAW.agent.md` (as the v1 baseline starts the
 * v1 agent) plus the project rules, with the v2 skill directory. The task does not name
 * the workflow skill: the agent must load `paw-workflow`, build the todo graph and finish
 * a default run with one PR. No skill from the removed v1 set is loaded.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { REMOVED_SKILLS, getRepoRoot, renderCliAgentPrompt } from "../../lib/skills.js";
import type { TodoGraph } from "../../lib/todos.js";
import { HOST_INSTRUCTIONS, RUN_TIMEOUT, TASK_DESCRIPTION, allBash, runV2Task } from "../../lib/v2-run.js";
import { IMPLEMENT_ACTIVITY, PLAN_ACTIVITY, WORKFLOW_SKILL, hostTasks, prCreates, sqlQueries, taskHeads } from "../../lib/v2-scenarios.js";
import { gitCmd } from "../../lib/shell-match.js";

const ENABLED = process.env.PAW_TEST_V2 === "1";

const TASK = [
  "Take this task through to a final pull request.",
  "",
  "Configuration: plan review single-model, final review single-model, no plan checkpoint, everything else default.",
  "",
  TASK_DESCRIPTION,
].join("\n");

describe("PAW v2: the PAW agent wraps paw-workflow", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    const agentPrompt = renderCliAgentPrompt(readFileSync(join(getRepoRoot(), "agents/PAW.agent.md"), "utf-8"));
    ({ ctx, todos, runError } = await runV2Task({
      label: "paw-agent",
      systemPrompt: `${HOST_INSTRUCTIONS}\n\n${agentPrompt}`,
      skillDirectories: [join(getRepoRoot(), "skills")],
      task: TASK,
    }));
    console.log("[paw-agent] host tasks:\n" + taskHeads(ctx));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("the agent loads paw-workflow, and no removed v1 skill", () => {
    const invoked = ctx.events.skillsInvoked();
    assert.ok(invoked.includes(WORKFLOW_SKILL), `Expected ${WORKFLOW_SKILL}; saw ${JSON.stringify(invoked)}`);
    assert.deepStrictEqual(invoked.filter((s) => REMOVED_SKILLS.includes(s)), []);
  });

  it("W1: the host builds the todo graph in the store before the first subagent", () => {
    const ids = todos.nodes.map((n) => n.id);
    for (const id of ["setup", "plan", "plan-review", "expand-plan", "final-review", "final-pr"]) {
      assert.ok(ids.includes(id), `Missing ${id}\n${todos.describe()}`);
    }
    assert.ok(ids.some((id) => /^implement\b/.test(id)), todos.describe());
    assert.ok(sqlQueries(ctx).some((q) => !q.fromSubagent && /INSERT\s+INTO\s+todos/i.test(q.query)), "No todos inserted by the host");
    assert.ok(hostTasks(ctx, PLAN_ACTIVITY).length >= 1 && hostTasks(ctx, IMPLEMENT_ACTIVITY).length >= 1, taskHeads(ctx));
  });

  it("W3: no todo is left open", () => {
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("autonomy: asks the user no questions", () => {
    assert.strictEqual(ctx.answerer.log.length, 0, `Host asked the user: ${JSON.stringify(ctx.answerer.log)}`);
  });

  it("D5/G9: one PR, opened by the host; subagents never push", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    assert.deepStrictEqual(allBash(ctx).filter((c) => c.fromSubagent && gitCmd("push\\b").test(c.command)).map((c) => c.command), []);
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });

  it("the feature is implemented and its tests pass", () => {
    execSync("npm run build --silent --if-present && npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    assert.match(execSync("cat src/*.ts", { cwd: ctx.fixture.workDir }).toString(), /stats/i);
  });
});
