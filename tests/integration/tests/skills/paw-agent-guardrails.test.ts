import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

describe("PAW agent guardrails", () => {
  it("requires paw-pr loading and blocks inline final PR creation", async () => {
    const content = await readFile(resolve(REPO_ROOT, "agents/PAW.agent.md"), "utf-8");

    assert.match(
      content,
      /\| paw-pr \| Load `paw-pr` skill\. Honor `artifact_lifecycle` and `artifact_lifecycle_action` from `paw-transition`\./,
      "PAW.agent.md should require loading paw-pr and honoring transition lifecycle fields",
    );

    assert.match(
      content,
      /artifact_lifecycle_action/,
      "PAW.agent.md should mention artifact_lifecycle_action in transition handling",
    );

    assert.match(
      content,
      /do NOT create the final PR inline or bypass the skill\./i,
      "PAW.agent.md should forbid inline final PR creation at the paw-pr boundary",
    );
  });

  it("treats embedded control state as the durable workflow source of truth", async () => {
    const content = await readFile(resolve(REPO_ROOT, "agents/PAW.agent.md"), "utf-8");

    assert.match(content, /## Control State/i);
    assert.match(content, /durable source of truth/i);
    assert.match(content, /TODOs as a mirror of active required workflow items/i);
    assert.match(content, /legacy best-effort mode/i);
  });

  it("stops standard orchestration for paw-lite workflow contexts", async () => {
    const content = await readFile(resolve(REPO_ROOT, "agents/PAW.agent.md"), "utf-8");

    assert.match(content, /Workflow Identity: paw-lite/);
    assert.match(content, /STOP standard PAW orchestration and tell the user this work item should continue with the `paw-lite` skill/i);
    assert.match(content, /\| paw-init \| paw-lite \(if `Workflow Identity: paw-lite`\) or paw-spec or paw-work-shaping \|/);
    assert.match(content, /If `paw-init` created a lite workflow, do not continue into standard PAW specification\/planning flow/i);
  });

  it("documents embedded review control state handling in PAW Review.agent.md", async () => {
    const content = await readFile(resolve(REPO_ROOT, "agents/PAW Review.agent.md"), "utf-8");

    assert.match(content, /## Embedded Review Control State/);
    assert.match(content, /contains `## Control State`/i);
    assert.match(content, /terminal external-review facts/i);
    assert.match(content, /legacy best-effort mode/i);
  });
});
