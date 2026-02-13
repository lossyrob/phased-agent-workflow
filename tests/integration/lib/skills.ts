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
