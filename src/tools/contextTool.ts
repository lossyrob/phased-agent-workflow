import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Parameters for the paw_get_context language model tool.
 */
export interface ContextParams {
  /** The normalized feature slug (e.g., "auth-system") */
  feature_slug: string;
  
  /** The name of the calling agent (e.g., "PAW-02B Impl Planner") */
  agent_name: string;
}

/**
 * Represents the status of a loaded instruction or context file.
 */
export interface InstructionStatus {
  /** Whether the file exists */
  exists: boolean;
  
  /** File content (empty if file doesn't exist or error occurred) */
  content: string;
  
  /** Error message if file read failed */
  error?: string;
}

/**
 * Result returned by the getContext function.
 */
export interface ContextResult {
  /** Workspace-specific custom instructions from .paw/instructions/ */
  workspace_instructions: InstructionStatus;
  
  /** User-level custom instructions from ~/.paw/instructions/ */
  user_instructions: InstructionStatus;
  
  /** Raw WorkflowContext.md content */
  workflow_context: InstructionStatus;
}

/**
 * Load raw WorkflowContext.md file content.
 * 
 * @param filePath Absolute path to WorkflowContext.md
 * @returns InstructionStatus with raw file content
 */
function loadWorkflowContext(filePath: string): InstructionStatus {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        exists: false,
        content: '',
        error: undefined
      };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const trimmedContent = fileContent.trim();

    return {
      exists: true,
      content: trimmedContent,
      error: undefined
    };
  } catch (error) {
    return {
      exists: true,
      content: '',
      error: `Failed to read WorkflowContext.md: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Load agent-specific custom instructions from a directory.
 * 
 * @param directory Absolute path to instructions directory
 * @param agentName Name of the agent (e.g., "PAW-02B Impl Planner")
 * @returns InstructionStatus with file content if found
 */
function loadCustomInstructions(directory: string, agentName: string): InstructionStatus {
  try {
    // Check if directory exists
    if (!fs.existsSync(directory)) {
      return {
        exists: false,
        content: '',
        error: undefined
      };
    }

    // Construct agent-specific instruction file path
    const instructionFilePath = path.join(directory, `${agentName}-instructions.md`);

    // Check if agent-specific file exists
    if (!fs.existsSync(instructionFilePath)) {
      return {
        exists: false,
        content: '',
        error: undefined
      };
    }

    // Read file content
    const fileContent = fs.readFileSync(instructionFilePath, 'utf-8');
    const trimmedContent = fileContent.trim();

    return {
      exists: true,
      content: trimmedContent,
      error: undefined
    };
  } catch (error) {
    return {
      exists: true,
      content: '',
      error: `Failed to read custom instructions: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate feature slug format to prevent path traversal attacks.
 * 
 * @param featureSlug The feature slug to validate
 * @returns True if valid, false otherwise
 */
function isValidFeatureSlug(featureSlug: string): boolean {
  // Allow only alphanumeric characters and hyphens
  const validPattern = /^[a-z0-9-]+$/;
  
  // Reject path traversal attempts
  if (featureSlug.includes('..') || featureSlug.includes('/') || featureSlug.includes('\\')) {
    return false;
  }
  
  // Reject absolute paths
  if (path.isAbsolute(featureSlug)) {
    return false;
  }
  
  return validPattern.test(featureSlug);
}

/**
 * Get PAW context including custom instructions and workflow metadata.
 * 
 * @param params Context parameters with feature slug and agent name
 * @returns ContextResult with all loaded content
 */
export async function getContext(params: ContextParams): Promise<ContextResult> {
  try {
    // Validate feature slug
    if (!isValidFeatureSlug(params.feature_slug)) {
      throw new Error(`Invalid feature slug format: ${params.feature_slug}`);
    }

    // Validate agent name
    if (!params.agent_name || params.agent_name.trim().length === 0) {
      throw new Error('Agent name is required');
    }

    // Determine workspace path
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder is open');
    }
    const workspacePath = workspaceFolder.uri.fsPath;

    // Construct paths
    const workspaceInstructionsDir = path.join(workspacePath, '.paw', 'instructions');
    const userInstructionsDir = path.join(os.homedir(), '.paw', 'instructions');
    const workflowContextPath = path.join(workspacePath, '.paw', 'work', params.feature_slug, 'WorkflowContext.md');

    // Load all three sources
    const workspaceInstructions = loadCustomInstructions(workspaceInstructionsDir, params.agent_name);
    const userInstructions = loadCustomInstructions(userInstructionsDir, params.agent_name);
    const workflowContext = loadWorkflowContext(workflowContextPath);

    return {
      workspace_instructions: workspaceInstructions,
      user_instructions: userInstructions,
      workflow_context: workflowContext
    };
  } catch (error) {
    // Return partial results on error
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      workspace_instructions: {
        exists: false,
        content: '',
        error: errorMessage
      },
      user_instructions: {
        exists: false,
        content: '',
        error: errorMessage
      },
      workflow_context: {
        exists: false,
        content: '',
        error: errorMessage
      }
    };
  }
}

/**
 * Format context result as natural language Markdown text.
 * 
 * @param result ContextResult to format
 * @returns Formatted Markdown text for agent consumption
 */
export function formatContextResponse(result: ContextResult): string {
  const sections: string[] = [];

  // Add header
  sections.push('# PAW Context');
  sections.push('');
  sections.push('Follow custom instructions in addition to your standard instructions. Custom instructions take precedence where conflicts exist.');
  sections.push('');
  sections.push('**Precedence rules**: Workspace instructions take precedence over user instructions.');
  sections.push('');

  // Workspace instructions section
  if (result.workspace_instructions.exists && result.workspace_instructions.content) {
    sections.push('## Workspace Custom Instructions');
    sections.push('');
    sections.push('---');
    sections.push('');
    sections.push(result.workspace_instructions.content);
    sections.push('');
    sections.push('---');
    sections.push('');
  } else if (result.workspace_instructions.error) {
    sections.push('## Workspace Custom Instructions');
    sections.push('');
    sections.push(`*Error loading workspace instructions: ${result.workspace_instructions.error}*`);
    sections.push('');
  }

  // User instructions section
  if (result.user_instructions.exists && result.user_instructions.content) {
    sections.push('## User Custom Instructions');
    sections.push('');
    sections.push('---');
    sections.push('');
    sections.push(result.user_instructions.content);
    sections.push('');
    sections.push('---');
    sections.push('');
  } else if (result.user_instructions.error) {
    sections.push('## User Custom Instructions');
    sections.push('');
    sections.push(`*Error loading user instructions: ${result.user_instructions.error}*`);
    sections.push('');
  }

  // Workflow context section
  if (result.workflow_context.exists && result.workflow_context.content) {
    sections.push('## Workflow Context');
    sections.push('');
    sections.push('Raw WorkflowContext.md content:');
    sections.push('');
    sections.push('```markdown');
    sections.push(result.workflow_context.content);
    sections.push('```');
    sections.push('');
  } else if (result.workflow_context.error) {
    sections.push('## Workflow Context');
    sections.push('');
    sections.push(`*Error loading workflow context: ${result.workflow_context.error}*`);
    sections.push('');
  }

  // Return formatted text, or minimal message if everything is empty
  const formattedText = sections.join('\n');
  
  // Check if we only have the header without any content sections
  const hasWorkspaceContent = result.workspace_instructions.exists && result.workspace_instructions.content;
  const hasUserContent = result.user_instructions.exists && result.user_instructions.content;
  const hasWorkflowContent = result.workflow_context.exists && result.workflow_context.content;
  const hasAnyErrors = result.workspace_instructions.error || result.user_instructions.error || result.workflow_context.error;
  
  if (!hasWorkspaceContent && !hasUserContent && !hasWorkflowContent && !hasAnyErrors) {
    return 'No custom instructions or workflow context found.';
  }

  return formattedText;
}
