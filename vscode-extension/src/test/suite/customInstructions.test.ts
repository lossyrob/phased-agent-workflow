import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { formatCustomInstructions, loadCustomInstructions } from '../../prompts/customInstructions';
import { constructAgentPrompt } from '../../prompts/agentPrompt';

function createWorkspaceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'paw-custom-instructions-'));
}

function writeCustomInstructions(workspacePath: string, content: string): void {
  const instructionsDir = path.join(workspacePath, '.paw', 'instructions');
  fs.mkdirSync(instructionsDir, { recursive: true });
  fs.writeFileSync(path.join(instructionsDir, 'init-instructions.md'), content, 'utf-8');
}

suite('Custom Instructions Loader', () => {
  test('returns exists=false when file is missing', () => {
    const workspace = createWorkspaceRoot();
    try {
      const result = loadCustomInstructions(workspace);
      assert.strictEqual(result.exists, false);
      assert.strictEqual(result.content, '');
      assert.strictEqual(result.error, undefined);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('loads and formats instructions when file is present', () => {
    const workspace = createWorkspaceRoot();
    try {
      writeCustomInstructions(workspace, '# Custom Rules\n- Enforce component prefix');

      const result = loadCustomInstructions(workspace);
      assert.strictEqual(result.exists, true);
      assert.strictEqual(result.error, undefined);
      assert.strictEqual(result.content, '# Custom Rules\n- Enforce component prefix');

      const formatted = formatCustomInstructions(result);
      assert.ok(formatted.includes('# Custom Rules'));
      assert.ok(formatted.includes('Custom Instructions'));
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('treats empty file as unusable instructions', () => {
    const workspace = createWorkspaceRoot();
    try {
      writeCustomInstructions(workspace, '   \n  \n');

      const result = loadCustomInstructions(workspace);
      assert.strictEqual(result.exists, true);
      assert.strictEqual(result.content, '');
      assert.ok(result.error?.includes('empty'));

      const formatted = formatCustomInstructions(result);
      assert.strictEqual(formatted, '');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('handles read errors gracefully', () => {
    const workspace = createWorkspaceRoot();
    try {
      const instructionsDir = path.join(workspace, '.paw', 'instructions');
      const instructionsPath = path.join(instructionsDir, 'init-instructions.md');
      fs.mkdirSync(instructionsPath, { recursive: true });

      const result = loadCustomInstructions(workspace);
      assert.strictEqual(result.exists, true);
      assert.strictEqual(result.content, '');
      assert.ok(result.error?.includes('Failed to read custom instructions'));

      const formatted = formatCustomInstructions(result);
      assert.strictEqual(formatted, '');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('injects custom instructions into the agent prompt when present', () => {
    const workspace = createWorkspaceRoot();
    try {
      writeCustomInstructions(workspace, '## Custom Section\n- Follow additional rules');

      const prompt = constructAgentPrompt('feature/test', undefined, workspace);
      assert.ok(prompt.includes('## Custom Instructions'));
      assert.ok(prompt.includes('## Custom Section'));
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('omits custom instructions section when file is absent', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt('feature/test', undefined, workspace);
      assert.ok(!prompt.includes('## Custom Instructions'));
      assert.ok(!prompt.includes('{{CUSTOM_INSTRUCTIONS}}'));
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
