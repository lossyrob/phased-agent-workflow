/**
 * PAW v2 scenario: `artifact_lifecycle: never-commit` (invariant G5).
 *
 * One autonomous run; no workflow artifact may enter any commit or the pushed
 * branch, the artifacts stay on disk, and the PR is still created.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { access } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { readTodoGraph, type TodoGraph } from "../../lib/todos.js";
import { ENABLED, RUN_TIMEOUT, logRun, prCreates, startScenario, workDir } from "../../lib/v2-scenarios.js";

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  "Configuration: artifact lifecycle never-commit; everything else default.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

describe("PAW v2: never-commit artifact lifecycle", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let baseHead: string;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    ({ ctx, baseHead } = await startScenario({
      name: "v2-never-commit",
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

  it("G5: no commit made during the run touches .paw/", async () => {
    const commits = (await git().raw(["log", "--format=%h %s", `${baseHead}..HEAD`])).trim();
    assert.ok(commits, "Expected implementation commits");
    const names = (await git().raw(["log", "--name-only", "--format=", `${baseHead}..HEAD`])).split("\n").filter(Boolean);
    const leaked = names.filter((f) => f.startsWith(".paw/"));
    assert.deepStrictEqual(leaked, [], `Commits:\n${commits}`);
  });

  it("G5: the pushed branch carries no .paw/ files", async () => {
    const branch = (await git().branch()).current;
    const remoteFiles = (await git().raw(["ls-tree", "-r", "--name-only", `origin/${branch}`])).split("\n");
    assert.deepStrictEqual(remoteFiles.filter((f) => f.startsWith(".paw/")), []);
    assert.ok(remoteFiles.includes("src/app.ts"), "The pushed branch should contain the implementation");
  });

  it("artifacts exist on disk and are untracked", async () => {
    const dir = await workDir(ctx);
    for (const f of ["WorkflowContext.md", "ImplementationPlan.md", "reviews/REVIEW.md"]) {
      await access(join(dir, f)).catch(() => assert.fail(`Missing artifact ${f}`));
    }
    assert.strictEqual((await git().raw(["ls-files", ".paw/"])).trim(), "", "No .paw/ file may be tracked");
  });

  it("the host still opens exactly one PR, and no todo is left open", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent, "PR must be created by the host");
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });
});
