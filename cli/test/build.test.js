import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = join(__dirname, '..');
const DIST_DIR = join(CLI_ROOT, 'dist');

describe('build-dist script', () => {
  // Run build first (in case dist doesn't exist)
  execSync('npm run build', { cwd: CLI_ROOT, stdio: 'pipe' });
  
  test('creates dist directory', () => {
    assert.ok(existsSync(DIST_DIR), 'dist directory should exist');
  });
  
  test('creates dist/agents directory with agents', () => {
    const agentsDir = join(DIST_DIR, 'agents');
    assert.ok(existsSync(agentsDir), 'dist/agents should exist');
    
    const agents = readdirSync(agentsDir);
    assert.ok(agents.length > 0, 'should have at least one agent');
    assert.ok(agents.includes('PAW.agent.md'), 'should include PAW.agent.md');
    assert.ok(agents.includes('PAW-Review.agent.md'), 'should include PAW-Review.agent.md (hyphenated)');
  });
  
  test('creates dist/skills directory with skills', () => {
    const skillsDir = join(DIST_DIR, 'skills');
    assert.ok(existsSync(skillsDir), 'dist/skills should exist');
    
    const skills = readdirSync(skillsDir);
    assert.ok(skills.length >= 27, `should have at least 27 skills, found ${skills.length}`);
  });
  
  test('processes vscode conditionals correctly', () => {
    const agentPath = join(DIST_DIR, 'agents', 'PAW.agent.md');
    const content = readFileSync(agentPath, 'utf-8');
    
    assert.ok(!content.includes('{{#vscode}}'), 'should not contain vscode opening tag');
    assert.ok(!content.includes('{{/vscode}}'), 'should not contain vscode closing tag');
  });
  
  test('processes cli conditionals correctly', () => {
    const agentPath = join(DIST_DIR, 'agents', 'PAW.agent.md');
    const content = readFileSync(agentPath, 'utf-8');
    
    assert.ok(!content.includes('{{#cli}}'), 'should not contain cli opening tag');
    assert.ok(!content.includes('{{/cli}}'), 'should not contain cli closing tag');
  });
  
  test('normalizes agent filenames (spaces to hyphens)', () => {
    const agentsDir = join(DIST_DIR, 'agents');
    const agents = readdirSync(agentsDir);
    
    // Check no spaces in filenames
    for (const agent of agents) {
      assert.ok(!agent.includes(' '), `agent filename should not contain spaces: ${agent}`);
    }
    
    // Verify PAW Review was converted to PAW-Review
    assert.ok(agents.includes('PAW-Review.agent.md'), 'PAW Review should be PAW-Review');
    assert.ok(!agents.includes('PAW Review.agent.md'), 'should not have space in filename');
  });

  test('copies references/ directories for skills that have them', () => {
    const refsDir = join(DIST_DIR, 'skills', 'paw-sot', 'references', 'specialists');
    assert.ok(existsSync(refsDir), 'dist should include paw-sot/references/specialists/');
    
    const specialists = readdirSync(refsDir);
    assert.ok(specialists.includes('_shared-rules.md'), 'should include _shared-rules.md');
    assert.ok(specialists.includes('security.md'), 'should include security.md');
    assert.ok(specialists.includes('architecture.md'), 'should include architecture.md');
    assert.ok(specialists.includes('correctness.md'), 'should include correctness.md');
    assert.ok(specialists.length >= 10, `should have at least 10 specialist files (9 + shared rules), found ${specialists.length}`);
  });

  test('generates plugin.json manifest', () => {
    const pluginPath = join(DIST_DIR, 'plugin.json');
    assert.ok(existsSync(pluginPath), 'dist/plugin.json should exist');
    
    const manifest = JSON.parse(readFileSync(pluginPath, 'utf-8'));
    assert.strictEqual(manifest.name, 'paw-workflow', 'plugin name should be paw-workflow');
    assert.strictEqual(manifest.agents, 'agents/', 'agents path should be agents/');
    assert.strictEqual(manifest.skills, 'skills/', 'skills path should be skills/');
    assert.ok(manifest.version, 'should have a version');
    assert.ok(manifest.description, 'should have a description');
    assert.ok(manifest.license, 'should have a license');
    assert.ok(manifest.keywords && manifest.keywords.length > 0, 'should have keywords');
    assert.ok(manifest.repository, 'should have a repository');
    assert.ok(manifest.homepage, 'should have a homepage');
  });

  test('plugin.json version matches package.json version', () => {
    const pluginManifest = JSON.parse(readFileSync(join(DIST_DIR, 'plugin.json'), 'utf-8'));
    const pkg = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8'));
    assert.strictEqual(pluginManifest.version, pkg.version, 'plugin version should match package.json version');
  });

  test('generates marketplace.json manifest', () => {
    const marketplacePath = join(DIST_DIR, '.github', 'plugin', 'marketplace.json');
    assert.ok(existsSync(marketplacePath), 'dist/.github/plugin/marketplace.json should exist');
    
    const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf-8'));
    const pkg = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8'));
    assert.ok(marketplace.name, 'should have a name');
    assert.ok(marketplace.owner && marketplace.owner.name, 'should have owner with name');
    assert.ok(Array.isArray(marketplace.plugins), 'should have plugins array');
    assert.ok(marketplace.plugins.length > 0, 'should have at least one plugin');
    assert.strictEqual(marketplace.metadata.version, pkg.version, 'marketplace metadata version should match package.json');
    
    const pawPlugin = marketplace.plugins.find(p => p.name === 'paw-workflow');
    assert.ok(pawPlugin, 'should contain paw-workflow plugin entry');
    assert.ok(pawPlugin.source, 'plugin entry should have a source');
    assert.ok(pawPlugin.description, 'plugin entry should have a description');
    assert.strictEqual(pawPlugin.version, pkg.version, 'plugin entry version should match package.json');
  });

  test('dist directory is a valid plugin layout', () => {
    // plugin.json at root
    assert.ok(existsSync(join(DIST_DIR, 'plugin.json')), 'plugin.json at dist root');
    // agents directory with expected files
    assert.ok(existsSync(join(DIST_DIR, 'agents', 'PAW.agent.md')), 'PAW agent in agents/');
    assert.ok(existsSync(join(DIST_DIR, 'agents', 'PAW-Review.agent.md')), 'PAW-Review agent in agents/');
    // skills directory with expected structure
    assert.ok(existsSync(join(DIST_DIR, 'skills', 'paw-spec', 'SKILL.md')), 'skills have SKILL.md');
    // marketplace manifest
    assert.ok(existsSync(join(DIST_DIR, '.github', 'plugin', 'marketplace.json')), 'marketplace.json in .github/plugin/');
  });
});
