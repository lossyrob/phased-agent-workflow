import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { createTestContext, destroyTestContext } from "../../lib/harness.js";
import {
  createPawLiteBoundaryContext,
  evaluatePawLiteBoundary,
  seedPawLiteWork,
} from "../../lib/paw-lite-boundary.js";
import { loadSkill } from "../../lib/skills.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

const FORBIDDEN_RUNTIME_MARKERS = [
  "## Control State",
  "TODO Mirror:",
  "Reconciliation:",
  "### Required Workflow Items",
  "### Gate Items",
  "### Configured Procedure Items",
];

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relativePath), "utf-8");
}

async function seedStandardPlanningBoundary(workDir: string, workId: string): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Standard Transition Lifetime",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: feature/${workId}`,
    "Workflow Mode: full",
    "Review Strategy: local",
    "Review Policy: planning-only",
    "Session Policy: continuous",
    "Planning Docs Review: enabled",
    "Planning Review Mode: multi-model",
    "Final Agent Review: enabled",
    "Final Review Mode: multi-model",
    "Artifact Lifecycle: commit-and-clean",
    "Artifact Paths: auto-derived",
    "",
  ].join("\n"));
  await writeFile(join(dir, "Spec.md"), [
    "# Spec",
    "",
    "## Requirements",
    "- Preserve WorkflowContext as durable configuration.",
    "",
  ].join("\n"));
  await writeFile(join(dir, "ImplementationPlan.md"), [
    "# Implementation Plan",
    "",
    "## Phase Status",
    "- [ ] **Phase 1: Test** - Pending",
    "",
    "## Phase Candidates",
    "None initially.",
    "",
  ].join("\n"));
}

describe("WorkflowContext lifetime guardrails", () => {
  it("keeps later workflow prompt paths from appending runtime state to WorkflowContext", async () => {
    for (const relativePath of [
      "agents/PAW.agent.md",
      "skills/paw-lite/SKILL.md",
      "skills/paw-transition/SKILL.md",
      "skills/paw-planning-docs-review/SKILL.md",
    ]) {
      const content = await readRepoFile(relativePath);
      for (const marker of FORBIDDEN_RUNTIME_MARKERS) {
        assert.doesNotMatch(
          content,
          new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          `${relativePath} should not contain runtime WorkflowContext marker ${marker}`,
        );
      }
    }
  });

  it("keeps a seeded WorkflowContext config-only after PAW-Lite boundary evaluation", { timeout: 180_000 }, async () => {
    const ctx = await createPawLiteBoundaryContext("workflow-context-lifetime");
    const workId = "runtime-context-lifetime";
    const contextPath = join(ctx.fixture.workDir, ".paw/work", workId, "WorkflowContext.md");

    try {
      await seedPawLiteWork(ctx.fixture.workDir, workId, {
        planningDocsReview: "enabled",
        finalAgentReview: "enabled",
      });
      const before = await readFile(contextPath, "utf-8");
      const response = await evaluatePawLiteBoundary(ctx, workId, "plan->planning-docs-review");

      assert.match(response, /plan->planning-docs-review/i);
      const after = await readFile(contextPath, "utf-8");
      assert.strictEqual(after, before);
      for (const marker of FORBIDDEN_RUNTIME_MARKERS) {
        assert.doesNotMatch(after, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    } finally {
      await destroyTestContext(ctx);
    }
  });

  it("keeps a seeded WorkflowContext config-only after standard PAW transition evaluation", { timeout: 180_000 }, async () => {
    const transitionSkill = await loadSkill("paw-transition");
    const answerer = new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false);
    const workId = "runtime-standard-transition-lifetime";
    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "workflow-context-standard-transition",
      systemPrompt: [
        "You are executing paw-transition in a deterministic integration test.",
        `Read WorkflowContext.md from .paw/work/${workId}/WorkflowContext.md.`,
        "Return the TRANSITION RESULT block. Do not edit files, commit, push, create PRs, or ask questions.",
        "",
        "paw-transition skill documentation:",
        transitionSkill,
      ].join("\n"),
      answerer,
    });
    const contextPath = join(ctx.fixture.workDir, ".paw/work", workId, "WorkflowContext.md");

    try {
      await seedStandardPlanningBoundary(ctx.fixture.workDir, workId);
      const before = await readFile(contextPath, "utf-8");
      const response = await ctx.session.sendAndWait({
        prompt: [
          `Evaluate transition for work ID: ${workId}`,
          "Context: paw-plan-review just passed. Spec.md and ImplementationPlan.md exist. Planning Docs Review is enabled.",
          "Determine the next activity without mutating WorkflowContext.md.",
        ].join("\n"),
      }, 120_000);

      const text = response?.data?.content ?? "";
      assert.match(text, /paw-planning-docs-review/i);
      const after = await readFile(contextPath, "utf-8");
      assert.strictEqual(after, before);
      for (const marker of FORBIDDEN_RUNTIME_MARKERS) {
        assert.doesNotMatch(after, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
