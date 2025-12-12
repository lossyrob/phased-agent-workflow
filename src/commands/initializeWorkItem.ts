import * as vscode from 'vscode';
import { collectUserInputs } from '../ui/userInput';
import { validateGitRepository, detectGitRepositories, GitRepository } from '../git/validation';
import { constructAgentPrompt } from '../prompts/workflowInitPrompt';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Relative path from workspace root to workflow initialization custom instructions file.
 */
const WORKFLOW_INIT_CUSTOM_INSTRUCTIONS_PATH = path.join(
  '.paw',
  'instructions',
  'init-instructions.md'
);

/**
 * Main command handler for initializing a PAW workflow.
 * 
 * This is the entry point for the "PAW: New PAW Workflow" command. It orchestrates
 * the entire initialization workflow:
 * 1. Validates that a workspace folder is open
 * 2. Checks that the workspace is a Git repository
 * 3. Collects user inputs (target branch, optional issue URL)
 * 4. Constructs a comprehensive prompt for the GitHub Copilot agent
 * 5. Invokes the agent to create the PAW workflow structure
 * 
 * The function delegates complex tasks (file creation, git operations, slug normalization)
 * to the GitHub Copilot agent via a carefully crafted prompt, keeping the extension code
 * minimal and maintainable.
 * 
 * @param outputChannel - VS Code output channel for logging operations and debugging
 * @returns Promise that resolves when the command completes or is cancelled
 */
export async function initializeWorkItemCommand(
  outputChannel: vscode.OutputChannel
): Promise<void> {
  outputChannel.appendLine('[INFO] Starting PAW workflow initialization...');

  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const firstWorkspaceFolder = workspaceFolders?.[0];
    if (!firstWorkspaceFolder) {
      vscode.window.showErrorMessage(
        'No workspace folder open. Please open a workspace to initialize a PAW workflow.'
      );
      outputChannel.appendLine('[ERROR] No workspace folder open');
      return;
    }

    outputChannel.appendLine(`[INFO] Workspace (first folder): ${firstWorkspaceFolder.uri.fsPath}`);

    // Detect repositories across all workspace folders for cross-repository workflows
    // This is done before collecting user inputs because cross-repository workflow
    // type selection requires knowing if there are multiple repositories available
    let detectedRepositories: GitRepository[] | undefined;
    
    if (workspaceFolders && workspaceFolders.length > 1) {
      outputChannel.appendLine('[INFO] Multi-root workspace detected, scanning for git repositories...');
      detectedRepositories = await detectGitRepositories(workspaceFolders);
      const validRepoCount = detectedRepositories.filter(r => r.isValid).length;
      outputChannel.appendLine(`[INFO] Found ${validRepoCount} valid git repositories out of ${workspaceFolders.length} workspace folders`);
    }

    outputChannel.appendLine('[INFO] Collecting user inputs...');

    const inputs = await collectUserInputs(outputChannel, detectedRepositories);
    if (!inputs) {
      outputChannel.appendLine('[INFO] User cancelled initialization');
      return;
    }

    outputChannel.appendLine(`[INFO] Workflow type: ${inputs.workflowType}`);
    if (inputs.storageRoot) {
      outputChannel.appendLine(`[INFO] Storage root: ${inputs.storageRoot.name} (${inputs.storageRoot.path})`);
    }
    if (inputs.affectedRepositories) {
      outputChannel.appendLine(`[INFO] Affected repositories: ${inputs.affectedRepositories.map(r => r.name).join(', ')}`);
    }

    outputChannel.appendLine(`[INFO] Target branch: ${inputs.targetBranch}`);
    outputChannel.appendLine(`[INFO] Workflow mode: ${inputs.workflowMode.mode}`);
    if (inputs.workflowMode.customInstructions) {
      outputChannel.appendLine(`[INFO] Custom instructions: ${inputs.workflowMode.customInstructions}`);
    }
    outputChannel.appendLine(`[INFO] Review strategy: ${inputs.reviewStrategy}`);
    outputChannel.appendLine(`[INFO] Handoff mode: ${inputs.handoffMode}`);
    if (inputs.issueUrl) {
      outputChannel.appendLine(`[INFO] Issue URL: ${inputs.issueUrl}`);
    }

    // Determine the primary workspace path for prompt generation.
    // For cross-repository workflows we use the first selected git repository as
    // the primary path (for custom instructions lookup and any git operations).
    // The storage root can be non-git and is provided separately.
    let promptWorkspacePath = firstWorkspaceFolder.uri.fsPath;
    if (inputs.workflowType === 'cross-repository') {
      if (!workspaceFolders || workspaceFolders.length <= 1) {
        vscode.window.showErrorMessage(
          'Cross-Repository workflow requires a multi-root workspace. Please add multiple folders to your workspace.'
        );
        outputChannel.appendLine('[ERROR] Cross-repository selected but workspace is not multi-root');
        return;
      }

      if (!inputs.storageRoot) {
        vscode.window.showErrorMessage('Storage root selection is required for cross-repository workflows.');
        outputChannel.appendLine('[ERROR] Missing storage root for cross-repository workflow');
        return;
      }

      if (!fs.existsSync(inputs.storageRoot.path)) {
        vscode.window.showErrorMessage(
          `Selected storage root folder does not exist: ${inputs.storageRoot.path}`
        );
        outputChannel.appendLine('[ERROR] Storage root folder does not exist');
        return;
      }

      if (!inputs.affectedRepositories || inputs.affectedRepositories.length === 0) {
        vscode.window.showErrorMessage(
          'No affected repositories selected. Cross-repository workflow requires at least one git repository.'
        );
        outputChannel.appendLine('[ERROR] Missing affected repositories for cross-repository workflow');
        return;
      }

      promptWorkspacePath = inputs.affectedRepositories[0].path;
    }

    // Validate git repository only for standard implementation workflows.
    // Cross-repository workflows do not require the first workspace folder to be a git repository.
    if (inputs.workflowType === 'implementation') {
      outputChannel.appendLine('[INFO] Validating git repository...');
      const isGitRepo = await validateGitRepository(promptWorkspacePath);
      if (!isGitRepo) {
        vscode.window.showErrorMessage(
          'PAW requires a Git repository. Please open a git repository folder or initialize Git with: git init'
        );
        outputChannel.appendLine('[ERROR] Not a git repository');
        return;
      }
      outputChannel.appendLine('[INFO] Git repository validated');
    }

    // Check for custom instructions (relative to prompt workspace path)
    outputChannel.appendLine('[INFO] Checking for custom instructions...');
    const customInstructionsPath = path.join(
      promptWorkspacePath,
      WORKFLOW_INIT_CUSTOM_INSTRUCTIONS_PATH
    );
    const hasCustomInstructions = fs.existsSync(customInstructionsPath);
    
    if (hasCustomInstructions) {
      outputChannel.appendLine('[INFO] Custom instructions found at .paw/instructions/init-instructions.md');
    } else {
      outputChannel.appendLine('[INFO] No custom instructions found (optional)');
    }

    outputChannel.appendLine('[INFO] Constructing agent prompt...');
    const prompt = constructAgentPrompt(
      inputs.workflowType,
      inputs.targetBranch,
      inputs.workflowMode,
      inputs.reviewStrategy,
      inputs.handoffMode,
      inputs.issueUrl,
      promptWorkspacePath,
      inputs.affectedRepositories,
      inputs.storageRoot
    );

    outputChannel.appendLine('[INFO] Invoking GitHub Copilot agent mode...');
    outputChannel.show(true);

    // Create a new chat
    await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async value => {
      outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
      // Opens chat in the new thread 
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: prompt,
        mode: 'agent'
      });
    });

    outputChannel.appendLine('[INFO] Agent invoked - check chat panel for progress');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Initialization failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`PAW initialization failed: ${errorMessage}`);
  }
}
