import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { installAgents, needsInstallation, isDevelopmentVersion, removeInstalledAgents } from '../../agents/installer';

function mockWorkspaceConfiguration(promptsDir: string): vscode.WorkspaceConfiguration {
  return {
    get: () => promptsDir,
    has: () => true,
    inspect: () => undefined,
    update: async () => undefined,
  } as unknown as vscode.WorkspaceConfiguration;
}

function overridePromptDirectoryConfig(promptsDir: string): () => void {
  const originalConfig = vscode.workspace.getConfiguration;
  (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
    () => mockWorkspaceConfiguration(promptsDir);

  return () => {
    (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
      originalConfig;
  };
}

suite('Agent Installation', () => {
  let testDir: string;
  let mockContext: vscode.ExtensionContext;
  let globalStateStore: Map<string, unknown>;

  setup(() => {
    // Create temporary directory for test installation
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-installer-test-'));
    
    // Create mock global state
    globalStateStore = new Map();
    
    // Create mock extension context
    mockContext = {
      globalState: {
        get: (key: string) => globalStateStore.get(key),
        update: async (key: string, value: unknown) => {
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
      workspaceState: {} as vscode.Memento,
      secrets: {} as vscode.SecretStorage,
      extensionUri: vscode.Uri.file(path.resolve(__dirname, '../../..')),
      extensionPath: path.resolve(__dirname, '../../..'),
      environmentVariableCollection: {} as vscode.GlobalEnvironmentVariableCollection,
      storageUri: undefined,
      storagePath: undefined,
      globalStorageUri: vscode.Uri.file(testDir),
      globalStoragePath: testDir,
      logUri: vscode.Uri.file(testDir),
      logPath: testDir,
      extensionMode: vscode.ExtensionMode.Test,
      asAbsolutePath: (relativePath: string) => path.resolve(__dirname, '../../..', relativePath),
      languageModelAccessInformation: {} as vscode.LanguageModelAccessInformation
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
    (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
      () => mockWorkspaceConfiguration(promptsDir);
    
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
      (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration = originalConfig;
    }
  });

  test('installAgents creates prompts directory if missing', async () => {
    const promptsDir = path.join(testDir, 'new-prompts-dir');
    
    // Configure custom prompts directory
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
      () => mockWorkspaceConfiguration(promptsDir);
    
    try {
      const result = await installAgents(mockContext);
      
      assert.ok(fs.existsSync(promptsDir), 'Should create prompts directory');
      assert.strictEqual(result.errors.length, 0, 'Should not have errors');
      assert.ok(result.filesInstalled.length > 0, 'Should install files');
    } finally {
      (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration = originalConfig;
    }
  });

  test('installAgents writes all agent files', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
      () => mockWorkspaceConfiguration(promptsDir);
    
    try {
      const result = await installAgents(mockContext);
      
      assert.strictEqual(result.errors.length, 0, 'Should not have errors');
      // 2 agents (PAW, PAW Review) + 2 prompt files (paw.prompt.md, paw-review.prompt.md)
      assert.ok(result.filesInstalled.length >= 4, 'Should install at least 4 files (2 agents + 2 prompts)');
      
      // Verify files exist on disk
      for (const filename of result.filesInstalled) {
        const filePath = path.join(promptsDir, filename);
        assert.ok(fs.existsSync(filePath), `File ${filename} should exist`);
        
        const content = fs.readFileSync(filePath, 'utf-8');
        assert.ok(content.length > 0, `File ${filename} should have content`);
      }
    } finally {
      (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration = originalConfig;
    }
  });

  test('installAgents updates globalState', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const originalConfig = vscode.workspace.getConfiguration;
    (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
      () => mockWorkspaceConfiguration(promptsDir);
    
    try {
      const result = await installAgents(mockContext);
      
      const state = mockContext.globalState.get<{ version: string; filesInstalled: string[]; installedAt: string; success: boolean }>('paw.agentInstallation');
      assert.ok(state, 'Should create installation state');
      assert.strictEqual(state.version, '0.0.1', 'Should store current version');
      assert.ok(Array.isArray(state.filesInstalled), 'Should store installed files list');
      assert.strictEqual(state.filesInstalled.length, result.filesInstalled.length, 'Should match installed count');
      assert.ok(state.installedAt, 'Should have installation timestamp');
      assert.strictEqual(state.success, true, 'Should mark as successful');
    } finally {
      (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration = originalConfig;
    }
  });

  test('installAgents is idempotent', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
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
      restoreConfig();
    }
  });

  test('installAgents continues on individual file failures', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    // Make prompts directory read-only to cause write errors
    fs.chmodSync(promptsDir, 0o444);
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
    try {
      const result = await installAgents(mockContext);
      
      // Should have errors but not throw
      assert.ok(result.errors.length > 0, 'Should have errors due to permissions');
      assert.strictEqual(result.filesInstalled.length, 0, 'Should not install any files');
      
      // State should be updated even with failures
      const state = mockContext.globalState.get<{ success: boolean }>('paw.agentInstallation');
      assert.ok(state, 'Should create installation state');
      assert.strictEqual(state.success, false, 'Should mark as failed');
    } finally {
      // Restore permissions for cleanup
      fs.chmodSync(promptsDir, 0o755);
      restoreConfig();
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
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
    try {
      const result = await installAgents(badContext);
      
      assert.ok(result.errors.length > 0, 'Should have errors');
      assert.ok(
        result.errors[0].includes('Agents directory not found') || 
        result.errors[0].includes('Failed to load agent templates'),
        'Should report missing agents directory'
      );
    } finally {
      restoreConfig();
    }
  });

  // Version Change and Migration Tests
  test('installAgents cleans up previous installation on version upgrade', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
    try {
      // Install with version 0.0.1
      const result1 = await installAgents(mockContext);
      assert.strictEqual(result1.errors.length, 0, 'First installation should succeed');
      const filesCount = result1.filesInstalled.length;
      
      // Verify files exist
      for (const filename of result1.filesInstalled) {
        assert.ok(fs.existsSync(path.join(promptsDir, filename)), `${filename} should exist after install`);
      }
      
      // Change version to simulate upgrade
      mockContext.extension.packageJSON.version = '0.0.2';
      
      // Install again - should clean up old files and install new ones
      const result2 = await installAgents(mockContext);
      assert.strictEqual(result2.errors.length, 0, 'Second installation should succeed');
      assert.strictEqual(result2.filesInstalled.length, filesCount, 'Should install same number of files');
      
      // Check state reflects version change
      const state = mockContext.globalState.get<{ version: string; previousVersion: string; filesDeleted: number }>('paw.agentInstallation');
      assert.ok(state, 'State should exist');
      assert.strictEqual(state.version, '0.0.2', 'Should update to new version');
      assert.strictEqual(state.previousVersion, '0.0.1', 'Should track previous version');
      assert.strictEqual(state.filesDeleted, filesCount, 'Should have deleted all previous files');
    } finally {
      restoreConfig();
    }
  });

  test('installAgents cleans up previous installation on version downgrade', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
    try {
      // Install with version 0.0.2
      mockContext.extension.packageJSON.version = '0.0.2';
      const result1 = await installAgents(mockContext);
      assert.strictEqual(result1.errors.length, 0, 'First installation should succeed');
      const filesCount = result1.filesInstalled.length;
      
      // Change version to simulate downgrade
      mockContext.extension.packageJSON.version = '0.0.1';
      
      // Install again - should clean up old files and install new ones
      const result2 = await installAgents(mockContext);
      assert.strictEqual(result2.errors.length, 0, 'Second installation should succeed');
      assert.strictEqual(result2.filesInstalled.length, filesCount, 'Should install same number of files');
      
      // Check state reflects version change
      const state = mockContext.globalState.get<{ version: string; previousVersion: string; filesDeleted: number }>('paw.agentInstallation');
      assert.ok(state, 'State should exist');
      assert.strictEqual(state.version, '0.0.1', 'Should update to downgraded version');
      assert.strictEqual(state.previousVersion, '0.0.2', 'Should track previous version');
      assert.strictEqual(state.filesDeleted, filesCount, 'Should have deleted all previous files');
    } finally {
      restoreConfig();
    }
  });

  test('cleanup errors do not block installation', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
    try {
      // Install with version 0.0.1
      const result1 = await installAgents(mockContext);
      assert.strictEqual(result1.errors.length, 0, 'First installation should succeed');
      
      // Simulate cleanup error by manually updating state with a non-existent file
      // This is more reliable than file permissions which vary by platform
      const state = mockContext.globalState.get<{ filesInstalled: string[] }>('paw.agentInstallation');
      assert.ok(state, 'State should exist');
      state.filesInstalled = [...result1.filesInstalled, 'nonexistent-file.agent.md'];
      await mockContext.globalState.update('paw.agentInstallation', state);
      
      // Change version to trigger cleanup
      mockContext.extension.packageJSON.version = '0.0.2';
      
      // Install again - cleanup should proceed despite missing file
      const result2 = await installAgents(mockContext);
      
      // Installation should succeed for all files (nonexistent file doesn't cause error)
      assert.ok(result2.filesInstalled.length > 0, 'Should install files even if cleanup encounters missing files');
      
      // State should reflect successful installation
      const newState = mockContext.globalState.get<{ version: string; filesDeleted?: number }>('paw.agentInstallation');
      assert.ok(newState, 'State should exist');
      assert.strictEqual(newState.version, '0.0.2', 'Should update version');
      assert.ok(newState.filesDeleted !== undefined, 'Should track cleanup even with missing files');
    } finally {
      restoreConfig();
    }
  });

  test('needsInstallation detects version changes in both directions', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
    try {
      // Install with version 0.0.1
      await installAgents(mockContext);
      assert.strictEqual(
        needsInstallation(mockContext, mockContext.extension.extensionUri, promptsDir),
        false,
        'Should not need installation when up to date'
      );
      
      // Test upgrade detection
      mockContext.extension.packageJSON.version = '0.0.2';
      assert.strictEqual(
        needsInstallation(mockContext, mockContext.extension.extensionUri, promptsDir),
        true,
        'Should detect version upgrade'
      );
      
      // Install upgraded version
      await installAgents(mockContext);
      assert.strictEqual(
        needsInstallation(mockContext, mockContext.extension.extensionUri, promptsDir),
        false,
        'Should not need installation after upgrade'
      );
      
      // Test downgrade detection
      mockContext.extension.packageJSON.version = '0.0.1';
      assert.strictEqual(
        needsInstallation(mockContext, mockContext.extension.extensionUri, promptsDir),
        true,
        'Should detect version downgrade'
      );
    } finally {
      restoreConfig();
    }
  });

  test('version change deletes all previously tracked files', async () => {
    const promptsDir = path.join(testDir, 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });
    
    const restoreConfig = overridePromptDirectoryConfig(promptsDir);
    
    try {
      // Install with version 0.0.1
      const result1 = await installAgents(mockContext);
      const installedFiles = [...result1.filesInstalled];
      
      // Verify all files exist
      for (const filename of installedFiles) {
        assert.ok(fs.existsSync(path.join(promptsDir, filename)), `${filename} should exist`);
      }
      
      // Change version
      mockContext.extension.packageJSON.version = '0.0.2';
      
      // Install again
      await installAgents(mockContext);
      
      // All files should still exist (reinstalled), but old ones were deleted first
      for (const filename of installedFiles) {
        assert.ok(fs.existsSync(path.join(promptsDir, filename)), `${filename} should exist after reinstall`);
      }
      
      // State should track the cleanup
      const state = mockContext.globalState.get<{ filesDeleted: number }>('paw.agentInstallation');
      assert.ok(state, 'State should exist');
      assert.strictEqual(state.filesDeleted, installedFiles.length, 'Should have deleted all previous files');
    } finally {
      restoreConfig();
    }
  });

  suite('Uninstall Cleanup', () => {
    test('removeInstalledAgents deletes tracked files and clears state', async () => {
      const promptsDir = path.join(testDir, 'prompts-cleanup-success');
      fs.mkdirSync(promptsDir, { recursive: true });

      const restoreConfig = overridePromptDirectoryConfig(promptsDir);

      try {
        const installResult = await installAgents(mockContext);
        assert.strictEqual(installResult.errors.length, 0, 'Installation should succeed before cleanup');

        // Ensure files exist prior to cleanup
        for (const filename of installResult.filesInstalled) {
          assert.ok(fs.existsSync(path.join(promptsDir, filename)), `${filename} should exist before cleanup`);
        }

        const cleanupResult = await removeInstalledAgents(mockContext);
        assert.strictEqual(cleanupResult.errors.length, 0, 'Cleanup should not error');
        assert.strictEqual(
          cleanupResult.filesRemoved.length,
          installResult.filesInstalled.length,
          'Cleanup should remove all installed files'
        );

        for (const filename of installResult.filesInstalled) {
          assert.strictEqual(
            fs.existsSync(path.join(promptsDir, filename)),
            false,
            `${filename} should be deleted during cleanup`
          );
        }

        const state = mockContext.globalState.get<unknown>('paw.agentInstallation');
        assert.strictEqual(state, undefined, 'Installation state should be cleared after cleanup');
      } finally {
        restoreConfig();
      }
    });

    test('removeInstalledAgents leaves non-PAW files untouched and reports failures', async () => {
      const promptsDir = path.join(testDir, 'prompts-cleanup-partial');
      fs.mkdirSync(promptsDir, { recursive: true });

      const restoreConfig = overridePromptDirectoryConfig(promptsDir);

      // Track whether we simulated a permission error
      let permissionErrorHit = false;
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const nativeFs = require('fs') as typeof fs;
      const originalUnlinkSync = nativeFs.unlinkSync;

      try {
        mockContext.extension.packageJSON.version = '0.0.1';
        const installResult = await installAgents(mockContext);
        assert.ok(installResult.filesInstalled.length > 0, 'Install should produce files');

        // Create a non-PAW agent file that should remain after cleanup
        const otherFile = path.join(promptsDir, 'custom-other.agent.md');
        fs.writeFileSync(otherFile, '# Other agent');

        const protectedFile = installResult.filesInstalled[0];
        nativeFs.unlinkSync = (targetPath: fs.PathLike) => {
          if (String(targetPath).endsWith(protectedFile)) {
            permissionErrorHit = true;
            throw new Error('permission denied');
          }
          return originalUnlinkSync(targetPath);
        };

        const cleanupResult = await removeInstalledAgents(mockContext);

        assert.ok(permissionErrorHit, 'Permission error simulation should run');
        assert.ok(cleanupResult.errors.length > 0, 'Errors should be reported for failed deletions');
        assert.ok(
          cleanupResult.filesRemoved.length < installResult.filesInstalled.length,
          'Not all files should be removed due to simulated failure'
        );

        // Non-PAW file should remain untouched
        assert.ok(fs.existsSync(otherFile), 'Non-PAW files should not be deleted');
      } finally {
        nativeFs.unlinkSync = originalUnlinkSync;
        restoreConfig();
      }
    });
  });

  suite('Development Version Handling', () => {
    test('needsInstallation returns true for dev -> dev with same version', async () => {
      const promptsDir = path.join(testDir, 'prompts-dev-dev');
      fs.mkdirSync(promptsDir, { recursive: true });

      const restoreConfig = overridePromptDirectoryConfig(promptsDir);

      try {
        mockContext.extension.packageJSON.version = '0.0.1-dev';
        await installAgents(mockContext);

        const result = needsInstallation(
          mockContext,
          mockContext.extension.extensionUri,
          promptsDir
        );

        assert.strictEqual(result, true, 'Dev builds should always trigger reinstall');
      } finally {
        restoreConfig();
      }
    });

    test('needsInstallation returns true for dev -> prod migration', async () => {
      const promptsDir = path.join(testDir, 'prompts-dev-prod');
      fs.mkdirSync(promptsDir, { recursive: true });

      const restoreConfig = overridePromptDirectoryConfig(promptsDir);

      try {
        mockContext.extension.packageJSON.version = '0.0.1-dev';
        await installAgents(mockContext);

        mockContext.extension.packageJSON.version = '0.2.0';
        const result = needsInstallation(
          mockContext,
          mockContext.extension.extensionUri,
          promptsDir
        );

        assert.strictEqual(result, true, 'Switching from dev to prod should reinstall');
      } finally {
        restoreConfig();
      }
    });

    test('needsInstallation returns true for prod -> dev migration', async () => {
      const promptsDir = path.join(testDir, 'prompts-prod-dev');
      fs.mkdirSync(promptsDir, { recursive: true });

      const restoreConfig = overridePromptDirectoryConfig(promptsDir);

      try {
        mockContext.extension.packageJSON.version = '0.2.0';
        await installAgents(mockContext);

        mockContext.extension.packageJSON.version = '0.0.1-dev';
        const result = needsInstallation(
          mockContext,
          mockContext.extension.extensionUri,
          promptsDir
        );

        assert.strictEqual(result, true, 'Switching from prod to dev should reinstall');
      } finally {
        restoreConfig();
      }
    });

    test('isDevelopmentVersion detects -dev suffix', () => {
      assert.strictEqual(isDevelopmentVersion('0.0.1-dev'), true);
      assert.strictEqual(isDevelopmentVersion('1.2.3-dev'), true);
      assert.strictEqual(isDevelopmentVersion('0.2.0'), false);
      assert.strictEqual(isDevelopmentVersion('1.0.0'), false);
      assert.strictEqual(isDevelopmentVersion(undefined), false);
      assert.strictEqual(isDevelopmentVersion(null), false);
    });
  });
});
