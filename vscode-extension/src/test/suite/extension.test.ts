import * as assert from 'assert';
import * as vscode from 'vscode';

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
