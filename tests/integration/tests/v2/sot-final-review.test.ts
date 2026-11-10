/**
 * PAW v2 scenario: final review configured as society-of-thought (W5, issue 268).
 *
 * A small SoT configuration (two specialists, parallel, no perspectives). The
 * host must load `paw-sot` and run it; the specialist subagents must be real
 * paw-sot specialists writing their own review files, followed by
 * REVIEW-SYNTHESIS.md, and the PR comes after the synthesis. An ad-hoc review
 * (a plain `reviews/REVIEW.md`, or reviewers without specialist personas) fails.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import { destroyTestContext, type TestContext } from "../../lib/harness.js";
import { getRepoRoot } from "../../lib/skills.js";
import type { TodoGraph } from "../../lib/todos.js";
import {
  ENABLED,
  RUN_TIMEOUT,
  hostSkillLoads,
  hostTasks,
  prCreateTime,
  prCreates,
  reviewFiles,
  runScenario,
  todo,
} from "../../lib/v2-scenarios.js";

const SPECIALISTS = ["correctness", "testing"];

const HOST_INSTRUCTIONS = [
  "Project rules for this repository:",
  "- Work autonomously. Do not ask the user questions unless you are blocked.",
].join("\n");

const TASK = [
  "Use the paw-workflow skill to take this task through to a final pull request.",
  "",
  "Configuration: plan review single-model; final review society-of-thought with specialists correctness and testing,",
  "interaction parallel, perspectives none; everything else default.",
  "",
  "Task: add request counting to the Express app. Count every request served and expose the total at",
  "GET /stats as JSON `{ \"requestCount\": N }`. Add a test for the endpoint.",
].join("\n");

/** A line from the specialist persona file that only a prompt composed from that file would carry. */
async function personaMarker(name: string): Promise<string> {
  const text = await readFile(join(getRepoRoot(), "skills/paw-sot/references/specialists", `${name}.md`), "utf-8");
  const line = text.split("\n").find((l) => l.startsWith("You are a leading expert"));
  assert.ok(line, `No identity line in ${name}.md`);
  return line.slice(0, 70);
}

describe("PAW v2: society-of-thought final review", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let ctx: TestContext;
  let todos: TodoGraph;
  let runError: unknown;

  before(async () => {
    ({ ctx, todos, runError } = await runScenario({ name: "v2-sot-final", hostInstructions: HOST_INSTRUCTIONS, task: TASK }));
    console.log("[v2] reviews/:", JSON.stringify((await reviewFiles(ctx).catch(() => [])).map((f) => f.name)));
  });

  after(async () => {
    if (ctx) {
      await destroyTestContext(ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!runError, `Run did not complete: ${runError instanceof Error ? runError.message : String(runError)}`);
  });

  it("W5: the host loads paw-sot through the runtime's skill system", () => {
    assert.ok(ctx.events.skillsInvoked().includes("paw-sot"), `skill.invoked: ${JSON.stringify(ctx.events.skillsInvoked())}`);
    assert.ok(hostSkillLoads(ctx, "paw-sot").length >= 1, "paw-sot was not loaded by the host");
  });

  it("W5: each configured specialist ran as a subagent composed from its paw-sot persona", async () => {
    const sotLoad = hostSkillLoads(ctx, "paw-sot")[0] ?? Infinity;
    const after = hostTasks(ctx).filter((t) => t.index > sotLoad);
    for (const name of SPECIALISTS) {
      const marker = await personaMarker(name);
      const path = new RegExp(`specialists/${name}\\.md`);
      const match = after.find((t) => t.prompt.includes(marker) || path.test(t.prompt));
      assert.ok(match, `No subagent after paw-sot load carries the ${name} persona. Prompts:\n${after.map((t) => t.prompt.slice(0, 160)).join("\n---\n")}`);
    }
  });

  it("W5: per-specialist review files and REVIEW-SYNTHESIS.md exist; no ad-hoc REVIEW.md", async () => {
    const files = await reviewFiles(ctx);
    const names = files.map((f) => f.name);
    for (const name of SPECIALISTS) {
      const f = files.find((x) => new RegExp(`^REVIEW-${name}\\b.*\\.md$`, "i").test(x.name));
      assert.ok(f && f.size > 0, `Missing REVIEW-${name.toUpperCase()}.md in ${JSON.stringify(names)}`);
    }
    const synthesis = files.find((f) => f.name === "REVIEW-SYNTHESIS.md");
    assert.ok(synthesis && synthesis.size > 0, `Missing REVIEW-SYNTHESIS.md in ${JSON.stringify(names)}`);
    const specialistTimes = files.filter((f) => SPECIALISTS.some((s) => new RegExp(`^REVIEW-${s}\\b`, "i").test(f.name)));
    assert.ok(specialistTimes.every((f) => f.mtimeMs <= synthesis.mtimeMs), "Synthesis must follow the specialist reviews");
    assert.ok(!names.includes("REVIEW.md"), "An ad-hoc single review replaced or duplicated the configured SoT review");
  });

  it("W3: the final-review todo names the provider and is closed", () => {
    const final = todo(todos, "final-review", /final[-\s_]?review/i);
    assert.ok(final, todos.describe());
    assert.match(`${final.title} ${final.description}`, /society|sot/i);
    assert.strictEqual(final.status, "done");
    assert.deepStrictEqual(todos.open().map((n) => n.id), [], todos.describe());
  });

  it("one PR, opened by the host after the synthesis", async () => {
    const prs = prCreates(ctx);
    assert.strictEqual(prs.length, 1, `Expected one gh pr create, saw ${prs.length}`);
    assert.ok(!prs[0].fromSubagent);
    const synthesis = (await reviewFiles(ctx)).find((f) => f.name === "REVIEW-SYNTHESIS.md");
    const prAt = prCreateTime(ctx);
    assert.ok(prAt, "No host gh pr create in the trace");
    assert.ok(synthesis && synthesis.createdMs < prAt, `REVIEW-SYNTHESIS.md created at ${synthesis?.createdMs}, PR at ${prAt}`);
    assert.strictEqual((await ctx.fixture.ghCalls()).filter((c) => c.startsWith("pr create")).length, 1);
    execSync("npm test --silent", { cwd: ctx.fixture.workDir, stdio: "pipe" });
  });
});
