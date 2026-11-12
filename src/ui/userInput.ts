import * as vscode from 'vscode';

export const WORKTREE_EXECUTION_FEATURE_FLAG = 'enableWorktreeExecution';

/**
 * Built-in PAW workflow presets (see the paw-workflow skill's configuration reference).
 * - lite: inline research, one implementation unit, single-model reviews
 * - standard: defaults; single-model plan review, multi-model final review
 * - thorough: spec, dedicated research, multi-model planning, society-of-thought reviews, phase review
 */
export type Preset = 'lite' | 'standard' | 'thorough';

/**
 * Execution mode determines whether PAW operates in the current checkout or a separate worktree.
 */
export type ExecutionMode = 'current-checkout' | 'worktree';

/**
 * Worktree strategy determines whether a dedicated worktree is created or reused.
 */
export type WorktreeStrategy = 'create' | 'reuse';

/**
 * Artifact lifecycle mode determines how workflow artifacts are handled in git.
 * - commit-and-clean: Artifacts committed during dev, removed from git at PR time (default)
 * - commit-and-persist: Artifacts permanently committed to the repository
 * - never-commit: Artifacts stay local only, never tracked in git
 */
export type ArtifactLifecycle = 'commit-and-clean' | 'commit-and-persist' | 'never-commit';

export interface WorktreeConfig {
  /** Whether to create a fresh worktree or reuse an existing one */
  strategy: WorktreeStrategy;

  /**
   * Optional worktree path.
   *
   * - create: optional override path, blank means auto-generated
   * - reuse: required absolute or relative path to an existing worktree
   */
  path?: string;
}

/**
 * User inputs collected for work item initialization.
 * 
 * This interface represents the minimal set of parameters required to initialize
 * a PAW work item. Additional parameters (Work ID, work title, etc.) are
 * derived by the agent during initialization.
 */
export interface WorkItemInputs {
  /**
   * Git branch name for the work item (e.g., "feature/my-feature").
   * 
   * When empty string, the agent will auto-derive the branch name from:
   * - The issue title (if issue URL was provided)
   * - A work description prompt (if no issue URL was provided)
   */
  targetBranch: string;
  
  /** Workflow preset */
  preset: Preset;

  /** Whether the workflow pauses for the user to accept the plan before implementation */
  planCheckpoint: boolean;

  /** Where the PAW workflow should execute */
  executionMode: ExecutionMode;

  /** Optional worktree configuration when executionMode is 'worktree' */
  worktree?: WorktreeConfig;

  /**
   * Artifact lifecycle mode for workflow artifacts.
   * 
   * Controls how .paw/work/<slug>/* files are handled in git:
   * - commit-and-clean (default): Committed during dev, removed at PR time
   * - commit-and-persist: Permanently committed to the repository
   * - never-commit: Local only, never tracked in git
   */
  artifactLifecycle: ArtifactLifecycle;
  
  /**
   * Optional issue or work item URL to associate with the work item.
   * 
   * Supports both GitHub Issues and Azure DevOps Work Items. When provided,
   * the agent will attempt to fetch the issue/work item title and use it as
   * the Work Title. If omitted, the Work Title will be derived from the branch name.
   * 
   * Supported formats:
   * - GitHub: `https://github.com/{owner}/{repo}/issues/{number}`
   * - Azure DevOps: `https://dev.azure.com/{org}/{project}/_workitems/edit/{id}`
   */
  issueUrl?: string;
}

export function isWorktreeExecutionEnabled(): boolean {
  return vscode.workspace.getConfiguration('paw').get<boolean>(WORKTREE_EXECUTION_FEATURE_FLAG, false);
}

/**
 * Determine whether the provided branch name uses only valid characters.
 */
export function isValidBranchName(value: string): boolean {
  return /^[a-zA-Z0-9/_-]+$/.test(value);
}

/**
 * Collect execution mode selection from user.
 */
export async function collectExecutionMode(
  outputChannel: vscode.OutputChannel
): Promise<ExecutionMode | undefined> {
  if (!isWorktreeExecutionEnabled()) {
    outputChannel.appendLine('[INFO] Dedicated worktree execution is disabled - defaulting to current checkout');
    return 'current-checkout';
  }

  const selection = await vscode.window.showQuickPick([
    {
      label: 'Current Checkout',
      description: 'Run PAW in the currently open repository checkout (default)',
      detail: 'Preserves today\'s behavior — PAW works directly in this workspace',
      value: 'current-checkout' as ExecutionMode,
    },
    {
      label: 'Dedicated Worktree',
      description: 'Create or reuse a separate worktree and run PAW there',
      detail: 'Keeps this checkout and branch untouched while PAW works elsewhere',
      value: 'worktree' as ExecutionMode,
    },
  ], {
    placeHolder: 'Select execution mode',
    title: 'Execution Mode Selection',
  });

  if (!selection) {
    outputChannel.appendLine('[INFO] Execution mode selection cancelled');
    return undefined;
  }

  return selection.value;
}

/**
 * Collect worktree creation or reuse preferences.
 */
export async function collectWorktreeConfig(
  outputChannel: vscode.OutputChannel,
  targetBranch: string
): Promise<WorktreeConfig | undefined> {
  const strategySelection = await vscode.window.showQuickPick([
    {
      label: 'Create New Worktree',
      description: 'Provision a fresh execution checkout for this workflow',
      detail: 'Recommended for new work — PAW will prepare a dedicated worktree',
      value: 'create' as WorktreeStrategy,
    },
    {
      label: 'Reuse Existing Worktree',
      description: 'Point PAW at a pre-existing worktree',
      detail: 'The worktree must already belong to this repository and pass safety checks',
      value: 'reuse' as WorktreeStrategy,
    },
  ], {
    placeHolder: 'Select worktree strategy',
    title: 'Dedicated Worktree',
  });

  if (!strategySelection) {
    outputChannel.appendLine('[INFO] Worktree strategy selection cancelled');
    return undefined;
  }

  if (strategySelection.value === 'create') {
    const pathInput = await vscode.window.showInputBox({
      prompt: 'Optional worktree path override (press Enter to auto-generate)',
      placeHolder: targetBranch
        ? `../<repo>-paw-worktrees/${targetBranch.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase()}`
        : '../<repo>-paw-worktrees/issue-123',
    });

    if (pathInput === undefined) {
      outputChannel.appendLine('[INFO] Worktree path override cancelled');
      return undefined;
    }

    return {
      strategy: 'create',
      path: pathInput.trim() === '' ? undefined : pathInput.trim(),
    };
  }

  const reusePath = await vscode.window.showInputBox({
    prompt: 'Enter the path to the existing worktree',
    placeHolder: '/absolute/path/to/worktree or ../relative/path/to/worktree',
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'A worktree path is required when reusing an existing worktree';
      }
      return undefined;
    },
  });

  if (reusePath === undefined) {
    outputChannel.appendLine('[INFO] Existing worktree path input cancelled');
    return undefined;
  }

  return {
    strategy: 'reuse',
    path: reusePath.trim(),
  };
}

/**
 * Collect the workflow preset from the user.
 *
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to the preset, or undefined if user cancelled
 */
export async function collectPreset(
  outputChannel: vscode.OutputChannel
): Promise<Preset | undefined> {
  const selection = await vscode.window.showQuickPick([
    {
      label: 'Standard',
      description: 'Plan, implement, single-model plan review, multi-model final review (default)',
      detail: 'Best for most features and fixes',
      value: 'standard' as Preset,
    },
    {
      label: 'Lite',
      description: 'Inline research, one implementation unit, single-model reviews',
      detail: 'Best for small, well-defined changes',
      value: 'lite' as Preset,
    },
    {
      label: 'Thorough',
      description: 'Spec, dedicated research, multi-model planning, society-of-thought reviews, phase review',
      detail: 'Best for large or risky work',
      value: 'thorough' as Preset,
    },
  ], {
    placeHolder: 'Select workflow preset',
    title: 'Workflow Preset',
  });

  if (!selection) {
    outputChannel.appendLine('[INFO] Workflow preset selection cancelled');
    return undefined;
  }

  return selection.value;
}

/**
 * Collect whether the workflow pauses for plan acceptance before implementation.
 *
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to true (pause) or false, or undefined if user cancelled
 */
export async function collectPlanCheckpoint(
  outputChannel: vscode.OutputChannel
): Promise<boolean | undefined> {
  const selection = await vscode.window.showQuickPick([
    {
      label: 'Run to Final PR',
      description: 'No pause; the workflow runs through to the final PR (default)',
      value: false,
    },
    {
      label: 'Pause to Review the Plan',
      description: 'Stop after planning so you can accept or change the plan',
      value: true,
    },
  ], {
    placeHolder: 'Pause for plan review?',
    title: 'Plan Checkpoint',
  });

  if (!selection) {
    outputChannel.appendLine('[INFO] Plan checkpoint selection cancelled');
    return undefined;
  }

  return selection.value;
}

/**
 * Collect artifact lifecycle mode from user.
 * 
 * Presents a Quick Pick menu with three lifecycle options:
 * - Commit & Clean: Artifacts committed during dev, removed at PR time (default)
 * - Commit & Persist: Artifacts permanently committed
 * - Never Commit: Local-only artifacts
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to ArtifactLifecycle, or undefined if cancelled
 */
export async function collectArtifactLifecycle(
  outputChannel: vscode.OutputChannel
): Promise<ArtifactLifecycle | undefined> {
  const lifecycleSelection = await vscode.window.showQuickPick(
    [
      {
        label: "Commit & Clean",
        description: "Artifacts committed during dev, cleaned at PR time (default)",
        detail:
          "Standard PAW behavior—artifacts visible during development, automatically removed from final PR",
        value: 'commit-and-clean' as ArtifactLifecycle,
      },
      {
        label: "Commit & Persist",
        description: "Artifacts permanently committed to the repository",
        detail:
          "Artifacts remain in version history and are visible in PRs",
        value: 'commit-and-persist' as ArtifactLifecycle,
      },
      {
        label: "Never Commit",
        description: "Artifacts stay local only",
        detail:
          "For external contributions or lightweight changes—artifacts never tracked in git",
        value: 'never-commit' as ArtifactLifecycle,
      },
    ],
    {
      placeHolder: "Select artifact lifecycle mode",
      title: "Artifact Lifecycle",
    }
  );

  if (!lifecycleSelection) {
    outputChannel.appendLine("[INFO] Artifact lifecycle selection cancelled");
    return undefined;
  }

  return lifecycleSelection.value;
}

/**
 * Collect user inputs for work item initialization.
 * 
 * Presents sequential input prompts to the user:
 * 1. Issue or work item URL (optional) - validates GitHub issue or Azure DevOps work item formats if provided
 * 2. Target branch name (required) - basic validation ensures valid git branch characters
 * 3. Workflow preset (required) - lite, standard, or thorough
 * 4. Plan checkpoint and artifact lifecycle (required)
 * 
 * The agent will perform additional validation and normalization of these inputs
 * (e.g., converting branch name to Work ID, fetching issue title).
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to collected inputs, or undefined if user cancelled
 */
export async function collectUserInputs(
  outputChannel: vscode.OutputChannel
): Promise<WorkItemInputs | undefined> {
  // Collect issue URL first (optional)
  // This enables future phases to customize branch input prompt based on issue URL presence
  // No validation - agents interpret input contextually (URL, issue number, or identifier)
  const issueUrl = await vscode.window.showInputBox({
    prompt: 'Enter issue or work item URL (optional, press Enter to skip)',
    placeHolder: 'https://github.com/owner/repo/issues/123 or https://dev.azure.com/org/project/_workitems/edit/123'
  });

  if (issueUrl === undefined) {
    outputChannel.appendLine('[INFO] Issue URL input cancelled');
    return undefined;
  }

  const executionMode = await collectExecutionMode(outputChannel);
  if (!executionMode) {
    return undefined;
  }

  // Collect target branch name (optional - empty triggers auto-derivation by agent)
  // Customize prompt text based on whether issue URL was provided
  const branchPrompt = executionMode === 'worktree'
    ? 'Enter explicit branch name for dedicated worktree execution'
    : issueUrl && issueUrl.trim().length > 0
      ? 'Enter branch name (or press Enter to auto-derive from issue)'
      : 'Enter branch name (or press Enter to auto-derive)';

  const targetBranch = await vscode.window.showInputBox({
    prompt: branchPrompt,
    placeHolder: 'feature/my-feature',
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        if (executionMode === 'worktree') {
          return 'Dedicated worktree execution requires an explicit target branch';
        }

        return undefined;
      }

      if (!isValidBranchName(value)) {
        return 'Branch name contains invalid characters';
      }

      return undefined;
    }
  });

  // targetBranch can be undefined (cancelled) or empty string (auto-derive)
  // Only undefined indicates cancellation - empty string is valid (triggers auto-derive)
  if (targetBranch === undefined) {
    outputChannel.appendLine('[INFO] Branch name input cancelled');
    return undefined;
  }

  const worktree = executionMode === 'worktree'
    ? await collectWorktreeConfig(outputChannel, targetBranch.trim())
    : undefined;

  if (executionMode === 'worktree' && !worktree) {
    return undefined;
  }

  const preset = await collectPreset(outputChannel);
  if (!preset) {
    return undefined;
  }

  const planCheckpoint = await collectPlanCheckpoint(outputChannel);
  if (planCheckpoint === undefined) {
    return undefined;
  }

  // Collect artifact lifecycle mode
  const artifactLifecycle = await collectArtifactLifecycle(outputChannel);
  if (artifactLifecycle === undefined) {
    return undefined;
  }

  return {
    targetBranch: targetBranch.trim(),
    preset,
    planCheckpoint,
    executionMode,
    worktree,
    artifactLifecycle,
    issueUrl: issueUrl.trim() === '' ? undefined : issueUrl.trim()
  };
}
