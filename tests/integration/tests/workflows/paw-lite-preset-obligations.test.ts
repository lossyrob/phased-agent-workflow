import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

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
});
