import * as vscode from 'vscode';

/**
 * Extension activation function called when extension is first needed
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');
  
  // Register commands (Phase 2)
  // Command registration will be added in next phase
  
  outputChannel.appendLine('[INFO] PAW Workflow extension ready');
}

/**
 * Extension deactivation function called when extension is deactivated
 */
export function deactivate() {
  // Cleanup handled automatically via context.subscriptions
}
