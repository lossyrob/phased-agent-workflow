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
    assert.ok(skills.length >= 26, `should have at least 26 skills, found ${skills.length}`);
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
});
