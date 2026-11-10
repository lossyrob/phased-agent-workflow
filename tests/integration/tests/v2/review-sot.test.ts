/**
 * PAW Review with society-of-thought configured (W5, regression for #268).
 *
 * Two specialists, parallel, no perspectives. The review host must load `paw-sot` itself
 * and run it: specialist subagents composed from their paw-sot personas write their own
 * review files, then REVIEW-SYNTHESIS.md, and feedback builds on the synthesis. The
 * single-model evaluation (ImpactAnalysis.md, GapAnalysis.md) or any other ad-hoc
 * reviewer in its place fails the suite. The host alone creates the pending review.
 *
 * Skipped unless PAW_TEST_V2=1. Set PAW_TEST_CLI_PATH to an installed Copilot CLI.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { join } from "path";
import { destroyTestContext } from "../../lib/harness.js";
import { getRepoRoot } from "../../lib/skills.js";
import {
  PR_URL,
  REVIEW_HOST_INSTRUCTIONS,
  RUN_TIMEOUT,
  ghCommands,
  isGhWrite,
  readReviewArtifact,
  refs,
  reviewArtifacts,
  runReviewScenario,
  subagentSkillLoads,
  type ReviewRun,
} from "../../lib/review-scenario.js";
import { ENABLED, hostSkillLoads, hostTasks } from "../../lib/v2-scenarios.js";

const SPECIALISTS = ["correctness", "testing"];

const TASK = [
  `Use the paw-review-workflow skill for a thorough review of ${PR_URL}.`,
  "Review mode society-of-thought with specialists correctness and testing, interaction parallel, perspectives none.",
].join("\n");

/** A line from the specialist persona file that only a prompt composed from that file would carry. */
async function personaMarker(name: string): Promise<string> {
  const text = await readFile(join(getRepoRoot(), "skills/paw-sot/references/specialists", `${name}.md`), "utf-8");
  const line = text.split("\n").find((l) => l.startsWith("You are a leading expert"));
  assert.ok(line, `No identity line in ${name}.md`);
  return line.slice(0, 70);
}

describe("PAW Review: configured society-of-thought", { skip: !ENABLED, timeout: RUN_TIMEOUT + 120_000 }, () => {
  let run: ReviewRun;

  before(async () => {
    run = await runReviewScenario({ name: "review-sot", systemPrompt: REVIEW_HOST_INSTRUCTIONS, task: TASK });
  });

  after(async () => {
    if (run?.ctx) {
      await destroyTestContext(run.ctx);
    }
  });

  it("completes within the time budget", () => {
    assert.ok(!run.runError, `Run did not complete: ${run.runError instanceof Error ? run.runError.message : String(run.runError)}`);
  });

  it("W5: the review host loads paw-sot itself", () => {
    assert.ok(hostSkillLoads(run.ctx, "paw-sot").length >= 1, `skills: ${JSON.stringify(run.ctx.events.skillsInvoked())}`);
    assert.ok(!subagentSkillLoads(run.ctx).some((s) => s.includes("paw-sot")), "paw-sot was loaded inside a subagent");
  });

  it("W5: each configured specialist ran as a subagent composed from its paw-sot persona", async () => {
    const sotLoad = hostSkillLoads(run.ctx, "paw-sot")[0] ?? Infinity;
    const after = hostTasks(run.ctx).filter((t) => t.index > sotLoad);
    for (const name of SPECIALISTS) {
      const marker = await personaMarker(name);
      const path = new RegExp(`specialists/${name}\\.md`);
      assert.ok(
        after.some((t) => t.prompt.includes(marker) || path.test(t.prompt)),
        `No subagent after the paw-sot load carries the ${name} persona. Prompts:\n${after.map((t) => t.prompt.slice(0, 160)).join("\n---\n")}`,
      );
    }
  });

  it("W5/#268: per-specialist reviews and REVIEW-SYNTHESIS.md exist; no single-model substitute", async () => {
    const files = await reviewArtifacts(run.ctx);
    const names = files.map((f) => f.name);
    for (const name of SPECIALISTS) {
      const f = files.find((x) => new RegExp(`^REVIEW-${name}\\b.*\\.md$`, "i").test(x.name));
      assert.ok(f && f.size > 0, `Missing REVIEW-${name.toUpperCase()}.md in ${JSON.stringify(names)}`);
    }
    const synthesis = files.find((f) => f.name === "REVIEW-SYNTHESIS.md");
    assert.ok(synthesis && synthesis.size > 0, `Missing REVIEW-SYNTHESIS.md in ${JSON.stringify(names)}`);
    for (const ad_hoc of ["ImpactAnalysis.md", "GapAnalysis.md", "REVIEW.md"]) {
      assert.ok(!names.includes(ad_hoc), `${ad_hoc} written in society-of-thought mode`);
    }
    const comments = files.find((f) => f.name === "ReviewComments.md");
    assert.ok(comments && comments.mtimeMs >= synthesis.mtimeMs, "ReviewComments.md must follow the synthesis");
    assert.match(await readReviewArtifact(run.ctx, "ReviewContext.md"), /mode:\s*society-of-thought/);
  });

  it("W3: the evaluation todo names the provider and every todo is closed", () => {
    const sot = run.todos.find(/\bsot\b|society/i);
    assert.ok(sot, run.todos.describe());
    assert.match(`${sot.id} ${sot.title} ${sot.description}`, /society|sot/i);
    assert.ok(!run.todos.find(/impact|gap/i), `Single-model todos in a society-of-thought review:\n${run.todos.describe()}`);
    assert.deepStrictEqual(run.todos.open().map((n) => n.id), [], run.todos.describe());
  });

  it("D5/G9: one pending review, created by the host; nothing pushed", async () => {
    const writes = ghCommands(run.ctx).filter((c) => isGhWrite(c.command));
    assert.ok(writes.length >= 1, "The host made no GitHub write");
    assert.deepStrictEqual(writes.filter((c) => c.fromSubagent).map((c) => c.command), [], "A subagent wrote to GitHub");
    const state = await run.ctx.fixture.reviewGhState();
    assert.strictEqual(state.reviews.length, 1, JSON.stringify(state.reviews));
    assert.strictEqual(state.reviews[0].state, "PENDING");
    assert.deepStrictEqual(await refs(run.ctx.fixture), run.refsBefore, "Refs changed in the checkout or on origin");
  });
});
