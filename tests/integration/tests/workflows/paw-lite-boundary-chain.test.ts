import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { destroyTestContext } from "../../lib/harness.js";
import {
  createPawLiteBoundaryContext,
  evaluatePawLiteBoundary,
  seedPawLiteWork,
} from "../../lib/paw-lite-boundary.js";
import { upsertBoundaryTodo, type PawLiteTodo } from "../../lib/paw-lite-todos.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

describe("PAW-Lite boundary chain contract", () => {
  it("defines successive boundary TODOs for planning and planning review transitions", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /lite:<work-id>:boundary:<boundary-name>/);
    assert.match(content, /lite:<work-id>:boundary:planning-docs-review->implement/);
    assert.match(content, /lite:<work-id>:boundary:plan->implement/);
    assert.match(content, /INSERT INTO todos \(id, title, description, status\)/);
    assert.match(content, /ON CONFLICT\(id\) DO UPDATE/);
    assert.match(content, /status = excluded\.status/);
    assert.match(content, /WHERE id = 'lite:<work-id>:boundary:<completed-boundary-name>'/);
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

  it("resets a previously completed boundary TODO to pending on re-entry", () => {
    const workId = "runtime-boundary-chain";
    const todos: PawLiteTodo[] = [{
      id: `lite:${workId}:boundary:plan->planning-docs-review`,
      title: "Boundary: plan->planning-docs-review",
      description: "old brief",
      status: "done",
    }];

    upsertBoundaryTodo(todos, workId, "plan->planning-docs-review", "new brief");

    assert.deepStrictEqual(todos, [{
      id: `lite:${workId}:boundary:plan->planning-docs-review`,
      title: "Boundary: plan->planning-docs-review",
      description: "new brief",
      status: "pending",
    }]);
  });

  it("evaluates successive seeded boundaries without advancing unrelated stages", { timeout: 300_000 }, async () => {
    const ctx = await createPawLiteBoundaryContext("chain");
    const workId = "runtime-boundary-chain";

    try {
      await seedPawLiteWork(ctx.fixture.workDir, workId, {
        planningDocsReview: "enabled",
        finalAgentReview: "enabled",
        finalReviewMode: "society-of-thought",
        finalReviewInteractionMode: "debate",
      });

      const planningReview = await evaluatePawLiteBoundary(ctx, workId, "plan->planning-docs-review");
      assert.match(planningReview, /plan->planning-docs-review/i);
      assert.match(planningReview, /paw-planning-docs-review/i);
      assert.match(planningReview, /Planning Docs Review:\s*enabled/i);
      assert.match(planningReview, /lite:runtime-boundary-chain:boundary:planning-docs-review->implement/i);

      const implementation = await evaluatePawLiteBoundary(ctx, workId, "planning-docs-review->implement");
      assert.match(implementation, /planning-docs-review->implement/i);
      assert.match(implementation, /implementation/i);
      assert.match(implementation, /blocking findings/i);

      const finalReview = await evaluatePawLiteBoundary(ctx, workId, "implement->final-review");
      assert.match(finalReview, /implement->final-review/i);
      assert.match(finalReview, /Final Agent Review:\s*enabled/i);
      assert.match(finalReview, /society-of-thought/i);

      const finalPr = await evaluatePawLiteBoundary(ctx, workId, "final-review->final-pr");
      assert.match(finalPr, /final-review->final-pr/i);
      assert.match(finalPr, /paw-pr/i);
      assert.match(finalPr, /inline/i);
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
