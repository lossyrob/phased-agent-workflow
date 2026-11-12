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
    const git = await readFile(resolve(REPO_ROOT, "skills/paw-workflow/references/procedures/git.md"), "utf-8");
    const finalPr = await readFile(resolve(REPO_ROOT, "skills/paw-workflow/references/procedures/final-pr.md"), "utf-8");

    assert.match(
      git,
      /`\.gitignore` files under `\.paw\/work\/<work-id>\/` are local markers\. Never stage them\./,
      "git procedure should forbid staging ignore markers under the work directory",
    );

    assert.match(
      finalPr,
      /Write `\.paw\/work\/<work-id>\/\.gitignore` containing `\*`\. Do not stage it\./,
      "final PR procedure should leave the stop-tracking marker unstaged",
    );
  });

  it("marks scratch-directory .gitignore files as untracked local-only markers at creation sites", async () => {
    for (const relPath of ["skills/paw-sot/SKILL.md"]) {
      const content = await readFile(resolve(REPO_ROOT, relPath), "utf-8");
      assert.match(
        content,
        /local-only scratch ignore marker — do NOT stage or commit it/i,
        `${relPath} should say that created scratch markers stay local-only and untracked`,
      );
    }
  });
});
