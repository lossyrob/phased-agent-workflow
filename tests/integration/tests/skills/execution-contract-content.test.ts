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
    assert.match(content, /caller checkout must never be mutated/i);
    assert.match(content, /Branch auto-derive prompts apply only to `current-checkout`/);
  });

  it("documents execution checkout contract in paw-git-operations", async () => {
    const content = await readRepoFile("skills/paw-git-operations/SKILL.md");
    assert.match(content, /## Execution Checkout Contract/);
    assert.match(content, /caller checkout must never be mutated/i);
    assert.match(content, /current branch".*validated execution checkout/is);
  });

  it("fails fast for worktree mode in branch auto-derive prompts", async () => {
    const issuePrompt = await readRepoFile("src/prompts/branchAutoDeriveWithIssue.template.md");
    const descriptionPrompt = await readRepoFile("src/prompts/branchAutoDeriveWithDescription.template.md");

    for (const prompt of [issuePrompt, descriptionPrompt]) {
      assert.match(prompt, /Only use this prompt when PAW is running in `current-checkout` mode/);
      assert.match(prompt, /Execution Mode: worktree/);
      assert.match(prompt, /git worktree list/);
      assert.match(prompt, /explicit target branch/i);
    }
  });
});
