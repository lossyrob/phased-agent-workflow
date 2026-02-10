import * as vscode from 'vscode';
import type { ReviewPolicy, SessionPolicy } from '../types/workflow';

// Re-export types for consumers that import from userInput.ts
export type { ReviewPolicy, SessionPolicy } from '../types/workflow';

/**
 * Workflow mode determines which stages are included in the workflow.
 * - full: All stages (spec, code research, planning, implementation, docs, PR, status)
 * - minimal: Core stages only (code research, planning, implementation, PR, status)
 * - custom: User-defined stages via custom instructions
 */
export type WorkflowMode = 'full' | 'minimal' | 'custom';

/**
 * Review strategy determines how work is reviewed and merged.
 * - prs: Create intermediate PRs (planning, phase, docs branches)
 * - local: Single branch workflow with only final PR
 */
export type ReviewStrategy = 'prs' | 'local';

/**
 * Workflow mode selection including optional custom instructions.
 */
export interface WorkflowModeSelection {
  /** The selected workflow mode */
  mode: WorkflowMode;
  
  /** Custom workflow stage instructions (required when mode is 'custom') */
  workflowCustomization?: string;
}

/**
 * Final Agent Review configuration for pre-PR review step.
 */
export interface FinalReviewConfig {
  /** Whether Final Agent Review is enabled */
  enabled: boolean;
  
  /** Review mode: single-model or multi-model (only applies if enabled) */
  mode: 'single-model' | 'multi-model';
  
  /** Whether review is interactive (apply/skip/discuss), auto-apply, or smart (auto-apply consensus, interactive for ambiguous) */
  interactive: boolean | 'smart';
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
  
  /** Workflow mode selection including optional custom instructions */
  workflowMode: WorkflowModeSelection;
  
  /** Review strategy for how work is reviewed and merged */
  reviewStrategy: ReviewStrategy;
  
  /** Review policy for artifact-level pause decisions */
  reviewPolicy: ReviewPolicy;
  
  /** Session policy for context management */
  sessionPolicy: SessionPolicy;

  /**
   * Whether to track workflow artifacts in git.
   * 
   * When true (default), workflow artifacts (.paw/work/<slug>/*) are committed to git.
   * When false, a .gitignore is created to exclude artifacts from version control.
   */
  trackArtifacts: boolean;
  
  /** Final Agent Review configuration for pre-PR review step */
  finalReview: FinalReviewConfig;
  
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

/**
 * Determine whether the provided branch name uses only valid characters.
 */
export function isValidBranchName(value: string): boolean {
  return /^[a-zA-Z0-9/_-]+$/.test(value);
}

/**
 * Collect workflow mode selection from user.
 * 
 * Presents a Quick Pick menu with three workflow mode options:
 * - Full: Complete workflow with all stages
 * - Minimal: Core stages only (skips spec and docs)
 * - Custom: User-defined stages via custom instructions
 * 
 * If custom mode is selected, prompts for custom instructions with validation.
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to workflow mode selection, or undefined if user cancelled
 */
export async function collectWorkflowMode(
  outputChannel: vscode.OutputChannel
): Promise<WorkflowModeSelection | undefined> {
  // Present Quick Pick menu with workflow mode options
  // Each option includes a label, description, detail (help text), and value
  const modeSelection = await vscode.window.showQuickPick([
    {
      label: 'Full',
      description: 'All stages: spec, research, planning, implementation, docs, PR',
      detail: 'Best for large features or when comprehensive documentation is needed',
      value: 'full' as WorkflowMode
    },
    {
      label: 'Minimal',
      description: 'Core stages only: research, planning, implementation, PR',
      detail: 'Best for bug fixes or small features. Skips spec and docs stages.',
      value: 'minimal' as WorkflowMode
    },
    {
      label: 'Custom',
      description: 'Define your own workflow stages',
      detail: 'Provide instructions describing which stages to include',
      value: 'custom' as WorkflowMode
    }
  ], {
    placeHolder: 'Select workflow mode',
    title: 'Workflow Mode Selection'
  });

  if (!modeSelection) {
    outputChannel.appendLine('[INFO] Workflow mode selection cancelled');
    return undefined;
  }

  // If custom mode selected, prompt for custom workflow instructions
  // These instructions help agents determine which stages to include
  if (modeSelection.value === 'custom') {
    const workflowCustomization = await vscode.window.showInputBox({
      prompt: 'Describe your desired workflow stages (e.g., "skip docs, single branch, multi-phase plan")',
      placeHolder: 'skip spec and docs, use local review strategy',
      validateInput: (value: string) => {
        if (!value || value.trim().length < 10) {
          return 'Custom instructions must be at least 10 characters';
        }
        return undefined;
      }
    });

    if (workflowCustomization === undefined) {
      outputChannel.appendLine('[INFO] Custom workflow input cancelled');
      return undefined;
    }

    return {
      mode: 'custom',
      workflowCustomization: workflowCustomization.trim()
    };
  }

  return {
    mode: modeSelection.value
  };
}

/**
 * Collect review strategy selection from user.
 * 
 * Presents a Quick Pick menu with two review strategy options:
 * - PRs: Create intermediate PRs (planning, phase, docs branches)
 * - Local: Single branch workflow with only final PR
 * 
 * If minimal mode is selected, automatically returns 'local' strategy without prompting.
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @param workflowMode - The selected workflow mode (affects available strategies)
 * @returns Promise resolving to review strategy, or undefined if user cancelled
 */
export async function collectReviewStrategy(
  outputChannel: vscode.OutputChannel,
  workflowMode: WorkflowMode
): Promise<ReviewStrategy | undefined> {
  // Minimal mode enforces local strategy to avoid complexity of intermediate PRs
  // This constraint simplifies the workflow for bug fixes and small features
  if (workflowMode === 'minimal') {
    outputChannel.appendLine('[INFO] Minimal mode requires local review strategy - auto-selected');
    return 'local';
  }

  // Present Quick Pick menu with review strategy options
  const strategySelection = await vscode.window.showQuickPick([
    {
      label: 'PRs',
      description: 'Create intermediate PRs for planning, phases, and docs',
      detail: 'Best for complex work requiring review at multiple stages',
      value: 'prs' as ReviewStrategy
    },
    {
      label: 'Local',
      description: 'Single branch workflow with only final PR',
      detail: 'Best for simpler work or when you prefer to review everything at once',
      value: 'local' as ReviewStrategy
    }
  ], {
    placeHolder: 'Select review strategy',
    title: 'Review Strategy Selection'
  });

  if (!strategySelection) {
    outputChannel.appendLine('[INFO] Review strategy selection cancelled');
    return undefined;
  }

  return strategySelection.value;
}

/**
 * Collect review policy selection from user.
 * 
 * Presents a Quick Pick menu with review policy options:
 * - Every Stage: Pause for user review after every stage
 * - Milestones: Pause at key decision points (planning, final PR)
 * - Final PR Only: Only pause at final PR (local strategy only)
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @param reviewStrategy - The selected review strategy (affects available options)
 * @returns Promise resolving to review policy, or undefined if user cancelled
 */
export async function collectReviewPolicy(
  outputChannel: vscode.OutputChannel,
  reviewStrategy: ReviewStrategy
): Promise<ReviewPolicy | undefined> {
  // Build review policy options based on review strategy
  // 'Final PR Only' option is only available with local strategy (PRs require human review)
  const policyOptions = [
    {
      label: "Every Stage",
      description: "Pause for user review after every stage",
      detail:
        "Best for learning PAW or when you want to review and decide at each step",
      value: "every-stage" as ReviewPolicy,
    },
    {
      label: "Milestones",
      description: "Pause at key decision points (planning, final PR)",
      detail:
        "Best for experienced users who want speed with control at key milestones",
      value: "milestones" as ReviewPolicy,
    },
  ];

  // Only include 'Final PR Only' option when using local review strategy
  if (reviewStrategy === "local") {
    policyOptions.push({
      label: "Final PR Only",
      description: "Full automation - only pause at final PR",
      detail:
        "Best for routine work where you trust the agents to complete the workflow",
      value: "final-pr-only" as ReviewPolicy,
    });
  }

  // Present Quick Pick menu with review policy options
  const policySelection = await vscode.window.showQuickPick(policyOptions, {
    placeHolder: "Select review policy",
    title: "Review Policy Selection",
  });

  if (!policySelection) {
    outputChannel.appendLine("[INFO] Review policy selection cancelled");
    return undefined;
  }

  return policySelection.value;
}

/**
 * Collect session policy selection from user.
 * 
 * Presents a Quick Pick menu with two session policy options:
 * - Per-Stage: Each stage runs in a new chat session
 * - Continuous: Single continuous chat session across stages
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to session policy, or undefined if user cancelled
 */
export async function collectSessionPolicy(
  outputChannel: vscode.OutputChannel
): Promise<SessionPolicy | undefined> {
  const policyOptions = [
    {
      label: "Per-Stage",
      description: "Each stage runs in a new chat session",
      detail:
        "Recommended - keeps context focused and reduces token usage",
      value: "per-stage" as SessionPolicy,
    },
    {
      label: "Continuous",
      description: "Single continuous chat session across stages",
      detail:
        "Preserves full conversation history but uses more tokens",
      value: "continuous" as SessionPolicy,
    },
  ];

  // Present Quick Pick menu with session policy options
  const policySelection = await vscode.window.showQuickPick(policyOptions, {
    placeHolder: "Select session policy",
    title: "Session Policy Selection",
  });

  if (!policySelection) {
    outputChannel.appendLine("[INFO] Session policy selection cancelled");
    return undefined;
  }

  return policySelection.value;
}

/**
 * Collect artifact tracking preference from user.
 * 
 * Presents a Quick Pick menu with two options:
 * - Track: Workflow artifacts committed to git (default)
 * - Don't Track: Exclude workflow artifacts from git
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to boolean (true = track, false = don't track), or undefined if cancelled
 */
export async function collectArtifactTracking(
  outputChannel: vscode.OutputChannel
): Promise<boolean | undefined> {
  const trackingSelection = await vscode.window.showQuickPick(
    [
      {
        label: "Track",
        description: "Workflow artifacts committed to git (default)",
        detail:
          "Standard PAW behavior—artifacts visible in PRs and version history",
        value: true,
      },
      {
        label: "Don't Track",
        description: "Exclude workflow artifacts from git",
        detail:
          "For external contributions or lightweight changes—artifacts stay local only",
        value: false,
      },
    ],
    {
      placeHolder: "Select artifact tracking behavior",
      title: "Artifact Tracking",
    }
  );

  if (!trackingSelection) {
    outputChannel.appendLine("[INFO] Artifact tracking selection cancelled");
    return undefined;
  }

  return trackingSelection.value;
}

/**
 * Collect Final Agent Review configuration from user.
 * 
 * Presents Quick Pick menus for:
 * 1. Enable/disable Final Agent Review
 * 2. If enabled: Review mode (single-model or multi-model)
 * 3. If enabled: Interactive mode (apply/skip/discuss vs auto-apply)
 * 
 * Note: VS Code can only execute single-model mode. Multi-model is CLI-only
 * and will fall back to single-model in VS Code.
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to FinalReviewConfig, or undefined if user cancelled
 */
export async function collectFinalReviewConfig(
  outputChannel: vscode.OutputChannel
): Promise<FinalReviewConfig | undefined> {
  // Step 1: Enable/disable Final Agent Review
  const enabledSelection = await vscode.window.showQuickPick(
    [
      {
        label: "Enabled",
        description: "Run automated review before Final PR (default)",
        detail: "Catches issues before external PR review",
        value: true,
      },
      {
        label: "Disabled",
        description: "Skip pre-PR review step",
        detail: "Go directly from implementation to Final PR",
        value: false,
      },
    ],
    {
      placeHolder: "Enable Final Agent Review?",
      title: "Final Agent Review",
    }
  );

  if (!enabledSelection) {
    outputChannel.appendLine("[INFO] Final Agent Review selection cancelled");
    return undefined;
  }

  // If disabled, return config with defaults for mode/interactive
  if (!enabledSelection.value) {
    return {
      enabled: false,
      mode: 'single-model',
      interactive: true,
    };
  }

  // VS Code only supports single-model (multi-model requires parallel subagents)
  // Skip mode selection - always use single-model

  // Step 2: Interactive mode (only if enabled)
  const interactiveSelection = await vscode.window.showQuickPick(
    [
      {
        label: "Smart",
        description: "Auto-apply consensus fixes, interactive for ambiguous (default)",
        detail: "In multi-model (CLI): obvious fixes applied automatically. In single-model: interactive",
        value: 'smart' as boolean | 'smart',
      },
      {
        label: "Interactive",
        description: "Review each finding: apply, skip, or discuss",
        detail: "You control what gets changed",
        value: true as boolean | 'smart',
      },
      {
        label: "Auto-Apply",
        description: "Automatically apply recommended fixes",
        detail: "Faster but less control over changes",
        value: false as boolean | 'smart',
      },
    ],
    {
      placeHolder: "Select interaction mode",
      title: "Final Review Interaction",
    }
  );

  if (!interactiveSelection) {
    outputChannel.appendLine("[INFO] Final review interaction selection cancelled");
    return undefined;
  }

  return {
    enabled: true,
    mode: 'single-model',
    interactive: interactiveSelection.value,
  };
}

/**
 * Collect user inputs for work item initialization.
 * 
 * Presents sequential input prompts to the user:
 * 1. Issue or work item URL (optional) - validates GitHub issue or Azure DevOps work item formats if provided
 * 2. Target branch name (required) - basic validation ensures valid git branch characters
 * 3. Workflow mode (required) - determines which stages are included
 * 4. Review strategy (required) - determines how work is reviewed (auto-selected for minimal mode)
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

  // Collect target branch name (optional - empty triggers auto-derivation by agent)
  // Customize prompt text based on whether issue URL was provided
  const branchPrompt = issueUrl && issueUrl.trim().length > 0
    ? 'Enter branch name (or press Enter to auto-derive from issue)'
    : 'Enter branch name (or press Enter to auto-derive)';

  const targetBranch = await vscode.window.showInputBox({
    prompt: branchPrompt,
    placeHolder: 'feature/my-feature',
    validateInput: (value: string) => {
      // Empty is valid - triggers auto-derivation by agent
      if (!value || value.trim().length === 0) {
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

  // Collect workflow mode
  const workflowMode = await collectWorkflowMode(outputChannel);
  if (!workflowMode) {
    return undefined;
  }

  // Collect review strategy (auto-selected for minimal mode)
  const reviewStrategy = await collectReviewStrategy(outputChannel, workflowMode.mode);
  if (!reviewStrategy) {
    return undefined;
  }

  // Collect review policy (validates 'final-pr-only' + prs strategy combination)
  const reviewPolicy = await collectReviewPolicy(outputChannel, reviewStrategy);
  if (!reviewPolicy) {
    return undefined;
  }

  // Collect session policy
  const sessionPolicy = await collectSessionPolicy(outputChannel);
  if (!sessionPolicy) {
    return undefined;
  }

  // Collect artifact tracking preference
  const trackArtifacts = await collectArtifactTracking(outputChannel);
  if (trackArtifacts === undefined) {
    return undefined;
  }

  // Collect Final Agent Review configuration
  const finalReview = await collectFinalReviewConfig(outputChannel);
  if (finalReview === undefined) {
    return undefined;
  }

  return {
    targetBranch: targetBranch.trim(),
    workflowMode,
    reviewStrategy,
    reviewPolicy,
    sessionPolicy,
    trackArtifacts,
    finalReview,
    issueUrl: issueUrl.trim() === '' ? undefined : issueUrl.trim()
  };
}
