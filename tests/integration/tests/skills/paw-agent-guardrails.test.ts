import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

describe("PAW agent final PR guardrails", () => {
  it("requires paw-pr loading and blocks inline final PR creation", async () => {
    const content = await readFile(resolve(REPO_ROOT, "agents/PAW.agent.md"), "utf-8");

    assert.match(
      content,
      /\| paw-pr \| Load `paw-pr` skill\. Honor `artifact_lifecycle` and `artifact_lifecycle_action` from `paw-transition`\./,
      "PAW.agent.md should require loading paw-pr and honoring transition lifecycle fields",
    );

    assert.match(
      content,
      /artifact_lifecycle_action/,
      "PAW.agent.md should mention artifact_lifecycle_action in transition handling",
    );

    assert.match(
      content,
      /do NOT create the final PR inline or bypass the skill\./i,
      "PAW.agent.md should forbid inline final PR creation at the paw-pr boundary",
    );
  });
});
