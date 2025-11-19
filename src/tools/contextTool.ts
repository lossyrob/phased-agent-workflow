import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const FEATURE_SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface ContextParams {
  feature_slug: string;
  agent_name: string;
}

export interface InstructionStatus {
  exists: boolean;
  content: string;
  error?: string;
}

export interface ContextResult {
  workspace_instructions: InstructionStatus;
  user_instructions: InstructionStatus;
  workflow_context: InstructionStatus;
}

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

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

function resolveWorkspacePath(featureSlug: string): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }

  for (const folder of folders) {
    const candidatePath = path.join(folder.uri.fsPath, '.paw', 'work', featureSlug);
    if (fs.existsSync(candidatePath)) {
      return folder.uri.fsPath;
    }
  }

  return folders[0].uri.fsPath;
}

function validateParams(params: ContextParams): { featureSlug: string; agentName: string } {
  const featureSlug = params.feature_slug?.trim();
  if (!featureSlug || !FEATURE_SLUG_PATTERN.test(featureSlug)) {
    throw new Error('Invalid feature_slug: only lowercase letters, numbers, and hyphens are allowed.');
  }

  const agentName = params.agent_name?.trim();
  if (!agentName) {
    throw new Error('Invalid agent_name: value must be a non-empty string.');
  }

  return { featureSlug, agentName };
}

export async function getContext(params: ContextParams): Promise<ContextResult> {
  const { featureSlug, agentName } = validateParams(params);

  const workspacePath = resolveWorkspacePath(featureSlug);
  if (!workspacePath) {
    throw new Error('Unable to determine workspace path: no workspace folder is currently open.');
  }

  const workspaceInstructionsDir = path.join(workspacePath, '.paw', 'instructions');
  const userInstructionsDir = path.join(os.homedir(), '.paw', 'instructions');
  const workflowContextPath = path.join(workspacePath, '.paw', 'work', featureSlug, 'WorkflowContext.md');

  const workspaceInstructions = loadCustomInstructions(workspaceInstructionsDir, agentName);
  const userInstructions = loadCustomInstructions(userInstructionsDir, agentName);
  const workflowContext = loadWorkflowContext(workflowContextPath);

  return {
    workspace_instructions: workspaceInstructions,
    user_instructions: userInstructions,
    workflow_context: workflowContext,
  };
}

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
