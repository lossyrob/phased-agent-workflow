import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

export async function loadSkill(name: string): Promise<string> {
  const skillPath = join(REPO_ROOT, "skills", name, "SKILL.md");
  return readFile(skillPath, "utf-8");
}

export async function loadAgent(name: string): Promise<string> {
  const agentPath = join(REPO_ROOT, "agents", `${name}.agent.md`);
  return readFile(agentPath, "utf-8");
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}

/** Agent prompt text for the CLI: front matter removed, `{{#cli}}` blocks kept, `{{#vscode}}` blocks dropped. */
export function renderCliAgentPrompt(raw: string): string {
  return raw
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/\{\{#vscode\}\}[\s\S]*?\{\{\/vscode\}\}\n?/g, "")
    .replace(/\{\{#cli\}\}\n?/g, "")
    .replace(/\{\{\/cli\}\}\n?/g, "")
    .trim();
}

/** v1 skills that the v2 workflow skill replaced (docs/specification/v2/design.md, Compatibility). */
export const REMOVED_SKILLS = [
  "paw-transition",
  "paw-init",
  "paw-spec",
  "paw-spec-research",
  "paw-spec-review",
  "paw-code-research",
  "paw-planning",
  "paw-plan-review",
  "paw-planning-docs-review",
  "paw-implement",
  "paw-impl-review",
  "paw-final-review",
  "paw-pr",
  "paw-git-operations",
];
