import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { createTestContext, destroyTestContext } from "../../lib/harness.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

async function readTransitionSkill(): Promise<string> {
  return readFile(resolve(REPO_ROOT, "skills/paw-transition/SKILL.md"), "utf-8");
}

async function seedFinalPrReadyWorkflow(workDir: string, workId: string): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Transition Obligations",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: feature/${workId}`,
    "Workflow Mode: full",
    "Review Strategy: local",
    "Review Policy: final-pr-only",
    "Session Policy: continuous",
    "Planning Docs Review: enabled",
    "Final Agent Review: enabled",
    "Final Review Mode: multi-model",
    "Final Review Models: gpt-5.5, claude-opus-4.7-xhigh",
    "Artifact Lifecycle: commit-and-clean",
    "Artifact Paths: auto-derived",
    "",
  ].join("\n"));
  await writeFile(join(dir, "ImplementationPlan.md"), [
    "# Implementation Plan",
    "",
    "## Phase Status",
    "- [x] **Phase 1: Done** - Complete",
    "",
    "## Phase Candidates",
    "- None",
    "",
  ].join("\n"));
}

describe("paw-transition configured obligation output", () => {
  it("adds an additive obligation_summary field without removing existing transition fields", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /TRANSITION RESULT:/);
    assert.match(content, /artifact_lifecycle_action/);
    assert.match(content, /obligation_summary: \[mandatory gate\/procedure\/final-PR routing obligation or none\]/);
    assert.match(content, /Do NOT omit `obligation_summary`/);
  });

  it("names planning docs review as a mandatory configured procedure", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Planning Docs Review \(`enabled` \| `disabled`\)/);
    assert.match(content, /paw-plan-review \(passes, planning docs enabled\).+paw-planning-docs-review/);
    assert.match(content, /`paw-planning-docs-review`: `Planning Docs Review: enabled` requires `paw-planning-docs-review` before implementation/);
  });

  it("names final review mode obligations before final PR routing", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Final Review Mode and related model\/specialist fields/);
    assert.match(content, /`paw-final-review`: `Final Agent Review: enabled` requires configured `Final Review Mode`/);
    assert.match(content, /do not substitute ad-hoc review/);
    assert.match(content, /Do NOT return `next_activity = paw-final-review` without naming the configured Final Review Mode/);
  });

  it("keeps final PR ownership with paw-pr and artifact lifecycle action", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /`paw-pr`: final PR must be created by `paw-pr`/);
    assert.match(content, /inline PR creation, push, or artifact cleanup are not transition responsibilities/);
    assert.match(content, /If final review is enabled, it must be complete before `paw-pr`/);
    assert.match(content, /Do NOT return `next_activity = paw-pr` without routing final PR creation through `paw-pr`/);
  });

  it("keeps queued next activity and following transition visible", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Keep both the next activity and the following transition visible/);
    assert.match(content, /Include the configured obligation in the next activity TODO/);
    assert.match(content, /planning docs review enabled, final review mode, or `paw-pr` final PR ownership/);
  });

  it("forbids hook, MCP, or broad tool-call inspection dependencies", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Do NOT make transition output depend on hooks, MCPs, or broad tool-call inspection/);
  });

  it("returns final PR obligation summary and lifecycle handoff at runtime", { timeout: 180_000 }, async () => {
    const transitionSkill = await readTransitionSkill();
    const workId = "runtime-transition-obligations";
    const answerer = new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false);
    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "transition-obligations-runtime",
      systemPrompt: [
        "You are executing the paw-transition skill. Follow the procedure exactly.",
        `Read WorkflowContext.md from .paw/work/${workId}/WorkflowContext.md.`,
        "Return the TRANSITION RESULT block with all fields, including obligation_summary.",
        "Do not ask the user questions.",
        "",
        "Skill documentation:",
        transitionSkill,
      ].join("\n"),
      answerer,
    });

    try {
      await seedFinalPrReadyWorkflow(ctx.fixture.workDir, workId);
      const response = await ctx.session.sendAndWait({
        prompt: [
          `Evaluate a transition for work ID: ${workId}`,
          "Context: paw-final-review just completed. All planned phases are complete, final review is complete, and there are no unresolved phase candidates.",
          "Determine the next activity and return the TRANSITION RESULT block with all fields.",
        ].join("\n"),
      }, 120_000);
      const text = response?.data?.content ?? "";

      assert.match(text, /next_activity:\s*paw-pr/i);
      assert.match(text, /artifact_lifecycle_action:\s*stop-tracking/i);
      assert.match(text, /obligation_summary:.*paw-pr/is);
      assert.match(text, /preflight:\s*passed/i);
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
