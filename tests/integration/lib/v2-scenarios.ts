/**
 * Shared setup and trace queries for the PAW v2 scenario suites.
 *
 * Each scenario runs the workflow skill once on the minimal-ts fixture with a
 * local bare `origin` and a stub `gh` reached through command rewriting (never
 * through PATH), then asserts on the recorded trace, TODO graph, git state and
 * artifacts.
 */
import { execSync } from "child_process";
import { readdir } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import { createTestContext, type TestContext } from "./harness.js";
import type { Answerer } from "./answerer.js";
import { TestFixture, rewriteGhCommand } from "./fixtures.js";
import { getRepoRoot } from "./skills.js";
import type { ToolStart } from "./events.js";
import type { TodoGraph } from "./todos.js";
import { ToolPolicy } from "./tool-policy.js";

export const ENABLED = process.env.PAW_TEST_V2 === "1";
export const RUN_TIMEOUT = parseInt(process.env.PAW_TEST_V2_TIMEOUT || "1500000", 10);
export const WORKFLOW_SKILL = "paw-workflow";

export interface Scenario {
  ctx: TestContext;
  baseHead: string;
}

/** Clone the fixture, install dependencies, add a local origin and a stub gh, and open a session. */
export async function startScenario(opts: {
  name: string;
  hostInstructions: string;
  answerer: Answerer;
}): Promise<Scenario> {
  const fixture = await TestFixture.clone("minimal-ts");
  execSync("npm install --silent", { cwd: fixture.workDir, stdio: "pipe" });
  const baseHead = (await simpleGit(fixture.workDir).raw(["rev-parse", "HEAD"])).trim();
  await fixture.addLocalRemote();
  const { stubPath } = await fixture.installGhStub();

  const ctx = await createTestContext({
    fixture,
    skillOrAgent: opts.name,
    systemPrompt: opts.hostInstructions,
    answerer: opts.answerer,
    skillDirectories: [join(getRepoRoot(), "skills")],
    toolPolicy: new ToolPolicy(fixture.workDir, [], { allowRemoteWrites: true }),
    rewriteCommand: (command) => rewriteGhCommand(command, stubPath),
  });
  return { ctx, baseHead };
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
export const IMPLEMENT_ACTIVITY = /^Activity:\s*implement\s*$/im;
export const REVIEW_ACTIVITY = /^Activity:\s*review\s*$/im;

/** Every bash command with its position in the trace. */
export function bashCalls(ctx: TestContext): Array<{ command: string; fromSubagent: boolean; index: number }> {
  return ctx.events
    .toolStarts()
    .map((t, index) => ({ t, index }))
    .filter(({ t }) => t.toolName === "bash")
    .map(({ t, index }) => ({ command: String(t.arguments.command ?? ""), fromSubagent: !!t.parentToolCallId, index }));
}

export function prCreates(ctx: TestContext): Array<{ command: string; fromSubagent: boolean; index: number }> {
  return bashCalls(ctx).filter((c) => /\bgh"?\s+pr\s+create\b/.test(c.command));
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
