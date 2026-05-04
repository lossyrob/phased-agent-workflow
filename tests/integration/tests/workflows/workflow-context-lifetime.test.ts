import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { join } from "path";
import { destroyTestContext } from "../../lib/harness.js";
import {
  createPawLiteBoundaryContext,
  evaluatePawLiteBoundary,
  seedPawLiteWork,
} from "../../lib/paw-lite-boundary.js";

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
});
