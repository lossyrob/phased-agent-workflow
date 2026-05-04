import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

describe("PAW-Lite final PR handoff", () => {
  it("routes final-review completion to paw-pr", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /output `final-review->final-pr`/);
    assert.match(content, /create\/maintain `lite:<work-id>:boundary:final-review->final-pr`/);
    assert.match(content, /hand off to Stage 5/i);
    assert.match(content, /Load the `paw-pr` skill/);
  });

  it("routes disabled final review directly to paw-pr", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /output `implement->final-pr`/);
    assert.match(content, /create\/maintain `lite:<work-id>:boundary:implement->final-pr`/);
    assert.match(content, /Final PR still routes through `paw-pr`/);
  });

  it("keeps artifact lifecycle, push, and PR creation owned by paw-pr", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /inline `git push`/);
    assert.match(content, /inline stop-tracking\/artifact cleanup are incorrect/i);
    assert.match(content, /`paw-pr` owns pre-flight validation, artifact lifecycle detection, stop-tracking, push, PR creation/i);
  });
});
