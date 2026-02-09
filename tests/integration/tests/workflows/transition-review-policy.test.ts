/**
 * Workflow test: paw-transition review policy handling
 *
 * Validates that the paw-transition skill correctly interprets review policy
 * values — both current and legacy — when determining pause_at_milestone.
 *
 * Tests the rename from issue #229:
 * - Legacy `never` maps to `final-pr-only` behavior (no pauses except final PR)
 * - Legacy `always` maps to `every-stage` behavior (pause at all milestones)
 * - New `final-pr-only` value works directly
 * - New `every-stage` value works directly
 *
 * Requires: Copilot CLI auth
 * Runtime: ~2-4 minutes
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";

/**
 * Seed a WorkflowContext.md with a specific review policy value.
 */
async function seedWorkflowContext(
  workDir: string,
  workId: string,
  reviewPolicy: string,
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    `Work Title: Test Transition`,
    `Work ID: ${workId}`,
    `Base Branch: main`,
    `Target Branch: feature/${workId}`,
    `Workflow Mode: full`,
    `Review Strategy: local`,
    `Review Policy: ${reviewPolicy}`,
    `Session Policy: continuous`,
    `Final Agent Review: enabled`,
    `Remote: origin`,
    `Artifact Paths: auto-derived`,
    "",
  ].join("\n"));
}

/**
 * Seed a minimal Spec.md so transition preflight passes for post-spec boundaries.
 */
async function seedSpec(workDir: string, workId: string): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await writeFile(join(dir, "Spec.md"), [
    "# Spec: Test Feature",
    "## Overview",
    "Test feature for transition validation.",
    "## Requirements",
    "- FR-001: Test requirement",
    "## Success Criteria",
    "- SC-001: Test passes",
  ].join("\n"));
}

function buildTransitionPrompt(skillContent: string, workId: string): string {
  return [
    "You are executing the paw-transition skill. Follow the skill procedure exactly.",
    "",
    "CRITICAL RULES:",
    `- Read WorkflowContext.md from .paw/work/${workId}/WorkflowContext.md`,
    "- Follow the Review Policy mapping rules in the skill (including legacy value mapping)",
    "- Return the TRANSITION RESULT block exactly as specified in the skill",
    "- Do NOT ask the user questions — determine everything from WorkflowContext.md and the context provided",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}

describe("paw-transition review policy handling", { timeout: 300_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  async function runTransition(
    reviewPolicy: string,
    stageContext: string,
    label: string,
  ): Promise<string> {
    const transitionSkill = await loadSkill("paw-transition");
    const workId = `test-transition-${label}`;

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: `transition-${label}`,
      systemPrompt: buildTransitionPrompt(transitionSkill, workId),
      answerer,
    });
    contexts.push(ctx);

    // Seed workflow state
    await seedWorkflowContext(ctx.fixture.workDir, workId, reviewPolicy);
    await seedSpec(ctx.fixture.workDir, workId);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Evaluate a transition for work ID: ${workId}`,
        "",
        `Context: ${stageContext}`,
        "",
        "Return the TRANSITION RESULT block with all fields.",
        "The key field I need is pause_at_milestone — determine it based on the Review Policy in WorkflowContext.md.",
      ].join("\n"),
    }, 120_000);

    return response?.data?.content ?? "";
  }

  it("legacy 'never' policy: does NOT pause at spec completion", async () => {
    const response = await runTransition(
      "never",
      "spec-review just passed. Determine the next activity and whether to pause.",
      "never-spec",
    );

    // The agent should map 'never' → 'final-pr-only' and NOT pause at spec completion
    assert.match(
      response,
      /pause_at_milestone:\s*false/i,
      `Expected pause_at_milestone: false for legacy 'never' at spec completion.\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("new 'final-pr-only' policy: does NOT pause at spec completion", async () => {
    const response = await runTransition(
      "final-pr-only",
      "spec-review just passed. Determine the next activity and whether to pause.",
      "fpo-spec",
    );

    assert.match(
      response,
      /pause_at_milestone:\s*false/i,
      `Expected pause_at_milestone: false for 'final-pr-only' at spec completion.\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("legacy 'always' policy: DOES pause at spec completion", async () => {
    const response = await runTransition(
      "always",
      "spec-review just passed. Determine the next activity and whether to pause.",
      "always-spec",
    );

    // The agent should map 'always' → 'every-stage' and pause
    assert.match(
      response,
      /pause_at_milestone:\s*true/i,
      `Expected pause_at_milestone: true for legacy 'always' at spec completion.\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("new 'every-stage' policy: DOES pause at spec completion", async () => {
    const response = await runTransition(
      "every-stage",
      "spec-review just passed. Determine the next activity and whether to pause.",
      "es-spec",
    );

    assert.match(
      response,
      /pause_at_milestone:\s*true/i,
      `Expected pause_at_milestone: true for 'every-stage' at spec completion.\nResponse: ${response.slice(0, 500)}`,
    );
  });
});
