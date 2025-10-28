import * as vscode from 'vscode';
import { collectUserInputs } from '../ui/userInput';
import { validateGitRepository } from '../git/validation';
import { constructAgentPrompt } from '../prompts/agentPrompt';

/**
 * Main command handler for initializing a PAW work item.
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
      const action = await vscode.window.showErrorMessage(
        'PAW requires a Git repository. Would you like to initialize Git?',
        'Initialize Git',
        'Cancel'
      );

      if (action === 'Initialize Git') {
        outputChannel.appendLine('[INFO] Initializing git repository...');
        vscode.window.showInformationMessage(
          'Please initialize Git manually with: git init'
        );
      }

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
