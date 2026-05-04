import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
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

  it("materializes a WorkflowContext artifact without runtime state markers", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-init/SKILL.md"), "utf-8");
    const generatedShape = extractWorkflowContextTemplate(content)
      .replace(/<generated_work_title>/g, "Runtime Context")
      .replace(/<work_id or generated_work_id>/g, "runtime-context")
      .replace(/<base_branch>/g, "main")
      .replace(/<target_branch>/g, "feature/runtime-context")
      .replace(/<execution_mode>/g, "current-checkout")
      .replace(/<repository_identity or "none">/g, "none")
      .replace(/<execution_binding or "none">/g, "none")
      .replace(/<workflow_mode>/g, "full")
      .replace(/<review_strategy>/g, "local")
      .replace(/<review_policy>/g, "planning-only")
      .replace(/<session_policy>/g, "continuous")
      .replace(/<final_agent_review>/g, "enabled")
      .replace(/<final_review_mode>/g, "single-model")
      .replace(/<final_review_interactive>/g, "smart")
      .replace(/<final_review_models>/g, "none")
      .replace(/<final_review_specialists>/g, "all")
      .replace(/<final_review_interaction_mode>/g, "parallel")
      .replace(/<final_review_specialist_models>/g, "none")
      .replace(/<final_review_perspectives>/g, "auto")
      .replace(/<final_review_perspective_cap>/g, "2")
      .replace(/<implementation_model or "none">/g, "none")
      .replace(/<plan_generation_mode>/g, "single-model")
      .replace(/<plan_generation_models>/g, "none")
      .replace(/<planning_docs_review>/g, "enabled")
      .replace(/<planning_review_mode>/g, "multi-model")
      .replace(/<planning_review_interactive>/g, "smart")
      .replace(/<planning_review_models>/g, "gpt-5.5, claude-opus-4.7-xhigh")
      .replace(/<planning_review_specialists>/g, "all")
      .replace(/<planning_review_interaction_mode>/g, "parallel")
      .replace(/<planning_review_specialist_models>/g, "none")
      .replace(/<planning_review_perspectives>/g, "auto")
      .replace(/<planning_review_perspective_cap>/g, "2")
      .replace(/<custom_instructions or "none">/g, "none")
      .replace(/<work_description or "none">/g, "none")
      .replace(/<issue_url or "none">/g, "none")
      .replace(/<artifact_lifecycle>/g, "commit-and-clean");

    const workspace = await mkdtemp(join(tmpdir(), "paw-context-"));
    try {
      const artifactPath = join(workspace, "WorkflowContext.md");
      await writeFile(artifactPath, generatedShape);
      const artifact = await readFile(artifactPath, "utf-8");

      assert.match(artifact, /Work ID: runtime-context/);
      assert.match(artifact, /Planning Docs Review: enabled/);
      assert.match(artifact, /Artifact Lifecycle: commit-and-clean/);
      for (const marker of FORBIDDEN_RUNTIME_MARKERS) {
        assert.doesNotMatch(
          artifact,
          new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          `Materialized WorkflowContext artifact should not contain runtime marker: ${marker}`,
        );
      }
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
