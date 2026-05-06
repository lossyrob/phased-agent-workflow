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

  it("evaluates enabled and disabled routing from seeded WorkflowContext values", { timeout: 240_000 }, async () => {
    const ctx = await createPawLiteBoundaryContext("planning-routing");
    const enabledWorkId = "runtime-planning-enabled";
    const disabledWorkId = "runtime-planning-disabled";

    try {
      await seedPawLiteWork(ctx.fixture.workDir, enabledWorkId, {
        planningDocsReview: "enabled",
        planningReviewMode: "multi-model",
      });
      await seedPawLiteWork(ctx.fixture.workDir, disabledWorkId, {
        planningDocsReview: "disabled",
      });

      const enabled = await evaluatePawLiteBoundary(ctx, enabledWorkId, "plan->planning-docs-review");
      assert.match(enabled, /plan->planning-docs-review/i);
      assert.match(enabled, /Planning Docs Review:\s*enabled/i);
      assert.match(enabled, /paw-planning-docs-review/i);
      assert.match(enabled, /before (advancing to )?implementation|without executing planning docs review/i);

      const disabled = await evaluatePawLiteBoundary(ctx, disabledWorkId, "plan->implement");
      assert.match(disabled, /plan->implement/i);
      assert.match(disabled, /Planning Docs Review:\s*disabled/i);
      assert.match(disabled, /implementation/i);
      assert.match(disabled, /lite:runtime-planning-disabled:boundary:plan->implement/i);
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
