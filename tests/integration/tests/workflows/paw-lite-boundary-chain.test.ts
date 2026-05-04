import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

describe("PAW-Lite boundary chain contract", () => {
  it("defines successive boundary TODOs for planning and planning review transitions", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /lite:<work-id>:boundary:<boundary-name>/);
    assert.match(content, /lite:<work-id>:boundary:planning-docs-review->implement/);
    assert.match(content, /lite:<work-id>:boundary:plan->implement/);
    assert.match(content, /keep the implementation boundary TODO visible/i);
    assert.match(content, /Boundary TODOs gate only their named checkpoint/i);
  });

  it("supports deterministic named-boundary evaluation for workflow tests", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /For deterministic resume\/tests/i);
    assert.match(content, /evaluate a named boundary/i);
    assert.match(content, /produce that boundary brief and TODO guidance/i);
    assert.match(content, /without advancing unrelated stages/i);
  });
});
