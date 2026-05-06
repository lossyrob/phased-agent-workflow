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
const FINAL_REVIEW_READY_PATTERN =
  /\bfindings\b.*\b(?:resolve(?:d)?|carried[- ]forward)\b|\b(?:resolve(?:d)?|carried[- ]forward)\b.*\bfindings\b|\breview\s+(?:is\s+)?complete\b|\bcomplete(?:d)?\s+(?:final\s+)?review\b/i;

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

  it("evaluates reviewed and review-disabled final PR handoffs from seeded artifacts", { timeout: 240_000 }, async () => {
    const ctx = await createPawLiteBoundaryContext("final-pr-handoff");
    const reviewedWorkId = "runtime-reviewed-final-pr";
    const disabledWorkId = "runtime-disabled-final-pr";

    try {
      await seedPawLiteWork(ctx.fixture.workDir, reviewedWorkId, {
        finalAgentReview: "enabled",
        finalReviewMode: "multi-model",
      });
      await seedPawLiteWork(ctx.fixture.workDir, disabledWorkId, {
        finalAgentReview: "disabled",
      });

      const reviewed = await evaluatePawLiteBoundary(ctx, reviewedWorkId, "final-review->final-pr");
      assert.match(reviewed, /final-review->final-pr/i);
      assert.match(reviewed, FINAL_REVIEW_READY_PATTERN);
      assert.match(reviewed, /paw-pr/i);
      assert.match(reviewed, /inline.*incorrect|incorrect.*inline/i);

      const disabled = await evaluatePawLiteBoundary(ctx, disabledWorkId, "implement->final-pr");
      assert.match(disabled, /implement->final-pr/i);
      assert.match(disabled, /Final Agent Review:\s*disabled/i);
      assert.match(disabled, /skip|skipped/i);
      assert.match(disabled, /paw-pr/i);
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
