import * as vscode from 'vscode';
import * as assert from 'assert';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import {
  buildExecutionRegistryEntry,
  clearPendingWorktreeInit,
  constructPawPromptArguments,
  createExecutionRegistryLookupKey,
  deriveWorkIdFromTargetBranch,
  initializeWorkItemCommand,
  maybeResumePendingWorktreeInit,
  recordExecutionRegistryEntry,
  recordPendingWorktreeInit,
  removeExecutionRegistryEntry,
  shouldResumePendingWorktreeInit,
  type ExecutionMetadata,
  type PendingWorktreeInit,
} from '../../commands/initializeWorkItem';
import type { WorkItemInputs } from '../../ui/userInput';

type InitializeWorkItemCommandDependencies = NonNullable<
  Parameters<typeof initializeWorkItemCommand>[2]
>;
type ResumePendingWorktreeInitDependencies = NonNullable<
  Parameters<typeof maybeResumePendingWorktreeInit>[2]
>;

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
        if (value === undefined) {
          globalStateStore.delete(key);
          return;
        }
        globalStateStore.set(key, value);
      },
      keys: () => Array.from(globalStateStore.keys()),
      setKeysForSync: () => undefined,
    },
  } as unknown as vscode.ExtensionContext;
}

function createMockOutputChannel(): vscode.OutputChannel {
  return {
    appendLine: () => undefined,
    append: () => undefined,
    clear: () => undefined,
    dispose: () => undefined,
    hide: () => undefined,
    replace: () => undefined,
    show: () => undefined,
    name: 'PAW Workflow Test',
  } as unknown as vscode.OutputChannel;
}

function createWorkspaceFolder(fsPath: string): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(fsPath),
    name: 'test-workspace',
    index: 0,
  };
}

function createCurrentCheckoutInputs(): WorkItemInputs {
  return {
    targetBranch: '',
    workflowMode: { mode: 'minimal' },
    executionMode: 'current-checkout',
    reviewStrategy: 'local',
    reviewPolicy: 'final-pr-only',
    sessionPolicy: 'continuous',
    artifactLifecycle: 'commit-and-clean',
    finalReview: {
      enabled: true,
      mode: 'single-model',
      interactive: 'smart',
    },
  };
}

function createDedicatedWorktreeInputs(path?: string): WorkItemInputs {
  return {
    ...createCurrentCheckoutInputs(),
    targetBranch: 'feature/test-worktree',
    executionMode: 'worktree',
    worktree: {
      strategy: 'create',
      path,
    },
  };
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
    assert.ok(skillContent.includes('<normalized-origin-slug>@<root-commit-sha>'));
    assert.ok(skillContent.includes('worktree:<work_id>:<target_branch>'));
    assert.ok(skillContent.includes('Copilot CLI does not execute the VS Code extension runtime'));
    assert.ok(skillContent.includes('already running in the intended execution checkout'));
    assert.ok(skillContent.includes('exact contract strings in `WorkflowContext.md`'));
    assert.ok(skillContent.includes('treat it as `current-checkout`'));
    assert.ok(skillContent.includes('execution registry is machine-local'));
    assert.ok(skillContent.includes('`git worktree list`'));
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

  test('removeExecutionRegistryEntry clears entries by repository identity and binding', async () => {
    const context = createMockContext();
    const metadata: ExecutionMetadata = {
      workId: 'test-worktree',
      repositoryIdentity: 'github.com/example/repo@abc123',
      executionBinding: 'worktree:test-worktree:feature/test-worktree',
    };

    await recordExecutionRegistryEntry(
      context,
      buildExecutionRegistryEntry(metadata, '/tmp/repo-worktree', 'feature/test-worktree')
    );
    await removeExecutionRegistryEntry(context, metadata);

    const registry = context.globalState.get<Record<string, unknown> | undefined>('paw.executionRegistry');
    assert.strictEqual(registry, undefined);
  });

  test('recordPendingWorktreeInit stores multiple pending worktree launches by binding key', async () => {
    const context = createMockContext();
    const pendingEntries: PendingWorktreeInit[] = [
      {
        worktreePath: '/tmp/repo-worktree-a',
        query: '## Initialization Parameters A',
        mode: 'PAW',
        createdAt: '2026-03-13T00:00:00.000Z',
        executionMetadata: {
          workId: 'test-worktree-a',
          repositoryIdentity: 'github.com/example/repo@abc123',
          executionBinding: 'worktree:test-worktree-a:feature/test-worktree-a',
        },
      },
      {
        worktreePath: '/tmp/repo-worktree-b',
        query: '## Initialization Parameters B',
        mode: 'PAW',
        createdAt: '2026-03-13T00:00:01.000Z',
        executionMetadata: {
          workId: 'test-worktree-b',
          repositoryIdentity: 'github.com/example/repo@abc123',
          executionBinding: 'worktree:test-worktree-b:feature/test-worktree-b',
        },
      },
    ];

    await recordPendingWorktreeInit(context, pendingEntries[0]);
    await recordPendingWorktreeInit(context, pendingEntries[1]);

    const pendingState = context.globalState.get<Record<string, PendingWorktreeInit>>(
      'paw.pendingWorktreeInit',
      {}
    );

    assert.strictEqual(Object.keys(pendingState).length, 2);
    assert.deepStrictEqual(
      Object.values(pendingState).map((pending) => pending.worktreePath).sort(),
      ['/tmp/repo-worktree-a', '/tmp/repo-worktree-b']
    );
  });

  test('clearPendingWorktreeInit removes only the matching pending worktree launch', async () => {
    const context = createMockContext();
    const pendingEntries: PendingWorktreeInit[] = [
      {
        worktreePath: '/tmp/repo-worktree-a',
        query: '## Initialization Parameters A',
        mode: 'PAW',
        createdAt: '2026-03-13T00:00:00.000Z',
        executionMetadata: {
          workId: 'test-worktree-a',
          repositoryIdentity: 'github.com/example/repo@abc123',
          executionBinding: 'worktree:test-worktree-a:feature/test-worktree-a',
        },
      },
      {
        worktreePath: '/tmp/repo-worktree-b',
        query: '## Initialization Parameters B',
        mode: 'PAW',
        createdAt: '2026-03-13T00:00:01.000Z',
        executionMetadata: {
          workId: 'test-worktree-b',
          repositoryIdentity: 'github.com/example/repo@abc123',
          executionBinding: 'worktree:test-worktree-b:feature/test-worktree-b',
        },
      },
    ];

    await recordPendingWorktreeInit(context, pendingEntries[0]);
    await recordPendingWorktreeInit(context, pendingEntries[1]);
    await clearPendingWorktreeInit(context, pendingEntries[0].executionMetadata);

    const pendingState = context.globalState.get<Record<string, PendingWorktreeInit>>(
      'paw.pendingWorktreeInit',
      {}
    );

    assert.strictEqual(Object.keys(pendingState).length, 1);
    assert.deepStrictEqual(Object.values(pendingState)[0], pendingEntries[1]);
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

  test('initializeWorkItemCommand opens PAW chat immediately in current-checkout mode', async () => {
    const context = createMockContext();
    const outputChannel = createMockOutputChannel();
    const prompts: string[] = [];
    const steps: string[] = [];

    const dependencies: InitializeWorkItemCommandDependencies = {
      getWorkspaceFolder: () => createWorkspaceFolder('/tmp/repo'),
      validateGitRepository: async () => true,
      collectUserInputs: async () => createCurrentCheckoutInputs(),
      isWorktreeExecutionEnabled: () => false,
      resolveExecutionMode: () => 'current-checkout',
      buildExecutionMetadata: async () => {
        throw new Error('should not build execution metadata');
      },
      prepareDedicatedWorktree: async () => {
        throw new Error('should not prepare a dedicated worktree');
      },
      openPawChat: async (query) => {
        steps.push('openPawChat');
        prompts.push(query);
      },
      openFolder: async () => {
        throw new Error('should not open a dedicated worktree');
      },
      recordExecutionRegistryEntry: async () => {
        throw new Error('should not write execution registry');
      },
      recordPendingWorktreeInit: async () => {
        throw new Error('should not persist pending worktree init');
      },
      showErrorMessage: async () => undefined,
      showOutput: () => undefined,
    };

    await initializeWorkItemCommand(context, outputChannel, dependencies);

    assert.deepStrictEqual(steps, ['openPawChat']);
    assert.strictEqual(prompts.length, 1);
    assert.ok(prompts[0].includes('- **execution_mode**: current-checkout'));
    assert.strictEqual(
      context.globalState.get<Record<string, unknown> | undefined>('paw.executionRegistry'),
      undefined
    );
    assert.strictEqual(
      context.globalState.get<Record<string, unknown> | undefined>('paw.pendingWorktreeInit'),
      undefined
    );
  });

  test('initializeWorkItemCommand records registry and pending state before opening a dedicated worktree', async () => {
    const context = createMockContext();
    const outputChannel = createMockOutputChannel();
    const executionMetadata: ExecutionMetadata = {
      workId: 'test-worktree',
      repositoryIdentity: 'github.com/example/repo@abc123',
      executionBinding: 'worktree:test-worktree:feature/test-worktree',
    };
    const steps: string[] = [];

    const dependencies: InitializeWorkItemCommandDependencies = {
      getWorkspaceFolder: () => createWorkspaceFolder('/tmp/repo'),
      validateGitRepository: async () => true,
      collectUserInputs: async () => createDedicatedWorktreeInputs(),
      isWorktreeExecutionEnabled: () => true,
      resolveExecutionMode: () => 'worktree',
      buildExecutionMetadata: async () => executionMetadata,
      prepareDedicatedWorktree: async () => '/tmp/repo-worktree',
      openPawChat: async () => {
        throw new Error('should not open chat in the caller checkout');
      },
      openFolder: async () => {
        steps.push('openFolder');
      },
      recordExecutionRegistryEntry: async (mockContext, entry) => {
        steps.push('registry');
        await recordExecutionRegistryEntry(mockContext, entry);
      },
      recordPendingWorktreeInit: async (mockContext, pending) => {
        steps.push('pending');
        await recordPendingWorktreeInit(mockContext, pending);
      },
      showErrorMessage: async () => undefined,
      showOutput: () => undefined,
    };

    await initializeWorkItemCommand(context, outputChannel, dependencies);

    assert.deepStrictEqual(steps, ['registry', 'pending', 'openFolder']);

    const registry = context.globalState.get<Record<string, ReturnType<typeof buildExecutionRegistryEntry>>>(
      'paw.executionRegistry',
      {}
    );
    assert.deepStrictEqual(
      registry[createExecutionRegistryLookupKey(
        executionMetadata.repositoryIdentity,
        executionMetadata.executionBinding
      )],
      buildExecutionRegistryEntry(
        executionMetadata,
        '/tmp/repo-worktree',
        'feature/test-worktree'
      )
    );

    const pendingState = context.globalState.get<Record<string, PendingWorktreeInit>>(
      'paw.pendingWorktreeInit',
      {}
    );
    const pending = pendingState[createExecutionRegistryLookupKey(
      executionMetadata.repositoryIdentity,
      executionMetadata.executionBinding
    )];
    assert.ok(pending);
    assert.strictEqual(pending.worktreePath, '/tmp/repo-worktree');
    assert.ok(pending.query.includes('- **execution_mode**: worktree'));
  });

  test('maybeResumePendingWorktreeInit clears only the matching pending init after chat opens', async () => {
    const context = createMockContext();
    const outputChannel = createMockOutputChannel();
    const matchingPending: PendingWorktreeInit = {
      worktreePath: '/tmp/repo-worktree-a',
      query: '## Initialization Parameters A',
      mode: 'PAW',
      createdAt: '2026-03-13T00:00:00.000Z',
      executionMetadata: {
        workId: 'test-worktree-a',
        repositoryIdentity: 'github.com/example/repo@abc123',
        executionBinding: 'worktree:test-worktree-a:feature/test-worktree-a',
      },
    };
    const otherPending: PendingWorktreeInit = {
      worktreePath: '/tmp/repo-worktree-b',
      query: '## Initialization Parameters B',
      mode: 'PAW',
      createdAt: '2026-03-13T00:00:01.000Z',
      executionMetadata: {
        workId: 'test-worktree-b',
        repositoryIdentity: 'github.com/example/repo@abc123',
        executionBinding: 'worktree:test-worktree-b:feature/test-worktree-b',
      },
    };
    const openedQueries: string[] = [];

    await recordPendingWorktreeInit(context, matchingPending);
    await recordPendingWorktreeInit(context, otherPending);

    const dependencies: ResumePendingWorktreeInitDependencies = {
      getWorkspaceFolder: () => createWorkspaceFolder('/tmp/repo-worktree-a'),
      openPawChat: async (query) => {
        openedQueries.push(query);
      },
      clearPendingWorktreeInit,
      showErrorMessage: async () => undefined,
    };

    await maybeResumePendingWorktreeInit(context, outputChannel, dependencies);

    assert.deepStrictEqual(openedQueries, ['## Initialization Parameters A']);
    const pendingState = context.globalState.get<Record<string, PendingWorktreeInit>>(
      'paw.pendingWorktreeInit',
      {}
    );
    assert.strictEqual(Object.keys(pendingState).length, 1);
    assert.deepStrictEqual(Object.values(pendingState)[0], otherPending);
  });

  test('maybeResumePendingWorktreeInit preserves pending state when chat launch fails', async () => {
    const context = createMockContext();
    const outputChannel = createMockOutputChannel();
    const pending: PendingWorktreeInit = {
      worktreePath: '/tmp/repo-worktree-a',
      query: '## Initialization Parameters A',
      mode: 'PAW',
      createdAt: '2026-03-13T00:00:00.000Z',
      executionMetadata: {
        workId: 'test-worktree-a',
        repositoryIdentity: 'github.com/example/repo@abc123',
        executionBinding: 'worktree:test-worktree-a:feature/test-worktree-a',
      },
    };
    const errors: string[] = [];

    await recordPendingWorktreeInit(context, pending);

    const dependencies: ResumePendingWorktreeInitDependencies = {
      getWorkspaceFolder: () => createWorkspaceFolder('/tmp/repo-worktree-a'),
      openPawChat: async () => {
        throw new Error('chat unavailable');
      },
      clearPendingWorktreeInit,
      showErrorMessage: async (message) => {
        errors.push(message);
        return undefined;
      },
    };

    await maybeResumePendingWorktreeInit(context, outputChannel, dependencies);

    const pendingState = context.globalState.get<Record<string, PendingWorktreeInit>>(
      'paw.pendingWorktreeInit',
      {}
    );
    assert.strictEqual(Object.keys(pendingState).length, 1);
    assert.deepStrictEqual(Object.values(pendingState)[0], pending);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes('chat unavailable'));
  });
});
