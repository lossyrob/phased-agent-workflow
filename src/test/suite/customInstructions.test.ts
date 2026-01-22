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
        'manual',
        undefined,
        workspace,
        true
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
        'manual',
        undefined,
        workspace,
        true
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
        'manual',
        undefined,
        workspace,
        true
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
        'manual',
        undefined,
        workspace,
        true
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
        'manual',
        undefined,
        workspace,
        true
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
        'manual',
        'https://github.com/owner/repo/issues/123',
        workspace,
        true
      );
      assert.ok(prompt.includes('Target Branch: auto'), 'Auto branch should work with issue URL');
      assert.ok(prompt.includes('https://github.com/owner/repo/issues/123'), 'Issue URL should appear in prompt');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});

/**
 * Branch auto-derivation section tests.
 * 
 * Verify that the branch auto-derivation instructions are included when
 * branch mode is auto-derive, with different content based on issue URL presence.
 */
suite('Branch Auto-Derivation Section', () => {
  test('includes branch auto-derivation instructions when branch is empty', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        '',
        { mode: 'full' },
        'prs',
        'manual',
        undefined,
        workspace,
        true
      );
      assert.ok(prompt.includes('**Branch Mode**: auto-derive'), 'Branch mode should be auto-derive');
      assert.ok(prompt.includes('Check Current Branch First'), 'Should include branch checking instructions');
      assert.ok(prompt.includes('Check Remote Branch Conventions'), 'Should include remote convention detection');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('omits branch auto-derivation instructions when branch is explicit', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        'feature/my-branch',
        { mode: 'full' },
        'prs',
        'manual',
        undefined,
        workspace,
        true
      );
      assert.ok(prompt.includes('**Branch Mode**: explicit'), 'Branch mode should be explicit');
      assert.ok(!prompt.includes('Check Current Branch First'), 'Should not include auto-derivation instructions');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('includes issue-based derivation when issue URL is provided', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        '',
        { mode: 'full' },
        'prs',
        'manual',
        'https://github.com/owner/repo/issues/42',
        workspace,
        true
      );
      assert.ok(prompt.includes('Derive From Issue Title'), 'Should include issue-based derivation');
      assert.ok(prompt.includes('Fetch the issue title from https://github.com/owner/repo/issues/42'), 'Should reference the issue URL');
      assert.ok(!prompt.includes('Derive From Work Description'), 'Should not include description-based derivation');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('includes description-based derivation when no issue URL', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        '',
        { mode: 'full' },
        'prs',
        'manual',
        undefined,
        workspace,
        true
      );
      assert.ok(prompt.includes('Derive From Work Description'), 'Should include description-based derivation');
      assert.ok(!prompt.includes('Derive From Issue Title'), 'Should not include issue-based derivation');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});

/**
 * Work description section tests.
 * 
 * Verify that the work description collection instructions are included
 * when no issue URL is provided.
 */
suite('Work Description Section', () => {
  test('includes work description section when no issue URL provided', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        'feature/test',
        { mode: 'full' },
        'prs',
        'manual',
        undefined,
        workspace,
        true
      );
      assert.ok(prompt.includes('What would you like to work on'), 'Should ask for work description');
      assert.ok(prompt.includes('Pause and Ask'), 'Should include pause instructions');
      assert.ok(prompt.includes('Capture the Response'), 'Should include capture instructions');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('omits work description section when issue URL is provided', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        'feature/test',
        { mode: 'full' },
        'prs',
        'manual',
        'https://github.com/owner/repo/issues/123',
        workspace,
        true
      );
      assert.ok(!prompt.includes('What would you like to work on'), 'Should not ask for work description');
      assert.ok(!prompt.includes('Pause and Ask'), 'Should not include pause instructions');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});

/**
 * Initial Prompt field tests.
 * 
 * Verify that the Initial Prompt field placeholder is included in the
 * WorkflowContext.md template when no issue URL is provided.
 */
suite('Initial Prompt Field', () => {
  test('includes Initial Prompt field placeholder when no issue URL', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        'feature/test',
        { mode: 'full' },
        'prs',
        'manual',
        undefined,
        workspace,
        true
      );
      assert.ok(prompt.includes('Initial Prompt: <user_work_description>'), 'Should include Initial Prompt placeholder');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('omits Initial Prompt field when issue URL is provided', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        'feature/test',
        { mode: 'full' },
        'prs',
        'manual',
        'https://github.com/owner/repo/issues/123',
        workspace,
        true
      );
      assert.ok(!prompt.includes('Initial Prompt:'), 'Should not include Initial Prompt field');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('Initial Prompt field definition is documented', () => {
    const workspace = createWorkspaceRoot();
    try {
      const prompt = constructAgentPrompt(
        '',
        { mode: 'full' },
        'prs',
        'manual',
        undefined,
        workspace,
        true
      );
      assert.ok(prompt.includes('**Initial Prompt** (Optional)'), 'Should document Initial Prompt field');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
