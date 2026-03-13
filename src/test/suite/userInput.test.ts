import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
  collectUserInputs,
  isValidBranchName, 
  WorkflowMode,
  ExecutionMode,
  WorktreeStrategy,
  WorktreeConfig,
  ReviewStrategy,
  ArtifactLifecycle,
  WorkflowModeSelection,
  FinalReviewConfig,
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
 * - Workflow mode type validation
 * - Review strategy type validation
 * - WorkflowModeSelection interface usage
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
 * Workflow mode type tests.
 * 
 * Verify that WorkflowMode type accepts valid values and the WorkflowModeSelection
 * interface works correctly with and without custom instructions.
 */
suite('Workflow Mode Types', () => {
  test('WorkflowMode accepts valid values', () => {
    const fullMode: WorkflowMode = 'full';
    const minimalMode: WorkflowMode = 'minimal';
    const customMode: WorkflowMode = 'custom';
    
    assert.strictEqual(fullMode, 'full');
    assert.strictEqual(minimalMode, 'minimal');
    assert.strictEqual(customMode, 'custom');
  });

  test('WorkflowModeSelection works without custom instructions', () => {
    const selection: WorkflowModeSelection = {
      mode: 'full'
    };
    
    assert.strictEqual(selection.mode, 'full');
    assert.strictEqual(selection.workflowCustomization, undefined);
  });

  test('WorkflowModeSelection works with workflow customization', () => {
    const selection: WorkflowModeSelection = {
      mode: 'custom',
      workflowCustomization: 'skip docs, single branch'
    };
    
    assert.strictEqual(selection.mode, 'custom');
    assert.strictEqual(selection.workflowCustomization, 'skip docs, single branch');
  });
});

/**
 * Review strategy type tests.
 * 
 * Verify that ReviewStrategy type accepts valid values (prs, local).
 */
suite('Review Strategy Types', () => {
  test('ReviewStrategy accepts valid values', () => {
    const prsStrategy: ReviewStrategy = 'prs';
    const localStrategy: ReviewStrategy = 'local';
    
    assert.strictEqual(prsStrategy, 'prs');
    assert.strictEqual(localStrategy, 'local');
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
          case 'Workflow Mode Selection':
            return findQuickPickValue(quickPickItems, 'minimal');
          case 'Review Policy Selection':
            return findQuickPickValue(quickPickItems, 'final-pr-only');
          case 'Session Policy Selection':
            return findQuickPickValue(quickPickItems, 'continuous');
          case 'Artifact Lifecycle':
            return findQuickPickValue(quickPickItems, 'commit-and-clean');
          case 'Final Agent Review':
            return findQuickPickValue(quickPickItems, false);
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
      assert.ok(
        !promptOrder.includes('pick:Review Strategy Selection'),
        'Minimal mode should auto-select the local review strategy'
      );
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
          case 'Workflow Mode Selection':
            return findQuickPickValue(items, 'minimal');
          case 'Review Policy Selection':
            return findQuickPickValue(items, 'final-pr-only');
          case 'Session Policy Selection':
            return findQuickPickValue(items, 'continuous');
          case 'Artifact Lifecycle':
            return findQuickPickValue(items, 'commit-and-clean');
          case 'Final Agent Review':
            return findQuickPickValue(items, false);
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
 * Final Review configuration type tests.
 * 
 * Verify that FinalReviewConfig interface accepts valid configurations.
 */
suite('Final Review Config Types', () => {
  test('FinalReviewConfig works when disabled', () => {
    const config: FinalReviewConfig = {
      enabled: false,
      mode: 'single-model',
      interactive: true
    };
    
    assert.strictEqual(config.enabled, false);
    assert.strictEqual(config.mode, 'single-model');
    assert.strictEqual(config.interactive, true);
  });

  test('FinalReviewConfig works with single-model mode', () => {
    const config: FinalReviewConfig = {
      enabled: true,
      mode: 'single-model',
      interactive: true
    };
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.mode, 'single-model');
  });

  test('FinalReviewConfig works with multi-model mode', () => {
    const config: FinalReviewConfig = {
      enabled: true,
      mode: 'multi-model',
      interactive: false
    };
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.mode, 'multi-model');
    assert.strictEqual(config.interactive, false);
  });

  test('FinalReviewConfig works with smart interactive mode', () => {
    const config: FinalReviewConfig = {
      enabled: true,
      mode: 'multi-model',
      interactive: 'smart'
    };
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.mode, 'multi-model');
    assert.strictEqual(config.interactive, 'smart');
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
