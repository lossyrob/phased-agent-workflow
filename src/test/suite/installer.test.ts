import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  installAgents,
  INSTALLATION_STATE_KEY,
  InstallationState,
  isDevelopmentVersion,
  needsInstallation,
  removeInstalledAgents
} from '../../agents/installer';
import { loadAgentTemplates } from '../../agents/agentTemplates';
import { getPlatformInfo, resolveLegacyPromptsDirectory } from '../../agents/platformDetection';

const EXTENSION_ROOT = path.resolve(__dirname, '../../..');
const LEGACY_PROMPT_FILENAMES = ['paw.prompt.md', 'paw-review.prompt.md', 'PAW Review.agent.md'];

type PawSettings = {
  agentDirectory?: string;
  promptDirectory?: string;
  enableWorktreeExecution?: boolean;
};

function mockWorkspaceConfiguration(settings: PawSettings): vscode.WorkspaceConfiguration {
  return {
    get: (section: string) => {
      if (section === 'agentDirectory') {
        return settings.agentDirectory ?? '';
      }
      if (section === 'promptDirectory') {
        return settings.promptDirectory ?? '';
      }
      if (section === 'enableWorktreeExecution') {
        return settings.enableWorktreeExecution ?? true;
      }
      return undefined;
    },
    has: () => true,
    inspect: () => undefined,
    update: async () => undefined,
  } as unknown as vscode.WorkspaceConfiguration;
}

function overridePawSettings(settings: PawSettings): () => void {
  const originalConfig = vscode.workspace.getConfiguration;
  (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
    () => mockWorkspaceConfiguration(settings);

  return () => {
    (vscode.workspace as unknown as { getConfiguration: typeof vscode.workspace.getConfiguration }).getConfiguration =
      originalConfig;
  };
}

function createMockContext(testDir: string, version = '0.0.1'): vscode.ExtensionContext {
  const globalStateStore = new Map<string, unknown>();

  return {
    globalState: {
      get: (key: string) => globalStateStore.get(key),
      update: async (key: string, value: unknown) => {
        globalStateStore.set(key, value);
      },
      keys: () => Array.from(globalStateStore.keys()),
      setKeysForSync: () => {}
    },
    extension: {
      packageJSON: { version },
      extensionUri: vscode.Uri.file(EXTENSION_ROOT),
      id: 'test.extension',
      extensionPath: EXTENSION_ROOT,
      isActive: true,
      exports: undefined,
      extensionKind: vscode.ExtensionKind.Workspace,
      activate: async () => undefined
    },
    subscriptions: [],
    workspaceState: {} as vscode.Memento,
    secrets: {} as vscode.SecretStorage,
    extensionUri: vscode.Uri.file(EXTENSION_ROOT),
    extensionPath: EXTENSION_ROOT,
    environmentVariableCollection: {} as vscode.GlobalEnvironmentVariableCollection,
    storageUri: undefined,
    storagePath: undefined,
    globalStorageUri: vscode.Uri.file(testDir),
    globalStoragePath: testDir,
    logUri: vscode.Uri.file(testDir),
    logPath: testDir,
    extensionMode: vscode.ExtensionMode.Test,
    asAbsolutePath: (relativePath: string) => path.resolve(EXTENSION_ROOT, relativePath),
    languageModelAccessInformation: {} as vscode.LanguageModelAccessInformation
  } as vscode.ExtensionContext;
}

function getBundledAgentFilenames(): string[] {
  return loadAgentTemplates(vscode.Uri.file(EXTENSION_ROOT)).map(template => template.filename);
}

function writeFiles(directory: string, filenames: string[]): void {
  fs.mkdirSync(directory, { recursive: true });
  for (const filename of filenames) {
    fs.writeFileSync(path.join(directory, filename), `content for ${filename}`, 'utf-8');
  }
}

async function withTemporaryHomeDirectory<T>(
  homeDir: string,
  fn: () => Promise<T>
): Promise<T> {
  const originalHome = process.env.HOME;
  const originalUserProfile = process.env.USERPROFILE;
  const originalAppData = process.env.APPDATA;

  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;
  process.env.APPDATA = path.join(homeDir, 'AppData', 'Roaming');

  try {
    return await fn();
  } finally {
    process.env.HOME = originalHome;
    process.env.USERPROFILE = originalUserProfile;
    process.env.APPDATA = originalAppData;
  }
}

function resolveDefaultLegacyPromptDir(homeDir: string): string {
  void homeDir;
  return resolveLegacyPromptsDirectory(getPlatformInfo());
}

suite('Agent Installation', () => {
  let testDir: string;
  let mockContext: vscode.ExtensionContext;
  let bundledAgentFilenames: string[];

  setup(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-installer-test-'));
    mockContext = createMockContext(testDir);
    bundledAgentFilenames = getBundledAgentFilenames();
  });

  teardown(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('isDevelopmentVersion detects dev builds', () => {
    assert.strictEqual(isDevelopmentVersion('0.1.0-dev'), true);
    assert.strictEqual(isDevelopmentVersion('0.1.0'), false);
  });

  test('needsInstallation returns true for fresh install', () => {
    const agentDir = path.join(testDir, 'agents');
    assert.strictEqual(
      needsInstallation(mockContext, mockContext.extension.extensionUri, agentDir),
      true
    );
  });

  test('installAgents creates agent directory and installs only agent files', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      const result = await installAgents(mockContext);

      assert.strictEqual(result.errors.length, 0, 'Installation should succeed');
      assert.deepStrictEqual(result.filesInstalled.sort(), [...bundledAgentFilenames].sort());

      for (const filename of bundledAgentFilenames) {
        assert.ok(fs.existsSync(path.join(agentDir, filename)), `${filename} should exist`);
      }

      for (const legacyPromptFilename of LEGACY_PROMPT_FILENAMES) {
        assert.ok(!fs.existsSync(path.join(agentDir, legacyPromptFilename)), `${legacyPromptFilename} should not be installed`);
      }
    } finally {
      restoreConfig();
    }
  });

  test('needsInstallation returns false when agents are up to date', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      const installResult = await installAgents(mockContext);
      assert.strictEqual(installResult.errors.length, 0, 'Installation should succeed');

      assert.strictEqual(
        needsInstallation(mockContext, mockContext.extension.extensionUri, agentDir),
        false
      );
    } finally {
      restoreConfig();
    }
  });

  test('installAgents stores the install directory in global state', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      await installAgents(mockContext);

      const state = mockContext.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
      assert.ok(state, 'Installation state should exist');
      assert.strictEqual(state?.installDirectory, agentDir);
      assert.strictEqual(state?.success, true);
      assert.deepStrictEqual(state?.filesInstalled.sort(), [...bundledAgentFilenames].sort());
    } finally {
      restoreConfig();
    }
  });

  test('needsInstallation returns true when the configured agent directory changes', async () => {
    const firstAgentDir = path.join(testDir, 'agents-a');
    const secondAgentDir = path.join(testDir, 'agents-b');

    const restoreFirstConfig = overridePawSettings({ agentDirectory: firstAgentDir });
    try {
      const installResult = await installAgents(mockContext);
      assert.strictEqual(installResult.errors.length, 0, 'Initial installation should succeed');
    } finally {
      restoreFirstConfig();
    }

    const restoreSecondConfig = overridePawSettings({ agentDirectory: secondAgentDir });
    try {
      assert.strictEqual(
        needsInstallation(mockContext, mockContext.extension.extensionUri, secondAgentDir),
        true
      );
    } finally {
      restoreSecondConfig();
    }
  });

  test('installAgents cleans legacy prompt-directory files during migration', async () => {
    const agentDir = path.join(testDir, 'agents');
    const legacyPromptDir = path.join(testDir, 'legacy-prompts');
    writeFiles(legacyPromptDir, [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]);

    await mockContext.globalState.update(INSTALLATION_STATE_KEY, {
      version: '0.0.1',
      filesInstalled: [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES],
      installedAt: new Date().toISOString(),
      success: true
    } satisfies InstallationState);
    mockContext.extension.packageJSON.version = '0.0.2';

    const restoreConfig = overridePawSettings({
      agentDirectory: agentDir,
      promptDirectory: legacyPromptDir
    });

    try {
      const result = await installAgents(mockContext);
      assert.strictEqual(result.errors.length, 0, 'Migration install should succeed');

      for (const filename of [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]) {
        assert.ok(!fs.existsSync(path.join(legacyPromptDir, filename)), `${filename} should be removed from legacy prompt dir`);
      }

      for (const filename of bundledAgentFilenames) {
        assert.ok(fs.existsSync(path.join(agentDir, filename)), `${filename} should be installed in new agent dir`);
      }

      const state = mockContext.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
      assert.strictEqual(state?.previousVersion, '0.0.1');
      assert.strictEqual(state?.filesDeleted, bundledAgentFilenames.length + LEGACY_PROMPT_FILENAMES.length);
    } finally {
      restoreConfig();
    }
  });

  test('installAgents cleans the default legacy prompt directory even without prior installation state', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      await withTemporaryHomeDirectory(testDir, async () => {
        const legacyPromptDir = resolveDefaultLegacyPromptDir(testDir);
        writeFiles(legacyPromptDir, [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]);

        const result = await installAgents(mockContext);
        assert.strictEqual(result.errors.length, 0, 'Fresh install should succeed');

        for (const filename of [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]) {
          assert.ok(!fs.existsSync(path.join(legacyPromptDir, filename)), `${filename} should be removed from legacy prompt dir`);
        }
      });
    } finally {
      restoreConfig();
    }
  });

  test('installAgents honors deprecated promptDirectory as a fallback', async () => {
    const fallbackDir = path.join(testDir, 'deprecated-fallback');
    const restoreConfig = overridePawSettings({ promptDirectory: fallbackDir });

    try {
      const result = await installAgents(mockContext);
      assert.strictEqual(result.errors.length, 0, 'Installation should succeed with deprecated fallback');

      for (const filename of bundledAgentFilenames) {
        assert.ok(fs.existsSync(path.join(fallbackDir, filename)), `${filename} should be installed in fallback dir`);
      }

      const state = mockContext.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
      assert.strictEqual(state?.installDirectory, fallbackDir);
    } finally {
      restoreConfig();
    }
  });

  test('needsInstallation detects repair when an installed agent is missing', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      const installResult = await installAgents(mockContext);
      assert.strictEqual(installResult.errors.length, 0, 'Installation should succeed');

      fs.unlinkSync(path.join(agentDir, bundledAgentFilenames[0]));

      assert.strictEqual(
        needsInstallation(mockContext, mockContext.extension.extensionUri, agentDir),
        true
      );
    } finally {
      restoreConfig();
    }
  });

  test('needsInstallation returns true when stale managed files remain in the default legacy prompt directory', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      await withTemporaryHomeDirectory(testDir, async () => {
        const installResult = await installAgents(mockContext);
        assert.strictEqual(installResult.errors.length, 0, 'Installation should succeed');

        const legacyPromptDir = resolveDefaultLegacyPromptDir(testDir);
        writeFiles(legacyPromptDir, ['paw.prompt.md']);

        assert.strictEqual(
          needsInstallation(mockContext, mockContext.extension.extensionUri, agentDir),
          true
        );
      });
    } finally {
      restoreConfig();
    }
  });

  test('installAgents removes legacy prompt files even when tracked state omits them', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      await withTemporaryHomeDirectory(testDir, async () => {
        const legacyPromptDir = resolveDefaultLegacyPromptDir(testDir);
        writeFiles(legacyPromptDir, [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]);

        await mockContext.globalState.update(INSTALLATION_STATE_KEY, {
          version: '0.0.1',
          filesInstalled: [...bundledAgentFilenames],
          installedAt: new Date().toISOString(),
          success: true
        } satisfies InstallationState);
        mockContext.extension.packageJSON.version = '0.0.2';

        const result = await installAgents(mockContext);
        assert.strictEqual(result.errors.length, 0, 'Migration install should succeed');

        for (const filename of [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]) {
          assert.ok(!fs.existsSync(path.join(legacyPromptDir, filename)), `${filename} should be removed from legacy prompt dir`);
        }
      });
    } finally {
      restoreConfig();
    }
  });

  test('removeInstalledAgents deletes tracked files from current and legacy directories', async () => {
    const agentDir = path.join(testDir, 'agents');
    const legacyPromptDir = path.join(testDir, 'legacy-prompts');
    const restoreConfig = overridePawSettings({
      agentDirectory: agentDir,
      promptDirectory: legacyPromptDir
    });

    try {
      const installResult = await installAgents(mockContext);
      assert.strictEqual(installResult.errors.length, 0, 'Installation should succeed');

      writeFiles(legacyPromptDir, bundledAgentFilenames);

      const cleanupResult = await removeInstalledAgents(mockContext);
      assert.strictEqual(cleanupResult.errors.length, 0, 'Cleanup should not error');

      for (const filename of bundledAgentFilenames) {
        assert.ok(!fs.existsSync(path.join(agentDir, filename)), `${filename} should be removed from agent dir`);
        assert.ok(!fs.existsSync(path.join(legacyPromptDir, filename)), `${filename} should be removed from legacy dir`);
      }

      assert.strictEqual(mockContext.globalState.get(INSTALLATION_STATE_KEY), undefined);
      assert.ok(cleanupResult.filesRemoved.length >= bundledAgentFilenames.length, 'Cleanup should report removed files');
    } finally {
      restoreConfig();
    }
  });

  test('removeInstalledAgents also deletes files from the default legacy prompt directory', async () => {
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });

    try {
      await withTemporaryHomeDirectory(testDir, async () => {
        const installResult = await installAgents(mockContext);
        assert.strictEqual(installResult.errors.length, 0, 'Installation should succeed');

        const legacyPromptDir = resolveDefaultLegacyPromptDir(testDir);
        writeFiles(legacyPromptDir, [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]);

        const cleanupResult = await removeInstalledAgents(mockContext);
        assert.strictEqual(cleanupResult.errors.length, 0, 'Cleanup should not error');

        for (const filename of [...bundledAgentFilenames, ...LEGACY_PROMPT_FILENAMES]) {
          assert.ok(!fs.existsSync(path.join(legacyPromptDir, filename)), `${filename} should be removed from legacy dir`);
        }
      });
    } finally {
      restoreConfig();
    }
  });
});
