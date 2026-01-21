import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { extractFrontmatterField } from '../utils/frontmatter';

/**
 * Represents a PAW prompt template loaded from the extension's prompts directory.
 * Prompt files are invoked via `/prompt-name` slash commands in Copilot Chat.
 */
export interface PromptTemplate {
  /** The original filename (e.g., 'paw-review.prompt.md') */
  filename: string;
  /** The agent to invoke (from YAML frontmatter 'agent' field) */
  agent: string;
  /** The full file content including frontmatter */
  content: string;
}

/**
 * Ensures the prompts source directory exists in the extension and returns its path.
 * 
 * @param extensionUri - The extension's root URI
 * @returns Absolute path to the prompts directory, or null if it doesn't exist
 */
function getPromptsSourceDirectory(extensionUri: vscode.Uri): string | null {
  const promptsUri = vscode.Uri.joinPath(extensionUri, 'prompts');
  const promptsPath = promptsUri.fsPath;

  if (!fs.existsSync(promptsPath)) {
    // No prompts directory is not an error - extension may not have any prompts yet
    return null;
  }

  return promptsPath;
}

/**
 * Extracts the agent field from YAML frontmatter.
 * Delegates to shared utility.
 * 
 * @param content - The full file content
 * @returns The agent value, or empty string if not found
 */
function extractFrontmatterAgent(content: string): string {
  return extractFrontmatterField(content, 'agent');
}

/**
 * Loads all PAW prompt templates from the extension's prompts directory.
 * 
 * This function reads all .prompt.md files, extracts metadata from their YAML frontmatter,
 * and returns structured prompt template objects ready for installation.
 * 
 * @param extensionUri - The extension's root URI
 * @returns Array of prompt templates with metadata and content, or empty array if no prompts found
 * 
 * @remarks
 * Only files with the '.prompt.md' extension are loaded. Other files are silently ignored.
 * Each prompt file should have YAML frontmatter with an 'agent' field specifying which
 * agent to invoke when the prompt is used.
 */
export function loadPromptTemplates(extensionUri: vscode.Uri): PromptTemplate[] {
  const promptsPath = getPromptsSourceDirectory(extensionUri);
  
  if (!promptsPath) {
    // No prompts directory - return empty array (not an error)
    return [];
  }

  const promptFiles = fs.readdirSync(promptsPath);
  const templates: PromptTemplate[] = [];

  for (const file of promptFiles) {
    // Only process .prompt.md files
    if (!file.toLowerCase().endsWith('.prompt.md')) {
      continue;
    }

    const absolutePath = path.join(promptsPath, file);
    
    // Skip directories
    if (fs.statSync(absolutePath).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const agent = extractFrontmatterAgent(content);

    templates.push({
      filename: file,
      agent,
      content
    });
  }

  return templates;
}
