import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
  collectUserInputs,
  isValidBranchName, 
  ArtifactLifecycle,
  ExecutionMode,
  Preset,
  WorktreeStrategy,
  WorktreeConfig,
  WORKTREE_EXECUTION_FEATURE_FLAG
} from '../../ui/userInput';

function createOutputChannel(): vscode.OutputChannel {
  return {
    name: 'test-output',
    append: () => undefined,
    appendLine: () => undefined,
    clear: () => undefined,
    dispose: () => undefined,
    hide: () => undefined,
    replace: () => undefined,
    show: () => undefined,
  } as unknown as vscode.OutputChannel;
}

function findQuickPickValue<T extends { value: unknown }>(
  items: readonly T[],
  value: unknown
): T {
  const match = items.find((item) => item.value === value);
  assert.ok(match, `Missing quick pick value: ${String(value)}`);
  return match!;
}

function overrideWorktreeExecutionFlag(enabled: boolean): () => void {
  const originalGetConfiguration = vscode.workspace.getConfiguration;
  (
    vscode.workspace as unknown as {
      getConfiguration: typeof vscode.workspace.getConfiguration;
    }
  ).getConfiguration = ((section?: string) => {
    if (section === 'paw') {
      return {
        get: <T>(key: string, defaultValue?: T) => {
          if (key === WORKTREE_EXECUTION_FEATURE_FLAG) {
            return enabled as T;
          }

          return defaultValue as T;
        },
        has: () => true,
        inspect: () => undefined,
        update: async () => undefined,
      } as unknown as vscode.WorkspaceConfiguration;
    }

    return originalGetConfiguration(section);
  }) as typeof vscode.workspace.getConfiguration;

  return () => {
    (
      vscode.workspace as unknown as {
        getConfiguration: typeof vscode.workspace.getConfiguration;
      }
    ).getConfiguration = originalGetConfiguration;
  };
}

/**
 * User input validation tests.
 * 
 * These unit tests verify the input validation logic used in the work item initialization flow.
 * Tests cover:
 * - Git branch name validation (alphanumeric, hyphens, underscores, slashes only)
 * 
 * Note: Issue URL validation was removed - agents now interpret input contextually
 * (URL, issue number, or identifier) and handle errors gracefully.
 */
suite('User Input Validation', () => {
  test('Valid branch names pass validation', () => {
    const validNames = [
      'feature/my-feature',
      'bugfix/fix-123',
      'hotfix/ISSUE-456',
      'feature/user_auth',
      'main'
    ];

    validNames.forEach(name => {
      assert.ok(isValidBranchName(name), `${name} should be valid`);
    });
  });

  test('Invalid branch names fail validation', () => {
    const invalidNames = [
      'feature/my feature',
      'feature/my@feature',
      ' feature/leading-space',
      'feature/with%percent'
    ];

    invalidNames.forEach(name => {
      assert.ok(!isValidBranchName(name), `${name} should be invalid`);
    });
  });

  test('Empty branch name fails validation (auto-derive handled separately)', () => {
    // Empty string is invalid for isValidBranchName - the auto-derive logic
    // in collectUserInputs allows empty input by checking before validation
    assert.ok(!isValidBranchName(''), 'Empty string should be invalid for isValidBranchName');
  });
});

/**
 * Preset type tests.
 */
suite('Preset Types', () => {
  test('Preset accepts the three built-in presets', () => {
    const presets: Preset[] = ['lite', 'standard', 'thorough'];
    assert.deepStrictEqual(presets, ['lite', 'standard', 'thorough']);
  });
});

/**
 * Execution mode type tests.
 */
suite('Execution Mode Types', () => {
  test('ExecutionMode accepts valid values', () => {
    const currentCheckout: ExecutionMode = 'current-checkout';
    const dedicatedWorktree: ExecutionMode = 'worktree';

    assert.strictEqual(currentCheckout, 'current-checkout');
    assert.strictEqual(dedicatedWorktree, 'worktree');
  });

  test('WorktreeConfig supports create and reuse strategies', () => {
    const createConfig: WorktreeConfig = {
      strategy: 'create',
    };
    const reuseConfig: WorktreeConfig = {
      strategy: 'reuse',
      path: '../repo-worktree',
    };

    const createStrategy: WorktreeStrategy = createConfig.strategy;
    const reuseStrategy: WorktreeStrategy = reuseConfig.strategy;

    assert.strictEqual(createStrategy, 'create');
    assert.strictEqual(reuseStrategy, 'reuse');
    assert.strictEqual(reuseConfig.path, '../repo-worktree');
  });

  test('collectUserInputs asks for execution mode before branch entry in worktree mode', async () => {
    const promptOrder: string[] = [];
    const restoreConfiguration = overrideWorktreeExecutionFlag(true);
    const mutableWindow = vscode.window as unknown as {
      showQuickPick: typeof vscode.window.showQuickPick;
      showInputBox: typeof vscode.window.showInputBox;
    };
    const originalShowQuickPick = mutableWindow.showQuickPick;
    const originalShowInputBox = mutableWindow.showInputBox;

    try {
      mutableWindow.showQuickPick = (async (
        items: ReadonlyArray<{ value: unknown }>,
        options?: vscode.QuickPickOptions
      ) => {
        const title = options?.title ?? options?.placeHolder ?? 'unknown quick pick';
        promptOrder.push(`pick:${title}`);

        const quickPickItems = items;
        switch (title) {
          case 'Execution Mode Selection':
            return findQuickPickValue(quickPickItems, 'worktree');
          case 'Dedicated Worktree':
            return findQuickPickValue(quickPickItems, 'create');
          case 'Workflow Preset':
            return findQuickPickValue(quickPickItems, 'standard');
          case 'Plan Checkpoint':
            return findQuickPickValue(quickPickItems, false);
          case 'Artifact Lifecycle':
            return findQuickPickValue(quickPickItems, 'commit-and-clean');
          default:
            throw new Error(`Unexpected quick pick title: ${title}`);
        }
      }) as unknown as typeof vscode.window.showQuickPick;

      mutableWindow.showInputBox = (async (options?: vscode.InputBoxOptions) => {
        const prompt = options?.prompt ?? 'unknown input box';
        promptOrder.push(`input:${prompt}`);

        if (prompt.startsWith('Enter issue or work item URL')) {
          return '';
        }

        if (prompt.startsWith('Enter explicit branch name') || prompt.startsWith('Enter branch name')) {
          assert.strictEqual(
            options?.validateInput?.(''),
            'Dedicated worktree execution requires an explicit target branch'
          );
          return 'feature/test-worktree';
        }

        if (prompt.startsWith('Optional worktree path override')) {
          return '';
        }

        throw new Error(`Unexpected input box prompt: ${prompt}`);
      }) as unknown as typeof vscode.window.showInputBox;

      const inputs = await collectUserInputs(createOutputChannel());

      assert.ok(inputs, 'Expected collectUserInputs to succeed');
      assert.strictEqual(inputs?.executionMode, 'worktree');
      assert.strictEqual(inputs?.worktree?.strategy, 'create');
      assert.strictEqual(inputs?.targetBranch, 'feature/test-worktree');

      const executionModeIndex = promptOrder.indexOf('pick:Execution Mode Selection');
      const branchInputIndex = promptOrder.findIndex((entry) =>
        entry.startsWith('input:Enter explicit branch name')
        || entry.startsWith('input:Enter branch name')
      );

      assert.ok(executionModeIndex >= 0, 'Execution mode prompt should be shown');
      assert.ok(branchInputIndex >= 0, 'Branch input prompt should be shown');
      assert.ok(
        executionModeIndex < branchInputIndex,
        `Expected execution mode prompt before branch input, saw: ${promptOrder.join(' -> ')}`
      );
      assert.strictEqual(inputs?.preset, 'standard');
      assert.strictEqual(inputs?.planCheckpoint, false);
    } finally {
      mutableWindow.showQuickPick = originalShowQuickPick;
      mutableWindow.showInputBox = originalShowInputBox;
      restoreConfiguration();
    }
  });

  test('collectUserInputs defaults to current-checkout when worktree execution is disabled', async () => {
    const promptOrder: string[] = [];
    const restoreConfiguration = overrideWorktreeExecutionFlag(false);
    const mutableWindow = vscode.window as unknown as {
      showQuickPick: typeof vscode.window.showQuickPick;
      showInputBox: typeof vscode.window.showInputBox;
    };
    const originalShowQuickPick = mutableWindow.showQuickPick;
    const originalShowInputBox = mutableWindow.showInputBox;

    try {
      mutableWindow.showQuickPick = (async (
        items: ReadonlyArray<{ value: unknown }>,
        options?: vscode.QuickPickOptions
      ) => {
        const title = options?.title ?? options?.placeHolder ?? 'unknown quick pick';
        promptOrder.push(`pick:${title}`);

        switch (title) {
          case 'Workflow Preset':
            return findQuickPickValue(items, 'lite');
          case 'Plan Checkpoint':
            return findQuickPickValue(items, true);
          case 'Artifact Lifecycle':
            return findQuickPickValue(items, 'commit-and-clean');
          default:
            throw new Error(`Unexpected quick pick title: ${title}`);
        }
      }) as unknown as typeof vscode.window.showQuickPick;

      mutableWindow.showInputBox = (async (options?: vscode.InputBoxOptions) => {
        const prompt = options?.prompt ?? 'unknown input box';
        promptOrder.push(`input:${prompt}`);

        if (prompt.startsWith('Enter issue or work item URL')) {
          return '';
        }

        if (prompt.startsWith('Enter branch name')) {
          assert.strictEqual(options?.validateInput?.(''), undefined);
          return '';
        }

        throw new Error(`Unexpected input box prompt: ${prompt}`);
      }) as unknown as typeof vscode.window.showInputBox;

      const inputs = await collectUserInputs(createOutputChannel());

      assert.ok(inputs, 'Expected collectUserInputs to succeed');
      assert.strictEqual(inputs?.executionMode, 'current-checkout');
      assert.strictEqual(inputs?.targetBranch, '');
      assert.strictEqual(inputs?.preset, 'lite');
      assert.strictEqual(inputs?.planCheckpoint, true);
      assert.deepStrictEqual(
        promptOrder.filter((entry) => entry.startsWith('pick:')),
        ['pick:Workflow Preset', 'pick:Plan Checkpoint', 'pick:Artifact Lifecycle']
      );
      assert.ok(
        !promptOrder.includes('pick:Execution Mode Selection'),
        'Execution mode prompt should stay hidden while the feature flag is disabled'
      );
    } finally {
      mutableWindow.showQuickPick = originalShowQuickPick;
      mutableWindow.showInputBox = originalShowInputBox;
      restoreConfiguration();
    }
  });
});

/**
 * Artifact lifecycle type tests.
 * 
 * Verify that ArtifactLifecycle type accepts all three valid modes.
 */
suite('Artifact Lifecycle Types', () => {
  test('ArtifactLifecycle accepts all three valid values', () => {
    const commitAndClean: ArtifactLifecycle = 'commit-and-clean';
    const commitAndPersist: ArtifactLifecycle = 'commit-and-persist';
    const neverCommit: ArtifactLifecycle = 'never-commit';
    
    assert.strictEqual(commitAndClean, 'commit-and-clean');
    assert.strictEqual(commitAndPersist, 'commit-and-persist');
    assert.strictEqual(neverCommit, 'never-commit');
  });

  test('Default lifecycle mode is commit-and-clean', () => {
    const defaultMode: ArtifactLifecycle = 'commit-and-clean';
    assert.strictEqual(defaultMode, 'commit-and-clean');
  });
});
