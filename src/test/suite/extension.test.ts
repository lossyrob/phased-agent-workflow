import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { activate } from '../../extension';
import { loadAgentTemplates } from '../../agents/agentTemplates';

const EXTENSION_ROOT = path.resolve(__dirname, '../../..');

type PawSettings = {
  agentDirectory?: string;
  promptDirectory?: string;
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

function createMockContext(testDir: string): vscode.ExtensionContext {
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
      packageJSON: { version: '0.0.1' },
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

function createMockOutputChannel(): vscode.OutputChannel {
  return {
    name: 'PAW Workflow Test',
    append: () => undefined,
    appendLine: () => undefined,
    clear: () => undefined,
    show: () => undefined,
    hide: () => undefined,
    replace: () => undefined,
    dispose: () => undefined
  };
}

function readInstalledAgent(agentDir: string, filename: string): string {
  return fs.readFileSync(path.join(agentDir, filename), 'utf-8');
}

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

  test('activate installs rendered agents in tests when the install seam is enabled', async () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-extension-install-test-'));
    const agentDir = path.join(testDir, 'agents');
    const restoreConfig = overridePawSettings({ agentDirectory: agentDir });
    const context = createMockContext(testDir);
    const outputChannel = createMockOutputChannel();
    const bundledAgentFilenames = loadAgentTemplates(vscode.Uri.file(EXTENSION_ROOT)).map(
      template => template.filename
    );

    try {
      await activate(context, {
        createOutputChannel: () => outputChannel,
        installOptions: { allowTestModeInstallation: true },
        checkForDeprecatedInstructions: async () => undefined,
        registerHandoffTool: () => undefined,
        registerInitializeWorkItemCommand: () => undefined,
        registerGetWorkStatusCommand: () => undefined,
        registerStopTrackingCommand: () => undefined,
        maybeResumePendingWorktreeInit: async () => undefined
      });

      for (const filename of bundledAgentFilenames) {
        assert.ok(fs.existsSync(path.join(agentDir, filename)), `${filename} should be installed`);
      }

      assert.ok(!fs.existsSync(path.join(agentDir, 'paw.prompt.md')), 'Prompt files should not be installed to the agent directory');

      const pawAgent = readInstalledAgent(agentDir, 'PAW.agent.md');
      assert.ok(pawAgent.includes('Consult available skills'));
      assert.ok(!pawAgent.includes('paw_get_skill'));
      assert.ok(!pawAgent.includes('paw_get_skills'));
      assert.ok(!pawAgent.includes('{{#vscode}}'));
      assert.ok(!pawAgent.includes('{{#cli}}'));

      const reviewAgent = readInstalledAgent(agentDir, 'PAW-Review.agent.md');
      assert.ok(reviewAgent.includes('skills catalog'));
      assert.ok(!reviewAgent.includes('paw_get_skill'));
      assert.ok(!reviewAgent.includes('paw_get_skills'));
      assert.ok(!reviewAgent.includes('{{#vscode}}'));
      assert.ok(!reviewAgent.includes('{{#cli}}'));
    } finally {
      restoreConfig();
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
