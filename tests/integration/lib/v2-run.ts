/**
 * Shared setup for the PAW v2 autonomous-run suites (v2 default run and the v1 baseline).
 *
 * Both run the same task against the same fixture: an unrelated earlier work
 * directory, an uncommitted user change to README.md, a local bare remote and a stub
 * `gh` reached only through the harness `rewriteCommand` hook (never through PATH).
 */
import { execSync } from "child_process";
import { mkdir, writeFile, appendFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { createTestContext, type TestContext } from "./harness.js";
import { RuleBasedAnswerer } from "./answerer.js";
import { TestFixture, rewriteGhCommand } from "./fixtures.js";
import { readTodoGraph, type TodoGraph } from "./todos.js";
import { ToolPolicy } from "./tool-policy.js";

export const RUN_TIMEOUT = parseInt(process.env.PAW_TEST_V2_TIMEOUT || "1500000", 10);
export const COMMIT_TRAILER = "Team: acme-platform";
export const OTHER_WORK_ID = "unrelated-earlier-work";

export const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  `- Every commit message must end with the line \`${COMMIT_TRAILER}\`. This applies to commits made by subagents too.`,
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

export const TASK_DESCRIPTION = [
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

export const SOURCE_EDIT_TOOLS = new Set(["create", "edit", "apply_patch", "str_replace_editor"]);

export interface V2Run {
  ctx: TestContext;
  todos: TodoGraph;
  baseHead: string;
  runError: unknown;
}

/** Build the fixture, start a session, send the task, and read the TODO graph afterwards. */
export async function runV2Task(opts: {
  label: string;
  systemPrompt: string;
  skillDirectories: string[];
  task: string;
  timeoutMs?: number;
}): Promise<V2Run> {
  const fixture = await TestFixture.clone("minimal-ts");
  const git = simpleGit(fixture.workDir);

  // A second, unrelated work directory that must survive the run untouched (G3).
  const otherDir = join(fixture.workDir, ".paw/work", OTHER_WORK_ID);
  await mkdir(otherDir, { recursive: true });
  await writeFile(join(otherDir, "ImplementationPlan.md"), "# Earlier work\n\nUnrelated to the current task.\n");
  await git.add(".paw/");
  await git.commit("Add unrelated earlier work artifacts");

  execSync("npm install --silent", { cwd: fixture.workDir, stdio: "pipe" });
  const baseHead = (await git.raw(["rev-parse", "HEAD"])).trim();

  // Local bare origin and a stub gh, so the run can push and open its PR offline.
  await fixture.addLocalRemote();
  const { stubPath } = await fixture.installGhStub();

  // An uncommitted user change that must not be staged, reverted or committed (G2).
  await appendFile(join(fixture.workDir, "README.md"), "\nUser note: do not commit this line.\n");

  const ctx = await createTestContext({
    fixture,
    skillOrAgent: opts.label,
    systemPrompt: opts.systemPrompt,
    answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false),
    skillDirectories: opts.skillDirectories,
    toolPolicy: new ToolPolicy(fixture.workDir, [], { allowRemoteWrites: true }),
    rewriteCommand: (command) => rewriteGhCommand(command, stubPath),
  });

  let runError: unknown;
  try {
    await ctx.session.sendAndWait({ prompt: opts.task }, opts.timeoutMs ?? RUN_TIMEOUT);
  } catch (err) {
    runError = err;
  }
  const todos = readTodoGraph(ctx.session.sessionId);
  printRunSummary(opts.label, ctx, todos);
  await printGitObservations(opts.label, ctx, baseHead);
  return { ctx, todos, baseHead, runError };
}

export function printRunSummary(label: string, ctx: TestContext, todos: TodoGraph): void {
  console.log(`[${label}] run summary:`, JSON.stringify(ctx.events.summary(), null, 2));
  console.log(`[${label}] todo graph:\n` + (todos.describe() || "(empty)"));
  const writeAgent = ctx.events.hostToolStarts().filter((t) => t.toolName === "write_agent").length;
  console.log(`[${label}] write_agent calls by host: ${writeAgent}`);
}

/** Every bash command, by host and subagents. */
export function allBash(ctx: TestContext): Array<{ command: string; fromSubagent: boolean }> {
  return ctx.events
    .toolStarts()
    .filter((t) => t.toolName === "bash")
    .map((t) => ({ command: String(t.arguments.command ?? ""), fromSubagent: !!t.parentToolCallId }));
}

/** Print commit messages and the shell commands that created them, for diagnosing failures. */
export async function printGitObservations(label: string, ctx: TestContext, baseHead: string): Promise<void> {
  const git = simpleGit(ctx.fixture.workDir);
  const log = await git.raw(["log", "--format=--- %h %s%n%b", `${baseHead}..HEAD`]).catch(() => "(git log failed)");
  console.log(`[${label}] workflow commits:\n${log}`);
  const commits = allBash(ctx).filter((c) => /\bgit\s+(-C\s+\S+\s+)?commit\b/.test(c.command));
  console.log(
    `[${label}] commit commands:\n` +
      commits.map((c) => `(${c.fromSubagent ? "subagent" : "host"}) ${c.command}`).join("\n----\n"),
  );
  const ghCalls = await ctx.fixture.ghCalls();
  const prs = ghCalls.filter((c) => c.startsWith("pr create"));
  console.log(`[${label}] gh pr create calls (stub log): ${prs.length}`);
  console.log(`[${label}] gh stub log:\n${ghCalls.join("\n")}`);
  const ghCommands = allBash(ctx).filter((c) => /\bgh"?\s+pr\b/.test(c.command));
  console.log(
    `[${label}] gh pr commands:\n` +
      ghCommands.map((c) => `(${c.fromSubagent ? "subagent" : "host"}) ${c.command.slice(0, 400)}`).join("\n----\n"),
  );
}
