import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * Extension activation and command registration tests.
 * 
 * These integration tests verify that:
 * - The extension metadata is properly registered with VS Code
 * - The extension activates without errors
 * - The "PAW: Initialize Work Item" command is available in the Command Palette
 * 
 * These tests run in a real VS Code environment (Extension Development Host).
 */
suite('Extension Activation Tests', () => {
  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('paw-workflow.paw-workflow');
    assert.ok(extension, 'Extension metadata should be registered');
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('paw-workflow.paw-workflow');
    await extension?.activate();
    assert.ok(extension?.isActive, 'Extension should be active after activation');
  });

  test('Command should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('paw.initializeWorkItem'), 'Command registration missing');
  });
});
