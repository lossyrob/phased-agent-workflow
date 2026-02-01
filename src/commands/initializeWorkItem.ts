import * as vscode from 'vscode';
import { collectUserInputs } from "../ui/userInput";
import type { ReviewPolicy, SessionPolicy } from "../tools/contextTool";
import { validateGitRepository } from "../git/validation";

/**
 * Constructs the configuration prompt arguments for the PAW agent.
 * 
 * @param inputs - User inputs collected from quick picks
 * @param workspacePath - Absolute path to the workspace root directory
 * @returns Formatted prompt arguments string for the PAW agent
 */
function constructPawPromptArguments(
  inputs: {
    targetBranch: string;
    workflowMode: { mode: string; customInstructions?: string };
    reviewStrategy: string;
    reviewPolicy: ReviewPolicy;
    sessionPolicy: SessionPolicy;
    trackArtifacts: boolean;
    issueUrl?: string;
  },
  _workspacePath: string
): string {
  // Build configuration object for paw-init skill
  const config: Record<string, string | boolean> = {
    target_branch: inputs.targetBranch.trim() || 'auto',
    workflow_mode: inputs.workflowMode.mode,
    review_strategy: inputs.reviewStrategy,
    review_policy: inputs.reviewPolicy,
    session_policy: inputs.sessionPolicy,
    track_artifacts: inputs.trackArtifacts,
  };

  // Add optional fields
  if (inputs.issueUrl) {
    config.issue_url = inputs.issueUrl;
  }

  if (inputs.workflowMode.customInstructions) {
    config.custom_instructions = inputs.workflowMode.customInstructions;
  }

  // Format as structured prompt arguments
  let args = `## Initialization Parameters\n\n`;

  for (const [key, value] of Object.entries(config)) {
    args += `- **${key}**: ${value}\n`;
  }

  return args;
}

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
    outputChannel.appendLine(`[INFO] Review policy: ${inputs.reviewPolicy}`);
    outputChannel.appendLine(`[INFO] Session policy: ${inputs.sessionPolicy}`);
    outputChannel.appendLine(`[INFO] Track artifacts: ${inputs.trackArtifacts}`);
    if (inputs.issueUrl) {
      outputChannel.appendLine(`[INFO] Issue URL: ${inputs.issueUrl}`);
    }

    outputChannel.appendLine('[INFO] Constructing PAW agent prompt arguments...');
    const promptArgs = constructPawPromptArguments(inputs, workspaceFolder.uri.fsPath);

    outputChannel.appendLine('[INFO] Invoking PAW agent...');
    outputChannel.show(true);

    // Create a new chat and invoke the PAW agent with initialization parameters
    await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async value => {
      outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
      // Opens chat with PAW agent mode and initialization parameters
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: promptArgs,
        mode: 'PAW'
      });
    });

    outputChannel.appendLine('[INFO] PAW agent invoked - check chat panel for progress');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Initialization failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`PAW initialization failed: ${errorMessage}`);
  }
}
