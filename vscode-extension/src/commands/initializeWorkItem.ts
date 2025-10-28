import * as vscode from 'vscode';
import { collectUserInputs } from '../ui/userInput';
import { validateGitRepository } from '../git/validation';
import { constructAgentPrompt } from '../prompts/agentPrompt';

/**
 * Main command handler for initializing a PAW work item.
 * 
 * This is the entry point for the "PAW: Initialize Work Item" command. It orchestrates
 * the entire initialization workflow:
 * 1. Validates that a workspace folder is open
 * 2. Checks that the workspace is a Git repository
 * 3. Collects user inputs (target branch, optional GitHub issue URL)
 * 4. Constructs a comprehensive prompt for the GitHub Copilot agent
 * 5. Invokes the agent to create the PAW work item structure
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
  outputChannel.appendLine('[INFO] Starting PAW work item initialization...');

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        'No workspace folder open. Please open a workspace to initialize a PAW work item.'
      );
      outputChannel.appendLine('[ERROR] No workspace folder open');
      return;
    }

    outputChannel.appendLine(`[INFO] Workspace: ${workspaceFolder.uri.fsPath}`);
    outputChannel.appendLine('[INFO] Validating git repository...');

    const isGitRepo = await validateGitRepository(workspaceFolder.uri.fsPath);
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

    outputChannel.appendLine(`[INFO] Target branch: ${inputs.targetBranch}`);
    if (inputs.githubIssueUrl) {
      outputChannel.appendLine(`[INFO] GitHub issue: ${inputs.githubIssueUrl}`);
    }

    outputChannel.appendLine('[INFO] Constructing agent prompt...');
    const prompt = constructAgentPrompt(
      inputs.targetBranch,
      inputs.githubIssueUrl,
      workspaceFolder.uri.fsPath
    );

    outputChannel.appendLine('[INFO] Invoking GitHub Copilot agent mode...');
    outputChannel.show(true);

    // Opens chat in a new thread (workbench.action.chat.open creates a new thread when
    // invoked programmatically rather than appending to an existing conversation)
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: prompt,
      mode: 'agent'
    });

    outputChannel.appendLine('[INFO] Agent invoked - check chat panel for progress');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Initialization failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`PAW initialization failed: ${errorMessage}`);
  }
}
