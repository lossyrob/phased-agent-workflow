import * as vscode from 'vscode';
import * as assert from 'assert';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import {
  buildExecutionRegistryEntry,
  constructPawPromptArguments,
  createExecutionRegistryLookupKey,
  deriveWorkIdFromTargetBranch,
  recordExecutionRegistryEntry,
  shouldResumePendingWorktreeInit,
  type ExecutionMetadata,
  type PendingWorktreeInit,
} from '../../commands/initializeWorkItem';

function createMockContext(): vscode.ExtensionContext {
  const globalStateStore = new Map<string, unknown>();

  return {
    globalState: {
      get: <T>(key: string, defaultValue?: T) => {
        if (globalStateStore.has(key)) {
          return globalStateStore.get(key) as T;
        }
        return defaultValue as T;
      },
      update: async (key: string, value: unknown) => {
        globalStateStore.set(key, value);
      },
      keys: () => Array.from(globalStateStore.keys()),
      setKeysForSync: () => undefined,
    },
  } as unknown as vscode.ExtensionContext;
}

suite('Initialize Work Item Helpers', () => {
  test('constructPawPromptArguments includes execution contract for paw-init worktree sessions', () => {
    const prompt = constructPawPromptArguments({
      targetBranch: '',
      workflowMode: { mode: 'minimal' },
      executionMode: 'worktree',
      reviewStrategy: 'local',
      reviewPolicy: 'final-pr-only',
      sessionPolicy: 'continuous',
      artifactLifecycle: 'commit-and-clean',
      finalReview: {
        enabled: true,
        mode: 'single-model',
        interactive: 'smart',
      },
      issueUrl: 'https://github.com/example/repo/issues/123',
      executionMetadata: {
        workId: 'test-worktree',
        repositoryIdentity: 'github.com/example/repo@abc123',
        executionBinding: 'worktree:test-worktree:feature/test-worktree',
      },
    }, '/tmp/repo');

      assert.ok(prompt.includes('- **target_branch**: auto'));
      assert.ok(prompt.includes('- **execution_mode**: worktree'));
      assert.ok(prompt.includes('- **issue_url**: https://github.com/example/repo/issues/123'));
      assert.ok(prompt.includes('- **work_id**: test-worktree'));
      assert.ok(prompt.includes('- **repository_identity**: github.com/example/repo@abc123'));
      assert.ok(prompt.includes('- **execution_binding**: worktree:test-worktree:feature/test-worktree'));
  });

  test('paw-init skill template persists execution contract fields in WorkflowContext', () => {
    const skillContent = readFileSync(
      resolve(__dirname, '../../../skills/paw-init/SKILL.md'),
      'utf8'
    );

    assert.ok(skillContent.includes('| `work_id` |'));
    assert.ok(skillContent.includes('| `repository_identity` |'));
    assert.ok(skillContent.includes('| `execution_binding` |'));
    assert.ok(skillContent.includes('Work ID: <work_id or generated_work_id>'));
    assert.ok(skillContent.includes('Execution Mode: <execution_mode>'));
    assert.ok(skillContent.includes('Repository Identity: <repository_identity or "none">'));
    assert.ok(skillContent.includes('Execution Binding: <execution_binding or "none">'));
  });

  test('deriveWorkIdFromTargetBranch normalizes branch suffixes', () => {
    assert.strictEqual(
      deriveWorkIdFromTargetBranch('feature/worktree-based-execution'),
      'worktree-based-execution'
    );
    assert.strictEqual(
      deriveWorkIdFromTargetBranch('feature/nested/worktree_execution'),
      'nested-worktree-execution'
    );
  });

  test('recordExecutionRegistryEntry stores entries by repository identity and binding', async () => {
    const context = createMockContext();
    const metadata: ExecutionMetadata = {
      workId: 'test-worktree',
      repositoryIdentity: 'github.com/example/repo@abc123',
      executionBinding: 'worktree:test-worktree:feature/test-worktree',
    };
    const entry = buildExecutionRegistryEntry(
      metadata,
      '/tmp/repo-worktree',
      'feature/test-worktree'
    );

    await recordExecutionRegistryEntry(context, entry);

    const registry = context.globalState.get<Record<string, typeof entry>>('paw.executionRegistry', {});
    assert.deepStrictEqual(
      registry?.[createExecutionRegistryLookupKey(metadata.repositoryIdentity, metadata.executionBinding)],
      entry
    );
  });

  test('shouldResumePendingWorktreeInit matches normalized paths', () => {
    const pending: PendingWorktreeInit = {
      worktreePath: '/tmp/repo-worktree',
      query: '## Initialization Parameters',
      mode: 'PAW',
      createdAt: '2026-03-13T00:00:00.000Z',
      executionMetadata: {
        workId: 'test-worktree',
        repositoryIdentity: 'github.com/example/repo@abc123',
        executionBinding: 'worktree:test-worktree:feature/test-worktree',
      },
    };

    assert.strictEqual(
      shouldResumePendingWorktreeInit('/tmp/repo-worktree', pending),
      true
    );
    assert.strictEqual(
      shouldResumePendingWorktreeInit('/tmp/other-worktree', pending),
      false
    );
  });

  test('shouldResumePendingWorktreeInit matches canonicalized paths', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'paw-init-resume-'));
    const worktreePath = join(tempDir, 'repo-worktree');
    const aliasBase = join(tempDir, 'nested');
    const aliasPath = join(aliasBase, '..', 'repo-worktree');

    try {
      mkdirSync(worktreePath, { recursive: true });
      mkdirSync(aliasBase, { recursive: true });

      const pending: PendingWorktreeInit = {
        worktreePath,
        query: '## Initialization Parameters',
        mode: 'PAW',
        createdAt: '2026-03-13T00:00:00.000Z',
        executionMetadata: {
          workId: 'test-worktree',
          repositoryIdentity: 'github.com/example/repo@abc123',
          executionBinding: 'worktree:test-worktree:feature/test-worktree',
        },
      };

      assert.strictEqual(
        shouldResumePendingWorktreeInit(aliasPath, pending),
        true
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
