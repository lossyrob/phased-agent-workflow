/**
 * PAW Workflow Extension - Main Entry Point
 * 
 * This module serves as the main entry point for the PAW (Phased Agent Workflow) VS Code extension.
 * It handles extension activation, command registration, and lifecycle management.
 * 
 * The extension provides automation for initializing PAW work items, including:
 * - Creating `.paw/work/<feature-slug>/` directory structure
 * - Generating WorkflowContext.md and prompt template files
 * - Managing git branch creation and checkout
 * - Optional GitHub issue integration for Work Title generation
 */
import * as vscode from 'vscode';
import { collectWorkItemInputs } from './ui/userInput';
import { getGitRemotes } from './git/gitOperations';
import { initializeOutputChannel, logInfo, logError } from './utils/logger';

/**
 * Extension activation function called when VS Code loads the extension.
 * 
 * This function is invoked when the extension is first activated. It registers
 * all commands and sets up the extension's functionality. The extension uses
 * an empty `activationEvents` array in package.json, which means it activates
 * when any contributed command is invoked.
 * 
 * @param context - The extension context provided by VS Code, used to manage
 *                  subscriptions and extension state
 */
export function activate(context: vscode.ExtensionContext) {
  // Initialize output channel for logging
  const outputChannel = initializeOutputChannel();
  context.subscriptions.push(outputChannel);
  
  logInfo('PAW Workflow extension activated');

  // Register the initialize work item command
  const initializeCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    async () => {
      try {
        logInfo('Starting work item initialization');
        
        // Verify workspace is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          const errorMsg = 'No workspace folder open. Please open a folder containing a git repository.';
          logError(errorMsg);
          vscode.window.showErrorMessage(`PAW: ${errorMsg}`);
          return;
        }
        
        logInfo(`Workspace: ${workspaceFolder.uri.fsPath}`);
        
        // Get git remotes (stub implementation in Phase 2, full implementation in Phase 4)
        const remotes = await getGitRemotes(workspaceFolder.uri.fsPath);
        logInfo(`Found ${remotes.length} git remote(s): ${remotes.join(', ')}`);
        
        // Collect user inputs
        const inputs = await collectWorkItemInputs(remotes);
        if (!inputs) {
          logInfo('User cancelled input collection');
          return;
        }
        
        logInfo(`Collected inputs: branch=${inputs.targetBranch}, issue=${inputs.githubIssueUrl || 'none'}, remote=${inputs.remote}`);
        
        // Show collected inputs (temporary - full implementation in later phases)
        vscode.window.showInformationMessage(
          `Branch: ${inputs.targetBranch}, Issue: ${inputs.githubIssueUrl || 'none'}, Remote: ${inputs.remote}`
        );
        
      } catch (error) {
        const errorMsg = `Initialization failed: ${error instanceof Error ? error.message : String(error)}`;
        logError(errorMsg, error instanceof Error ? error : undefined);
        vscode.window.showErrorMessage(`PAW: ${errorMsg}`);
      }
    }
  );

  // Register the command with the extension context to ensure proper cleanup on deactivation
  context.subscriptions.push(initializeCommand);
}

/**
 * Extension deactivation function called when VS Code unloads the extension.
 * 
 * This function is invoked when the extension is deactivated (e.g., when VS Code
 * is closing or when the extension is being disabled). All subscriptions registered
 * with the extension context are automatically cleaned up by VS Code, but this
 * function can be used for any additional cleanup if needed in future phases.
 */
export function deactivate() {
  logInfo('PAW Workflow extension deactivated');
}
