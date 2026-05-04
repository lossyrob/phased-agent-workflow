import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

async function readTransitionSkill(): Promise<string> {
  return readFile(resolve(REPO_ROOT, "skills/paw-transition/SKILL.md"), "utf-8");
}

describe("paw-transition configured obligation output", () => {
  it("adds an additive obligation_summary field without removing existing transition fields", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /TRANSITION RESULT:/);
    assert.match(content, /artifact_lifecycle_action/);
    assert.match(content, /obligation_summary: \[mandatory gate\/procedure\/final-PR routing obligation or none\]/);
    assert.match(content, /Do NOT omit `obligation_summary`/);
  });

  it("names planning docs review as a mandatory configured procedure", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Planning Docs Review \(`enabled` \| `disabled`\)/);
    assert.match(content, /paw-plan-review \(passes, planning docs enabled\).+paw-planning-docs-review/);
    assert.match(content, /`paw-planning-docs-review`: `Planning Docs Review: enabled` requires `paw-planning-docs-review` before implementation/);
  });

  it("names final review mode obligations before final PR routing", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Final Review Mode and related model\/specialist fields/);
    assert.match(content, /`paw-final-review`: `Final Agent Review: enabled` requires configured `Final Review Mode`/);
    assert.match(content, /do not substitute ad-hoc review/);
    assert.match(content, /Do NOT return `next_activity = paw-final-review` without naming the configured Final Review Mode/);
  });

  it("keeps final PR ownership with paw-pr and artifact lifecycle action", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /`paw-pr`: final PR must be created by `paw-pr`/);
    assert.match(content, /inline PR creation, push, or artifact cleanup are not transition responsibilities/);
    assert.match(content, /If final review is enabled, it must be complete before `paw-pr`/);
    assert.match(content, /Do NOT return `next_activity = paw-pr` without routing final PR creation through `paw-pr`/);
  });

  it("keeps queued next activity and following transition visible", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Keep both the next activity and the following transition visible/);
    assert.match(content, /Include the configured obligation in the next activity TODO/);
    assert.match(content, /planning docs review enabled, final review mode, or `paw-pr` final PR ownership/);
  });

  it("forbids hook, MCP, or broad tool-call inspection dependencies", async () => {
    const content = await readTransitionSkill();

    assert.match(content, /Do NOT make transition output depend on hooks, MCPs, or broad tool-call inspection/);
  });
});
