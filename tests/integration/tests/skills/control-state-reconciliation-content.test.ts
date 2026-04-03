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

describe("control-state reconciliation content", () => {
  it("documents shared reconciliation rules in the workflow contract", async () => {
    const workflow = await readRepoFile("skills/paw-workflow/references/control-state-contract.md");

    assert.match(workflow, /## Reconciliation Rules/);
    assert.match(workflow, /Mutation-affecting decisions include delegation, transition advancement, review execution, git mutation, and final PR creation\./);
    assert.match(workflow, /Read-only status\/reporting may continue when reconciliation is `stale` or `external_unverified`/);
    assert.match(workflow, /continue in legacy best-effort mode and explicitly report that hardened protections are inactive/i);
    assert.match(workflow, /Configured procedure items become `resolved` only when the configured mode actually ran\./);
  });

  it("requires reconciliation before mutation-affecting PAW actions", async () => {
    const transition = await readRepoFile("skills/paw-transition/SKILL.md");
    const status = await readRepoFile("skills/paw-status/SKILL.md");
    const gitOps = await readRepoFile("skills/paw-git-operations/SKILL.md");
    const pawAgent = await readRepoFile("agents/PAW.agent.md");
    const pawPr = await readRepoFile("skills/paw-pr/SKILL.md");

    assert.match(transition, /first non-terminal required activity item/i);
    assert.match(transition, /preflight:\s*blocked:\s*reconciliation incomplete/i);
    assert.match(transition, /TODOs are a mirror only/i);

    assert.match(status, /read-only\/unverified/i);
    assert.match(status, /hardened protections are inactive/i);
    assert.match(status, /do not report progress past unresolved required items, gate items, or procedure items/i);

    assert.match(gitOps, /Treat `Reconciliation: current` as required for mutation-affecting git work\./);
    assert.match(gitOps, /STOP and report that unresolved control-state item/i);

    assert.match(pawAgent, /If reconciliation cannot make the state `current`, STOP and report the blocker/i);
    assert.match(pawAgent, /do not advance past required activity items, gate items, or configured procedure items/i);

    assert.match(pawPr, /Required activity items earlier than `final-pr`, plus all gate items and configured procedure items, must all be `resolved` or `not_applicable`/);
    assert.match(pawPr, /Treat `final-pr` as the current activity/i);
    assert.match(pawPr, /hardened protections are inactive/i);
  });
});
