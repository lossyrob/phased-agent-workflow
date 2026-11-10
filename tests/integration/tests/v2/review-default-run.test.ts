/**
 * PAW Review default run through the `PAW-Review` agent (#297, v2 shared contracts).
 *
 * The host's prompt is the rendered `agents/PAW-Review.agent.md` plus project rules. It
 * reviews a seeded pull request served by the stub `gh`. Expected: the agent loads
 * `paw-review-workflow`, builds a todo graph, runs each stage in a subagent that returns
 * the shared block, writes the review artifacts, and the host alone creates one pending
 * review with comments. No subagent posts or pushes; the reviewed branch, the checkout,
 * and the user's uncommitted change are unchanged.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext } from "../../lib/harness.js";
import { getRepoRoot, renderCliAgentPrompt } from "../../lib/skills.js";
import {
  DELEGATED_STAGE_SKILLS,
  PR_BRANCH,
  PR_URL,
  REVIEW_HOST_INSTRUCTIONS,
  RUN_TIMEOUT,
  USER_NOTE,
  ghCommands,
  isGhWrite,
  readReviewArtifact,
  refs,
  reviewArtifacts,
  runReviewScenario,
  subagentReturns,
  subagentSkillLoads,
  type ReviewRun,
} from "../../lib/review-scenario.js";
import { ENABLED, bashCalls, hostSkillLoads, hostTasks, sqlQueries, taskHeads } from "../../lib/v2-scenarios.js";

const TASK = `Do a thorough PAW review of ${PR_URL}.`;

const ARTIFACTS = [
  "ReviewContext.md",
  "ResearchQuestions.md",
  "CodeResearch.md",
  "DerivedSpec.md",
  "ImpactAnalysis.md",
  "GapAnalysis.md",
  "ReviewComments.md",
];

describe("PAW Review: default run through the PAW-Review agent", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let run: ReviewRun;

  before(async () => {
    const agent = renderCliAgentPrompt(readFileSync(join(getRepoRoot(), "agents/PAW-Review.agent.md"), "utf-8"));
    run = await runReviewScenario({ name: "review-default", systemPrompt: `${REVIEW_HOST_INSTRUCTIONS}\n\n${agent}`, task: TASK });
    console.log("[review-default] host tasks:\n" + taskHeads(run.ctx));
  });

  after(async () => {
    if (run?.ctx) {
      await destroyTestContext(run.ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!run.runError, `Run did not complete: ${run.runError instanceof Error ? run.runError.message : String(run.runError)}`);
  });

  it("#297/D1: the host loads paw-review-workflow; no subagent loads it", () => {
    assert.ok(hostSkillLoads(run.ctx, "paw-review-workflow").length >= 1, `skills: ${JSON.stringify(run.ctx.events.skillsInvoked())}`);
    const nested = subagentSkillLoads(run.ctx).filter((s) => s.includes("paw-review-workflow"));
    assert.deepStrictEqual(nested, [], "A subagent loaded the review workflow");
  });

  it("W1: the host builds the review todo graph before the first stage subagent", () => {
    const { todos, ctx } = run;
    for (const pattern of [/understand/i, /baseline/i, /derived|spec/i, /impact/i, /gap/i, /feedback/i, /critic|critique/i, /post|github/i]) {
      assert.ok(todos.find(pattern), `No todo matching ${pattern}\n${todos.describe()}`);
    }
    const firstInsert = ctx.events.toolStarts().findIndex((t) => !t.parentToolCallId && t.toolName === "sql" && /INSERT\s+INTO\s+todos/i.test(String(t.arguments.query ?? "")));
    const firstTask = hostTasks(ctx)[0]?.index ?? Infinity;
    assert.ok(firstInsert >= 0 && firstInsert < firstTask, `Todos inserted at ${firstInsert}, first task at ${firstTask}`);
    assert.ok(!sqlQueries(ctx).some((q) => q.fromSubagent && /\btodos\b/i.test(q.query) && /INSERT|UPDATE|DELETE/i.test(q.query)), "A subagent edited todos");
  });

  it("W3: every todo is closed", () => {
    assert.deepStrictEqual(run.todos.open().map((n) => n.id), [], run.todos.describe());
  });

  it("stages run in subagents that load their stage skill; the host loads none of them", () => {
    const loads = subagentSkillLoads(run.ctx);
    for (const skill of [...DELEGATED_STAGE_SKILLS, "paw-review-impact", "paw-review-gap"]) {
      assert.ok(loads.some((s) => s.includes(skill)), `No subagent loaded ${skill}. Subagent skill loads: ${JSON.stringify(loads)}`);
      assert.deepStrictEqual(hostSkillLoads(run.ctx, skill), [], `The host loaded ${skill} itself`);
    }
    assert.ok(loads.filter((s) => s.includes("paw-review-understanding")).length >= 2, "understanding must run twice (initial, resume)");
    assert.ok(loads.filter((s) => s.includes("paw-review-feedback")).length >= 2, "feedback must run twice (initial, critique response)");
  });

  it("stage subagents return the shared block", () => {
    const returns = subagentReturns(run.ctx);
    const statuses = returns.match(/status:\s*(complete|blocked|needs-decision|failed)\b/g) ?? [];
    assert.ok(statuses.length >= 7, `Expected a status line per stage, saw ${statuses.length}`);
    for (const skill of ["paw-review-understanding", "paw-review-baseline", "paw-review-impact", "paw-review-gap", "paw-review-feedback", "paw-review-critic"]) {
      assert.match(returns, new RegExp(`activity:\\s*\`?${skill}`), `No return block from ${skill}`);
    }
    assert.match(returns, /findings:\s*\n\s*-\s*severity:\s*(must-fix|should-fix|consider)/, "No findings with severity in any return");
    assert.doesNotMatch(returns, /Status: (Success|Partial)/, "A stage returned the old status format");
  });

  it("the review artifacts exist and the comments are finalized", async () => {
    const names = (await reviewArtifacts(run.ctx)).filter((f) => f.size > 0).map((f) => f.name);
    for (const name of ARTIFACTS) {
      assert.ok(names.includes(name), `Missing ${name} in ${JSON.stringify(names)}`);
    }
    const comments = await readReviewArtifact(run.ctx, "ReviewComments.md");
    assert.match(comments, /\*\*Final\*\*:/);
    const context = await readReviewArtifact(run.ctx, "ReviewContext.md");
    assert.match(context, /mode:\s*single-model/, "ReviewContext.md does not record the provider block");
  });

  it("D5/G9: only the host writes to GitHub; subagents only read", () => {
    const writes = ghCommands(run.ctx).filter((c) => isGhWrite(c.command));
    assert.ok(writes.length >= 1, "The host made no GitHub write");
    assert.deepStrictEqual(writes.filter((c) => c.fromSubagent).map((c) => c.command), [], "A subagent wrote to GitHub");
    const githubSkillLoads = hostSkillLoads(run.ctx, "paw-review-github");
    assert.ok(githubSkillLoads.length >= 1, "The host did not load paw-review-github");
    assert.ok(!subagentSkillLoads(run.ctx).some((s) => s.includes("paw-review-github")), "A subagent loaded paw-review-github");
  });

  it("one pending review holds the posted comments and its ID is recorded; nothing is submitted", async () => {
    const state = await run.ctx.fixture.reviewGhState();
    assert.strictEqual(state.reviews.length, 1, `Reviews: ${JSON.stringify(state.reviews)}`);
    const [review] = state.reviews;
    assert.strictEqual(review.state, "PENDING");
    assert.ok(state.comments.length >= 1, "No comments posted");
    assert.deepStrictEqual(state.comments.filter((c) => c.pull_request_review_id !== review.id).map((c) => c.id), [], "Comments posted outside the pending review");
    assert.match(await readReviewArtifact(run.ctx, "ReviewComments.md"), new RegExp(String(review.id)));
  });

  it("G12/D5: nothing is committed or pushed; the checkout and the user's change are untouched", async () => {
    const { ctx, refsBefore } = run;
    assert.deepStrictEqual(await refs(ctx.fixture), refsBefore, "Refs changed in the checkout or on origin");
    assert.deepStrictEqual(bashCalls(ctx).filter((c) => /\bgit\s+(push|commit|stash|reset)\b/.test(c.command)).map((c) => c.command), []);
    assert.strictEqual(await ctx.fixture.getBranch(), PR_BRANCH);
    const status = await ctx.fixture.getStatus();
    const withoutReviews = (st: string) => st.split("\n").filter((l) => !/^\?\? \.paw\//.test(l));
    assert.deepStrictEqual(withoutReviews(status), withoutReviews(run.statusBefore), status);
    assert.match(run.statusBefore, /M README\.md/);
    assert.match(await readFile(join(ctx.fixture.workDir, "README.md"), "utf-8"), new RegExp(USER_NOTE));
    const worktrees = (await simpleGit(ctx.fixture.workDir).raw(["worktree", "list"])).trim().split("\n");
    assert.strictEqual(worktrees.length, 1, `Temporary worktrees left behind: ${worktrees.join("; ")}`);
  });

  it("autonomy: asks the user no questions", () => {
    assert.strictEqual(run.ctx.answerer.log.length, 0, `Host asked: ${JSON.stringify(run.ctx.answerer.log)}`);
  });
});
