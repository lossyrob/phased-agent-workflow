import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadCustomInstructions, formatCustomInstructions } from '../../prompts/customInstructions';
import { constructAgentPrompt } from '../../prompts/workflowInitPrompt';

const CUSTOM_INSTRUCTIONS_PATH = path.join('.paw', 'instructions', 'init-instructions.md');

/**
 * Create a temporary workspace directory for testing.
 * @returns Absolute path to the temporary workspace root
 */
function createWorkspaceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'paw-custom-instructions-'));
}

/**
 * Write custom instructions file in a test workspace.
 * Creates the .paw/instructions directory structure if needed.
 * @param workspacePath Absolute path to workspace root
 * @param content Content to write to init-instructions.md
 */
function writeCustomInstructions(workspacePath: string, content: string): void {
  const instructionsDir = path.join(workspacePath, '.paw', 'instructions');
  fs.mkdirSync(instructionsDir, { recursive: true });
  fs.writeFileSync(path.join(instructionsDir, 'init-instructions.md'), content, 'utf-8');
}

suite('Custom Instructions Loader', () => {
  test('returns exists=false when file is missing', () => {
    const workspace = createWorkspaceRoot();
    try {
      const result = loadCustomInstructions(workspace, CUSTOM_INSTRUCTIONS_PATH);
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

      const result = loadCustomInstructions(workspace, CUSTOM_INSTRUCTIONS_PATH);
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

      const result = loadCustomInstructions(workspace, CUSTOM_INSTRUCTIONS_PATH);
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

      const result = loadCustomInstructions(workspace, CUSTOM_INSTRUCTIONS_PATH);
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

      const prompt = constructAgentPrompt(
        'feature/test',
        { mode: 'full' },
        'prs',
        undefined,
        workspace
      );
      assert.ok(prompt.includes('## Custom Instructions'));
      assert.ok(prompt.includes('## Custom Section'));
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('omits custom instructions section when file is absent', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        'feature/test',
        { mode: 'full' },
        'prs',
        undefined,
        workspace
      );
      assert.ok(!prompt.includes('## Custom Instructions'));
      assert.ok(!prompt.includes('{{CUSTOM_INSTRUCTIONS}}'));
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});

/**
 * Branch mode tests.
 * 
 * Verify that the prompt construction correctly handles explicit branch names
 * and empty branch names (auto-derive mode).
 */
suite('Branch Mode Handling', () => {
  test('explicit branch name is passed through to template', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        'feature/my-feature',
        { mode: 'full' },
        'prs',
        undefined,
        workspace
      );
      assert.ok(prompt.includes('feature/my-feature'), 'Explicit branch name should appear in prompt');
      assert.ok(!prompt.includes('Target Branch: auto'), 'auto sentinel should not appear when branch is explicit');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('empty branch name triggers auto-derive mode with "auto" sentinel', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        '',
        { mode: 'full' },
        'prs',
        undefined,
        workspace
      );
      assert.ok(prompt.includes('Target Branch: auto'), 'Empty branch should result in "auto" sentinel in WorkflowContext');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('whitespace-only branch name triggers auto-derive mode', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        '   ',
        { mode: 'full' },
        'prs',
        undefined,
        workspace
      );
      assert.ok(prompt.includes('Target Branch: auto'), 'Whitespace-only branch should result in "auto" sentinel');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('auto branch mode works with issue URL provided', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        '',
        { mode: 'full' },
        'prs',
        'https://github.com/owner/repo/issues/123',
        workspace
      );
      assert.ok(prompt.includes('Target Branch: auto'), 'Auto branch should work with issue URL');
      assert.ok(prompt.includes('https://github.com/owner/repo/issues/123'), 'Issue URL should appear in prompt');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
