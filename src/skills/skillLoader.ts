import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Entry in the skill catalog returned by `loadSkillCatalog`.
 */
export interface SkillCatalogEntry {
  /**
   * Unique identifier for the skill. Must be 1-64 characters, lowercase
   * alphanumeric and hyphens only, must not start/end with hyphen or contain
   * consecutive hyphens, must match the parent directory name.
   */
  name: string;
  /**
   * Describes what the skill does and when to use it. Must be 1-1024
   * characters. Should include keywords that help agents identify relevant
   * tasks.
   */
  description: string;
  /**
   * Optional type classification from metadata (e.g., 'workflow', 'activity').
   * Stored in metadata.type per the Agent Skills spec which allows arbitrary
   * key-value metadata.
   */
  type?: string;
  /**
   * Indicates where the skill was loaded from. Currently only 'builtin' for
   * skills bundled with the extension.
   */
  source: 'builtin';
}

/**
 * Result of loading a skill's content.
 * Contains either the full SKILL.md content or an error message.
 */
export interface SkillContent {
  /** The skill name that was requested. */
  name: string;
  /**
   * The full SKILL.md file content including frontmatter and body. The body
   * contains instructions with no format restrictions.
   */
  content: string;
  /** Error message if the skill could not be loaded, undefined on success. */
  error?: string;
}

/**
 * Parsed YAML frontmatter from a SKILL.md file.
 */
interface SkillFrontmatter {
  name: string;
  description: string;
  metadata?: Record<string, string>;
  license?: string;
  compatibility?: string;
  allowedTools?: string;
}

/**
 * Removes surrounding quotes from a string value.
 */
function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

/**
 * Extracts the YAML frontmatter block from skill content.
 * @param content - Full SKILL.md file content
 * @returns The frontmatter text between --- delimiters
 * @throws Error if frontmatter is missing or malformed
 */
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

/**
 * Parses the YAML frontmatter from a SKILL.md file.
 * Extracts name, description, and optional metadata fields.
 * 
 * @param content - Full SKILL.md file content with YAML frontmatter
 * @returns Parsed frontmatter object
 * @throws Error if required fields (name, description) are missing
 */
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

/**
 * Ensures the skills directory exists at the expected location.
 * 
 * @param extensionUri - URI to the extension root
 * @returns Absolute filesystem path to the skills directory
 * @throws Error if the skills directory does not exist
 */
export function ensureSkillsDirectory(extensionUri: vscode.Uri): string {
  const skillsUri = vscode.Uri.joinPath(extensionUri, 'skills');
  const skillsPath = skillsUri.fsPath;

  if (!fs.existsSync(skillsPath)) {
    throw new Error(`Skills directory not found at ${skillsPath}`);
  }

  return skillsPath;
}

/**
 * Loads the catalog of all available skills from the bundled skills directory.
 * Scans for subdirectories containing SKILL.md files and extracts their metadata.
 * Skills with invalid frontmatter are silently skipped to allow graceful degradation.
 * 
 * @param extensionUri - URI to the extension root
 * @returns Array of skill catalog entries with name, description, and type
 */
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

    try {
      const content = fs.readFileSync(skillFile, 'utf-8');
      const frontmatter = parseSkillFrontmatter(content);

      entries.push({
        name: frontmatter.name,
        description: frontmatter.description,
        type: frontmatter.metadata?.type,
        source: 'builtin'
      });
    } catch {
      // Skip skills with invalid frontmatter to allow graceful degradation
      continue;
    }
  }

  return entries;
}

/**
 * Loads the full content of a specific skill by name.
 * 
 * @param extensionUri - URI to the extension root
 * @param skillName - Name of the skill directory to load (e.g., 'paw-review-workflow')
 * @returns SkillContent with the full SKILL.md content, or an error if not found
 */
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
