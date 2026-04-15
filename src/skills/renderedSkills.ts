import * as fs from 'fs';
import * as path from 'path';
import { processConditionalBlocks } from '../utils/conditionalBlocks';

function ensureDirectoryExists(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function copySkillDirectoryForVSCode(sourceDir: string, outputDir: string): void {
  ensureDirectoryExists(outputDir);

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const outputPath = path.join(outputDir, entry.name);

    if (entry.isDirectory()) {
      copySkillDirectoryForVSCode(sourcePath, outputPath);
      continue;
    }

    if (entry.name === 'SKILL.md') {
      const content = fs.readFileSync(sourcePath, 'utf-8');
      const renderedContent = processConditionalBlocks(content, 'vscode');
      fs.writeFileSync(outputPath, renderedContent, 'utf-8');
      continue;
    }

    fs.copyFileSync(sourcePath, outputPath);
  }
}

export function listBundledSkillNames(skillsRoot: string): string[] {
  if (!fs.existsSync(skillsRoot)) {
    throw new Error(`Skills directory not found at ${skillsRoot}`);
  }

  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => fs.existsSync(path.join(skillsRoot, entry.name, 'SKILL.md')))
    .map(entry => entry.name)
    .sort();
}

export function renderBundledSkillsForVSCode(skillsRoot: string, outputRoot: string): string[] {
  const skillNames = listBundledSkillNames(skillsRoot);

  fs.rmSync(outputRoot, { recursive: true, force: true });
  ensureDirectoryExists(outputRoot);

  for (const skillName of skillNames) {
    copySkillDirectoryForVSCode(
      path.join(skillsRoot, skillName),
      path.join(outputRoot, skillName)
    );
  }

  return skillNames;
}
