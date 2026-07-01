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
    assert.match(workflow, /mutation-affecting decisions/i);
    assert.match(workflow, /read-only/i);
    assert.match(workflow, /legacy best-effort mode/i);
    assert.match(workflow, /Procedure items become `resolved` only when the configured mode actually ran/);
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

    assert.match(status, /read-only.*unverified/i);
    assert.match(status, /legacy best-effort mode/i);
    assert.match(status, /Do not report progress past unresolved required/i);

    assert.match(gitOps, /Treat `Reconciliation: current` as required for mutation-affecting git work\./);
    assert.match(gitOps, /STOP and report that unresolved control-state item/i);

    assert.match(pawAgent, /If reconciliation cannot make the state `current`, STOP and report the blocker/i);
    assert.match(pawAgent, /do not advance past required activity items, gate items, or configured procedure items/i);

    assert.match(pawPr, /All items before `final-pr` must be terminal/i);
    assert.match(pawPr, /legacy best-effort mode/i);
  });
});
