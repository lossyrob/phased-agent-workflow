import { after, describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";

const LIVE_TURN_TIMEOUT = 180_000;

async function seedLegacyWorkflowFiles(workDir: string, workId: string): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Legacy Mode Test",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: feature/${workId}`,
    "Workflow Mode: full",
    "Review Strategy: local",
    "Review Policy: milestones",
    "Session Policy: continuous",
    "Final Agent Review: enabled",
    "Remote: origin",
    "Artifact Paths: auto-derived",
    "",
  ].join("\n"));

  await writeFile(join(dir, "ImplementationPlan.md"), [
    "# Implementation Plan",
    "",
    "## Phase Status",
    "- [x] Phase 1: Embedded Control State Contract",
    "- [ ] Phase 2: PAW Gate Reconciliation",
    "",
  ].join("\n"));
}

function buildStatusPrompt(skillContent: string, workId: string): string {
  return [
    "You are executing the paw-status skill. Follow the skill exactly.",
    "",
    "CRITICAL RULES:",
    `- Read .paw/work/${workId}/WorkflowContext.md and .paw/work/${workId}/ImplementationPlan.md`,
    "- If control state is absent, explicitly say legacy best-effort mode is active and control-state protections are inactive",
    "- Do NOT ask the user questions",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}

describe("legacy control-state mode reporting", { timeout: 240_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  it("explicitly reports legacy best-effort mode when control state is absent", async () => {
    const pawStatus = await loadSkill("paw-status");
    const workId = "test-legacy-control-state-mode";

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "legacy-control-state-mode",
      systemPrompt: buildStatusPrompt(pawStatus, workId),
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
    });
    contexts.push(ctx);

    await seedLegacyWorkflowFiles(ctx.fixture.workDir, workId);

    const response = await ctx.session.sendAndWait({
      prompt: `Summarize the current PAW status for work ID ${workId}.`,
    }, LIVE_TURN_TIMEOUT);

    const content = response?.data?.content ?? "";
    assert.match(content, /legacy/i);
    assert.match(content, /control-state protections[\s\S]*inactive/i);
  });
});
