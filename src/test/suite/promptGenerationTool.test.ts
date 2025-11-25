import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildDynamicPromptFilename,
  generatePromptFile,
  PromptGenerationParams,
} from '../../tools/promptGenerationTool';

function createTempWorkspace(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function ensureWorkDirectories(root: string, workId: string): void {
  const featureDir = path.join(root, '.paw', 'work', workId);
  fs.mkdirSync(featureDir, { recursive: true });
}

function withWorkspaceEnv(workspaceRoot: string): () => void {
  const previous = process.env.PAW_WORKSPACE_PATH;
  process.env.PAW_WORKSPACE_PATH = workspaceRoot;
  return () => {
    if (previous === undefined) {
      delete process.env.PAW_WORKSPACE_PATH;
    } else {
      process.env.PAW_WORKSPACE_PATH = previous;
    }
  };
}

suite('Prompt Generation Tool', () => {
  test('generatePromptFile creates base prompt without suffix when no additional content', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-base-');
    const workId = 'hand-off-demo';
    ensureWorkDirectories(workspaceRoot, workId);
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      const params: PromptGenerationParams = {
        work_id: workId,
        agent_name: 'PAW-03A Implementer',
      };

      const result = await generatePromptFile(params);
      assert.ok(result.file_path.endsWith(path.join('.paw', 'work', workId, 'prompts', '03A-implement.prompt.md')));

      const fileContent = fs.readFileSync(result.file_path, 'utf-8');
      assert.ok(fileContent.includes('agent: PAW-03A Implementer'));
      assert.ok(fileContent.includes(`Work ID: ${workId}`));
      assert.ok(!fileContent.includes('Additional Context'));
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('generatePromptFile appends phase suffix and instructions', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-phase-');
    const workId = 'handoff-phase';
    ensureWorkDirectories(workspaceRoot, workId);
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      const params: PromptGenerationParams = {
        work_id: workId,
        agent_name: 'PAW-03A Implementer',
        additional_content: 'Phase 3',
      };

      const result = await generatePromptFile(params);
      assert.ok(result.file_path.endsWith('03A-implement-phase3.prompt.md'));

      const fileContent = fs.readFileSync(result.file_path, 'utf-8');
      assert.ok(fileContent.includes('Additional Context'));
      assert.ok(fileContent.includes('Phase 3'));
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('generatePromptFile selects PR review template when hinted', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-pr-');
    const workId = 'handoff-pr';
    ensureWorkDirectories(workspaceRoot, workId);
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      const params: PromptGenerationParams = {
        work_id: workId,
        agent_name: 'PAW-03A Implementer',
        additional_content: 'PR review comments batch 2',
      };

      const result = await generatePromptFile(params);
      assert.ok(path.basename(result.file_path).startsWith('03C-pr-review'));
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('buildDynamicPromptFilename falls back to base when suffix empty', () => {
    const filename = buildDynamicPromptFilename('03A-implement.prompt.md');
    assert.strictEqual(filename, '03A-implement.prompt.md');
  });

  test('generatePromptFile rejects invalid work id format', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-invalid-');
    ensureWorkDirectories(workspaceRoot, 'valid-slug');
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      await assert.rejects(
        () => generatePromptFile({ work_id: 'Invalid Slug', agent_name: 'PAW-03A Implementer' }),
        /Invalid Work ID format/
      );
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('generatePromptFile rejects unknown agent names', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-agent-');
    ensureWorkDirectories(workspaceRoot, 'valid-slug');
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      await assert.rejects(
        () => generatePromptFile({ work_id: 'valid-slug', agent_name: 'Unknown Agent' }),
        /Unknown agent_name/
      );
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
