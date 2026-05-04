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

function extractWorkflowContextTemplate(content: string): string {
  const match = content.match(/```markdown\r?\n# WorkflowContext\r?\n[\s\S]*?\r?\n```/);
  assert.ok(match, "paw-init should contain a fenced WorkflowContext.md template");
  return match[0].replace(/^```markdown\r?\n/, "").replace(/\r?\n```$/, "");
}

describe("paw-init WorkflowContext artifact contract", () => {
  it("defines a generated artifact shape with configuration fields only", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-init/SKILL.md"), "utf-8");
    const generatedShape = extractWorkflowContextTemplate(content);

    for (const requiredField of [
      "Work Title:",
      "Work ID:",
      "Base Branch:",
      "Target Branch:",
      "Execution Mode:",
      "Repository Identity:",
      "Execution Binding:",
      "Workflow Mode:",
      "Review Strategy:",
      "Review Policy:",
      "Planning Docs Review:",
      "Final Agent Review:",
      "Artifact Lifecycle:",
    ]) {
      assert.match(generatedShape, new RegExp(requiredField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    for (const marker of FORBIDDEN_RUNTIME_MARKERS) {
      assert.doesNotMatch(
        generatedShape,
        new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `Generated WorkflowContext shape should not contain runtime marker: ${marker}`,
      );
    }
  });
});
