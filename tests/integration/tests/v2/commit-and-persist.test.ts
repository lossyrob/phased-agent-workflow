/**
 * PAW v2 scenario: `artifact_lifecycle: commit-and-persist` (G5, G6) with final
 * PR procedure and status checks (G4, G10).
 *
 * One autonomous run. Workflow artifacts stay tracked through the final PR: no
 * stop-tracking commit and no `git rm` on `.paw/`. Scratch ignore markers are
 * never committed. The PR is created only after the final PR procedure is read,
 * and the reported PR URL is the one live state returns.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { basename } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { readTodoGraph, type TodoGraph } from "../../lib/todos.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import {
  ENABLED,
  RUN_TIMEOUT,
  assistantMessages,
  bashCalls,
  logRun,
  prCreates,
  referenceReads,
  startScenario,
  workDir,
} from "../../lib/v2-scenarios.js";
import { gitCmd } from "../../lib/shell-match.js";

const STUB_PR_URL = "https://github.com/example/fixture/pull/1";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  "Configuration: artifact lifecycle commit-and-persist, plan review off, final review single-model; everything else default.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

describe("PAW v2: commit-and-persist artifact lifecycle", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let baseHead: string;
  let todos: TodoGraph;
  let runError: unknown;
  let workId: string;

  before(async () => {
    ({ ctx, baseHead } = await startScenario({
      name: "v2-commit-and-persist",
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
    workId = basename(await workDir(ctx).catch(() => "unknown"));
    const log = await simpleGit(ctx.fixture.workDir).raw(["log", "--format=%h %s", "--name-status", `${baseHead}..HEAD`]).catch(() => "");
    console.log("[v2] commits:\n" + log);
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  const git = () => simpleGit(ctx.fixture.workDir);

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("G5: the pushed branch tracks the work item's artifacts", async () => {
    const branch = (await git().branch()).current;
    const remote = (await git().raw(["ls-tree", "-r", "--name-only", `origin/${branch}`])).split("\n");
    for (const f of ["WorkflowContext.md", "ImplementationPlan.md"]) {
      assert.ok(remote.includes(`.paw/work/${workId}/${f}`), `origin/${branch} lacks .paw/work/${workId}/${f}`);
    }
    assert.ok(remote.includes("src/app.ts"));
  });

  it("G5: no stop-tracking step ran: no git rm on .paw/ and no commit removed an artifact", async () => {
    const rms = bashCalls(ctx).filter((c) => gitCmd("rm\\b[^\\n]*\\.paw").test(c.command));
    assert.deepStrictEqual(rms.map((c) => c.command), []);
    const deleted = (await git().raw(["log", "--format=%h %s", "--diff-filter=D", `${baseHead}..HEAD`, "--", ".paw/"])).trim();
    assert.strictEqual(deleted, "", "A commit removed workflow artifacts");
  });

  it("G6: no ignore marker under .paw/ is ever committed", async () => {
    const names = (await git().raw(["log", "--name-only", "--format=", `${baseHead}..HEAD`])).split("\n");
    assert.deepStrictEqual(names.filter((f) => /^\.paw\/.*\.gitignore$/.test(f)), []);
  });

  it("G4: the PR is created by the host after the final PR procedure was read", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    const reads = referenceReads(ctx, "procedures/final-pr.md");
    assert.ok(reads.length > 0 && reads[0] < prs[0].index, "final-pr.md was not read before gh pr create");
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
  });

  it("G10: the PR was read back from live state and the report gives its URL", async () => {
    const prIndex = prCreates(ctx)[0]?.index ?? Infinity;
    // `gh pr view` in a later command, or later in the same command as the create.
    const views = bashCalls(ctx).filter(
      (c) => !c.fromSubagent && c.index >= prIndex && /\bgh"?\s+pr\s+create\b[\s\S]*\bgh"?\s+pr\s+view\b|^(?![\s\S]*\bpr\s+create\b)[\s\S]*\bgh"?\s+pr\s+view\b/.test(c.command),
    );
    assert.ok(views.length > 0, "No gh pr view after creating the PR");
    const last = assistantMessages(ctx).filter(Boolean).pop() ?? "";
    assert.ok(last.includes(STUB_PR_URL), `Final report does not give the live PR URL:\n${last.slice(0, 600)}`);
    const viewed = (await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr view"));
    assert.ok(viewed.length > 0, "The stub gh recorded no pr view");
  });

  it("no todo is left open", () => {
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });
});
