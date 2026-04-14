import { after, describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";

const LIVE_TURN_TIMEOUT = 180_000;

async function seedWorkflowFiles(workDir: string, workId: string): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Status Reconciliation Test",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: feature/${workId}`,
    "Workflow Mode: full",
    "Review Strategy: local",
    "Review Policy: planning-only",
    "Session Policy: continuous",
    "Planning Docs Review: disabled",
    "Final Agent Review: enabled",
    "Remote: origin",
    "Artifact Paths: auto-derived",
    "",
    "## Control State",
    "",
    "TODO Mirror: active-required-items",
    "Reconciliation: stale",
    "",
    "### Required Workflow Items",
    "- `init` | `resolved` | `activity`",
    "- `spec` | `resolved` | `activity`",
    "- `spec-review` | `resolved` | `activity`",
    "- `code-research` | `resolved` | `activity`",
    "- `planning` | `resolved` | `activity`",
    "- `plan-review` | `resolved` | `activity`",
    "- `planning-docs-review` | `not_applicable` | `activity`",
    "- `phase:1:embedded-control-state-contract` | `resolved` | `activity`",
    "- `phase:2:paw-gate-reconciliation` | `pending` | `activity`",
    "- `final-review` | `pending` | `activity`",
    "- `final-pr` | `pending` | `activity`",
    "",
    "### Gate Items",
    "- `transition:after-spec-review` | `resolved` | `transition`",
    "- `transition:after-plan-review` | `resolved` | `transition`",
    "- `transition:after-phase:1` | `blocked` | `transition`",
    "- `transition:after-final-review` | `pending` | `transition`",
    "",
    "### Configured Procedure Items",
    "- `procedure:planning-review` | `not_applicable` | `procedure`",
    "- `procedure:final-review` | `pending` | `procedure`",
    "",
  ].join("\n"));

  await writeFile(join(dir, "ImplementationPlan.md"), [
    "# Implementation Plan",
    "",
    "## Phase Status",
    "- [x] Phase 1: Embedded Control State Contract",
    "- [ ] Phase 2: PAW Gate Reconciliation",
    "",
    "## Phase 1: Embedded Control State Contract",
    "Complete.",
    "",
    "## Phase 2: PAW Gate Reconciliation",
    "In progress.",
    "",
  ].join("\n"));
}

function buildStatusPrompt(skillContent: string, workId: string): string {
  return [
    "You are executing the paw-status skill. Follow the skill exactly.",
    "",
    "CRITICAL RULES:",
    `- Read .paw/work/${workId}/WorkflowContext.md and .paw/work/${workId}/ImplementationPlan.md`,
    "- When control state exists, use it as the durable source of truth",
    "- Do NOT ask the user questions",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}

describe("paw-status reconciliation reporting", { timeout: 240_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  it("reports stale control state as read-only/unverified", async () => {
    const pawStatus = await loadSkill("paw-status");
    const workId = "test-paw-status-reconciliation";

    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-status-reconciliation",
      systemPrompt: buildStatusPrompt(pawStatus, workId),
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
    });
    contexts.push(ctx);

    await seedWorkflowFiles(ctx.fixture.workDir, workId);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Summarize the current PAW status for work ID ${workId}.`,
        "Focus on whether mutation-affecting work is safe to proceed and what is blocking progress.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    const content = response?.data?.content ?? "";
    assert.match(content, /stale/i);
    assert.match(content, /read-only|unverified/i);
    assert.match(content, /transition:after-phase:1|blocked/i);
  });
});
