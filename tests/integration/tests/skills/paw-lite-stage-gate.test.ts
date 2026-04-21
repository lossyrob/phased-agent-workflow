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
    assert.match(lite, /lite:<work-id>:/);
    assert.match(lite, /Reconcile/i);
    assert.match(lite, /Block on drift/i);
    assert.match(lite, /Stage Boundary Gate \(3→4\)/);
    assert.match(lite, /Stage Boundary Gate \(4→5\)/);
  });

  it("supports optional planning docs review in paw-lite", async () => {
    const lite = await readRepoFile("skills/paw-lite/SKILL.md");
    const init = await readRepoFile("skills/paw-init/SKILL.md");

    // paw-lite has a Stage 2.5 for planning docs review
    assert.match(lite, /### Stage 2\.5: Planning Docs Review/);
    assert.match(lite, /paw-planning-docs-review/);
    assert.match(lite, /reviews\/planning\//);
    assert.match(lite, /planning-docs-review/);
    assert.match(lite, /`procedure:planning-review`/);

    // paw-init allows planning_docs_review=enabled for paw-lite
    assert.doesNotMatch(
      init,
      /paw-lite requires:[^\n]*planning_docs_review=disabled/,
      "paw-init must not require planning_docs_review=disabled for paw-lite",
    );
    assert.match(init, /paw-lite[^\n]*`planning_docs_review`[^\n]*explicitly `enabled`/i);
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

  it("defines a state-echo banner on skill load in the control-state contract", async () => {
    const contract = await readRepoFile("skills/paw-workflow/references/control-state-contract.md");

    assert.match(contract, /State-echo banner/i);
    assert.match(contract, /\[<skill-name>\]/);
    assert.match(contract, /work-id=<id>/);
    assert.match(contract, /Reconciliation=<marker>/);
    assert.match(contract, /Next gate:/);
  });

  it("defines summarization and subagent-dispatch protocols in the control-state contract", async () => {
    const contract = await readRepoFile("skills/paw-workflow/references/control-state-contract.md");

    assert.match(contract, /## Summarization Protocol/);
    assert.match(contract, /include the following verbatim/i);
    assert.match(contract, /## Subagent Dispatch Discipline/);
    assert.match(contract, /main-session/i);
    assert.match(contract, /before dispatching/i);
  });

  it("adds pre-dispatch subagent discipline to the paw-lite Stage Boundary Gate", async () => {
    const lite = await readRepoFile("skills/paw-lite/SKILL.md");

    assert.match(lite, /Pre-dispatch discipline/i);
    assert.match(lite, /main-session discipline/i);
    assert.match(lite, /Subagents do not inherit/i);
  });

  it("adds a Stage 5 admission precondition in paw-pr for paw-lite", async () => {
    const pr = await readRepoFile("skills/paw-pr/SKILL.md");

    assert.match(pr, /Stage 5 Admission Check \(paw-lite\)/);
    assert.match(pr, /lite:<work-id>:final-pr/);
    assert.match(pr, /in_progress/);
    assert.match(pr, /STOP/);
  });

  it("flags direct remote-affecting git operations as contract violations from paw-lite", async () => {
    const git = await readRepoFile("skills/paw-git-operations/SKILL.md");

    assert.match(git, /Contract violation \(paw-lite\)/i);
    assert.match(git, /gh pr create/);
    assert.match(git, /git push origin/);
    assert.match(git, /paw-pr/);
  });

  it("requires summarization protocols in agent-level tracking guidance", async () => {
    const paw = await readRepoFile("agents/PAW.agent.md");
    const pawReview = await readRepoFile("agents/PAW-Review.agent.md");

    assert.match(paw, /Summarization and Checkpoint Protocol/);
    assert.match(paw, /`## Control State`/);
    assert.match(paw, /verbatim/i);
    assert.match(pawReview, /Summarization and Checkpoint Protocol/);
    assert.match(pawReview, /verbatim/i);
  });

  it("requires paw-lite and paw-init to halt on unknown activity requests", async () => {
    const lite = await readRepoFile("skills/paw-lite/SKILL.md");
    const init = await readRepoFile("skills/paw-init/SKILL.md");
    const contract = await readRepoFile("skills/paw-workflow/references/control-state-contract.md");

    assert.match(lite, /Halt on Unknown Activity/i);
    assert.match(lite, /Do not improvise/i);
    assert.match(init, /Unknown stage, review, or activity/i);
    assert.match(init, /Do not improvise/i);
    assert.match(contract, /Halt on unknown activity/i);
  });
});
