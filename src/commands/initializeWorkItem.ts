import * as vscode from 'vscode';
import { collectUserInputs } from '../ui/userInput';
import { validateGitRepository } from '../git/validation';
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
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        'No workspace folder open. Please open a workspace to initialize a PAW workflow.'
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

    // Check for custom instructions
    outputChannel.appendLine('[INFO] Checking for custom instructions...');
    const customInstructionsPath = path.join(
      workspaceFolder.uri.fsPath,
      WORKFLOW_INIT_CUSTOM_INSTRUCTIONS_PATH
    );
    const hasCustomInstructions = fs.existsSync(customInstructionsPath);
    
    if (hasCustomInstructions) {
      outputChannel.appendLine('[INFO] Custom instructions found at .paw/instructions/init-instructions.md');
    } else {
      outputChannel.appendLine('[INFO] No custom instructions found (optional)');
    }

    outputChannel.appendLine('[INFO] Collecting user inputs...');

    const inputs = await collectUserInputs(outputChannel);
    if (!inputs) {
      outputChannel.appendLine('[INFO] User cancelled initialization');
      return;
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

    outputChannel.appendLine('[INFO] Constructing agent prompt...');
    const prompt = constructAgentPrompt(
      inputs.targetBranch,
      inputs.workflowMode,
      inputs.reviewStrategy,
      inputs.handoffMode,
      inputs.issueUrl,
      workspaceFolder.uri.fsPath
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
