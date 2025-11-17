import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { installAgents, needsInstallation } from '../../agents/installer';

suite('Agent Installation', () => {
  let testDir: string;
  let mockContext: vscode.ExtensionContext;
  let globalStateStore: Map<string, any>;

  setup(() => {
    // Create temporary directory for test installation
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-installer-test-'));
    
    // Create mock global state
    globalStateStore = new Map();
    
    // Create mock extension context
    mockContext = {
      globalState: {
        get: (key: string) => globalStateStore.get(key),
        update: async (key: string, value: any) => {
          globalStateStore.set(key, value);
        },
        keys: () => Array.from(globalStateStore.keys()),
        setKeysForSync: () => {}
      },
      extension: {
        packageJSON: { version: '0.0.1' },
        extensionUri: vscode.Uri.file(path.resolve(__dirname, '../../..')),
        id: 'test.extension',
        extensionPath: path.resolve(__dirname, '../../..'),
        isActive: true,
        exports: undefined,
        extensionKind: vscode.ExtensionKind.Workspace,
        activate: async () => undefined
      },
      subscriptions: [],
      workspaceState: {} as any,
      secrets: {} as any,
      extensionUri: vscode.Uri.file(path.resolve(__dirname, '../../..')),
      extensionPath: path.resolve(__dirname, '../../..'),
      environmentVariableCollection: {} as any,
      storageUri: undefined,
      storagePath: undefined,
      globalStorageUri: vscode.Uri.file(testDir),
      globalStoragePath: testDir,
      logUri: vscode.Uri.file(testDir),
      logPath: testDir,
      extensionMode: vscode.ExtensionMode.Test,
      asAbsolutePath: (relativePath: string) => path.resolve(__dirname, '../../..', relativePath),
      languageModelAccessInformation: {} as any
    };
  });

  teardown(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('needsInstallation returns true for fresh install', () => {
    // No previous installation state
    const result = needsInstallation(
      mockContext,
      mockContext.extension.extensionUri,
      testDir
    );
    
    assert.strictEqual(result, true, 'Should require installation when no state exists');
  });

  test('needsInstallation returns true when version changes', async () => {
    // Simulate previous installation
    await mockContext.globalState.update('paw.agentInstallation', {
      version: '0.0.0', // Different version
      filesInstalled: ['PAW-01A Specification.agent.md'],
      installedAt: new Date().toISOString(),
      success: true
    });
    
    const result = needsInstallation(
      mockContext,
      mockContext.extension.extensionUri,
      testDir
    );
    
    assert.strictEqual(result, true, 'Should require installation when version changes');
  });

  test('needsInstallation returns true when files are missing', async () => {
    // Simulate previous installation with current version
    await mockContext.globalState.update('paw.agentInstallation', {
      version: '0.0.1', // Same version
      filesInstalled: ['PAW-01A Specification.agent.md'],
      installedAt: new Date().toISOString(),
      success: true
    });
    
    // Files don't exist in testDir
    const result = needsInstallation(
      mockContext,
      mockContext.extension.extensionUri,
      testDir
    );
    
    assert.strictEqual(result, true, 'Should require installation when expected files are missing');
  });

  test('needsInstallation returns false when up to date', async () => {
    // Create mock prompts directory
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    // Install agents first
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: () => promptsDir
    });
    
    try {
      const installResult = await installAgents(mockContext);
      assert.strictEqual(installResult.errors.length, 0, 'Installation should succeed');
      
      // Now check if installation is needed
      const result = needsInstallation(
        mockContext,
        mockContext.extension.extensionUri,
        promptsDir
      );
      
      assert.strictEqual(result, false, 'Should not require installation when up to date');
    } finally {
      (vscode.workspace as any).getConfiguration = originalConfig;
    }
  });

  test('installAgents creates prompts directory if missing', async () => {
    const promptsDir = path.join(testDir, 'new-prompts-dir');
    
    // Configure custom prompts directory
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: () => promptsDir
    });
    
    try {
      const result = await installAgents(mockContext);
      
      assert.ok(fs.existsSync(promptsDir), 'Should create prompts directory');
      assert.strictEqual(result.errors.length, 0, 'Should not have errors');
      assert.ok(result.filesInstalled.length > 0, 'Should install files');
    } finally {
      (vscode.workspace as any).getConfiguration = originalConfig;
    }
  });

  test('installAgents writes all agent files', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: () => promptsDir
    });
    
    try {
      const result = await installAgents(mockContext);
      
      assert.strictEqual(result.errors.length, 0, 'Should not have errors');
      assert.ok(result.filesInstalled.length >= 15, 'Should install at least 15 agents');
      
      // Verify files exist on disk
      for (const filename of result.filesInstalled) {
        const filePath = path.join(promptsDir, filename);
        assert.ok(fs.existsSync(filePath), `File ${filename} should exist`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        assert.ok(content.length > 0, `File ${filename} should have content`);
      }
    } finally {
      (vscode.workspace as any).getConfiguration = originalConfig;
    }
  });

  test('installAgents updates globalState', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: () => promptsDir
    });
    
    try {
      const result = await installAgents(mockContext);
      
      const state = mockContext.globalState.get<any>('paw.agentInstallation');
      assert.ok(state, 'Should create installation state');
      assert.strictEqual(state.version, '0.0.1', 'Should store current version');
      assert.ok(Array.isArray(state.filesInstalled), 'Should store installed files list');
      assert.strictEqual(state.filesInstalled.length, result.filesInstalled.length, 'Should match installed count');
      assert.ok(state.installedAt, 'Should have installation timestamp');
      assert.strictEqual(state.success, true, 'Should mark as successful');
    } finally {
      (vscode.workspace as any).getConfiguration = originalConfig;
    }
  });

  test('installAgents is idempotent', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: () => promptsDir
    });
    
    try {
      // First installation
      const result1 = await installAgents(mockContext);
      assert.strictEqual(result1.errors.length, 0, 'First installation should succeed');
      
      // Second installation (should overwrite)
      const result2 = await installAgents(mockContext);
      assert.strictEqual(result2.errors.length, 0, 'Second installation should succeed');
      assert.strictEqual(result2.filesInstalled.length, result1.filesInstalled.length, 'Should install same number of files');
      
      // Verify files still exist and have content
      for (const filename of result2.filesInstalled) {
        const filePath = path.join(promptsDir, filename);
        assert.ok(fs.existsSync(filePath), `File ${filename} should still exist`);
      }
    } finally {
      (vscode.workspace as any).getConfiguration = originalConfig;
    }
  });

  test('installAgents continues on individual file failures', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    // Make prompts directory read-only to cause write errors
    fs.chmodSync(promptsDir, 0o444);
    
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: () => promptsDir
    });
    
    try {
      const result = await installAgents(mockContext);
      
      // Should have errors but not throw
      assert.ok(result.errors.length > 0, 'Should have errors due to permissions');
      assert.strictEqual(result.filesInstalled.length, 0, 'Should not install any files');
      
      // State should be updated even with failures
      const state = mockContext.globalState.get<any>('paw.agentInstallation');
      assert.ok(state, 'Should create installation state');
      assert.strictEqual(state.success, false, 'Should mark as failed');
    } finally {
      // Restore permissions for cleanup
      fs.chmodSync(promptsDir, 0o755);
      (vscode.workspace as any).getConfiguration = originalConfig;
    }
  });

  test('installAgents handles missing agents directory gracefully', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    // Create context with invalid extension URI (no agents directory)
    const badContext = {
      ...mockContext,
      extension: {
        ...mockContext.extension,
        extensionUri: vscode.Uri.file('/nonexistent/path')
      }
    };
    
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = () => ({
      get: () => promptsDir
    });
    
    try {
      const result = await installAgents(badContext);
      
      assert.ok(result.errors.length > 0, 'Should have errors');
      assert.ok(
        result.errors[0].includes('Agents directory not found') || 
        result.errors[0].includes('Failed to load agent templates'),
        'Should report missing agents directory'
      );
    } finally {
      (vscode.workspace as any).getConfiguration = originalConfig;
    }
  });
});
