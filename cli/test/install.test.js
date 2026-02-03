import { test, describe } from 'node:test';
import assert from 'node:assert';
import { join } from 'path';
import { tmpdir } from 'os';

// Test directory for isolated tests
const TEST_DIR = join(tmpdir(), 'paw-cli-test-' + Date.now());

describe('manifest module', () => {
  test('createManifest creates valid manifest object', async () => {
    const { createManifest } = await import('../lib/manifest.js');
    
    const manifest = createManifest('1.0.0', 'copilot', {
      agents: ['/path/to/agent.md'],
      skills: ['/path/to/skill/SKILL.md'],
    });
    
    assert.strictEqual(manifest.version, '1.0.0');
    assert.strictEqual(manifest.target, 'copilot');
    assert.ok(manifest.installedAt);
    assert.deepStrictEqual(manifest.files.agents, ['/path/to/agent.md']);
  });
});

describe('paths module', () => {
  test('getCopilotDir returns .copilot path', async () => {
    const { getCopilotDir, getHomeDir } = await import('../lib/paths.js');
    
    const copilotDir = getCopilotDir();
    const homeDir = getHomeDir();
    
    assert.strictEqual(copilotDir, join(homeDir, '.copilot'));
  });
  
  test('getManifestPath returns correct path', async () => {
    const { getManifestPath, getHomeDir } = await import('../lib/paths.js');
    
    const manifestPath = getManifestPath();
    const homeDir = getHomeDir();
    
    assert.strictEqual(manifestPath, join(homeDir, '.paw', 'copilot-cli', 'manifest.json'));
  });
});

describe('CLI entry point', () => {
  test('help output includes all commands', async () => {
    const { execSync } = await import('child_process');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    
    const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
    
    assert.ok(output.includes('install'));
    assert.ok(output.includes('upgrade'));
    assert.ok(output.includes('list'));
    assert.ok(output.includes('uninstall'));
  });
  
  test('version output shows version', async () => {
    const { execSync } = await import('child_process');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    
    assert.match(output.trim(), /^\d+\.\d+\.\d+$/);
  });
  
  test('install without target shows error', async () => {
    const { execSync } = await import('child_process');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    
    try {
      execSync(`node ${cliPath} install`, { encoding: 'utf-8', stdio: 'pipe' });
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error.stderr.includes('install requires a target'));
    }
  });
  
  test('install with unsupported target shows error', async () => {
    const { execSync } = await import('child_process');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    
    try {
      execSync(`node ${cliPath} install invalid`, { encoding: 'utf-8', stdio: 'pipe' });
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error.stderr.includes('Unsupported target'));
    }
  });
});

describe('list command', () => {
  test('shows not installed when no manifest', async () => {
    const { execSync } = await import('child_process');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    
    // Use a temp HOME to ensure no manifest exists
    const output = execSync(`HOME=${TEST_DIR}/empty node ${cliPath} list`, { 
      encoding: 'utf-8',
      env: { ...process.env, HOME: join(TEST_DIR, 'empty') },
    });
    
    assert.ok(output.includes('not installed'));
  });
});
