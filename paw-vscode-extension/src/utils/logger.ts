import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Initializes the output channel for the extension
 */
export function initializeOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  }
  return outputChannel;
}

/**
 * Gets the output channel instance
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    throw new Error('Output channel not initialized. Call initializeOutputChannel first.');
  }
  return outputChannel;
}

/**
 * Logs an info message to the output channel
 */
export function logInfo(message: string): void {
  const channel = getOutputChannel();
  channel.appendLine(`[INFO] ${new Date().toISOString()}: ${message}`);
}

/**
 * Logs an error message to the output channel
 */
export function logError(message: string, error?: Error): void {
  const channel = getOutputChannel();
  channel.appendLine(`[ERROR] ${new Date().toISOString()}: ${message}`);
  if (error) {
    channel.appendLine(`  ${error.stack || error.message}`);
  }
}

/**
 * Logs a debug message to the output channel
 */
export function logDebug(message: string): void {
  const channel = getOutputChannel();
  channel.appendLine(`[DEBUG] ${new Date().toISOString()}: ${message}`);
}

/**
 * Shows the output channel panel
 */
export function showOutputChannel(): void {
  const channel = getOutputChannel();
  channel.show();
}
