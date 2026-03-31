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

describe("execution checkout contract content", () => {
  it("documents execution checkout rules in PAW.agent.md", async () => {
    const content = await readRepoFile("agents/PAW.agent.md");
    assert.match(content, /## Execution Checkout Rules/);
    assert.match(content, /never mutate it/i);
    assert.match(content, /<normalized-origin-slug>@<root-commit-sha>/);
    assert.match(content, /worktree:<work-id>:<target-branch>/);
    assert.match(content, /execution checkout path can be proven/i);
    assert.match(content, /session cwd may differ from the execution checkout/i);
    assert.match(content, /proven execution checkout path as the working directory/i);
    assert.match(content, /git -C <execution-checkout-path>/i);
    assert.doesNotMatch(content, /this session is (already )?in the intended execution checkout/i);
  });

  it("documents execution checkout contract in paw-git-operations", async () => {
    const content = await readRepoFile("skills/paw-git-operations/SKILL.md");
    assert.match(content, /## Execution Checkout Contract/);
    assert.match(content, /caller checkout must never be mutated/i);
    assert.match(content, /session cwd may differ from the execution checkout/i);
    assert.match(content, /execution checkout is ambiguous or cannot be proven/i);
    assert.match(content, /all git operations must execute in the proven execution checkout directory/i);
    assert.match(content, /git -C <execution-checkout-path>/i);
    assert.match(content, /<normalized-origin-slug>@<root-commit-sha>/);
    assert.match(content, /worktree:<work-id>:<target-branch>/);
  });

  it("documents CLI-specific worktree limitations in paw-init", async () => {
    const content = await readRepoFile("skills/paw-init/SKILL.md");
    assert.match(content, /Do not assume a registry or automatic handoff into another checkout/i);
    assert.match(content, /session cwd may differ from the execution checkout/i);
    assert.match(content, /git commands against that candidate\/proven execution checkout path/i);
    assert.match(content, /caller checkout's branch\/status as authoritative proof/i);
    assert.match(content, /identify or reopen the execution checkout|re-initialize in `current-checkout` mode/i);
    assert.match(content, /git worktree list/);
    assert.doesNotMatch(content, /already runs? in the intended execution checkout/i);
  });
});
