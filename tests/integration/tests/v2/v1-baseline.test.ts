/**
 * v1 baseline for the PAW v2 comparison.
 *
 * Runs the same task, fixture and host instructions as default-run.test.ts, but with
 * v1 PAW: the skills and the PAW agent prompt come from a detached worktree of
 * the last v1 commit (V1_REF). The test asserts only that the run completed and the feature works;
 * everything else is printed so the two runs can be compared.
 *
 * Skipped unless PAW_TEST_V2=1. Run with `npm run test:v2` (which also sets
 * PAW_TEST_AUTH=gh-token) or, for this file alone,
 * `PAW_TEST_V2=1 PAW_TEST_AUTH=gh-token npx tsx --test tests/v2/v1-baseline.test.ts`.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { mkdtempSync, readFileSync } from "fs";
import { readdir, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { getRepoRoot, renderCliAgentPrompt } from "../../lib/skills.js";
import type { TodoGraph } from "../../lib/todos.js";
import {
  COMMIT_TRAILER,
  HOST_INSTRUCTIONS,
  OTHER_WORK_ID,
  RUN_TIMEOUT,
  TASK_DESCRIPTION,
  allBash as allBashFor,
  runV2Task,
} from "../../lib/v2-run.js";
import { BROAD_STAGING, gitCmd } from "../../lib/shell-match.js";

const ENABLED = process.env.PAW_TEST_V2 === "1";

/**
 * The last v1 commit of main (the merge base of the v2 branch). Pinned so the baseline keeps
 * measuring v1 after v2 lands on main; override with PAW_TEST_V1_REF.
 */
const V1_REF = process.env.PAW_TEST_V1_REF || "465a5c9743f66722634cb0fb057b1580169a0661";

const TASK = [
  "Act as the PAW agent: take this task through the full PAW workflow to a final pull request. Initialize the work with the",
  "paw-init skill, then run the workflow stages (planning, implementation, final review, final PR) with the PAW skills.",
  "",
  "Configuration (the `auto` preset, with the plan and final reviews single-model): workflow_mode full, review_strategy local,",
  "review_policy final-pr-only, planning_docs_review disabled, final_agent_review enabled with final_review_mode single-model,",
  "plan_generation_mode single-model, session_policy continuous, artifact_lifecycle commit-and-clean.",
  "Use these values as given; do not ask me to confirm them.",
  "",
  TASK_DESCRIPTION,
].join("\n");

describe("PAW v1 baseline: autonomous run with the same task", { skip: !ENABLED, timeout: RUN_TIMEOUT + 180_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let baseHead: string;
  let runError: unknown;
  let v1Dir: string;

  before(async () => {
    v1Dir = mkdtempSync(join(tmpdir(), "paw-v1-baseline-"));
    execSync(`git worktree add --detach "${v1Dir}" ${V1_REF}`, { cwd: getRepoRoot(), stdio: "pipe" });
    const agentPrompt = renderCliAgentPrompt(readFileSync(join(v1Dir, "agents/PAW.agent.md"), "utf-8"));

    ({ ctx, todos, baseHead, runError } = await runV2Task({
      label: "v1",
      systemPrompt: `${HOST_INSTRUCTIONS}\n\n${agentPrompt}`,
      skillDirectories: [join(v1Dir, "skills")],
      task: TASK,
    }));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
    if (v1Dir) {
      try {
        execSync(`git worktree remove --force "${v1Dir}"`, { cwd: getRepoRoot(), stdio: "pipe" });
      } catch {
        await rm(v1Dir, { recursive: true, force: true });
      }
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("the feature is implemented and its tests pass", () => {
    execSync("npm run build --silent --if-present && npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
    const app = execSync("cat src/app.ts", { cwd: ctx.fixture.workDir }).toString();
    assert.match(app, /stats/i);
  });

  it("prints observations for comparison with the v2 run", async () => {
    const git = simpleGit(ctx.fixture.workDir);
    const usage = ctx.events.usage();
    const bash = allBashFor(ctx);

    const status = (await git.raw(["status", "--short", "README.md"])).trim();
    const readmeCommits = (await git.raw(["log", "--format=%h", `${baseHead}..HEAD`, "--", "README.md"])).trim();
    const log = (await git.raw(["log", "--format=%H%x00%B%x01", `${baseHead}..HEAD`])).split("\x01").map((s) => s.trim()).filter(Boolean);
    const withoutTrailer = log.filter((e) => !e.split("\x00")[1].split("\n").some((l) => l.trim() === COMMIT_TRAILER));
    const workRoot = join(ctx.fixture.workDir, ".paw/work");
    const workIds = await readdir(workRoot).catch(() => [] as string[]);
    const branch = (await git.branch()).current;
    const remoteFiles = (await git.raw(["ls-tree", "-r", "--name-only", `origin/${branch}`]).catch(() => "")).split("\n");
    const leaked = remoteFiles.filter((f) => f.startsWith(".paw/work/") && !f.startsWith(`.paw/work/${OTHER_WORK_ID}/`));
    const prCreates = (await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length;

    const observations = {
      elapsedMs: ctx.events.elapsedMs(),
      userQuestionsAsked: ctx.answerer.log.length,
      skillsInvoked: ctx.events.skillsInvoked(),
      subagentsStarted: ctx.events.subagentsStarted().map((s) => s.agentName),
      hostCalls: usage.host.calls,
      hostTokens: { input: usage.host.inputTokens, output: usage.host.outputTokens },
      subagentCalls: usage.subagents.calls,
      subagentTokens: { input: usage.subagents.inputTokens, output: usage.subagents.outputTokens },
      peakHostInputTokens: ctx.events.peakHostInputTokens(),
      todoNodes: todos.nodes.length,
      openTodos: todos.open().map((n) => n.id),
      writeAgentCalls: ctx.events.hostToolStarts().filter((t) => t.toolName === "write_agent").length,
      prCreateCallsInStubLog: prCreates,
      hostSourceEdits: ctx.events
        .hostToolStarts()
        .filter((t) => ["create", "edit", "apply_patch", "str_replace_editor"].includes(t.toolName))
        .map((t) => String(t.arguments.path ?? ""))
        .filter((p) => /\/(src|tests)\//.test(p)),
      subagentPushesOrPrs: bash.filter((c) => c.fromSubagent && (gitCmd("push\\b").test(c.command) || /\bgh"?\s+pr\s+create\b(?!\s+--help)/.test(c.command))).length,
      broadStaging: bash.filter((c) => BROAD_STAGING.test(c.command)).length,
      readmeStatus: status,
      readmeCommittedByWorkflow: readmeCommits !== "",
      workflowCommits: log.length,
      commitsWithoutProjectTrailer: withoutTrailer.length,
      newWorkDirs: workIds.filter((d) => d !== OTHER_WORK_ID),
      otherWorkDirTracked: (await git.raw(["ls-files", `.paw/work/${OTHER_WORK_ID}`])).trim() !== "",
      artifactsLeakedOnPushedBranch: leaked,
    };
    console.log("[v1] observations:", JSON.stringify(observations, null, 2));
    assert.ok(true);
  });
});
