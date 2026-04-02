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

    assert.match(planning, /set `procedure:planning-review` to `blocked`/);
    assert.match(planning, /Do not run a single-model fallback\./);
    assert.doesNotMatch(planning, /Running single-model review\./);
  });

  it("blocks unsupported final review modes instead of silently downgrading", async () => {
    const finalReview = await readRepoFile("skills/paw-final-review/SKILL.md");

    assert.match(finalReview, /set `procedure:final-review` to `blocked`/);
    assert.match(finalReview, /Do not run a single-model fallback\./);
    assert.doesNotMatch(finalReview, /Running single-model review\./);
  });
});
