import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  detectVSCodeVariant,
  getPlatformInfo,
  resolvePromptsDirectory,
  isWSL,
  VSCodeVariant
} from '../../agents/platformDetection';
import { loadAgentTemplates } from '../../agents/agentTemplates';

suite('Platform Detection Utilities', () => {
  test('detects VS Code variant from app name', () => {
    assert.strictEqual(detectVSCodeVariant('Visual Studio Code'), VSCodeVariant.Stable);
    assert.strictEqual(detectVSCodeVariant('Visual Studio Code - Insiders'), VSCodeVariant.Insiders);
    assert.strictEqual(detectVSCodeVariant('Code - OSS'), VSCodeVariant.OSS);
    assert.strictEqual(detectVSCodeVariant('VSCodium'), VSCodeVariant.VSCodium);
  });

  test('provides platform info from overrides', () => {
    const winInfo = getPlatformInfo('Visual Studio Code', 'win32', 'C/Users/Test');
    assert.strictEqual(winInfo.platform, 'windows');
    assert.strictEqual(winInfo.variant, VSCodeVariant.Stable);

    const macInfo = getPlatformInfo('Visual Studio Code - Insiders', 'darwin', '/Users/tester');
    assert.strictEqual(macInfo.platform, 'macos');
    assert.strictEqual(macInfo.variant, VSCodeVariant.Insiders);

    // Mock non-WSL Linux by providing a non-WSL proc version
    const linuxInfo = getPlatformInfo('Code - OSS', 'linux', '/home/tester', () => 'Linux version 5.4.0-generic');
    assert.strictEqual(linuxInfo.platform, 'linux');
    assert.strictEqual(linuxInfo.variant, VSCodeVariant.OSS);
  });

  test('resolves prompts directory using override path when provided', () => {
    const info = { platform: 'linux', homeDir: '/home/test', variant: VSCodeVariant.Stable } as const;
    const override = '/custom/prompts';
    assert.strictEqual(resolvePromptsDirectory(info, override), override);
  });

  test('resolves platform-specific prompts directories', () => {
    const originalAppData = process.env.APPDATA;
    process.env.APPDATA = 'C:/Users/Test/AppData/Roaming';

    const winInfo = { platform: 'windows', homeDir: 'C/Users/Test', variant: VSCodeVariant.Stable } as const;
    const winPath = resolvePromptsDirectory(winInfo);
    assert.strictEqual(winPath, 'C:\\Users\\Test\\AppData\\Roaming\\Code\\User\\prompts');

    process.env.APPDATA = originalAppData;

    const macInfo = { platform: 'macos', homeDir: '/Users/Test', variant: VSCodeVariant.Insiders } as const;
    const macPath = resolvePromptsDirectory(macInfo);
    assert.strictEqual(macPath, path.join('/Users/Test', 'Library', 'Application Support', 'Code - Insiders', 'User', 'prompts'));

    const linuxInfo = { platform: 'linux', homeDir: '/home/test', variant: VSCodeVariant.OSS } as const;
    const linuxPath = resolvePromptsDirectory(linuxInfo);
    assert.strictEqual(linuxPath, path.join('/home/test', '.config', 'Code - OSS', 'User', 'prompts'));

    const wslInfo = { platform: 'wsl', homeDir: '/mnt/c/Users/Test', variant: VSCodeVariant.Stable } as const;
    const wslPath = resolvePromptsDirectory(wslInfo);
    assert.strictEqual(wslPath, '/mnt/c/Users/Test/AppData/Roaming/Code/User/prompts');
  });

  test('detects WSL environment correctly', () => {
    // Test WSL detection with mocked proc version
    assert.strictEqual(isWSL('linux', () => 'Linux version 5.4.0-generic'), false, 'Should not detect non-WSL Linux as WSL');
    assert.strictEqual(isWSL('linux', () => 'Linux version 6.6.87.2-microsoft-standard-WSL2'), true, 'Should detect WSL from microsoft in version');
    assert.strictEqual(isWSL('linux', () => 'Linux version 5.15.0-WSL2'), true, 'Should detect WSL from WSL in version');
    assert.strictEqual(isWSL('win32', () => 'Windows'), false, 'Should not detect Windows as WSL');
    assert.strictEqual(isWSL('darwin', () => 'Darwin'), false, 'Should not detect macOS as WSL');
  });
});

function createTempExtensionRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'paw-agents-test-'));
}

suite('Agent Template Loader', () => {
  test('loads agent metadata from agents directory', () => {
    const root = createTempExtensionRoot();
    try {
      const agentsDir = path.join(root, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      const templatePath = path.join(agentsDir, 'PAW-99Z Example Agent.agent.md');
      fs.writeFileSync(
        templatePath,
        "---\ndescription: 'Example agent for tests'\n---\n# Example\n",
        'utf-8'
      );

      const templates = loadAgentTemplates(vscode.Uri.file(root));
      assert.strictEqual(templates.length, 1);
      assert.strictEqual(templates[0].filename, 'PAW-99Z Example Agent.agent.md');
      assert.strictEqual(templates[0].description, 'Example agent for tests');
      assert.strictEqual(templates[0].name, 'Example Agent');
      assert.ok(templates[0].content.includes('# Example'));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('ignores non-agent files and errors when none exist', () => {
    const root = createTempExtensionRoot();
    try {
      const agentsDir = path.join(root, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(path.join(agentsDir, 'README.md'), '# docs', 'utf-8');
      assert.throws(() => loadAgentTemplates(vscode.Uri.file(root)));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('throws when agents directory is missing', () => {
    const root = createTempExtensionRoot();
    try {
      assert.throws(() => loadAgentTemplates(vscode.Uri.file(root)));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
