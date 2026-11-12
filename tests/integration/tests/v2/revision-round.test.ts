/**
 * PAW v2 scenario: plan checkpoint with one revision round.
 *
 * `plan_checkpoint: on`. The user rejects the first plan with a specific change
 * and accepts the second. The revision must go to the SAME plan subagent as a
 * revision packet, the change must reach the plan and the code, and the
 * automated activities must match the default run (W7).
 *
 * The user is reached through ask_user if the host uses it; if the host pauses
 * by ending its turn, the test sends the change and the acceptance as follow-up
 * prompts instead.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import type { Answerer, AnswerResult, UserInputRequest } from "../../lib/answerer.js";
import { readTodoGraph, type TodoGraph } from "../../lib/todos.js";
import {
  ENABLED,
  IMPLEMENT_ACTIVITY,
  PLAN_ACTIVITY,
  RUN_TIMEOUT,
  argText,
  firstMention,
  hostTasks,
  logRun,
  prCreates,
  startScenario,
  todo,
  toolResult,
  workDir,
} from "../../lib/v2-scenarios.js";

const HEADER = "X-Request-Count";
const CHANGE = `Not yet. Also expose the count in a response header ${HEADER} on every response. Revise the plan.`;
const ACCEPT = "The revised plan is accepted. Continue the workflow through to the final pull request.";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked or a configured checkpoint is reached.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  "Configuration: plan review single-model, final review single-model, plan checkpoint on, everything else default.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

/** Static nodes of the default configuration (checkpoint off); dynamic `implement:*` etc. excluded. */
const DEFAULT_AUTOMATED = ["expand-plan", "final-pr", "final-review", "plan", "plan-review", "setup"];
const DYNAMIC = /^(implement|review|revise|candidate):/;

/** Rejects the first plan with CHANGE and accepts the second. */
class CheckpointUser implements Answerer {
  readonly log: Array<{ question: string; answer: string }> = [];
  changeSent = false;
  accepted = false;
  private awaitingDetail = false;

  answer(req: UserInputRequest): AnswerResult {
    const answer = this.pick(req);
    this.log.push({ question: req.question, answer });
    return { answer, wasFreeform: !req.choices?.includes(answer) };
  }

  private pick(req: UserInputRequest): string {
    const text = `${req.question} ${(req.choices ?? []).join(" ")}`;
    const choice = (re: RegExp) => req.choices?.find((c) => re.test(c));
    if (this.awaitingDetail) {
      this.awaitingDetail = false;
      this.changeSent = true;
      return CHANGE;
    }
    if (!/plan|checkpoint|accept|approve/i.test(text)) {
      return req.choices?.[0] ?? "proceed";
    }
    if (!this.changeSent) {
      if (req.allowFreeform === false) {
        const c = choice(/change|revis|reject|modif|feedback/i);
        if (c) {
          this.awaitingDetail = true;
          return c;
        }
      }
      this.changeSent = true;
      return CHANGE;
    }
    this.accepted = true;
    return choice(/accept|approve|proceed|continue|yes/i) ?? ACCEPT;
  }
}

describe("PAW v2: plan checkpoint with a revision round", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let user: CheckpointUser;
  let todos: TodoGraph;
  let runError: unknown;
  const prompts: string[] = [];

  before(async () => {
    user = new CheckpointUser();
    ({ ctx } = await startScenario({ name: "v2-revision-round", hostInstructions: HOST_INSTRUCTIONS, answerer: user }));
    const deadline = Date.now() + RUN_TIMEOUT;
    const send = async (prompt: string) => {
      prompts.push(prompt);
      await ctx.session.sendAndWait({ prompt }, Math.max(60_000, deadline - Date.now()));
    };
    try {
      await send(TASK);
      // The host paused by ending its turn rather than through ask_user.
      if (prCreates(ctx).length === 0 && !user.changeSent) {
        user.changeSent = true;
        await send(CHANGE);
      }
      if (prCreates(ctx).length === 0 && !user.accepted) {
        user.accepted = true;
        await send(ACCEPT);
      }
    } catch (err) {
      runError = err;
    }
    todos = readTodoGraph(ctx.session.sessionId);
    console.log("[v2] prompts sent:", prompts.length, "ask_user:", JSON.stringify(user.log));
    logRun(ctx, todos);
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  const revisionMessages = () =>
    ctx.events
      .hostToolStarts()
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.toolName === "write_agent" && argText(t.arguments).toLowerCase().includes(HEADER.toLowerCase()));

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("the user was asked to accept the plan before any implementation started", () => {
    assert.ok(user.changeSent && user.accepted, `Checkpoint not reached: prompts=${prompts.length}, ask_user=${JSON.stringify(user.log)}`);
    const firstImplement = hostTasks(ctx, IMPLEMENT_ACTIVITY)[0];
    const firstRevision = firstMention(ctx, new RegExp(HEADER, "i"));
    assert.ok(firstImplement, "No implement subagent started");
    assert.ok(firstRevision >= 0 && firstRevision < firstImplement.index, "Implementation started before the requested change reached the workflow");
  });

  it("the revision went to the same plan subagent; no second plan subagent was started", () => {
    const plans = hostTasks(ctx, /^Activity:\s*plan\b/im);
    assert.strictEqual(plans.length, 1, `Expected one plan subagent, got ${plans.length}:\n${plans.map((p) => p.prompt.slice(0, 200)).join("\n---\n")}`);
    assert.match(plans[0].prompt, PLAN_ACTIVITY);
    const msgs = revisionMessages();
    assert.ok(msgs.length >= 1, `No write_agent carried the requested change. Host tools: ${JSON.stringify(ctx.events.summary().hostTools)}`);
    const planAgent = toolResult(ctx, plans[0].toolCallId) + argText(plans[0].arguments);
    for (const { t } of msgs) {
      const id = String(t.arguments.agent_id ?? t.arguments.agentId ?? "");
      assert.ok(id && planAgent.includes(id), `write_agent target ${id} is not the plan subagent (${planAgent.slice(0, 300)})`);
    }
  });

  it("the follow-up is a revision packet: requested change plus must-not-regress / accepted decisions", () => {
    const msgs = revisionMessages();
    assert.ok(msgs.length >= 1, "No revision follow-up");
    const body = argText(msgs[0].t.arguments);
    assert.match(body, /requested change/i);
    assert.match(body, /must not regress|accepted decisions/i);
  });

  it("the final plan and the implementation include the header", async () => {
    const plan = await readFile(join(await workDir(ctx), "ImplementationPlan.md"), "utf-8");
    assert.match(plan, new RegExp(HEADER, "i"));
    const src = execSync("cat src/*.ts", { cwd: ctx.fixture.workDir }).toString();
    assert.match(src, new RegExp(HEADER, "i"));
    execSync("npm run build --silent --if-present && npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
  });

  it("the plan-checkpoint todo exists, is blocked by plan review, and is done", () => {
    const checkpoint = todo(todos, "plan-checkpoint", /checkpoint/i);
    const upstream = todo(todos, "plan-review", /plan[-\s_]?review/i) ?? todo(todos, "plan", /^plan$/);
    assert.ok(checkpoint && upstream, `Missing nodes\n${todos.describe()}`);
    assert.ok(todos.isBlockedBy(checkpoint, upstream), `plan-checkpoint must depend on ${upstream.id}\n${todos.describe()}`);
    assert.strictEqual(checkpoint.status, "done");
  });

  it("W7: the automated nodes are the same as in the default run", () => {
    const ids = todos.nodes.map((n) => n.id).filter((id) => id !== "plan-checkpoint" && !DYNAMIC.test(id)).sort();
    assert.deepStrictEqual(ids, DEFAULT_AUTOMATED, todos.describe());
    assert.ok(todos.nodes.some((n) => /^implement:/.test(n.id)), "No implement:* node");
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], "Open TODOs remain");
  });

  it("one PR, opened by the host after the final review", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    const reviewWrite = firstMention(ctx, /reviews\/REVIEW\.md/);
    assert.ok(reviewWrite >= 0 && reviewWrite < prs[0].index, "Final review output must exist before the PR");
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });
});
