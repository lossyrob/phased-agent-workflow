import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  loadComponentTemplatesFromDirectory,
  processAgentTemplate
} from './agentTemplateRenderer';
import { extractFrontmatterField } from '../utils/frontmatter';

/**
 * Represents a PAW agent template loaded from the extension's agents directory.
 */
export interface AgentTemplate {
  /** The original filename (e.g., 'PAW.agent.md', 'PAW Review.agent.md') */
  filename: string;
  /** The derived agent name (e.g., 'PAW', 'Review') */
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
 * Delegates to shared utility.
 * 
 * @param content - The full file content
 * @returns The description value, or empty string if not found
 */
function extractFrontmatterDescription(content: string): string {
  return extractFrontmatterField(content, 'description');
}

/**
 * Derives a clean agent name from the filename.
 * 
 * Removes the '.agent.md' extension and the 'PAW-##X ' prefix.
 * 
 * @param filename - The agent filename (e.g., 'PAW.agent.md', 'PAW Review.agent.md')
 * @returns The derived name (e.g., 'PAW', 'Review')
 * 
 * @example
 * deriveAgentName('PAW.agent.md') // returns 'PAW'
 * deriveAgentName('PAW Review.agent.md') // returns 'Review'
 */
function deriveAgentName(filename: string): string {
  // Remove the .agent.md extension
  const withoutExtension = filename.replace(/\.agent\.md$/i, '');
  // Remove the PAW-##X prefix (e.g., 'PAW-01A ', 'PAW-R1B ') - legacy support
  return withoutExtension.replace(/^PAW-[^\s]+\s*/i, '').trim();
}

/**
 * Derives the full agent identifier from the filename (e.g., 'PAW', 'PAW Review').
 * 
 * @param filename - The agent filename (e.g., 'PAW.agent.md', 'PAW Review.agent.md')
 * @returns The full agent identifier without extension (e.g., 'PAW', 'PAW Review')
 */
function deriveAgentIdentifier(filename: string): string {
  return filename.replace(/\.agent\.md$/i, '');
}

/**
 * Loads all PAW agent templates from the extension's agents directory.
 * 
 * This function reads all .agent.md files, extracts metadata from their YAML frontmatter,
 * processes template substitutions (components and variables), and returns structured
 * agent template objects ready for installation.
 * 
 * @param extensionUri - The extension's root URI
 * @returns Array of agent templates with metadata and processed content
 * @throws {Error} If the agents directory is missing or contains no agent files
 * 
 * @remarks
 * Only files with the '.agent.md' extension are loaded. Other files are silently ignored.
 * Each agent file should have YAML frontmatter with a 'description' field.
 * Component references ({{COMPONENT_NAME}}) are expanded with content from agents/components/
 * Variables in components ({{AGENT_NAME}}) are substituted with agent-specific values.
 */
export function loadAgentTemplates(extensionUri: vscode.Uri): AgentTemplate[] {
  const agentsPath = ensureAgentsDirectory(extensionUri);
  const agentFiles = fs.readdirSync(agentsPath);
  const componentsDir = vscode.Uri.joinPath(extensionUri, 'agents', 'components').fsPath;
  const components = loadComponentTemplatesFromDirectory(componentsDir);
  const templates: AgentTemplate[] = [];

  for (const file of agentFiles) {
    // Only process .agent.md files
    if (!file.toLowerCase().endsWith('.agent.md')) {
      continue;
    }

    const absolutePath = path.join(agentsPath, file);
    const rawContent = fs.readFileSync(absolutePath, 'utf-8');
    const description = extractFrontmatterDescription(rawContent);
    const name = deriveAgentName(file);
    const agentIdentifier = deriveAgentIdentifier(file);
    
    // Process template substitutions
    const processedContent = processAgentTemplate(rawContent, agentIdentifier, components);

    templates.push({
      filename: file,
      name,
      description,
      content: processedContent
    });
  }

  if (templates.length === 0) {
    throw new Error('No agent templates were found in the agents directory.');
  }

  return templates;
}
