import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

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
});
