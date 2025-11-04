import * as vscode from 'vscode';
import { initializeWorkItemCommand } from './commands/initializeWorkItem';
import { registerPromptTemplatesTool } from './tools/createPromptTemplates';

/**
 * Extension activation function called when extension is first needed.
 * 
 * This function is invoked by VS Code when the extension is activated. The extension
 * uses lazy activation (no explicit activationEvents), so it activates only when
 * the user invokes one of its commands.
 * 
 * Responsibilities:
 * - Create and register the output channel for logging PAW operations
 * - Register all extension commands (added in Phase 2)
 * - Register language model tools for agent integration (added in Phase 2)
 * 
 * @param context - Extension context provided by VS Code, used for registering
 *                  disposable resources and accessing extension-specific APIs
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  // The channel provides transparency into PAW operations and helps with debugging
  const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');

  registerPromptTemplatesTool(context);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_create_prompt_templates');

  const initCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    () => initializeWorkItemCommand(outputChannel)
  );
  context.subscriptions.push(initCommand);
  outputChannel.appendLine('[INFO] Registered command: paw.initializeWorkItem');

  outputChannel.appendLine('[INFO] PAW Workflow extension ready');
}

/**
 * Extension deactivation function called when extension is deactivated.
 * 
 * This function is called when the extension is deactivated, either because
 * VS Code is shutting down or the extension is being disabled/uninstalled.
 * 
 * All resources registered via context.subscriptions are automatically disposed,
 * so no manual cleanup is required in this implementation.
 */
export function deactivate() {
  // Cleanup handled automatically via context.subscriptions
}
