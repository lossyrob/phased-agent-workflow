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
const PRESET_DIR = resolve(REPO_ROOT, "skills/paw-init/references/presets");

type PresetConfig = Record<string, string>;

async function readPreset(name: string): Promise<{ extendsPreset?: string; config: PresetConfig }> {
  const content = await readFile(resolve(PRESET_DIR, `${name}.yaml`), "utf-8");
  const extendsMatch = content.match(/^extends:\s*(\S+)\s*$/m);
  const config: PresetConfig = {};

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^  ([a-z_]+):\s*(.+?)\s*$/);
    if (match) {
      config[match[1]] = match[2];
    }
  }

  return { extendsPreset: extendsMatch?.[1], config };
}

async function resolvePreset(name: string, depth = 0): Promise<PresetConfig> {
  assert.ok(depth < 5, "preset inheritance should not exceed five levels");
  const preset = await readPreset(name);
  if (!preset.extendsPreset) {
    return preset.config;
  }
  return { ...(await resolvePreset(preset.extendsPreset, depth + 1)), ...preset.config };
}

describe("PAW-Lite preset-derived obligations", () => {
  it("resolves the built-in auto-full preset to planning docs review and SoT final review", async () => {
    const resolved = await resolvePreset("auto-full");

    assert.strictEqual(resolved.review_policy, "final-pr-only");
    assert.strictEqual(resolved.planning_docs_review, "enabled");
    assert.strictEqual(resolved.planning_review_mode, "multi-model");
    assert.strictEqual(resolved.final_agent_review, "enabled");
    assert.strictEqual(resolved.final_review_mode, "society-of-thought");
    assert.strictEqual(resolved.final_review_specialists, "all");
    assert.strictEqual(resolved.final_review_interaction_mode, "debate");
  });

  it("treats resolved preset values as mandatory PAW-Lite boundary obligations", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-lite/SKILL.md"), "utf-8");

    assert.match(content, /Defaults, presets, and explicit overrides are equally authoritative/i);
    assert.match(content, /Review Policy controls human pause points only/i);
    assert.match(content, /Planning Docs Review: enabled/);
    assert.match(content, /Final Agent Review: enabled/);
    assert.match(content, /Final review is mandatory before final PR/i);
    assert.match(content, /Final Review Mode/);
    assert.match(content, /society-of-thought/);
    assert.match(content, /generic self-review or ad-hoc single-model review is incorrect/i);
  });

  it("evaluates a boundary using values resolved from the real auto-full preset", { timeout: 240_000 }, async () => {
    const resolved = await resolvePreset("auto-full");
    const ctx = await createPawLiteBoundaryContext("preset-obligations");
    const workId = "runtime-auto-full";

    try {
      await seedPawLiteWork(ctx.fixture.workDir, workId, {
        planningDocsReview: resolved.planning_docs_review as "enabled",
        planningReviewMode: resolved.planning_review_mode as "multi-model",
        reviewPolicy: resolved.review_policy as "final-pr-only",
        finalAgentReview: resolved.final_agent_review as "enabled",
        finalReviewMode: resolved.final_review_mode as "society-of-thought",
        finalReviewSpecialists: resolved.final_review_specialists,
        finalReviewInteractionMode: resolved.final_review_interaction_mode as "debate",
      });

      const response = await evaluatePawLiteBoundary(ctx, workId, "implement->final-review");
      assert.match(response, /implement->final-review/i);
      assert.match(response, /Final Agent Review:\s*enabled/i);
      assert.match(response, /society-of-thought/i);
      assert.match(response, /paw-sot|configured/i);
      assert.match(response, /generic self-review|ad-hoc single-model review/i);
    } finally {
      await destroyTestContext(ctx);
    }
  });
});
