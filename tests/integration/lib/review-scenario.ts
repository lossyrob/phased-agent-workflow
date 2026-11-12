/**
 * Shared setup and trace queries for the PAW Review scenario suites.
 *
 * The minimal-ts fixture gets a seeded pull request: `main` is the base, and
 * `feature/request-count` adds request counting with a middleware-ordering defect and a
 * test that does not exercise the new endpoint. Both branches are pushed to a local bare
 * `origin`; the checkout stays on the PR branch with an uncommitted user change. GitHub is
 * the PAW Review stub `gh` (reached by command rewriting, never through PATH), and every
 * MCP or web tool is denied, so nothing reaches the real GitHub API.
 */
import { execSync } from "child_process";
import { appendFile, readdir, readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { createTestContext, type TestContext } from "./harness.js";
import { RuleBasedAnswerer } from "./answerer.js";
import { TestFixture, rewriteGhCommand, type ReviewStubPr } from "./fixtures.js";
import { getRepoRoot } from "./skills.js";
import { readTodoGraph, type TodoGraph } from "./todos.js";
import { ToolPolicy } from "./tool-policy.js";
import { RUN_TIMEOUT, argText, bashCalls, logRun, toolResult } from "./v2-scenarios.js";

export const PR_BRANCH = "feature/request-count";
export const PR_REPOSITORY = "paw-fixture/review-target";
export const PR_NUMBER = 7;
export const PR_URL = `https://github.com/${PR_REPOSITORY}/pull/${PR_NUMBER}`;
export const USER_NOTE = "User note: do not commit this line.";

export const REVIEW_HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Use the `gh` CLI for all GitHub access. GitHub MCP tools are not available.",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

/** Stage skills the review host delegates to subagents. */
export const DELEGATED_STAGE_SKILLS = [
  "paw-review-understanding",
  "paw-review-baseline",
  "paw-review-feedback",
  "paw-review-critic",
];

const APP_WITH_COUNTING = `import express from "express";

const app = express();
let requestCount = 0;

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/stats", (_req, res) => {
  res.json({ requestCount });
});

// Count every request served.
app.use((_req, _res, next) => {
  requestCount++;
  next();
});

export default app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(\`Server running on port \${port}\`);
  });
}
`;

const STATS_TEST = `const assert = require("node:assert");
const { describe, it } = require("node:test");

describe("stats", () => {
  it("exposes a request count", () => {
    assert.ok(true, "stats endpoint exists");
  });
});
`;

export interface ReviewRun {
  ctx: TestContext;
  todos: TodoGraph;
  runError: unknown;
  pr: ReviewStubPr;
  /** `git for-each-ref` of the checkout and of origin before the session started. */
  refsBefore: { local: string; origin: string };
  /** `git status --short` of the checkout before the session started. */
  statusBefore: string;
}

/** Seed the pull request, start a session with the review skills, send `task`, and read the todo graph. */
export async function runReviewScenario(opts: { name: string; systemPrompt: string; task: string }): Promise<ReviewRun> {
  const fixture = await TestFixture.clone("minimal-ts");
  const git = simpleGit(fixture.workDir);
  execSync("npm install --silent", { cwd: fixture.workDir, stdio: "pipe" });
  await fixture.addLocalRemote();
  const baseRefOid = (await git.raw(["rev-parse", "HEAD"])).trim();

  await git.checkoutLocalBranch(PR_BRANCH);
  await writeFile(join(fixture.workDir, "src/app.ts"), APP_WITH_COUNTING);
  await writeFile(join(fixture.workDir, "tests/stats.test.js"), STATS_TEST);
  await git.add(["src/app.ts", "tests/stats.test.js"]);
  await git.commit("Add request counting and GET /stats");
  await git.raw(["push", "-u", "origin", PR_BRANCH]);
  const headRefOid = (await git.raw(["rev-parse", "HEAD"])).trim();

  // An uncommitted user change outside the PR's files that the review must leave alone.
  await appendFile(join(fixture.workDir, "README.md"), `\n${USER_NOTE}\n`);

  const pr: ReviewStubPr = {
    repository: PR_REPOSITORY,
    number: PR_NUMBER,
    url: PR_URL,
    title: "Add request counting and GET /stats",
    body: "Counts every request the app serves and exposes the total at GET /stats as `{ \"requestCount\": N }`. Adds a test for the endpoint.",
    author: "fixture-contributor",
    baseRefName: "main",
    headRefName: PR_BRANCH,
    baseRefOid,
    headRefOid,
  };
  const { stubPath } = await fixture.installReviewGhStub(pr);
  const refsBefore = await refs(fixture);
  const statusBefore = await fixture.getStatus();

  const ctx = await createTestContext({
    fixture,
    skillOrAgent: opts.name,
    systemPrompt: opts.systemPrompt,
    answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false),
    skillDirectories: [join(getRepoRoot(), "skills")],
    toolPolicy: new ToolPolicy(fixture.workDir, [], { offlineWithGhStub: stubPath }),
    rewriteCommand: (command) => rewriteGhCommand(command, stubPath),
  });

  let runError: unknown;
  try {
    await ctx.session.sendAndWait({ prompt: opts.task }, RUN_TIMEOUT);
  } catch (err) {
    runError = err;
  }
  const todos = readTodoGraph(ctx.session.sessionId);
  logRun(ctx, todos);
  console.log(`[${opts.name}] gh stub log:\n${(await fixture.ghCalls()).join("\n")}`);
  console.log(`[${opts.name}] gh stub state: ${JSON.stringify(await fixture.reviewGhState())}`);
  console.log(`[${opts.name}] gh commands:\n` + ghCommands(ctx).map((c) => `(${c.fromSubagent ? "subagent" : "host"}) ${c.command.slice(0, 300)}`).join("\n----\n"));
  console.log(`[${opts.name}] review files: ${JSON.stringify((await reviewArtifacts(ctx)).map((f) => f.name))}`);
  return { ctx, todos, runError, pr, refsBefore, statusBefore };
}

export async function refs(fixture: TestFixture): Promise<{ local: string; origin: string }> {
  const local = await simpleGit(fixture.workDir).raw(["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/tags"]);
  const origin = await simpleGit(join(fixture.workspaceDir, "origin.git")).raw(["for-each-ref", "--format=%(refname) %(objectname)"]);
  return { local, origin };
}

/** Bash commands that call gh (the stub after rewriting), by host or subagent. */
export function ghCommands(ctx: TestContext) {
  return bashCalls(ctx).filter((c) => /(^|[\s;&|(`"/])gh"?\s/.test(c.command));
}

/** True for a gh command that would change GitHub state. */
export function isGhWrite(command: string): boolean {
  if (/\bgh"?\s+pr\s+(review|comment|edit|merge|close|ready|create)\b/.test(command)) return true;
  if (/\bgh"?\s+issue\s+(comment|create|edit|close)\b/.test(command)) return true;
  if (!/\bgh"?\s+api\b/.test(command)) return false;
  if (/\bgraphql\b/.test(command)) return /\bmutation\b/.test(command);
  if (/(-X|--method)[\s=]+(POST|PUT|PATCH|DELETE)\b/i.test(command)) return true;
  if (/(-X|--method)[\s=]+GET\b/i.test(command)) return false;
  return /\s(-f|-F|--field|--raw-field|--input)\s/.test(command);
}

/** The single review artifact directory under .paw/reviews/. */
export async function reviewDir(ctx: TestContext): Promise<string> {
  const root = join(ctx.fixture.workDir, ".paw/reviews");
  const ids = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  if (ids.length !== 1) {
    throw new Error(`Expected one review directory, got ${JSON.stringify(ids)}`);
  }
  return join(root, ids[0]);
}

export async function reviewArtifacts(ctx: TestContext): Promise<Array<{ name: string; size: number; mtimeMs: number }>> {
  const dir = await reviewDir(ctx).catch(() => "");
  if (!dir) return [];
  const names = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  return Promise.all(names.map(async (name) => {
    const s = await stat(join(dir, name));
    return { name, size: s.size, mtimeMs: s.mtimeMs };
  }));
}

export async function readReviewArtifact(ctx: TestContext, name: string): Promise<string> {
  return readFile(join(await reviewDir(ctx), name), "utf-8").catch(() => "");
}

/** Skill names loaded inside subagents. */
export function subagentSkillLoads(ctx: TestContext): string[] {
  return ctx.events
    .subagentToolStarts()
    .filter((t) => t.toolName === "skill")
    .map((t) => argText(t.arguments));
}

/** Text of every result the host received from a subagent (`task` results and `read_agent` reads). */
export function subagentReturns(ctx: TestContext): string {
  return ctx.events
    .hostToolStarts()
    .filter((t) => t.toolName === "task" || t.toolName === "read_agent")
    .map((t) => toolResult(ctx, t.toolCallId).replace(/\\n/g, "\n"))
    .join("\n");
}

export { RUN_TIMEOUT };
