import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

describe("PAW-Lite boundary configuration content", () => {
  it("treats resolved WorkflowContext values as active obligations", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /## Configuration Contract/);
    assert.match(content, /Read resolved WorkflowContext\.md values before each stage boundary/i);
    assert.match(content, /Defaults, presets, and explicit overrides are equally authoritative/i);
    assert.match(content, /Planning Docs Review/);
    assert.match(content, /Planning Review Mode/);
    assert.match(content, /Final Agent Review/);
    assert.match(content, /Final Review Mode/);
    assert.match(content, /Artifact Lifecycle/);
  });

  it("distinguishes human pause policy from required procedures", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /Review Policy controls human pause points only/i);
    assert.match(content, /does not disable configured planning docs review/i);
    assert.match(content, /configured final review/i);
    assert.match(content, /automated gates/i);
    assert.match(content, /final PR handoff/i);
  });

  it("keeps WorkflowContext as configuration-only in PAW-Lite", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /WorkflowContext\.md is durable configuration only/i);
    assert.match(content, /do not write runtime progress, boundary status, reconciliation markers, TODO mirrors, or SQL mirror data/i);
  });

  it("defines compact boundary checkpoints and deterministic boundary evaluation", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /## Boundary Checkpoints/);
    assert.match(content, /completed stage, next activity, required gate\/procedure, configured value, incorrect shortcut, and next TODOs/i);
    assert.match(content, /plan->planning-docs-review/);
    assert.match(content, /plan->implement/);
    assert.match(content, /planning-docs-review->implement/);
    assert.match(content, /if asked to evaluate a named boundary/i);
    assert.match(content, /without advancing unrelated stages/i);
  });

  it("keeps boundary TODOs separate from implementation work TODOs", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /lite:<work-id>:boundary:<boundary-name>/);
    assert.match(content, /lite:<work-id>:work:<slug>/);
    assert.match(content, /Filter readiness checks by category/i);
    assert.match(content, /id LIKE 'lite:<work-id>:work:%'/);
    assert.match(content, /pending future boundary TODOs must not block implementation, review, or PR readiness/i);
  });

  it("requires planning docs review execution before implementation when enabled", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /Planning Docs Review: enabled/);
    assert.match(content, /honor configured planning review mode\/models/);
    assert.match(content, /load and execute `paw-planning-docs-review`/);
    assert.match(content, /Skipping directly to implementation is incorrect/i);
    assert.match(content, /Planning Docs Review: disabled/);
    assert.match(content, /proceed to implementation with tracked work-item TODOs/i);
  });
});
