import * as vscode from 'vscode';

/**
 * Extension activation function called when VS Code loads the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('PAW Workflow extension is now active');

  // Register the initialize work item command
  const initializeCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    async () => {
      // Command implementation will be added in Phase 2
      vscode.window.showInformationMessage(
        'PAW: Initialize Work Item command registered'
      );
    }
  );

  context.subscriptions.push(initializeCommand);
}

/**
 * Extension deactivation function called when VS Code unloads the extension
 */
export function deactivate() {
  // Cleanup if needed
}
