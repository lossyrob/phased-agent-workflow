import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import {
  assertValidWorkId,
  hasCompletedWorkOrNoWorkAttestation,
  isPrePrWorkReady,
  unfinishedWorkTodos,
  type PawLiteTodo,
} from "../../lib/paw-lite-todos.js";

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

  it("defines persistent SQL maintenance for boundary TODO checkpoints", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /Upsert the next boundary as `pending`/);
    assert.match(content, /INSERT INTO todos \(id, title, description, status\)/);
    assert.match(content, /VALUES \('lite:<work-id>:boundary:<boundary-name>'/);
    assert.match(content, /ON CONFLICT\(id\) DO UPDATE/);
    assert.match(content, /status = excluded\.status/);
    assert.match(content, /mark its active boundary TODO `done`/);
    assert.match(content, /WHERE id = 'lite:<work-id>:boundary:<completed-boundary-name>'/);
  });

  it("keeps work-item completion separate from active and future boundary TODOs", () => {
    const workId = "runtime-todo-filter";
    const todos: PawLiteTodo[] = [
      { id: `lite:${workId}:work:update-prompt`, status: "done" },
      { id: `lite:${workId}:work:add-tests`, status: "done" },
      { id: `lite:${workId}:boundary:implement->final-review`, status: "pending" },
      { id: `lite:${workId}:boundary:final-review->final-pr`, status: "pending" },
    ].map((todo) => ({ ...todo, title: todo.id, description: "" }));

    const unfinishedWork = unfinishedWorkTodos(todos, workId);
    const activeBoundary = todos.find((todo) =>
      todo.id === `lite:${workId}:boundary:implement->final-review`);

    assert.deepStrictEqual(unfinishedWork, []);
    assert.strictEqual(activeBoundary?.status, "pending");
    assert.strictEqual(isPrePrWorkReady(todos, workId), true);
  });

  it("fails closed when no work TODO or no-work attestation exists", () => {
    const workId = "runtime-todo-filter";
    const boundaryOnly: PawLiteTodo[] = [{
      id: `lite:${workId}:boundary:final-review->final-pr`,
      title: "Boundary: final-review->final-pr",
      description: "",
      status: "pending",
    }];
    const noWorkAttested: PawLiteTodo[] = [
      ...boundaryOnly,
      {
        id: `lite:${workId}:work:no-work-required`,
        title: "No work required",
        description: "Doc-only workflow attestation.",
        status: "done",
      },
    ];

    assert.deepStrictEqual(unfinishedWorkTodos(boundaryOnly, workId), []);
    assert.strictEqual(hasCompletedWorkOrNoWorkAttestation(boundaryOnly, workId), false);
    assert.strictEqual(isPrePrWorkReady(boundaryOnly, workId), false);
    assert.strictEqual(isPrePrWorkReady(noWorkAttested, workId), true);
  });

  it("rejects wildcard or empty work IDs before SQL-like prefix filtering", () => {
    assert.doesNotThrow(() => assertValidWorkId("runtime-todo-filter"));
    assert.throws(() => assertValidWorkId(""));
    assert.throws(() => assertValidWorkId("feat_x"));
    assert.throws(() => assertValidWorkId("feat%"));
    assert.throws(() => assertValidWorkId("feat--x"));
  });
});
