import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

describe("PAW-Lite planning docs review routing", () => {
  it("routes enabled planning docs review through paw-planning-docs-review before implementation", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /If `Planning Docs Review: enabled`/);
    assert.match(content, /output `plan->planning-docs-review`/);
    assert.match(content, /honor configured planning review mode\/models/);
    assert.match(content, /load and execute `paw-planning-docs-review`/);
    assert.match(content, /Skipping directly to implementation is incorrect/i);
  });

  it("routes disabled planning docs review directly to implementation with boundary TODOs", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /If `Planning Docs Review: disabled`/);
    assert.match(content, /output `plan->implement`/);
    assert.match(content, /create\/maintain `lite:<work-id>:boundary:plan->implement`/);
    assert.match(content, /proceed to implementation with tracked work-item TODOs/i);
  });
});
