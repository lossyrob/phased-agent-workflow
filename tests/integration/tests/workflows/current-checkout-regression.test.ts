import { after, describe, it } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile } from "fs/promises";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { assertArtifactExists, assertToolCalls } from "../../lib/assertions.js";
import { createTestContext, destroyTestContext, type TestContext } from "../../lib/harness.js";
import { TestFixture } from "../../lib/fixtures.js";
import { join } from "path";

const LIVE_MODEL = process.env.PAW_TEST_LIVE_MODEL ?? "claude-sonnet-4.6";
const LIVE_TURN_TIMEOUT = 180_000;

async function seedWorkflowContext(
  workDir: string,
  workId: string,
  targetBranch: string,
  executionMode: "current-checkout" | null,
): Promise<void> {
  const dir = join(workDir, ".paw/work", workId);
  await mkdir(dir, { recursive: true });

  const lines = [
    "# WorkflowContext",
    "",
    "Work Title: Current Checkout Test",
    `Work ID: ${workId}`,
    "Base Branch: main",
    `Target Branch: ${targetBranch}`,
    "Workflow Mode: minimal",
    "Review Strategy: local",
    "Review Policy: final-pr-only",
    "Session Policy: continuous",
    "Final Agent Review: enabled",
    "Remote: origin",
    "Artifact Paths: auto-derived",
  ];

  if (executionMode) {
    lines.push(`Execution Mode: ${executionMode}`);
  }

  lines.push("");
  await writeFile(join(dir, "WorkflowContext.md"), lines.join("\n"));
}

function buildPrompt(workId: string, targetBranch: string): string {
  return [
    "You are a focused current-checkout compatibility test agent.",
    "",
    "CRITICAL RULES:",
    `- Read WorkflowContext.md from .paw/work/${workId}/WorkflowContext.md before any git mutation`,
    `- Treat ${targetBranch} as the required target branch for this work item`,
    "- In current-checkout mode, the current working directory is the execution checkout",
    "- Stay on the target branch for all requested work",
    "- Create only the files requested by the user prompt",
    "- Stage only the requested files and commit locally when asked",
    "- Do not create or update session workspace files such as plan.md",
    "- Do not run tests, builds, lint, or cleanup commands unless the user explicitly asks for them",
    "- Once the requested files are committed, stop and report the branch used",
    "- Never push or create PRs",
    "- Do not invoke the skill tool or use SQL",
    "- Do NOT ask the user questions",
  ].join("\n");
}

describe("current-checkout workflow regression coverage", { timeout: 240_000 }, () => {
  const contexts: TestContext[] = [];

  after(async () => {
    for (const ctx of contexts) {
      await destroyTestContext(ctx);
    }
  });

  async function runCurrentCheckoutCase(
    label: string,
    executionMode: "current-checkout" | null,
  ): Promise<void> {
    const workId = `test-current-checkout-${label}`;
    const targetBranch = `feature/${workId}`;
    const fixture = await TestFixture.clone("minimal-ts");
    await fixture.checkoutBranch(targetBranch, { create: true });
    await seedWorkflowContext(fixture.workDir, workId, targetBranch, executionMode);

    const answerer = new RuleBasedAnswerer([
      (req) => req.choices?.[0] ?? "yes",
    ], false);

    const ctx = await createTestContext({
      fixture,
      skillOrAgent: `current-checkout-${label}`,
      systemPrompt: buildPrompt(workId, targetBranch),
      answerer,
      model: LIVE_MODEL,
      excludedTools: ["skill", "sql"],
    });
    contexts.push(ctx);

    await ctx.session.sendAndWait({
      prompt: [
        `1. Read .paw/work/${workId}/WorkflowContext.md and stay on target branch ${targetBranch}.`,
        `2. Create .paw/work/${workId}/Spec.md with a short heading and overview.`,
        "3. Create src/current-checkout-proof.ts containing `export const currentCheckoutProof = true;`",
        "4. Stage only those two files and commit them locally with message 'Add current checkout proof'.",
        "5. Report the branch you used.",
        "6. Do not run tests, builds, lint, cleanup commands, or create session workspace files.",
      ].join("\n"),
    }, LIVE_TURN_TIMEOUT);

    assert.strictEqual(ctx.workingDirectory, fixture.workDir);
    assert.strictEqual(await fixture.getBranch(), targetBranch);
    await assertArtifactExists(fixture.workDir, workId, "Spec.md");

    const proofFile = await fixture.readRelativeFile(fixture.workDir, "src/current-checkout-proof.ts");
    assert.match(proofFile, /currentCheckoutProof/, "current-checkout proof file should exist");

    assertToolCalls(ctx.toolLog, {
      bashMustNotInclude: [/git push/, /gh\s+pr\s+create/, /\bnpm test\b/, /\bnpm run build\b/, /\brm -rf dist\b/],
    });
  }

  it("keeps legacy WorkflowContext files without Execution Mode working", async () => {
    await runCurrentCheckoutCase("legacy", null);
  });

  it("supports explicit current-checkout WorkflowContext files", async () => {
    await runCurrentCheckoutCase("explicit", "current-checkout");
  });
});
