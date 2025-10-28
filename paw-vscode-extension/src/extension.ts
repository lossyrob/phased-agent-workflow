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
  console.log('PAW Workflow extension is now active');

  // Register the initialize work item command
  // This command will be expanded in Phase 2 to include user input collection,
  // and in subsequent phases to include git operations, file creation, and GitHub integration
  const initializeCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    async () => {
      // Command implementation will be added in Phase 2
      // For now, this serves as a placeholder to verify extension activation
      vscode.window.showInformationMessage(
        'PAW: Initialize Work Item command registered'
      );
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
  // Cleanup if needed
  // Currently no additional cleanup required - VS Code handles subscription disposal
}
