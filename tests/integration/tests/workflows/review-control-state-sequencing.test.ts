import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relativePath), "utf-8");
}

describe("review control-state sequencing content", () => {
  it("documents review-stage sequencing and terminal-state rules", async () => {
    const contract = await readRepoFile("skills/paw-review-workflow/references/control-state-contract.md");
    const workflow = await readRepoFile("skills/paw-review-workflow/SKILL.md");
    const understanding = await readRepoFile("skills/paw-review-understanding/SKILL.md");
    const feedback = await readRepoFile("skills/paw-review-feedback/SKILL.md");
    const critic = await readRepoFile("skills/paw-review-critic/SKILL.md");
    const reviewAgent = await readRepoFile("agents/PAW Review.agent.md");

    assert.match(contract, /manual-posting-provided/);
    assert.match(contract, /stage advancement, critique finalization, or GitHub\/manual-posting output/i);
    assert.match(contract, /`procedure:review-mode` becomes `resolved` only when the configured evaluation path actually ran/);
    assert.match(contract, /`output:github` becomes `resolved` only after a pending review is created or manual posting instructions are written/i);

    assert.match(workflow, /use it as the durable source of truth for review stage sequencing and terminal external-review state/i);
    assert.match(workflow, /Do not advance to evaluation while `understanding` is unresolved/i);
    assert.match(workflow, /`output:feedback` runs only after `evaluation` is resolved/i);
    assert.match(workflow, /`output:github` runs only after `output:critique-response` is resolved/i);

    assert.match(understanding, /preserve the existing review identifier, stage items, terminal external review state, and pending review identifiers/i);
    assert.match(understanding, /After Step 4 creates `DerivedSpec\.md`, update control state so `understanding` is `resolved`, `evaluation` is `pending`, and `Reconciliation` is `current`/i);

    assert.match(feedback, /Initial feedback generation requires `evaluation` to be `resolved` and `output:feedback` to be `pending` or `in_progress`/);
    assert.match(feedback, /Critique Response Mode requires `output:critic` to be `resolved` and `output:critique-response` to be `pending` or `in_progress`/);
    assert.match(feedback, /After the initial pass, update `ReviewContext\.md` so `output:feedback` is `resolved`/i);

    assert.match(critic, /`paw-review-critic` requires `output:feedback` to be `resolved` and `output:critic` to be `pending` or `in_progress`/);
    assert.match(critic, /After assessments are written, update `ReviewContext\.md` so `output:critic` is `resolved`/i);

    assert.match(reviewAgent, /If reconciliation cannot make the state `current`, STOP and report the blocker/i);
    assert.match(reviewAgent, /Do not advance past review-stage items or terminal external-review facts that remain unresolved/i);
  });
});
