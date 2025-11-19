import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Pattern to validate feature slug format.
 * Feature slugs must contain only lowercase letters, numbers, and hyphens.
 */
const FEATURE_SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Parameters for retrieving PAW context information.
 */
export interface ContextParams {
  /** The normalized feature slug (e.g., 'auth-system') */
  feature_slug: string;
  /** The name of the calling agent (e.g., 'PAW-02B Impl Planner') */
  agent_name: string;
}

/**
 * Status and content of a loaded instruction or context file.
 */
export interface InstructionStatus {
  /** Whether the file exists */
  exists: boolean;
  /** The file content (empty string if file doesn't exist or couldn't be read) */
  content: string;
  /** Error message if file read failed (undefined if no error) */
  error?: string;
}

/**
 * Complete context result containing workspace instructions, user instructions,
 * and workflow context metadata.
 */
export interface ContextResult {
  /** Workspace-specific custom instructions from .paw/instructions/ */
  workspace_instructions: InstructionStatus;
  /** User-level custom instructions from ~/.paw/instructions/ */
  user_instructions: InstructionStatus;
  /** Raw WorkflowContext.md content from .paw/work/<feature-slug>/ */
  workflow_context: InstructionStatus;
}

/**
 * Normalizes file content by converting Windows line endings to Unix format
 * and trimming leading/trailing whitespace.
 * 
 * @param content - The file content to normalize
 * @returns Normalized content with consistent line endings
 */
function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

/**
 * Loads WorkflowContext.md file content from the specified path.
 * Returns raw file content without parsing.
 * 
 * @param filePath - Absolute path to the WorkflowContext.md file
 * @returns InstructionStatus with file content or error information
 */
export function loadWorkflowContext(filePath: string): InstructionStatus {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false, content: '' };
    }

    const fileContent = normalizeContent(fs.readFileSync(filePath, 'utf-8'));
    return { exists: true, content: fileContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exists: true,
      content: '',
      error: `Failed to read WorkflowContext.md: ${message}`,
    };
  }
}

/**
 * Loads custom instruction file for a specific agent from the given directory.
 * Looks for a file named `<agentName>-instructions.md`.
 * 
 * @param directory - Directory path containing instruction files (e.g., .paw/instructions/)
 * @param agentName - Name of the agent (e.g., 'PAW-02B Impl Planner')
 * @returns InstructionStatus with file content or error information
 */
export function loadCustomInstructions(directory: string, agentName: string): InstructionStatus {
  try {
    if (!fs.existsSync(directory)) {
      return { exists: false, content: '' };
    }

    const filePath = path.join(directory, `${agentName}-instructions.md`);
    if (!fs.existsSync(filePath)) {
      return { exists: false, content: '' };
    }

    const fileContent = normalizeContent(fs.readFileSync(filePath, 'utf-8'));
    return { exists: true, content: fileContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exists: true,
      content: '',
      error: `Failed to read custom instructions: ${message}`,
    };
  }
}

/**
 * Resolves the workspace path for a given feature slug.
 * Searches all workspace folders for one containing .paw/work/<featureSlug>.
 * 
 * @param featureSlug - The feature slug to search for
 * @returns Workspace folder path and feature directory path
 * @throws Error if no workspace is open or feature slug directory doesn't exist
 */
function resolveWorkspacePath(featureSlug: string): { workspacePath: string; featureDir: string } {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('Unable to determine workspace path: no workspace folder is currently open.');
  }

  // Search for workspace containing the feature slug
  for (const folder of folders) {
    const featureDir = path.join(folder.uri.fsPath, '.paw', 'work', featureSlug);
    if (fs.existsSync(featureDir)) {
      return { workspacePath: folder.uri.fsPath, featureDir };
    }
  }

  // Feature slug directory not found in any workspace
  const workspacePaths = folders.map(f => f.uri.fsPath).join(', ');
  throw new Error(
    `Feature slug '${featureSlug}' not found in any workspace. ` +
    `Expected directory .paw/work/${featureSlug}/ to exist in one of: ${workspacePaths}. ` +
    `Please verify the feature slug is correct.`
  );
}

/**
 * Validates and normalizes context parameters.
 * 
 * @param params - Parameters to validate
 * @returns Validated and trimmed feature slug and agent name
 * @throws Error if feature slug format is invalid or agent name is empty
 */
function validateParams(params: ContextParams): { featureSlug: string; agentName: string } {
  const featureSlug = params.feature_slug?.trim();
  if (!featureSlug) {
    throw new Error('Invalid feature_slug: value must be a non-empty string.');
  }

  // Basic format validation to prevent path traversal and clearly invalid inputs
  // The primary validation (existence check) happens in resolveWorkspacePath
  if (!FEATURE_SLUG_PATTERN.test(featureSlug)) {
    throw new Error(
      `Invalid feature_slug format: '${featureSlug}'. ` +
      `Feature slugs must contain only lowercase letters, numbers, and hyphens.`
    );
  }

  const agentName = params.agent_name?.trim();
  if (!agentName) {
    throw new Error('Invalid agent_name: value must be a non-empty string.');
  }

  return { featureSlug, agentName };
}

/**
 * Retrieves complete PAW context including workspace instructions, user instructions,
 * and workflow metadata for a specific feature and agent.
 * 
 * This function:
 * 1. Validates the feature slug format and agent name
 * 2. Verifies the feature slug directory (.paw/work/<feature-slug>/) exists
 * 3. Loads workspace-specific custom instructions from .paw/instructions/
 * 4. Loads user-level custom instructions from ~/.paw/instructions/
 * 5. Loads raw WorkflowContext.md content from .paw/work/<feature-slug>/
 * 
 * Missing instruction files are handled gracefully and returned with exists=false.
 * However, if the feature slug directory itself doesn't exist, an error is thrown
 * immediately to allow the agent to correct the slug and retry.
 * 
 * @param params - Context parameters with feature_slug and agent_name
 * @returns Promise resolving to ContextResult with all loaded content
 * @throws Error if feature slug format is invalid, feature slug directory doesn't exist,
 *         agent name is empty, or no workspace is open
 */
export async function getContext(params: ContextParams): Promise<ContextResult> {
  const { featureSlug, agentName } = validateParams(params);

  // Validate that feature slug directory exists - throws error if not found
  const { workspacePath, featureDir } = resolveWorkspacePath(featureSlug);

  const workspaceInstructionsDir = path.join(workspacePath, '.paw', 'instructions');
  const userInstructionsDir = path.join(os.homedir(), '.paw', 'instructions');
  const workflowContextPath = path.join(featureDir, 'WorkflowContext.md');

  const workspaceInstructions = loadCustomInstructions(workspaceInstructionsDir, agentName);
  const userInstructions = loadCustomInstructions(userInstructionsDir, agentName);
  const workflowContext = loadWorkflowContext(workflowContextPath);

  return {
    workspace_instructions: workspaceInstructions,
    user_instructions: userInstructions,
    workflow_context: workflowContext,
  };
}

/**
 * Formats an instruction section with title, content, and optional error message.
 * 
 * @param title - Section title (e.g., 'Workspace Custom Instructions')
 * @param status - Instruction status containing content and optional error
 * @returns Formatted Markdown section
 */
function formatInstructionSection(title: string, status: InstructionStatus): string {
  const parts: string[] = [`## ${title}`];

  if (status.content) {
    parts.push(status.content);
  }

  if (status.error) {
    parts.push(`Warning: ${status.error}`);
  }

  return parts.join('\n\n');
}

/**
 * Formats a complete context result as a natural language Markdown response
 * suitable for agent consumption.
 * 
 * The formatted response includes:
 * - Precedence rules for custom instructions
 * - Workspace custom instructions (if present)
 * - User custom instructions (if present)
 * - Raw WorkflowContext.md content in a code fence (if present)
 * - Message if no content was found
 * 
 * Empty sections are omitted from the response.
 * 
 * @param result - Context result to format
 * @returns Formatted Markdown text ready for agent consumption
 */
export function formatContextResponse(result: ContextResult): string {
  const sections: string[] = [
    'Follow custom instructions in addition to your standard instructions. Custom instructions take precedence where conflicts exist.',
    'Workspace custom instructions take precedence over user custom instructions.',
  ];

  if (result.workspace_instructions.content || result.workspace_instructions.error) {
    sections.push(formatInstructionSection('Workspace Custom Instructions', result.workspace_instructions));
  }

  if (result.user_instructions.content || result.user_instructions.error) {
    sections.push(formatInstructionSection('User Custom Instructions', result.user_instructions));
  }

  if (result.workflow_context.content || result.workflow_context.error) {
    const workflowParts: string[] = ['## Workflow Context'];
    if (result.workflow_context.content) {
      workflowParts.push('```markdown');
      workflowParts.push(result.workflow_context.content);
      workflowParts.push('```');
    } else if (result.workflow_context.error) {
      workflowParts.push(`Warning: ${result.workflow_context.error}`);
    }
    sections.push(workflowParts.join('\n\n'));
  }

  if (sections.length === 2) {
    sections.push('No custom instructions or workflow context content were found.');
  }

  return sections.join('\n\n');
}
