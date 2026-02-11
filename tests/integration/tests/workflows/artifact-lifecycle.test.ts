/**
 * Workflow test: artifact lifecycle detection via paw-transition
 *
 * Validates that paw-transition correctly detects and communicates
 * artifact_lifecycle values — including legacy backward compatibility.
 *
 * Tests:
 * - Default (no field): resolves to commit-and-clean
 * - Explicit commit-and-clean, commit-and-persist, never-commit values
 * - Legacy artifact_tracking: enabled → commit-and-clean
 * - Legacy artifact_tracking: disabled → never-commit
 *
 * Requires: Copilot CLI auth
 * Runtime: ~3-5 minutes
 */
import { describe, it, after } from "node:test";
import assert from "node:assert";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { loadSkill } from "../../lib/skills.js";

/**
 * Seed a WorkflowContext.md with a specific artifact lifecycle configuration.
 * When lifecycleField is null, the field is omitted entirely (tests default detection).
 */
async function seedWorkflowContext(
  workDir: string,
  workId: string,
  lifecycleField: string | null,
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });

  const lines = [
    "# WorkflowContext",
    "",
    `Work Title: Test Lifecycle`,
    `Work ID: ${workId}`,
    `Base Branch: main`,
    `Target Branch: feature/${workId}`,
    `Workflow Mode: full`,
    `Review Strategy: local`,
    `Review Policy: every-stage`,
    `Session Policy: continuous`,
    `Final Agent Review: enabled`,
    `Remote: origin`,
    `Artifact Paths: auto-derived`,
  ];

  if (lifecycleField !== null) {
    lines.push(`Artifact Lifecycle: ${lifecycleField}`);
  }

  lines.push("");
  await writeFile(join(dir, "WorkflowContext.md"), lines.join("\n"));
}

/**
 * Seed a WorkflowContext.md using legacy artifact_tracking field.
 */
async function seedLegacyWorkflowContext(
  workDir: string,
  workId: string,
  trackingValue: string,
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    `Work Title: Test Legacy`,
    `Work ID: ${workId}`,
    `Base Branch: main`,
    `Target Branch: feature/${workId}`,
    `Workflow Mode: full`,
    `Review Strategy: local`,
    `Review Policy: every-stage`,
    `Session Policy: continuous`,
    `Final Agent Review: enabled`,
    `Remote: origin`,
    `Artifact Paths: auto-derived`,
    `Artifact Tracking: ${trackingValue}`,
    "",
  ].join("\n"));
}

/**
 * Seed a minimal Spec.md so transition preflight passes.
 */
async function seedSpec(workDir: string, workId: string): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await writeFile(join(dir, "Spec.md"), [
    "# Spec: Test Feature",
    "## Overview",
    "Test feature for lifecycle validation.",
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
    "- Follow the Artifact Lifecycle Check rules in the skill (including legacy value mapping and detection hierarchy)",
    "- Return the TRANSITION RESULT block exactly as specified in the skill",
    "- The artifact_lifecycle field must reflect the detected lifecycle mode",
    "- Do NOT ask the user questions — determine everything from WorkflowContext.md and the context provided",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}

describe("artifact lifecycle detection", { timeout: 600_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  async function runTransition(
    label: string,
    seedFn: (workDir: string, workId: string) => Promise<void>,
  ): Promise<string> {
    const transitionSkill = await loadSkill("paw-transition");
    const workId = `test-lifecycle-${label}`;

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: `lifecycle-${label}`,
      systemPrompt: buildTransitionPrompt(transitionSkill, workId),
      answerer,
    });
    contexts.push(ctx);

    await seedFn(ctx.fixture.workDir, workId);
    await seedSpec(ctx.fixture.workDir, workId);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Evaluate a transition for work ID: ${workId}`,
        "",
        "Context: spec-review just passed. Determine the next activity.",
        "",
        "Return the TRANSITION RESULT block with all fields.",
        "I specifically need the artifact_lifecycle field value.",
      ].join("\n"),
    }, 120_000);

    return response?.data?.content ?? "";
  }

  it("explicit commit-and-clean: detected correctly", async () => {
    const response = await runTransition(
      "cac",
      (workDir, workId) => seedWorkflowContext(workDir, workId, "commit-and-clean"),
    );

    assert.match(
      response,
      /artifact_lifecycle:\s*commit-and-clean/i,
      `Expected artifact_lifecycle: commit-and-clean.\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("explicit commit-and-persist: detected correctly", async () => {
    const response = await runTransition(
      "cap",
      (workDir, workId) => seedWorkflowContext(workDir, workId, "commit-and-persist"),
    );

    assert.match(
      response,
      /artifact_lifecycle:\s*commit-and-persist/i,
      `Expected artifact_lifecycle: commit-and-persist.\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("explicit never-commit: detected correctly", async () => {
    const response = await runTransition(
      "nc",
      (workDir, workId) => seedWorkflowContext(workDir, workId, "never-commit"),
    );

    assert.match(
      response,
      /artifact_lifecycle:\s*never-commit/i,
      `Expected artifact_lifecycle: never-commit.\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("no field (default): resolves to commit-and-clean", async () => {
    const response = await runTransition(
      "default",
      (workDir, workId) => seedWorkflowContext(workDir, workId, null),
    );

    assert.match(
      response,
      /artifact_lifecycle:\s*commit-and-clean/i,
      `Expected artifact_lifecycle: commit-and-clean for default (no field).\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("legacy 'enabled': maps to commit-and-clean", async () => {
    const response = await runTransition(
      "legacy-enabled",
      (workDir, workId) => seedLegacyWorkflowContext(workDir, workId, "enabled"),
    );

    assert.match(
      response,
      /artifact_lifecycle:\s*commit-and-clean/i,
      `Expected artifact_lifecycle: commit-and-clean for legacy 'enabled'.\nResponse: ${response.slice(0, 500)}`,
    );
  });

  it("legacy 'disabled': maps to never-commit", async () => {
    const response = await runTransition(
      "legacy-disabled",
      (workDir, workId) => seedLegacyWorkflowContext(workDir, workId, "disabled"),
    );

    assert.match(
      response,
      /artifact_lifecycle:\s*never-commit/i,
      `Expected artifact_lifecycle: never-commit for legacy 'disabled'.\nResponse: ${response.slice(0, 500)}`,
    );
  });
});
