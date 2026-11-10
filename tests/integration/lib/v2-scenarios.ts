/**
 * Shared setup and trace queries for the PAW v2 scenario suites.
 *
 * Each scenario runs the workflow skill once on the minimal-ts fixture with a
 * local bare `origin` and a stub `gh` reached through command rewriting (never
 * through PATH), then asserts on the recorded trace, TODO graph, git state and
 * artifacts.
 */
import { execSync } from "child_process";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { createTestContext, type TestContext } from "./harness.js";
import { RuleBasedAnswerer, type Answerer } from "./answerer.js";
import { TestFixture, rewriteGhCommand } from "./fixtures.js";
import { getRepoRoot } from "./skills.js";
import type { ToolStart } from "./events.js";
import { readTodoGraph, type TodoGraph } from "./todos.js";
import { ToolPolicy } from "./tool-policy.js";

export const ENABLED = process.env.PAW_TEST_V2 === "1";
export const RUN_TIMEOUT = parseInt(process.env.PAW_TEST_V2_TIMEOUT || "1500000", 10);
export const WORKFLOW_SKILL = "paw-workflow";

export interface Scenario {
  ctx: TestContext;
  baseHead: string;
}

/**
 * Clone the fixture, install dependencies, add a local origin and a stub gh, and open a session.
 *
 * `prepare` runs after the origin exists and before the session opens (for seeding state).
 * `writableRoots` adds paths outside the checkout that file tools may write (for worktrees).
 */
export async function startScenario(opts: {
  name: string;
  hostInstructions: string;
  answerer: Answerer;
  prepare?: (fixture: TestFixture) => Promise<void>;
  writableRoots?: (fixture: TestFixture) => string[];
}): Promise<Scenario> {
  const fixture = await TestFixture.clone("minimal-ts");
  execSync("npm install --silent", { cwd: fixture.workDir, stdio: "pipe" });
  const baseHead = (await simpleGit(fixture.workDir).raw(["rev-parse", "HEAD"])).trim();
  await fixture.addLocalRemote();
  const { stubPath } = await fixture.installGhStub();
  await opts.prepare?.(fixture);

  const ctx = await createTestContext({
    fixture,
    skillOrAgent: opts.name,
    systemPrompt: opts.hostInstructions,
    answerer: opts.answerer,
    skillDirectories: [join(getRepoRoot(), "skills")],
    toolPolicy: new ToolPolicy(fixture.workDir, opts.writableRoots?.(fixture) ?? [], { allowRemoteWrites: true }),
    rewriteCommand: (command) => rewriteGhCommand(command, stubPath),
  });
  return { ctx, baseHead };
}

export interface ScenarioRun extends Scenario {
  todos: TodoGraph;
  runError: unknown;
}

/** Start a scenario, send one task prompt, and read the TODO graph afterwards. */
export async function runScenario(opts: {
  name: string;
  hostInstructions: string;
  task: string;
  answerer?: Answerer;
}): Promise<ScenarioRun> {
  const { ctx, baseHead } = await startScenario({
    name: opts.name,
    hostInstructions: opts.hostInstructions,
    answerer: opts.answerer ?? new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false),
  });
  let runError: unknown;
  try {
    await ctx.session.sendAndWait({ prompt: opts.task }, RUN_TIMEOUT);
  } catch (err) {
    runError = err;
  }
  const todos = readTodoGraph(ctx.session.sessionId);
  logRun(ctx, todos);
  return { ctx, baseHead, todos, runError };
}

export function logRun(ctx: TestContext, todos: TodoGraph): void {
  console.log("[v2] run summary:", JSON.stringify(ctx.events.summary(), null, 2));
  console.log("[v2] todo graph:\n" + (todos.describe() || "(empty)"));
}

export function argText(args: Record<string, unknown>): string {
  return JSON.stringify(args);
}

/** Result text of a finished tool call, or "" if it has not completed. */
export function toolResult(ctx: TestContext, toolCallId: string): string {
  const done = ctx.events.ofType("tool.execution_complete").find((e) => String(e.data.toolCallId) === toolCallId);
  return done ? JSON.stringify(done.data.result ?? "") : "";
}

/** Host `task` calls that the runtime accepted, optionally filtered by their prompt. */
export function hostTasks(ctx: TestContext, prompt?: RegExp): Array<ToolStart & { index: number; prompt: string }> {
  return ctx.events
    .toolStarts()
    .map((t, index) => ({ ...t, index, prompt: String(t.arguments.prompt ?? "") }))
    .filter((t) => !t.parentToolCallId && t.toolName === "task")
    .filter((t) => !/Invalid input/.test(toolResult(ctx, t.toolCallId)))
    .filter((t) => !prompt || prompt.test(t.prompt));
}

export const PLAN_ACTIVITY = /^Activity:\s*plan\s*$/im;
export const IMPLEMENT_ACTIVITY = /^Activity:\s*implement\b/im;
export const REVIEW_ACTIVITY = /^Activity:\s*review\b/im;
export const SPECIFY_ACTIVITY = /^Activity:\s*specify\b/im;
export const RESEARCH_ACTIVITY = /^Activity:\s*research\b/im;

/** First lines of every host `task` prompt, for assertion messages. */
export function taskHeads(ctx: TestContext): string {
  return hostTasks(ctx).map((t) => `  [${t.index}] ${t.prompt.slice(0, 160).replace(/\n/g, " | ")}`).join("\n");
}

/** Host `task` calls not started in background mode (and so unreachable for follow-up revisions). */
export function notBackground(tasks: Array<ToolStart & { prompt: string }>): string[] {
  return tasks.filter((t) => t.arguments.mode !== "background").map((t) => `mode=${String(t.arguments.mode)}: ${t.prompt.slice(0, 80)}`);
}

/** Trace index of each host `skill` call that loaded `name`. */
export function hostSkillLoads(ctx: TestContext, name: string): number[] {
  return ctx.events
    .toolStarts()
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => !t.parentToolCallId && t.toolName === "skill" && argText(t.arguments).includes(name))
    .map(({ index }) => index);
}

/** Wall-clock time of the first host `gh pr create`, or undefined. */
export function prCreateTime(ctx: TestContext): number | undefined {
  return ctx.events
    .ofType("tool.execution_start")
    .find((e) => !e.data.parentToolCallId && e.data.toolName === "bash" && /\bgh"?\s+pr\s+create\b(?!\s+--help)/.test(String((e.data.arguments as Record<string, unknown> | undefined)?.command ?? "")))?.at;
}

/** Review files (name, creation and modification time) under the work directory's reviews/ subdirectory `sub`. */
export async function reviewFiles(
  ctx: TestContext,
  sub = "",
): Promise<Array<{ name: string; path: string; createdMs: number; mtimeMs: number; size: number }>> {
  const dir = join(await workDir(ctx), "reviews", sub);
  const names = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".md"));
  return Promise.all(
    names.map(async (name) => {
      const s = await stat(join(dir, name));
      return { name, path: join(dir, name), createdMs: s.birthtimeMs || s.mtimeMs, mtimeMs: s.mtimeMs, size: s.size };
    }),
  );
}

/** Contents of a work-directory artifact, or "" if it is missing. */
export async function readArtifact(ctx: TestContext, rel: string): Promise<string> {
  return readFile(join(await workDir(ctx), rel), "utf-8").catch(() => "");
}

/** Index of the first SQL statement marking `id` done (an UPDATE, or an INSERT that creates it already done), or -1. */
export function markedDoneAt(ctx: TestContext, id: string): number {
  const update = new RegExp(`UPDATE\\s+todos\\s+SET\\s+status\\s*=\\s*'done'[^;]*'${id}'`, "i");
  const insert = new RegExp(`INSERT\\s+INTO\\s+todos[^;]*\\(\\s*'${id}'\\s*,\\s*'[^']*'\\s*,\\s*'[^']*'\\s*,\\s*'done'\\s*\\)`, "i");
  return ctx.events
    .toolStarts()
    .findIndex((t) => t.toolName === "sql" && !t.parentToolCallId && (update.test(String(t.arguments.query ?? "")) || insert.test(String(t.arguments.query ?? ""))));
}

/** Every bash command with its position in the trace. */
export function bashCalls(ctx: TestContext): Array<{ command: string; fromSubagent: boolean; index: number }> {
  return ctx.events
    .toolStarts()
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => t.toolName === "bash")
    .map(({ t, index }) => ({ command: String(t.arguments.command ?? ""), fromSubagent: !!t.parentToolCallId, index }));
}

/** `gh pr create` commands that ran; a command the runtime refused to run ("Command blocked") never reached gh. */
export function prCreates(ctx: TestContext): Array<{ command: string; fromSubagent: boolean; index: number }> {
  const starts = ctx.events.toolStarts();
  const blocked = (index: number) => {
    const done = ctx.events.ofType("tool.execution_complete").find((e) => String(e.data.toolCallId) === starts[index].toolCallId);
    return /Command blocked/.test(JSON.stringify(done?.data.error ?? ""));
  };
  return bashCalls(ctx).filter((c) => /\bgh"?\s+pr\s+create\b(?!\s+--help)/.test(c.command) && !blocked(c.index));
}

/** Trace index of the first tool call whose arguments mention `pattern`, or -1. */
export function firstMention(ctx: TestContext, pattern: RegExp): number {
  return ctx.events.toolStarts().findIndex((t) => pattern.test(argText(t.arguments)));
}

/** The single new work directory under .paw/work/. */
export async function workDir(ctx: TestContext): Promise<string> {
  const root = join(ctx.fixture.workDir, ".paw/work");
  const ids = await readdir(root);
  if (ids.length !== 1) {
    throw new Error(`Expected one work directory, got ${JSON.stringify(ids)}`);
  }
  return join(root, ids[0]);
}

/** Query text of every `sql` tool call. */
export function sqlQueries(ctx: TestContext): Array<{ query: string; fromSubagent: boolean }> {
  return ctx.events
    .toolStarts()
    .filter((t) => t.toolName === "sql")
    .map((t) => ({ query: String(t.arguments.query ?? argText(t.arguments)), fromSubagent: !!t.parentToolCallId }));
}

/** A todo by its exact id, falling back to a pattern. */
export function todo(todos: TodoGraph, id: string, fallback: RegExp) {
  return todos.nodes.find((n) => n.id === id) ?? todos.find(fallback);
}

/** Every host message the model produced, in order. */
export function assistantMessages(ctx: TestContext): string[] {
  return ctx.events
    .ofType("assistant.message")
    .filter((e) => !e.data.parentToolCallId)
    .map((e) => String(e.data.content ?? ""));
}

/** Commands that rewrite history (G12). */
export const REWRITE_COMMAND =
  /\bgit\s+(commit-tree|update-ref|rebase|filter-branch)\b|\bgit\s+commit\b[^\n]*--amend|\bgit\s+reset\s+--hard|\bgit\s+push\b[^\n]*(--force|\s-f\b)/;

/** Host `view` calls (or shell reads) of a skill reference file whose path ends with `rel`. */
export function referenceReads(ctx: TestContext, rel: string): number[] {
  const re = new RegExp(rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return ctx.events
    .toolStarts()
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => !t.parentToolCallId && ["view", "bash"].includes(t.toolName) && re.test(argText(t.arguments)))
    .map(({ index }) => index);
}
