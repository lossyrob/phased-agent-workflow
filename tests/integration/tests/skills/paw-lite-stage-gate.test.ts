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

describe("paw-lite stage boundary gate and reconciliation preamble", () => {
  it("defines a reconciliation-on-read preamble in the control-state contract", async () => {
    const contract = await readRepoFile("skills/paw-workflow/references/control-state-contract.md");

    assert.match(contract, /## Reconciliation on Skill Load/);
    assert.match(contract, /Drift check/i);
    assert.match(contract, /Block on drift/i);
    assert.match(contract, /reconcile:<work-id>/);
    assert.match(contract, /INSERT OR IGNORE/);
    assert.match(contract, /<todo_status>/);
  });

  it("seeds the reconcile todo at init for both profiles", async () => {
    const init = await readRepoFile("skills/paw-init/SKILL.md");

    assert.match(init, /reconcile:<work-id>/);
    assert.match(init, /INSERT OR IGNORE/);
    assert.match(init, /Reconcile control state with live evidence/);
  });

  it("documents a stage boundary gate in paw-lite at every transition", async () => {
    const lite = await readRepoFile("skills/paw-lite/SKILL.md");

    assert.match(lite, /### Stage Boundary Gate/);
    assert.match(lite, /Rebuild activity mirror/i);
    assert.match(lite, /lite:<work-id>:\{planning,implementation,final-review,final-pr\}/);
    assert.match(lite, /Reconcile/i);
    assert.match(lite, /Block on drift/i);
    assert.match(lite, /Stage Boundary Gate \(2→3\)/);
    assert.match(lite, /Stage Boundary Gate \(3→4\)/);
    assert.match(lite, /Stage Boundary Gate \(4→5\)/);
  });

  it("requires the Stage 5 gate to pass before loading paw-pr", async () => {
    const lite = await readRepoFile("skills/paw-lite/SKILL.md");

    const stage5Match = lite.match(/### Stage 5: PR[\s\S]*?(?=\n## |\n### |$)/);
    assert.ok(stage5Match, "Stage 5: PR section missing");
    const stage5 = stage5Match[0];
    assert.match(stage5, /Stage Boundary Gate \(4→5\)/);
    assert.match(stage5, /Do not run `git rm`|Do not perform stop-tracking/i);
    assert.match(stage5, /Load `paw-pr`/);
  });

  it("references the reconciliation preamble from mutation-affecting skills", async () => {
    const files = [
      "skills/paw-lite/SKILL.md",
      "skills/paw-pr/SKILL.md",
      "skills/paw-git-operations/SKILL.md",
      "skills/paw-implement/SKILL.md",
      "skills/paw-planning/SKILL.md",
      "skills/paw-final-review/SKILL.md",
      "skills/paw-planning-docs-review/SKILL.md",
    ];

    for (const path of files) {
      const content = await readRepoFile(path);
      assert.match(
        content,
        /reconciliation-on-read preamble|reconcile:<work-id>/i,
        `${path} must reference the reconciliation-on-read preamble or reconcile:<work-id> todo`,
      );
    }
  });

  it("surfaces the reconcile todo in agent-level Workflow Tracking guidance", async () => {
    const paw = await readRepoFile("agents/PAW.agent.md");
    const pawReview = await readRepoFile("agents/PAW-Review.agent.md");

    assert.match(paw, /reconcile:<work-id>/);
    assert.match(paw, /<todo_status>/);
    assert.match(pawReview, /reconcile:<work-id>/);
    assert.match(pawReview, /<todo_status>/);
  });

  it("requires paw-transition to open/close the reconcile todo across stage boundaries", async () => {
    const transition = await readRepoFile("skills/paw-transition/SKILL.md");

    assert.match(transition, /reconcile:<work-id>/);
    assert.match(transition, /re-open `reconcile:<work-id>`/i);
    assert.match(transition, /mark `reconcile:<work-id>` todo `done`/i);
  });
});
