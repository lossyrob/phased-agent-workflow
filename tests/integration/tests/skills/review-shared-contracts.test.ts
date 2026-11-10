/**
 * PAW Review and paw-workflow are installed as separate skills, so each carries its own
 * copy of the contracts they share. These checks keep the copies identical.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { getRepoRoot } from "../../lib/skills.js";

const read = (rel: string) => readFile(resolve(getRepoRoot(), rel), "utf-8");

/** Text between `<!-- shared:<name> -->` and the next `<!-- /shared -->`. */
function sharedRegion(text: string, name: string, file: string): string {
  const match = text.match(new RegExp(`<!-- shared:${name} -->\\n([\\s\\S]*?)<!-- /shared -->`));
  assert.ok(match, `${file} has no shared:${name} region`);
  return match[1];
}

/** The fenced YAML return block under `## Return`. */
function returnBlock(text: string, file: string): string {
  const match = text.match(/## Return\n+```yaml\n([\s\S]*?)```/);
  assert.ok(match, `${file} has no Return yaml block`);
  return match[1];
}

/** The lines of a YAML list item starting at `key:` up to the next top-level key. */
function yamlEntry(block: string, key: string, file: string): string {
  const match = block.match(new RegExp(`^${key}:.*\\n(?:[ ].*\\n)*`, "m"));
  assert.ok(match, `${file} return block has no ${key}`);
  return match[0];
}

const REVIEW_SKILL = "skills/paw-review-workflow/SKILL.md";
const REVIEW_CONTRACT = "skills/paw-review-workflow/references/activity-contract.md";

describe("contracts shared by paw-workflow and PAW Review", () => {
  for (const [name, v2File] of [
    ["review-provider-block", "skills/paw-workflow/references/configuration.md"],
    ["sot-invocation", "skills/paw-workflow/references/review-providers.md"],
  ] as const) {
    it(`${name} is identical in both workflows`, async () => {
      const v2 = sharedRegion(await read(v2File), name, v2File);
      const review = sharedRegion(await read(REVIEW_SKILL), name, REVIEW_SKILL);
      assert.strictEqual(review, v2);
    });
  }

  it("the PAW Review return block uses the v2 status vocabulary and entry shapes", async () => {
    const contract = returnBlock(await read(REVIEW_CONTRACT), REVIEW_CONTRACT);
    const plan = returnBlock(await read("skills/paw-workflow/references/activities/plan.md"), "plan.md");
    const review = returnBlock(await read("skills/paw-workflow/references/activities/review.md"), "review.md");

    assert.strictEqual(yamlEntry(contract, "status", REVIEW_CONTRACT), yamlEntry(plan, "status", "plan.md"));
    assert.strictEqual(yamlEntry(contract, "summary", REVIEW_CONTRACT), yamlEntry(plan, "summary", "plan.md"));
    assert.strictEqual(yamlEntry(contract, "decisions_needed", REVIEW_CONTRACT), yamlEntry(plan, "decisions_needed", "plan.md"));
    assert.strictEqual(yamlEntry(contract, "blockers", REVIEW_CONTRACT), yamlEntry(plan, "blockers", "plan.md"));
    assert.strictEqual(yamlEntry(contract, "findings", REVIEW_CONTRACT), yamlEntry(review, "findings", "review.md"));
    assert.strictEqual(yamlEntry(contract, "validation", REVIEW_CONTRACT), yamlEntry(review, "validation", "review.md"));
  });

  it("every PAW Review stage skill returns the shared block, not its own status format", async () => {
    for (const stage of ["understanding", "baseline", "impact", "gap", "correlation", "feedback", "critic"]) {
      const file = `skills/paw-review-${stage}/SKILL.md`;
      const text = await read(file);
      assert.match(text, /Follow the activity contract named in your brief/, file);
      assert.match(text, /## Completion\n\nReturn the block in the activity contract/, file);
      assert.doesNotMatch(text, /Status: (Success|Partial|Draft|Finalized)/, `${file} still defines its own status`);
      assert.doesNotMatch(text, /Core Review Principles from `paw-review-workflow`/, `${file} sends the subagent to the workflow skill`);
    }
  });
});
