/**
 * A PAW v2 work item in progress, for the resume and rewind suites.
 *
 * On top of the minimal-ts fixture:
 * - base branch: `.gitignore` (node_modules, dist) and an unrelated earlier work item;
 * - target branch `feature/request-stats`: WorkflowContext.md and a two-unit plan in
 *   one commit, then Unit 1 (request counter middleware and its test) in a second.
 *
 * Unit 2 (GET /stats) is not implemented. Final review is single-model, plan review off.
 *
 * With `format: "v1"` the work item is one PAW v1 left behind: a v1 WorkflowContext.md
 * (full mode, PRs strategy, milestones), Spec.md and CodeResearch.md, and a v1 plan with
 * `## Phase N:` sections whose Phase 1 is checked off.
 */
import { execFileSync } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { simpleGit } from "simple-git";
import type { TestFixture } from "./fixtures.js";

export const SEED_WORK_ID = "request-stats";
export const SEED_TARGET = "feature/request-stats";
export const SEED_OTHER_WORK_ID = "unrelated-earlier-work";
export const SEED_PLAN_PATH = `.paw/work/${SEED_WORK_ID}/ImplementationPlan.md`;

export interface SeededWork {
  baseBranch: string;
  /** Base branch HEAD after the seed's base commits. */
  baseHead: string;
  planCommit: string;
  unit1Commit: string;
  /** Target branch HEAD after seeding. */
  seedHead: string;
  planText: string;
}

const WORKFLOW_CONTEXT = (base: string) => `# WorkflowContext

- Work title: Request Stats
- Work id: ${SEED_WORK_ID}
- Task source: prompt
- Base branch: ${base}
- Target branch: ${SEED_TARGET}
- Preset: standard

## Configuration

\`\`\`yaml
shaping: off
spec: off
research: inline
planning:
  models: [session]
plan_review:
  mode: off
plan_checkpoint: off
implementation:
  phases: auto
  parallel: off
  model: session
phase_review: off
final_review:
  mode: single-model
artifact_lifecycle: commit-and-clean
execution_mode: current-checkout
instructions: none
\`\`\`
`;

const PLAN = `# Request Stats Implementation Plan

## Summary
Count every request the Express app serves with a middleware, and expose the total at GET /stats as JSON \`{ "requestCount": N }\`.

## Sources
- Task (prompt): add request counting to the Express app. Count every request served and expose the total at GET /stats as JSON \`{ "requestCount": N }\`. Add a test for the endpoint.

## Findings
- \`src/app.ts:3\` creates the Express app; \`src/app.ts:5\` defines the only route, GET /.
- \`package.json\` runs tests with \`node --test tests/*.test.js\`; tests are CommonJS and load compiled code from \`dist/\`.

## Decisions
- The counter is an in-memory module-level integer; no persistence.
- \`npm test\` builds with \`tsc\` first so tests load \`dist/\`.

## Units
### Unit 1: Request counter middleware
- Depends on: none
- Changes: create \`src/requestCounter.ts\` exporting \`requestCounter\` (middleware that increments the count), \`getRequestCount()\` and \`resetRequestCount()\`; register the middleware in \`src/app.ts\` before all routes; make the \`test\` script run \`tsc\` first.
- Tests: \`tests/requestCounter.test.js\` checks that each call increments the count.
- Done when: \`npm test\` passes.

### Unit 2: GET /stats endpoint
- Depends on: Unit 1
- Changes: add GET /stats to \`src/app.ts\`, responding \`{ "requestCount": getRequestCount() }\`.
- Tests: \`tests/stats.test.js\` starts the app on an ephemeral port, makes requests, and checks the JSON count.
- Done when: \`npm test\` passes.

## Out of scope
- Persisting counts across restarts; per-route counts.
`;

/** A v1 WorkflowContext.md (paw-init format): full mode, PRs strategy, milestones, single-model final review. */
const V1_WORKFLOW_CONTEXT = (base: string) => `# WorkflowContext

Work Title: Request Stats
Work ID: ${SEED_WORK_ID}
Base Branch: ${base}
Target Branch: ${SEED_TARGET}
Execution Mode: current-checkout
Repository Identity: none
Execution Binding: none
Workflow Mode: full
Review Strategy: prs
Review Policy: milestones
Session Policy: per-stage
Final Agent Review: enabled
Final Review Mode: single-model
Final Review Interactive: smart
Final Review Models: latest GPT
Final Review Specialists: all
Final Review Interaction Mode: parallel
Final Review Specialist Models: none
Final Review Perspectives: auto
Final Review Perspective Cap: 2
Implementation Model: none
Plan Generation Mode: single-model
Plan Generation Models: latest GPT, latest Gemini, latest Claude Opus
Planning Docs Review: disabled
Planning Review Mode: multi-model
Planning Review Interactive: smart
Planning Review Models: latest GPT, latest Gemini, latest Claude Opus
Custom Workflow Instructions: none
Initial Prompt: Add request counting to the Express app. Count every request served and expose the total at GET /stats as JSON { "requestCount": N }. Add a test for the endpoint.
Issue URL: none
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: none
`;

const V1_SPEC = `# Request Stats Specification

## Overview
Operators need to know how much traffic the Express app serves. The app counts every request it serves and reports the total at GET /stats.

## User Stories
- As an operator, I can call GET /stats and read the number of requests served since the process started.

## Functional Requirements
- FR-001: Every request the app serves increments an in-memory counter.
- FR-002: GET /stats responds with JSON \`{ "requestCount": N }\`, where N is the current count.
- FR-003: A test covers the endpoint.

## Success Criteria
- SC-001: After two requests to GET /, GET /stats reports a count of at least 2.

## Out of Scope
- Persisting counts across restarts; per-route counts.
`;

const V1_CODE_RESEARCH = `# Code Research: Request Stats

## Findings
- \`src/app.ts:3\` creates the Express app; \`src/app.ts:5\` defines the only route, GET /.
- \`package.json\` runs tests with \`node --test tests/*.test.js\`; tests are CommonJS and load compiled code from \`dist/\`.
- No middleware is registered today (\`src/app.ts:3-9\`).
`;

const V1_PLAN = `# Request Stats Implementation Plan

## Overview
Count every request the Express app serves with a middleware, and expose the total at GET /stats as JSON \`{ "requestCount": N }\`.

## Current State Analysis
- \`src/app.ts:3\` creates the Express app; \`src/app.ts:5\` defines the only route, GET /.
- Tests are CommonJS and load compiled code from \`dist/\`.

## Desired End State
GET /stats returns the number of requests served, and \`npm test\` covers it.

## What We're NOT Doing
- Persisting counts across restarts; per-route counts.

## Phase Status
- [x] **Phase 1: Request counter middleware** - Count every request
- [ ] **Phase 2: GET /stats endpoint** - Expose the count

---

## Phase 1: Request counter middleware

### Changes Required:

#### 1. Counter module
**File**: \`src/requestCounter.ts\`
**Changes**: export \`requestCounter\` (middleware that increments the count), \`getRequestCount()\` and \`resetRequestCount()\`.

#### 2. App wiring
**File**: \`src/app.ts\`
**Changes**: register the middleware before all routes. Make the \`test\` script run \`tsc\` first.

#### 3. Tests
**File**: \`tests/requestCounter.test.js\`
**Changes**: check that each call increments the count.

### Success Criteria:

#### Automated Verification:
- [x] Tests pass: \`npm test\`

---

## Phase 2: GET /stats endpoint

### Changes Required:

#### 1. Endpoint
**File**: \`src/app.ts\`
**Changes**: add GET /stats responding \`{ "requestCount": getRequestCount() }\`.

#### 2. Tests
**File**: \`tests/stats.test.js\`
**Changes**: start the app on an ephemeral port, make requests, and check the JSON count.

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: \`npm test\`
- [ ] GET /stats returns the count as JSON
`;

const COUNTER_TS = `import type { NextFunction, Request, Response } from "express";

let count = 0;

export function requestCounter(_req: Request, _res: Response, next: NextFunction): void {
  count += 1;
  next();
}

export function getRequestCount(): number {
  return count;
}

export function resetRequestCount(): void {
  count = 0;
}
`;

const COUNTER_TEST = `const assert = require("node:assert");
const { describe, it } = require("node:test");
const { requestCounter, getRequestCount, resetRequestCount } = require("../dist/requestCounter.js");

describe("requestCounter", () => {
  it("increments once per request", () => {
    resetRequestCount();
    requestCounter({}, {}, () => {});
    requestCounter({}, {}, () => {});
    assert.strictEqual(getRequestCount(), 2);
  });
});
`;

/** Build the seeded work item. Leaves the checkout on the target branch or the base branch. */
export async function seedInProgressWork(
  fixture: TestFixture,
  checkout: "target" | "base",
  format: "v2" | "v1" = "v2",
): Promise<SeededWork> {
  const dir = fixture.workDir;
  const git = simpleGit(dir);
  const baseBranch = (await git.branch()).current;

  await writeFile(join(dir, ".gitignore"), "node_modules/\ndist/\n");
  const other = join(dir, ".paw/work", SEED_OTHER_WORK_ID);
  await mkdir(other, { recursive: true });
  await writeFile(join(other, "ImplementationPlan.md"), "# Earlier work\n\nUnrelated to the current task.\n");
  await git.add([".gitignore", `.paw/work/${SEED_OTHER_WORK_ID}/ImplementationPlan.md`]);
  await git.commit("Add .gitignore and unrelated earlier work artifacts");
  const baseHead = (await git.revparse(["HEAD"])).trim();
  await git.raw(["push", "origin", baseBranch]).catch(() => undefined);

  await git.checkoutLocalBranch(SEED_TARGET);
  const work = join(dir, ".paw/work", SEED_WORK_ID);
  await mkdir(work, { recursive: true });
  const planText = format === "v1" ? V1_PLAN : PLAN;
  await writeFile(join(work, "WorkflowContext.md"), format === "v1" ? V1_WORKFLOW_CONTEXT(baseBranch) : WORKFLOW_CONTEXT(baseBranch));
  await writeFile(join(work, "ImplementationPlan.md"), planText);
  const artifacts = [`.paw/work/${SEED_WORK_ID}/WorkflowContext.md`, SEED_PLAN_PATH];
  if (format === "v1") {
    await writeFile(join(work, "Spec.md"), V1_SPEC);
    await writeFile(join(work, "CodeResearch.md"), V1_CODE_RESEARCH);
    artifacts.push(`.paw/work/${SEED_WORK_ID}/Spec.md`, `.paw/work/${SEED_WORK_ID}/CodeResearch.md`);
  }
  await git.add(artifacts);
  await git.commit("Add PAW workflow context and implementation plan for request-stats");
  const planCommit = (await git.revparse(["HEAD"])).trim();

  await writeFile(join(dir, "src/requestCounter.ts"), COUNTER_TS);
  const app = await readFile(join(dir, "src/app.ts"), "utf-8");
  await writeFile(
    join(dir, "src/app.ts"),
    app
      .replace('import express from "express";\n', 'import express from "express";\nimport { requestCounter } from "./requestCounter";\n')
      .replace("const app = express();\n", "const app = express();\n\napp.use(requestCounter);\n"),
  );
  const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf-8"));
  pkg.scripts.test = "tsc && node --test tests/*.test.js";
  await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  await writeFile(join(dir, "tests/requestCounter.test.js"), COUNTER_TEST);
  execFileSync("npm", ["test", "--silent"], { cwd: dir, stdio: "pipe" });
  await git.add(["src/requestCounter.ts", "src/app.ts", "package.json", "tests/requestCounter.test.js"]);
  await git.commit(format === "v1" ? "Phase 1: Add request counter middleware" : "Add request counter middleware (Unit 1)");
  const unit1Commit = (await git.revparse(["HEAD"])).trim();

  if (checkout === "base") {
    await git.checkout(baseBranch);
  }
  return { baseBranch, baseHead, planCommit, unit1Commit, seedHead: unit1Commit, planText };
}

/** True when `ancestor` is reachable from `ref`. */
export async function isAncestor(dir: string, ancestor: string, ref: string): Promise<boolean> {
  try {
    await simpleGit(dir).raw(["merge-base", "--is-ancestor", ancestor, ref]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compile the checkout's `src/` under node_modules/ (ignored, and where `express`
 * resolves), start the app on an ephemeral port,
 * make the given GET requests in order, and return each JSON body (or status text).
 */
export async function probeApp(dir: string, paths: string[]): Promise<unknown[]> {
  const out = join(dir, "node_modules", `.paw-probe-${Date.now()}`);
  try {
    execFileSync("npx", ["tsc", "--outDir", out], { cwd: dir, stdio: "pipe" });
    const script = `
      const mod = require(${JSON.stringify(join(out, "app.js"))});
      const app = mod.default || mod;
      const server = app.listen(0, async () => {
        const port = server.address().port;
        const results = [];
        for (const p of ${JSON.stringify(paths)}) {
          const r = await fetch("http://127.0.0.1:" + port + p);
          const text = await r.text();
          try { results.push(JSON.parse(text)); } catch { results.push(r.status + " " + text.slice(0, 80)); }
        }
        console.log(JSON.stringify(results));
        server.close();
      });
    `;
    const stdout = execFileSync("node", ["-e", script], { cwd: dir, stdio: "pipe", timeout: 30_000 }).toString();
    const last = stdout.trim().split("\n").pop() ?? "[]";
    return JSON.parse(last) as unknown[];
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}
