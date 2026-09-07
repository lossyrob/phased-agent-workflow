import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { RuleBasedAnswerer } from "../../lib/answerer.js";
import { createTestContext, destroyTestContext } from "../../lib/harness.js";
import { loadSkill } from "../../lib/skills.js";
import {
  assertWorkflowContextConfigOnly,
  extractWorkflowContextTemplate,
} from "../../lib/workflow-context-invariants.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

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

    assertWorkflowContextConfigOnly(generatedShape, "Generated WorkflowContext shape");
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
      assertWorkflowContextConfigOnly(artifact, "Materialized WorkflowContext artifact");
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it("creates a WorkflowContext artifact through paw-init without runtime state markers", { timeout: 180_000 }, async () => {
    const workId = "runtime-init-context";
    const pawInitSkill = await loadSkill("paw-init");
    const answerer = new RuleBasedAnswerer([(req) => req.choices?.[0] ?? "proceed"], false);
    const ctx = await createTestContext({
      fixtureName: "minimal-ts",
      skillOrAgent: "paw-init-workflow-context",
      systemPrompt: [
        "You are executing the paw-init skill in a deterministic integration test.",
        `Create only .paw/work/${workId}/WorkflowContext.md, then stop.`,
        "Use durable configuration fields only. Do not add runtime progress, control state, TODO mirrors, reconciliation markers, or SQL mirror data.",
        "Do not commit, push, create pull requests, or ask the user questions.",
        "",
        "paw-init skill documentation:",
        pawInitSkill,
      ].join("\n"),
      answerer,
    });

    try {
      await ctx.session.sendAndWait({
        prompt: [
          "Initialize a PAW workflow with these exact values:",
          "Work Title: Runtime Init Context",
          `Work ID: ${workId}`,
          "Base Branch: main",
          "Target Branch: feature/runtime-init-context",
          "Execution Mode: current-checkout",
          "Repository Identity: none",
          "Execution Binding: none",
          "Workflow Mode: full",
          "Review Strategy: local",
          "Review Policy: planning-only",
          "Session Policy: continuous",
          "Final Agent Review: enabled",
          "Final Review Mode: single-model",
          "Final Review Interactive: smart",
          "Plan Generation Mode: single-model",
          "Planning Docs Review: enabled",
          "Planning Review Mode: multi-model",
          "Artifact Lifecycle: commit-and-clean",
          "Initial Prompt: deterministic init test",
          "Issue URL: none",
          "Remote: origin",
          "Additional Inputs: none",
        ].join("\n"),
      }, 120_000);

      const artifact = await readFile(
        join(ctx.fixture.workDir, ".paw/work", workId, "WorkflowContext.md"),
        "utf-8",
      );

      assert.match(artifact, /Work ID: runtime-init-context/);
      assert.match(artifact, /Workflow Mode: full/);
      assert.match(artifact, /Planning Docs Review: enabled/);
      assert.match(artifact, /Artifact Lifecycle: commit-and-clean/);
      assertWorkflowContextConfigOnly(artifact, "paw-init-generated WorkflowContext artifact");
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
