import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

describe("PAW-Lite TODO category filtering", () => {
  it("filters implementation readiness checks to work-item TODOs", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /Query ready work todos/i);
    assert.match(content, /status = 'pending' AND id LIKE 'lite:<work-id>:work:%'/);
    assert.match(content, /Verify work todos are done/i);
    assert.match(content, /status != 'done' AND id LIKE 'lite:<work-id>:work:%'/);
  });

  it("prevents future boundary TODOs from blocking implementation, review, or PR readiness", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /pending future boundary TODOs must not block implementation, review, or PR readiness/i);
    assert.match(content, /Boundary TODOs gate only their named checkpoint/i);
    assert.match(content, /Before invoking paw-pr, ensure implementation work todos are complete/i);
  });

  it("keeps work-item completion separate from active and future boundary TODOs", () => {
    const workId = "runtime-todo-filter";
    const todos = [
      { id: `lite:${workId}:work:update-prompt`, status: "done" },
      { id: `lite:${workId}:work:add-tests`, status: "done" },
      { id: `lite:${workId}:boundary:implement->final-review`, status: "pending" },
      { id: `lite:${workId}:boundary:final-review->final-pr`, status: "pending" },
    ];

    const unfinishedWork = todos.filter((todo) =>
      todo.status !== "done" && todo.id.startsWith(`lite:${workId}:work:`));
    const activeBoundary = todos.find((todo) =>
      todo.id === `lite:${workId}:boundary:implement->final-review`);

    assert.deepStrictEqual(unfinishedWork, []);
    assert.strictEqual(activeBoundary?.status, "pending");
  });
});
