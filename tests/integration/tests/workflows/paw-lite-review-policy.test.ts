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

describe("PAW-Lite review policy and final review routing", () => {
  it("keeps review policy scoped to human pauses", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /Review Policy controls human pause points only/i);
    assert.match(content, /does not disable configured planning docs review/i);
    assert.match(content, /configured final review/i);
    assert.match(content, /automated gates/i);
    assert.match(content, /final PR handoff/i);
    assert.match(content, /Review Policy does not make final review optional/i);
  });

  it("branches final review routing from Final Agent Review", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /If `Final Agent Review: enabled`/);
    assert.match(content, /`implement->final-review`/);
    assert.match(content, /Final review is mandatory before final PR/i);
    assert.match(content, /If `Final Agent Review: disabled`/);
    assert.match(content, /`implement->final-pr`/);
    assert.match(content, /intentionally skip Stage 4 by configuration/i);
  });

  it("requires the configured society-of-thought review path", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /`society-of-thought`/);
    assert.match(content, /Load `paw-sot` and invoke with configured specialists/i);
    assert.match(content, /specialist models, and perspectives/i);
    assert.match(content, /Use the configured `paw-sot` path/i);
  });

  it("keeps final review mandatory at runtime when review policy is final-pr-only", { timeout: 240_000 }, async () => {
    const ctx = await createPawLiteBoundaryContext("review-policy");
    const workId = "runtime-review-policy";

    try {
      await seedPawLiteWork(ctx.fixture.workDir, workId, {
        reviewPolicy: "final-pr-only",
        finalAgentReview: "enabled",
        finalReviewMode: "society-of-thought",
        finalReviewInteractionMode: "debate",
      });

      const response = await evaluatePawLiteBoundary(
        ctx,
        workId,
        "implement->final-review",
        "Emphasize whether Review Policy changes the configured final review obligation.",
      );

      assert.match(response, /final-pr-only/i);
      assert.match(response, /Final Agent Review:\s*enabled/i);
      assert.match(response, /final review/i);
      assert.match(response, /mandatory/i);
      assert.match(response, /society-of-thought/i);
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
