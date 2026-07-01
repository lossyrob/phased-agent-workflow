import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relativePath), "utf-8");
}

describe("paw-lite control-state content", () => {
  it("documents the lite workflow identity, durable artifacts, and SQL mirrors", async () => {
    const lite = await readRepoFile("skills/paw-lite/SKILL.md");

    assert.match(lite, /Workflow Identity: paw-lite/);
    assert.match(lite, /legacy paw-lite compatibility mode/i);
    assert.match(lite, /read-only/i);
    assert.match(lite, /STOP before mutation-affecting work until `Workflow Identity: paw-lite` is persisted/);
    assert.match(lite, /lite:<work-id>:/);
    assert.match(lite, /lite-task:<work-id>:<slug>/);
    assert.match(lite, /## Work Items/);
    assert.match(lite, /FINAL-REVIEW\.md/);
  });

  it("teaches paw-status to detect lite workflows and legacy compatibility mode", async () => {
    const status = await readRepoFile("skills/paw-status/SKILL.md");

    assert.match(status, /Workflow Identity.*`paw`.*`paw-lite`/);
    assert.match(status, /Legacy lite compatibility fallback/i);
    assert.match(status, /`Plan\.md` exists and `ImplementationPlan\.md` does not/);
    assert.match(status, /## Work Items/);
    assert.match(status, /FINAL-REVIEW\.md/);
    assert.match(status, /work-item/i);
  });

  it("teaches paw-pr to use lite preflight validation", async () => {
    const pawPr = await readRepoFile("skills/paw-pr/SKILL.md");

    assert.match(pawPr, /### Workflow Identity Detection/);
    assert.match(pawPr, /PAW Lite profile/);
    assert.match(pawPr, /`Plan\.md` exists/);
    assert.match(pawPr, /checkboxes resolved/);
    assert.match(pawPr, /FINAL-REVIEW\.md/);
    assert.match(pawPr, /identity missing/i);
    assert.match(pawPr, /STOP final PR creation until persisted/);
  });
});
