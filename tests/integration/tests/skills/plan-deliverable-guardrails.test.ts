import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

describe("plan deliverable guardrails", () => {
  it("requires paw-implement to verify planned deliverables before phase completion", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-implement/SKILL.md"), "utf-8");

    assert.match(
      content,
      /Before marking the phase complete, verify each deliverable in the current phase's `### Changes Required` section exists in repo state/i,
    );

    assert.match(
      content,
      /All planned deliverables from the current phase `Changes Required` section exist and are non-empty where applicable/i,
    );
  });

  it("requires paw-impl-review to block missing or empty planned outputs", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-impl-review/SKILL.md"), "utf-8");

    assert.match(content, /Build an explicit deliverable checklist/i);
    assert.match(
      content,
      /substantive deliverables rather than empty scaffolding|ships scaffolding where the plan promised concrete deliverables/i,
    );
    assert.match(content, /plan promised 2 integration tests but directory is empty/i);
  });

  it("requires final review and spec to treat missing plan deliverables as substantive findings", async () => {
    const finalReview = await readFile(resolve(REPO_ROOT, "skills/paw-final-review/SKILL.md"), "utf-8");
    const spec = await readFile(resolve(REPO_ROOT, "paw-specification.md"), "utf-8");
    const implementationDoc = await readFile(
      resolve(REPO_ROOT, "docs/specification/implementation.md"),
      "utf-8",
    );

    assert.match(
      finalReview,
      /Missing planned deliverables or empty scaffolding where the plan promised concrete output is `should-fix` minimum/i,
    );

    assert.match(
      spec,
      /verifies the current phase's `Changes Required` deliverables actually exist before marking the phase complete/i,
    );

    assert.match(spec, /Missing planned deliverables are `should-fix` minimum/i);

    assert.match(
      implementationDoc,
      /blocks missing or empty planned outputs before pushing\/opening the Phase PR/i,
    );
  });
});
