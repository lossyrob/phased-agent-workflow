import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generatePromptFile,
  PromptGenerationParams,
  VALID_TEMPLATE_KEYS,
  TEMPLATE_KEY_MAP,
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
  test('generatePromptFile creates prompt with agent-specified filename', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-base-');
    const workId = 'hand-off-demo';
    ensureWorkDirectories(workspaceRoot, workId);
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      const params: PromptGenerationParams = {
        work_id: workId,
        template_key: '03A-implement',
        filename: '03A-implement.prompt.md',
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

  test('generatePromptFile uses agent-specified filename with phase suffix', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-phase-');
    const workId = 'handoff-phase';
    ensureWorkDirectories(workspaceRoot, workId);
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      const params: PromptGenerationParams = {
        work_id: workId,
        template_key: '03A-implement',
        filename: '03A-implement-phase3.prompt.md',
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

  test('generatePromptFile uses PR review template when agent specifies it', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-pr-');
    const workId = 'handoff-pr';
    ensureWorkDirectories(workspaceRoot, workId);
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      const params: PromptGenerationParams = {
        work_id: workId,
        template_key: '03C-pr-review',
        filename: '03C-pr-review-batch2.prompt.md',
        additional_content: 'PR review comments batch 2',
      };

      const result = await generatePromptFile(params);
      assert.ok(path.basename(result.file_path).startsWith('03C-pr-review'));

      const fileContent = fs.readFileSync(result.file_path, 'utf-8');
      assert.ok(fileContent.includes('agent: PAW-03A Implementer'));
      assert.ok(fileContent.includes('Address PR review comments'));
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('VALID_TEMPLATE_KEYS includes all expected template keys', () => {
    assert.ok(VALID_TEMPLATE_KEYS.includes('01A-spec'));
    assert.ok(VALID_TEMPLATE_KEYS.includes('03A-implement'));
    assert.ok(VALID_TEMPLATE_KEYS.includes('03C-pr-review'));
    assert.ok(VALID_TEMPLATE_KEYS.includes('0X-status'));
  });

  test('TEMPLATE_KEY_MAP maps keys to correct templates', () => {
    const implTemplate = TEMPLATE_KEY_MAP.get('03A-implement');
    assert.ok(implTemplate);
    assert.strictEqual(implTemplate.mode, 'PAW-03A Implementer');

    const prReviewTemplate = TEMPLATE_KEY_MAP.get('03C-pr-review');
    assert.ok(prReviewTemplate);
    assert.strictEqual(prReviewTemplate.mode, 'PAW-03A Implementer');
    assert.ok(prReviewTemplate.instruction.includes('PR review'));
  });

  test('generatePromptFile rejects invalid work id format', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-invalid-');
    ensureWorkDirectories(workspaceRoot, 'valid-slug');
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      await assert.rejects(
        () => generatePromptFile({
          work_id: 'Invalid Slug',
          template_key: '03A-implement',
          filename: '03A-implement.prompt.md'
        }),
        /Invalid Work ID format/
      );
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('generatePromptFile rejects unknown template keys', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-template-');
    ensureWorkDirectories(workspaceRoot, 'valid-slug');
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      await assert.rejects(
        () => generatePromptFile({
          work_id: 'valid-slug',
          template_key: 'unknown-template',
          filename: 'unknown.prompt.md'
        }),
        /Unknown template_key/
      );
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('generatePromptFile rejects invalid filename format', async () => {
    const workspaceRoot = createTempWorkspace('paw-prompt-filename-');
    ensureWorkDirectories(workspaceRoot, 'valid-slug');
    const restoreEnv = withWorkspaceEnv(workspaceRoot);

    try {
      await assert.rejects(
        () => generatePromptFile({
          work_id: 'valid-slug',
          template_key: '03A-implement',
          filename: 'invalid-filename.txt'
        }),
        /Invalid filename format/
      );
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
