import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

describe("paw-status about-paw guidance", () => {
  it("grounds about-paw answers in the correct name, concepts, and source docs", async () => {
    const content = await readFile(resolve(REPO_ROOT, "skills/paw-status/SKILL.md"), "utf-8");

    assert.match(content, /Use the exact name \*\*Phased Agent Workflow\*\*/);
    assert.match(content, /Never invent an acronym expansion/i);
    assert.match(content, /Context-Driven Development/);
    assert.match(content, /README\.md.*docs\/index\.md.*docs\/guide\/index\.md.*docs\/guide\/cli-installation\.md/s);
    assert.match(content, /GitHub Copilot CLI/);
    assert.match(content, /VS Code/);
  });

  it("routes about/onboarding requests to paw-status", async () => {
    const agent = await readFile(resolve(REPO_ROOT, "agents/PAW.agent.md"), "utf-8");
    const reference = await readFile(resolve(REPO_ROOT, "docs/reference/agents.md"), "utf-8");

    assert.match(agent, /About PAW, onboarding, install, or "how do I get started\?" questions → `paw-status`/);
    assert.match(reference, /"What is PAW\?" or "How do I get started\?" → `paw-status` skill/);
  });

  it("keeps the top-level docs aligned on cross-platform onboarding", async () => {
    const docsIndex = await readFile(resolve(REPO_ROOT, "docs/index.md"), "utf-8");
    const guideIndex = await readFile(resolve(REPO_ROOT, "docs/guide/index.md"), "utf-8");

    assert.match(docsIndex, /\*\*GitHub Copilot CLI\*\* and \*\*VS Code\*\*/);
    assert.match(docsIndex, /CLI installation/);
    assert.match(guideIndex, /CLI Installation/);
    assert.match(guideIndex, /VS Code extension/);
  });
});
