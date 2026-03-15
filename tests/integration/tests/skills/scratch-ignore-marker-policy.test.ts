import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

describe("scratch ignore marker policy", () => {
  it("documents scratch ignore markers as local-only in the artifact lifecycle spec", async () => {
    const content = await readFile(resolve(REPO_ROOT, "paw-specification.md"), "utf-8");

    assert.match(
      content,
      /Scratch ignore markers are local-only lifecycle markers/i,
      "paw-specification.md should describe scratch ignore markers as local-only lifecycle markers",
    );

    assert.match(
      content,
      /If any scratch ignore marker becomes tracked, remove it from the git index before commit or final PR creation/i,
      "paw-specification.md should require removing tracked scratch ignore markers from the index",
    );
  });

  it("adds commit and PR guardrails for scratch ignore markers", async () => {
    const gitOps = await readFile(resolve(REPO_ROOT, "skills/paw-git-operations/SKILL.md"), "utf-8");
    const pawPr = await readFile(resolve(REPO_ROOT, "skills/paw-pr/SKILL.md"), "utf-8");

    assert.match(
      gitOps,
      /Scratch ignore markers are always local-only/i,
      "paw-git-operations should call out scratch ignore markers as always local-only",
    );

    assert.match(
      gitOps,
      /Do NOT stage or commit them in normal commits/i,
      "paw-git-operations should forbid staging scratch ignore markers",
    );

    assert.match(
      pawPr,
      /Scratch ignore markers are local-only lifecycle markers/i,
      "paw-pr should treat scratch ignore markers as local-only lifecycle markers",
    );

    assert.match(
      pawPr,
      /Scratch ignore markers are not tracked in the final PR diff/i,
      "paw-pr quality checklist should check that scratch ignore markers are absent from the final PR diff",
    );
  });

  it("marks scratch-directory .gitignore files as untracked local-only markers at creation sites", async () => {
    for (const relPath of [
      "skills/paw-planning/SKILL.md",
      "skills/paw-final-review/SKILL.md",
      "skills/paw-planning-docs-review/SKILL.md",
      "skills/paw-sot/SKILL.md",
    ]) {
      const content = await readFile(resolve(REPO_ROOT, relPath), "utf-8");
      assert.match(
        content,
        /local-only scratch ignore marker — do NOT stage or commit it/i,
        `${relPath} should say that created scratch markers stay local-only and untracked`,
      );
    }
  });
});
