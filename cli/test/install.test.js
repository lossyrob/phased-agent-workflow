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

  test('createManifest works with claude target', async () => {
    const { createManifest } = await import('../lib/manifest.js');
    
    const manifest = createManifest('1.0.0', 'claude', {
      agents: ['/path/to/agent.md'],
      skills: ['/path/to/skill/SKILL.md'],
    });
    
    assert.strictEqual(manifest.target, 'claude');
  });
});

describe('paths module', () => {
  test('getCopilotDir returns .copilot path', async () => {
    const { getCopilotDir, getHomeDir } = await import('../lib/paths.js');
    
    const copilotDir = getCopilotDir();
    const homeDir = getHomeDir();
    
    assert.strictEqual(copilotDir, join(homeDir, '.copilot'));
  });

  test('getClaudeDir returns .claude path', async () => {
    const { getClaudeDir, getHomeDir } = await import('../lib/paths.js');
    
    const claudeDir = getClaudeDir();
    const homeDir = getHomeDir();
    
    assert.strictEqual(claudeDir, join(homeDir, '.claude'));
  });

  test('getTargetDirs returns copilot dirs by default', async () => {
    const { getTargetDirs, getCopilotAgentsDir, getCopilotSkillsDir } = await import('../lib/paths.js');
    
    const { agentsDir, skillsDir } = getTargetDirs('copilot');
    
    assert.strictEqual(agentsDir, getCopilotAgentsDir());
    assert.strictEqual(skillsDir, getCopilotSkillsDir());
  });

  test('getTargetDirs returns claude dirs for claude target', async () => {
    const { getTargetDirs, getClaudeAgentsDir, getClaudeSkillsDir } = await import('../lib/paths.js');
    
    const { agentsDir, skillsDir } = getTargetDirs('claude');
    
    assert.strictEqual(agentsDir, getClaudeAgentsDir());
    assert.strictEqual(skillsDir, getClaudeSkillsDir());
  });
  
  test('getManifestPath returns correct path for copilot', async () => {
    const { getManifestPath, getHomeDir } = await import('../lib/paths.js');
    
    const manifestPath = getManifestPath();
    const homeDir = getHomeDir();
    
    assert.strictEqual(manifestPath, join(homeDir, '.paw', 'copilot-cli', 'manifest.json'));
  });

  test('getManifestPath returns correct path for claude', async () => {
    const { getManifestPath, getHomeDir } = await import('../lib/paths.js');
    
    const manifestPath = getManifestPath('claude');
    const homeDir = getHomeDir();
    
    assert.strictEqual(manifestPath, join(homeDir, '.paw', 'claude-cli', 'manifest.json'));
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
    assert.ok(output.includes('claude'), 'help should mention claude target');
  });
  
  test('version output shows version', async () => {
    const { execSync } = await import('child_process');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    
    assert.match(output.trim(), /^\d+\.\d+\.\d+/);
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

describe('install output', () => {
  test('fresh copilot install shows quickstart guide', async () => {
    const { execSync } = await import('child_process');
    const { mkdirSync } = await import('fs');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    const freshHome = join(TEST_DIR, 'fresh-install');
    mkdirSync(freshHome, { recursive: true });
    
    const output = execSync(`node ${cliPath} install copilot`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: freshHome },
    });
    
    assert.ok(output.includes('Quick Start'), 'should show Quick Start section');
    assert.ok(output.includes('copilot --agent PAW'), 'should show PAW agent command');
    assert.ok(output.includes('copilot --agent PAW-Review'), 'should show PAW-Review command');
    assert.ok(output.includes('/agent'), 'should mention /agent');
    assert.ok(output.includes('Try saying'), 'should show Try saying section');
    assert.ok(output.includes('uninstall'), 'should mention uninstall');
  });

  test('fresh claude install shows claude quickstart guide', async () => {
    const { execSync } = await import('child_process');
    const { mkdirSync } = await import('fs');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    const freshHome = join(TEST_DIR, 'fresh-claude-install');
    mkdirSync(freshHome, { recursive: true });
    
    const output = execSync(`node ${cliPath} install claude`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: freshHome },
    });
    
    assert.ok(output.includes('Quick Start'), 'should show Quick Start section');
    assert.ok(output.includes('/agents'), 'should mention /agents command');
    assert.ok(output.includes('~/.claude/'), 'should reference ~/.claude/ directory');
    assert.ok(output.includes('Try saying'), 'should show Try saying section');
  });

  test('repeat install does not show quickstart guide', async () => {
    const { execSync } = await import('child_process');
    const { mkdirSync } = await import('fs');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    const upgradeHome = join(TEST_DIR, 'upgrade-install');
    mkdirSync(upgradeHome, { recursive: true });
    
    // First install
    execSync(`node ${cliPath} install copilot`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: upgradeHome },
    });
    
    // Second install (upgrade) with --force to skip prompt
    const output = execSync(`node ${cliPath} install copilot --force`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: upgradeHome },
    });
    
    assert.ok(!output.includes('Quick Start'), 'should not show quickstart on repeat install');
    assert.ok(output.includes('Installed'), 'should still show install summary');
  });

  test('manifest records version from package.json', async () => {
    const { execSync } = await import('child_process');
    const { mkdirSync, readFileSync } = await import('fs');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    const versionHome = join(TEST_DIR, 'version-check');
    mkdirSync(versionHome, { recursive: true });

    const pkgJson = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8'));

    execSync(`node ${cliPath} install copilot`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: versionHome },
    });

    // Verify via list command output
    const listOutput = execSync(`node ${cliPath} list`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: versionHome },
    });

    assert.ok(listOutput.includes(`PAW v${pkgJson.version}`),
      `manifest version should be ${pkgJson.version}, got: ${listOutput}`);
  });

  test('version flag matches package.json', async () => {
    const { execSync } = await import('child_process');
    const { readFileSync } = await import('fs');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');

    const pkgJson = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8'));
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });

    assert.strictEqual(output.trim(), pkgJson.version,
      'CLI --version should match package.json version');
  });

  test('claude install creates files in .claude directory', async () => {
    const { execSync } = await import('child_process');
    const { mkdirSync, existsSync } = await import('fs');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    const claudeHome = join(TEST_DIR, 'claude-dirs');
    mkdirSync(claudeHome, { recursive: true });

    execSync(`node ${cliPath} install claude`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: claudeHome },
    });

    assert.ok(existsSync(join(claudeHome, '.claude', 'agents')), '.claude/agents should exist');
    assert.ok(existsSync(join(claudeHome, '.claude', 'skills')), '.claude/skills should exist');
    assert.ok(existsSync(join(claudeHome, '.paw', 'claude-cli', 'manifest.json')), 'claude manifest should exist');
  });

  test('copilot and claude can be installed side by side', async () => {
    const { execSync } = await import('child_process');
    const { mkdirSync, existsSync } = await import('fs');
    const cliPath = join(import.meta.dirname, '..', 'bin', 'paw.js');
    const dualHome = join(TEST_DIR, 'dual-install');
    mkdirSync(dualHome, { recursive: true });

    execSync(`node ${cliPath} install copilot`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: dualHome },
    });
    execSync(`node ${cliPath} install claude`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: dualHome },
    });

    // Both should exist
    assert.ok(existsSync(join(dualHome, '.copilot', 'agents')), '.copilot/agents should exist');
    assert.ok(existsSync(join(dualHome, '.claude', 'agents')), '.claude/agents should exist');

    // List should show both
    const listOutput = execSync(`node ${cliPath} list`, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: dualHome },
    });
    assert.ok(listOutput.includes('copilot'), 'list should show copilot target');
    assert.ok(listOutput.includes('claude'), 'list should show claude target');
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
