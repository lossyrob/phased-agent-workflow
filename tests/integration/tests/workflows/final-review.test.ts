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

describe("configured review mode enforcement content", () => {
  it("blocks unsupported planning review modes instead of silently downgrading", async () => {
    const planning = await readRepoFile("skills/paw-planning-docs-review/SKILL.md");

    assert.match(planning, /persist `procedure:planning-review` as `blocked` in `WorkflowContext\.md`/);
    assert.match(planning, /Do not run a single-model fallback\./);
    assert.match(planning, /When hardened state is absent, continue in legacy best-effort mode/i);
    assert.match(planning, /run a single-model fallback review/i);
  });

  it("blocks unsupported final review modes instead of silently downgrading", async () => {
    const finalReview = await readRepoFile("skills/paw-final-review/SKILL.md");

    assert.match(finalReview, /persist `procedure:final-review` as `blocked` in `WorkflowContext\.md`/);
    assert.match(finalReview, /Do not run a single-model fallback\./);
    assert.match(finalReview, /When hardened state is absent, continue in legacy best-effort mode/i);
    assert.match(finalReview, /run a single-model fallback review/i);
  });
});
