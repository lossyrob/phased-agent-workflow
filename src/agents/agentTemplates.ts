import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Represents a PAW agent template loaded from the extension's agents directory.
 */
export interface AgentTemplate {
  /** The original filename (e.g., 'PAW-01A Specification.agent.md') */
  filename: string;
  /** The derived agent name (e.g., 'Specification') */
  name: string;
  /** The description from YAML frontmatter */
  description: string;
  /** The full file content including frontmatter */
  content: string;
}

/**
 * Ensures the agents directory exists in the extension and returns its path.
 * 
 * @param extensionUri - The extension's root URI
 * @returns Absolute path to the agents directory
 * @throws {Error} If the agents directory does not exist
 */
function ensureAgentsDirectory(extensionUri: vscode.Uri): string {
  const agentsUri = vscode.Uri.joinPath(extensionUri, 'agents');
  const agentsPath = agentsUri.fsPath;

  if (!fs.existsSync(agentsPath)) {
    throw new Error(`Agents directory not found at ${agentsPath}`);
  }

  return agentsPath;
}

/**
 * Extracts the description field from YAML frontmatter.
 * 
 * This is a simplified YAML parser that only extracts the description field.
 * It handles quoted and unquoted values, and colons within values.
 * 
 * @param content - The full file content
 * @returns The description value, or empty string if not found
 */
function extractFrontmatterDescription(content: string): string {
  // Check if content starts with YAML frontmatter delimiter
  if (!content.startsWith('---')) {
    return '';
  }

  // Find the closing delimiter
  const closingIndex = content.indexOf('\n---', 3);
  if (closingIndex === -1) {
    return '';
  }

  // Extract and parse the frontmatter
  const frontmatter = content.substring(3, closingIndex).trim();
  const lines = frontmatter.split(/\r?\n/);
  for (const line of lines) {
    const [rawKey, ...rawValue] = line.split(':');
    if (!rawKey || rawValue.length === 0) {
      continue;
    }

    const key = rawKey.trim().toLowerCase();
    if (key === 'description') {
      // Join value parts (in case value contains colons)
      const value = rawValue.join(':').trim();
      // Remove surrounding quotes if present
      return value.replace(/^['"]|['"]$/g, '');
    }
  }

  return '';
}

/**
 * Derives a clean agent name from the filename.
 * 
 * Removes the '.agent.md' extension and the 'PAW-##X ' prefix.
 * 
 * @param filename - The agent filename (e.g., 'PAW-01A Specification.agent.md')
 * @returns The derived name (e.g., 'Specification')
 * 
 * @example
 * deriveAgentName('PAW-01A Specification.agent.md') // returns 'Specification'
 * deriveAgentName('PAW-03B Impl Reviewer.agent.md') // returns 'Impl Reviewer'
 */
function deriveAgentName(filename: string): string {
  // Remove the .agent.md extension
  const withoutExtension = filename.replace(/\.agent\.md$/i, '');
  // Remove the PAW-##X prefix (e.g., 'PAW-01A ', 'PAW-R1B ')
  return withoutExtension.replace(/^PAW-[^\s]+\s*/i, '').trim();
}

/**
 * Loads all PAW agent templates from the extension's agents directory.
 * 
 * This function reads all .agent.md files, extracts metadata from their YAML frontmatter,
 * and returns structured agent template objects ready for installation.
 * 
 * @param extensionUri - The extension's root URI
 * @returns Array of agent templates with metadata and content
 * @throws {Error} If the agents directory is missing or contains no agent files
 * 
 * @remarks
 * Only files with the '.agent.md' extension are loaded. Other files are silently ignored.
 * Each agent file should have YAML frontmatter with a 'description' field.
 */
export function loadAgentTemplates(extensionUri: vscode.Uri): AgentTemplate[] {
  const agentsPath = ensureAgentsDirectory(extensionUri);
  const agentFiles = fs.readdirSync(agentsPath);
  const templates: AgentTemplate[] = [];

  for (const file of agentFiles) {
    // Only process .agent.md files
    if (!file.toLowerCase().endsWith('.agent.md')) {
      continue;
    }

    const absolutePath = path.join(agentsPath, file);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const description = extractFrontmatterDescription(content);
    const name = deriveAgentName(file);

    templates.push({
      filename: file,
      name,
      description,
      content
    });
  }

  if (templates.length === 0) {
    throw new Error('No agent templates were found in the agents directory.');
  }

  return templates;
}
