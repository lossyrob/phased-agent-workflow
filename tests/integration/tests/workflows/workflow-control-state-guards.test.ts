import { after, describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { TestFixture } from "../../lib/fixtures.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";

const LIVE_TURN_TIMEOUT = 180_000;

type TransitionCase = {
  workId: string;
  phaseBoundaryStatus: "resolved" | "blocked";
};

async function seedPhase2WorkflowContext(
  workDir: string,
  { workId, phaseBoundaryStatus }: TransitionCase,
  targetBranch: string,
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "WorkflowContext.md"), [
    "# WorkflowContext",
    "",
    "Work Title: Control State Guard Test",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: ${targetBranch}`,
    "Workflow Mode: full",
    "Review Strategy: local",
    "Review Policy: planning-only",
    "Session Policy: continuous",
    "Planning Docs Review: disabled",
    "Final Agent Review: enabled",
    "Remote: origin",
    "Artifact Lifecycle: commit-and-clean",
    "Artifact Paths: auto-derived",
    "",
    "## Hardened State",
    "",
    "TODO Mirror: active-required-items",
    "Reconciliation: current",
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
    `- \`transition:after-phase:1\` | \`${phaseBoundaryStatus}\` | \`transition\``,
    "- `transition:after-final-review` | `pending` | `transition`",
    "",
    "### Configured Procedure Items",
    "- `procedure:planning-review` | `not_applicable` | `procedure`",
    "- `procedure:final-review` | `pending` | `procedure`",
    "",
  ].join("\n"));
}

async function seedImplementationPlan(workDir: string, workId: string, phase2Complete = false): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await writeFile(join(dir, "ImplementationPlan.md"), [
    "# Implementation Plan",
    "",
    "## Phase Status",
    "- [x] Phase 1: Embedded Control-State Contract",
    `- [${phase2Complete ? "x" : " "}] Phase 2: PAW Gate Reconciliation`,
    "",
    "## Phase 1: Embedded Control-State Contract",
    "Complete.",
    "",
    "## Phase 2: PAW Gate Reconciliation",
    phase2Complete ? "Complete." : "In progress.",
    "",
    "## Phase Candidates",
    "None.",
    "",
  ].join("\n"));
}

function buildTransitionPrompt(skillContent: string, workId: string): string {
  return [
    "You are executing the paw-transition skill. Follow the skill exactly.",
    "",
    "CRITICAL RULES:",
    `- Read .paw/work/${workId}/WorkflowContext.md and .paw/work/${workId}/ImplementationPlan.md`,
    "- When hardened state exists, use it as the durable source of truth",
    "- Use only evidence that is available from the seeded workflow files and the local git checkout",
    "- If the required live state cannot be proven from that evidence, block instead of inferring",
    "- Return the TRANSITION RESULT block exactly as specified in the skill",
    "- Do NOT ask the user questions",
    "",
    "Skill documentation:",
    skillContent,
  ].join("\n");
}

describe("workflow control-state guards", { timeout: 360_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  async function runPhase2Transition(testCase: TransitionCase): Promise<string> {
    const transitionSkill = await loadSkill("paw-transition");
    const targetBranch = `feature/${testCase.workId}`;
    const fixture = await TestFixture.clone("minimal-ts");
    await fixture.checkoutBranch(targetBranch, { create: true });
    await seedPhase2WorkflowContext(fixture.workDir, testCase, targetBranch);
    await seedImplementationPlan(fixture.workDir, testCase.workId);

    const ctx = await createTestContext({
      fixture,
      skillOrAgent: `transition-${testCase.workId}`,
      systemPrompt: buildTransitionPrompt(transitionSkill, testCase.workId),
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
    });
    contexts.push(ctx);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Evaluate the transition for work ID ${testCase.workId}.`,
        "Context: paw-impl-review for Phase 1 just passed and the workflow is deciding whether Phase 2 can start.",
        "Return only the TRANSITION RESULT block.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    return response?.data?.content ?? "";
  }

  it("blocks transition when external state cannot be verified", async () => {
    const transitionSkill = await loadSkill("paw-transition");
    const workId = "test-transition-external-unverified";
    const targetBranch = `feature/${workId}`;
    const fixture = await TestFixture.clone("minimal-ts");
    await fixture.checkoutBranch(targetBranch, { create: true });

    const dir = join(fixture.workDir, ".paw/work", workId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "WorkflowContext.md"), [
      "# WorkflowContext",
      "",
      "Work Title: External Verification Guard Test",
      `Work ID: ${workId}`,
      "Base Branch: main",
      `Target Branch: ${targetBranch}`,
      "Workflow Mode: full",
      "Review Strategy: prs",
      "Review Policy: planning-only",
      "Session Policy: continuous",
      "Planning Docs Review: disabled",
      "Final Agent Review: enabled",
      "Remote: origin",
      "Artifact Lifecycle: commit-and-clean",
      "Artifact Paths: auto-derived",
      "",
      "## Hardened State",
      "",
      "TODO Mirror: active-required-items",
      "Reconciliation: external_unverified",
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
      "- `phase:2:paw-gate-reconciliation` | `resolved` | `activity`",
      "- `final-review` | `pending` | `activity`",
      "- `final-pr` | `pending` | `activity`",
      "",
      "### Gate Items",
      "- `transition:after-spec-review` | `resolved` | `transition`",
      "- `transition:after-plan-review` | `resolved` | `transition`",
      "- `transition:after-phase:1` | `resolved` | `transition`",
      "- `transition:after-phase:2` | `resolved` | `transition`",
      "- `transition:after-final-review` | `pending` | `transition`",
      "",
      "### Configured Procedure Items",
      "- `procedure:planning-review` | `not_applicable` | `procedure`",
      "- `procedure:final-review` | `pending` | `procedure`",
      "",
    ].join("\n"));
    await seedImplementationPlan(fixture.workDir, workId, true);

    const ctx = await createTestContext({
      fixture,
      skillOrAgent: `transition-${workId}`,
      systemPrompt: buildTransitionPrompt(transitionSkill, workId),
      answerer: new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "yes"], false),
    });
    contexts.push(ctx);

    const response = await ctx.session.sendAndWait({
      prompt: [
        `Evaluate the transition for work ID ${workId}.`,
        "Context: the last implementation phase and impl review both completed, so the workflow is deciding whether final review can begin.",
        "No PR metadata, remote state, or merge-verification evidence exists beyond this local checkout.",
        "Return only the TRANSITION RESULT block.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    const content = response?.data?.content ?? "";
    assert.match(content, /preflight:\s*blocked/i);
    assert.match(content, /external_unverified|unverified|cannot prove/i);
  });

  it("blocks transition when a required gate item remains unresolved", async () => {
    const response = await runPhase2Transition({
      workId: "test-transition-blocked-gate",
      phaseBoundaryStatus: "blocked",
    });

    assert.match(response, /preflight:\s*blocked:.*transition:after-phase:1.*unresolved/i);
  });

  it("allows transition when hardened state is current and the phase gate is resolved", async () => {
    const response = await runPhase2Transition({
      workId: "test-transition-phase2-ready",
      phaseBoundaryStatus: "resolved",
    });

    assert.match(response, /preflight:\s*passed/i);
    assert.match(response, /next_activity:\s*paw-implement/i);
    assert.match(response, /Phase 2: PAW Gate Reconciliation/i);
    assert.match(response, /pause_at_milestone:\s*false/i);
  });
});
