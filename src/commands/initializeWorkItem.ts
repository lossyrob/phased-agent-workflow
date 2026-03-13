import * as vscode from 'vscode';
import {
  collectUserInputs,
  type FinalReviewConfig,
  type ArtifactLifecycle,
  type WorkItemInputs,
} from '../ui/userInput';
import type { ReviewPolicy, SessionPolicy } from '../types/workflow';
import {
  validateGitRepository,
  getRepositoryContext,
  createWorktree,
  deriveDefaultWorktreePath,
  ensureUniqueWorktreePath,
  validateReusableWorktree,
} from '../git/validation';

export const PENDING_WORKTREE_INIT_KEY = 'paw.pendingWorktreeInit';

export interface PendingWorktreeInit {
  worktreePath: string;
  query: string;
  mode: 'PAW';
  createdAt: string;
}

interface PromptArgumentsInput {
  targetBranch: string;
  workflowMode: { mode: string; workflowCustomization?: string };
  executionMode: string;
  reviewStrategy: string;
  reviewPolicy: ReviewPolicy;
  sessionPolicy: SessionPolicy;
  artifactLifecycle: ArtifactLifecycle;
  finalReview: FinalReviewConfig;
  issueUrl?: string;
}

function normalizePath(targetPath: string): string {
  return targetPath.replace(/\\/g, '/');
}

/**
 * Constructs the configuration prompt arguments for the PAW agent.
 */
export function constructPawPromptArguments(
  inputs: PromptArgumentsInput,
  _workspacePath: string
): string {
  const config: Record<string, string | boolean> = {
    target_branch: inputs.targetBranch.trim() || 'auto',
    workflow_mode: inputs.workflowMode.mode,
    execution_mode: inputs.executionMode,
    review_strategy: inputs.reviewStrategy,
    review_policy: inputs.reviewPolicy,
    session_policy: inputs.sessionPolicy,
    artifact_lifecycle: inputs.artifactLifecycle,
    final_agent_review: inputs.finalReview.enabled ? 'enabled' : 'disabled',
  };

  if (inputs.finalReview.enabled) {
    config.final_review_mode = inputs.finalReview.mode;
    config.final_review_interactive = inputs.finalReview.interactive;
    config.final_review_models = 'latest GPT, latest Gemini, latest Claude Opus';
  }

  if (inputs.issueUrl) {
    config.issue_url = inputs.issueUrl;
  }

  if (inputs.workflowMode.workflowCustomization) {
    config.custom_instructions = inputs.workflowMode.workflowCustomization;
  }

  let args = '## Initialization Parameters\n\n';
  for (const [key, value] of Object.entries(config)) {
    args += `- **${key}**: ${value}\n`;
  }

  return args;
}

async function openPawChat(
  query: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async (value) => {
    outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query,
      mode: 'PAW',
    });
  });
}

function buildPendingWorktreeInit(worktreePath: string, query: string): PendingWorktreeInit {
  return {
    worktreePath,
    query,
    mode: 'PAW',
    createdAt: new Date().toISOString(),
  };
}

export function shouldResumePendingWorktreeInit(
  currentWorkspacePath: string,
  pending: PendingWorktreeInit | undefined
): boolean {
  if (!pending) {
    return false;
  }

  return normalizePath(currentWorkspacePath) === normalizePath(pending.worktreePath);
}

async function prepareDedicatedWorktree(
  workspacePath: string,
  inputs: WorkItemInputs,
  outputChannel: vscode.OutputChannel
): Promise<string> {
  const branchName = inputs.targetBranch.trim();
  const baseBranch = 'main';
  const repositoryContext = await getRepositoryContext(workspacePath);
  const worktreeConfig = inputs.worktree;

  if (!worktreeConfig) {
    throw new Error('Dedicated worktree mode requires worktree configuration.');
  }

  if (worktreeConfig.strategy === 'reuse') {
    if (!worktreeConfig.path) {
      throw new Error('Reusable worktree path is required.');
    }

    outputChannel.appendLine(`[INFO] Validating reusable worktree: ${worktreeConfig.path}`);
    return validateReusableWorktree({
      repositoryPath: workspacePath,
      worktreePath: worktreeConfig.path,
      expectedTargetBranch: branchName || undefined,
      baseBranch,
    });
  }

  const requestedPath = worktreeConfig.path?.trim();
  const defaultPath = requestedPath && requestedPath.length > 0
    ? requestedPath
    : deriveDefaultWorktreePath(repositoryContext.rootPath, branchName, inputs.issueUrl);
  const uniquePath = requestedPath && requestedPath.length > 0
    ? defaultPath
    : await ensureUniqueWorktreePath(defaultPath);

  outputChannel.appendLine(`[INFO] Creating dedicated worktree at: ${uniquePath}`);
  return createWorktree({
    repositoryPath: workspacePath,
    worktreePath: uniquePath,
    targetBranch: branchName || undefined,
    baseBranch,
  });
}

/**
 * Resume a pending dedicated-worktree initialization when the target window activates.
 */
export async function maybeResumePendingWorktreeInit(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const pending = context.globalState.get<PendingWorktreeInit>(PENDING_WORKTREE_INIT_KEY);
  if (!pending) {
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  if (!shouldResumePendingWorktreeInit(workspaceFolder.uri.fsPath, pending)) {
    return;
  }

  outputChannel.appendLine(`[INFO] Resuming pending worktree initialization for ${pending.worktreePath}`);
  await context.globalState.update(PENDING_WORKTREE_INIT_KEY, undefined);
  await openPawChat(pending.query, outputChannel);
}

/**
 * Main command handler for initializing a PAW workflow.
 */
export async function initializeWorkItemCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  outputChannel.appendLine('[INFO] Starting PAW workflow initialization...');

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        'No workspace folder open. Please open a workspace to initialize a PAW workflow.'
      );
      outputChannel.appendLine('[ERROR] No workspace folder open');
      return;
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    outputChannel.appendLine(`[INFO] Workspace: ${workspacePath}`);
    outputChannel.appendLine('[INFO] Validating git repository...');

    const isGitRepo = await validateGitRepository(workspacePath);
    if (!isGitRepo) {
      vscode.window.showErrorMessage(
        'PAW requires a Git repository. Please initialize Git with: git init'
      );
      outputChannel.appendLine('[ERROR] Not a git repository');
      return;
    }

    outputChannel.appendLine('[INFO] Git repository validated');
    outputChannel.appendLine('[INFO] Collecting user inputs...');

    const inputs = await collectUserInputs(outputChannel);
    if (!inputs) {
      outputChannel.appendLine('[INFO] User cancelled initialization');
      return;
    }

    outputChannel.appendLine(`[INFO] Execution mode: ${inputs.executionMode}`);
    outputChannel.appendLine(`[INFO] Target branch: ${inputs.targetBranch || '(auto)'}`);
    if (inputs.worktree) {
      outputChannel.appendLine(`[INFO] Worktree strategy: ${inputs.worktree.strategy}`);
      if (inputs.worktree.path) {
        outputChannel.appendLine(`[INFO] Worktree path: ${inputs.worktree.path}`);
      }
    }
    outputChannel.appendLine(`[INFO] Workflow mode: ${inputs.workflowMode.mode}`);
    if (inputs.workflowMode.workflowCustomization) {
      outputChannel.appendLine(`[INFO] Workflow customization: ${inputs.workflowMode.workflowCustomization}`);
    }
    outputChannel.appendLine(`[INFO] Review strategy: ${inputs.reviewStrategy}`);
    outputChannel.appendLine(`[INFO] Review policy: ${inputs.reviewPolicy}`);
    outputChannel.appendLine(`[INFO] Session policy: ${inputs.sessionPolicy}`);
    outputChannel.appendLine(`[INFO] Artifact lifecycle: ${inputs.artifactLifecycle}`);
    outputChannel.appendLine(`[INFO] Final Review: ${inputs.finalReview.enabled ? 'enabled' : 'disabled'}`);
    if (inputs.finalReview.enabled) {
      outputChannel.appendLine(`[INFO] Final Review mode: ${inputs.finalReview.mode}`);
      outputChannel.appendLine(`[INFO] Final Review interactive: ${inputs.finalReview.interactive}`);
    }
    if (inputs.issueUrl) {
      outputChannel.appendLine(`[INFO] Issue URL: ${inputs.issueUrl}`);
    }

    outputChannel.appendLine('[INFO] Constructing PAW agent prompt arguments...');
    const promptArgs = constructPawPromptArguments(inputs, workspacePath);

    outputChannel.appendLine('[INFO] Invoking PAW agent...');
    outputChannel.show(true);

    if (inputs.executionMode === 'current-checkout') {
      await openPawChat(promptArgs, outputChannel);
      outputChannel.appendLine('[INFO] PAW agent invoked - check chat panel for progress');
      return;
    }

    const worktreePath = await prepareDedicatedWorktree(workspacePath, inputs, outputChannel);
    await context.globalState.update(
      PENDING_WORKTREE_INIT_KEY,
      buildPendingWorktreeInit(worktreePath, promptArgs)
    );

    outputChannel.appendLine(`[INFO] Opening dedicated worktree in a new window: ${worktreePath}`);
    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(worktreePath), true);
    outputChannel.appendLine('[INFO] Dedicated worktree opened - PAW will launch there on activation');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Initialization failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`PAW initialization failed: ${errorMessage}`);
  }
}
