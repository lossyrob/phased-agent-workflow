import { describe, it } from "node:test";
import assert from "node:assert";
import { readdir, readFile } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import {
  assertNoRuntimeMarkers,
  assertWorkflowContextConfigOnly,
  extractWorkflowContextTemplate,
} from "../../lib/workflow-context-invariants.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(resolve(REPO_ROOT, relativePath), "utf-8");
}

async function listPromptFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listPromptFiles(path);
    }
    return entry.name.endsWith(".md") ? [path] : [];
  }));
  return files.flat();
}

describe("WorkflowContext config-only guardrails", () => {
  it("keeps runtime control-state markers out of the paw-init template", async () => {
    const content = await readRepoFile("skills/paw-init/SKILL.md");
    const template = extractWorkflowContextTemplate(content);

    assertWorkflowContextConfigOnly(template, "WorkflowContext template");

    assert.match(content, /WorkflowContext\.md is durable configuration only/i);
    assert.match(content, /Do not add runtime progress, gate status, reconciliation markers, TODO mirrors, SQL mirror data/i);
  });

  it("treats resolved configuration values as downstream obligations", async () => {
    const content = await readRepoFile("skills/paw-init/SKILL.md");

    assert.match(content, /Resolved values stored in WorkflowContext\.md are active workflow obligations/i);
    assert.match(content, /Defaults, user defaults, presets, and explicit overrides all become equally authoritative/i);
  });

  it("does not instruct agents or skills to create runtime control-state sections", async () => {
    const promptFiles = [
      ...(await listPromptFiles(resolve(REPO_ROOT, "agents"))),
      ...(await listPromptFiles(resolve(REPO_ROOT, "skills"))),
    ];

    for (const file of promptFiles) {
      const content = await readFile(file, "utf-8");
      assertNoRuntimeMarkers(content, file);
    }
  });
});
