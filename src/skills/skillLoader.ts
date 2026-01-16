import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface SkillCatalogEntry {
  name: string;
  description: string;
  type?: string;
  source: 'builtin';
}

export interface SkillContent {
  name: string;
  content: string;
  error?: string;
}

interface SkillFrontmatter {
  name: string;
  description: string;
  metadata?: Record<string, string>;
  license?: string;
  compatibility?: string;
  allowedTools?: string;
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

function extractFrontmatter(content: string): string {
  if (!content.startsWith('---')) {
    throw new Error('Skill frontmatter is missing or malformed.');
  }

  const closingIndex = content.indexOf('\n---', 3);
  if (closingIndex === -1) {
    throw new Error('Skill frontmatter is missing or malformed.');
  }

  return content.substring(3, closingIndex).trim();
}

export function parseSkillFrontmatter(content: string): SkillFrontmatter {
  const frontmatter = extractFrontmatter(content);
  const lines = frontmatter.split(/\r?\n/);
  const metadata: Record<string, string> = {};
  const result: Partial<SkillFrontmatter> = { metadata };
  let currentSection: string | null = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const match = /^(\s*)([^:\s]+)\s*:\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }

    const indent = match[1].length;
    const key = match[2].trim();
    const rawValue = match[3] ?? '';

    if (indent === 0) {
      currentSection = null;
      if (!rawValue) {
        currentSection = key;
        continue;
      }

      const value = stripQuotes(rawValue.trim());
      switch (key) {
        case 'name':
          result.name = value;
          break;
        case 'description':
          result.description = value;
          break;
        case 'license':
          result.license = value;
          break;
        case 'compatibility':
          result.compatibility = value;
          break;
        case 'allowed-tools':
          result.allowedTools = value;
          break;
        case 'metadata':
          currentSection = key;
          break;
        default:
          break;
      }
    } else if (currentSection === 'metadata') {
      if (!rawValue) {
        continue;
      }
      const value = stripQuotes(rawValue.trim());
      metadata[key] = value;
    }
  }

  if (!result.name || !result.description) {
    throw new Error('Skill frontmatter must include name and description.');
  }

  if (Object.keys(metadata).length === 0) {
    delete result.metadata;
  }

  return result as SkillFrontmatter;
}

export function ensureSkillsDirectory(extensionUri: vscode.Uri): string {
  const skillsUri = vscode.Uri.joinPath(extensionUri, 'skills');
  const skillsPath = skillsUri.fsPath;

  if (!fs.existsSync(skillsPath)) {
    throw new Error(`Skills directory not found at ${skillsPath}`);
  }

  return skillsPath;
}

export function loadSkillCatalog(extensionUri: vscode.Uri): SkillCatalogEntry[] {
  const skillsPath = ensureSkillsDirectory(extensionUri);
  const entries: SkillCatalogEntry[] = [];
  const skillDirs = fs.readdirSync(skillsPath, { withFileTypes: true });

  for (const dirent of skillDirs) {
    if (!dirent.isDirectory()) {
      continue;
    }

    const skillDir = path.join(skillsPath, dirent.name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      continue;
    }

    const content = fs.readFileSync(skillFile, 'utf-8');
    const frontmatter = parseSkillFrontmatter(content);

    entries.push({
      name: frontmatter.name,
      description: frontmatter.description,
      type: frontmatter.metadata?.type,
      source: 'builtin'
    });
  }

  return entries;
}

export function loadSkillContent(extensionUri: vscode.Uri, skillName: string): SkillContent {
  const skillsPath = ensureSkillsDirectory(extensionUri);
  const skillDir = path.join(skillsPath, skillName);
  const skillFile = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(skillFile)) {
    return {
      name: skillName,
      content: '',
      error: `Skill not found: ${skillName}`
    };
  }

  const content = fs.readFileSync(skillFile, 'utf-8');
  return { name: skillName, content };
}
