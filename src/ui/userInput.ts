import * as vscode from 'vscode';

/**
 * Workflow type determines the overall workflow pattern.
 * - implementation: Standard single-repository workflow
 * - cross-repository: Multi-repository coordination workflow
 * - review: Code review workflow for existing changes
 */
export type WorkflowType = 'implementation' | 'cross-repository' | 'review';

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
 * Handoff mode determines how stage transitions are handled.
 * - manual: User explicitly commands each stage transition
 * - semi-auto: Automatic at research/review transitions, pause at decision points
 * - auto: Full automation through all stages with only tool approvals
 */
export type HandoffMode = 'manual' | 'semi-auto' | 'auto';

/**
 * Workflow mode selection including optional custom instructions.
 */
export interface WorkflowModeSelection {
  /** The selected workflow mode */
  mode: WorkflowMode;
  
  /** Custom instructions for workflow stages (required when mode is 'custom') */
  customInstructions?: string;
}

/**
 * User inputs collected for work item initialization.
 * 
 * This interface represents the minimal set of parameters required to initialize
 * a PAW work item. Additional parameters (Work ID, work title, etc.) are
 * derived by the agent during initialization.
 */
export interface WorkItemInputs {
  /** Workflow type (implementation, cross-repository, or review) */
  workflowType: WorkflowType;
  
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
  
  /** Handoff mode for stage transition handling */
  handoffMode: HandoffMode;
  
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
 * Determine whether the provided value matches expected issue URL formats.
 * 
 * This validator supports multiple platform-specific URL patterns to enable
 * PAW to work with both GitHub Issues and Azure DevOps Work Items.
 * 
 * Supported formats:
 * - GitHub Issues: `https://github.com/{owner}/{repo}/issues/{number}`
 * - Azure DevOps Work Items: `https://dev.azure.com/{org}/{project}/_workitems/edit/{id}`
 * 
 * @param value - The URL string to validate
 * @returns true if the value matches a supported issue URL format, false otherwise
 * 
 * @example
 * isValidIssueUrl('https://github.com/owner/repo/issues/123') // true
 * isValidIssueUrl('https://dev.azure.com/org/project/_workitems/edit/456') // true
 * isValidIssueUrl('https://example.com') // false
 */
export function isValidIssueUrl(value: string): boolean {
  const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/;
  const azureDevOpsPattern = /^https:\/\/dev\.azure\.com\/[^/]+\/[^/]+\/_workitems\/edit\/\d+$/;
  return githubPattern.test(value) || azureDevOpsPattern.test(value);
}

/**
 * Collect workflow type selection from user.
 * 
 * Presents a Quick Pick menu with workflow type options:
 * - Implementation: Standard single-repository workflow
 * - Cross-Repository: Multi-repository coordination workflow (only available in multi-root workspaces)
 * - Review: Code review workflow for existing changes
 * 
 * The Cross-Repository option only appears when multiple workspace folders are open.
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to workflow type, or undefined if user cancelled
 */
export async function collectWorkflowType(
  outputChannel: vscode.OutputChannel
): Promise<WorkflowType | undefined> {
  // Check if multi-root workspace is available for cross-repository option
  const workspaceFolderCount = vscode.workspace.workspaceFolders?.length || 0;
  const isMultiRootWorkspace = workspaceFolderCount > 1;

  // Build workflow type options - Cross-Repository only shown in multi-root workspaces
  const workflowTypeOptions: { label: string; description: string; detail: string; value: WorkflowType }[] = [
    {
      label: 'Implementation',
      description: 'Standard single-repository workflow',
      detail: 'Work within one git repository',
      value: 'implementation' as WorkflowType
    }
  ];

  if (isMultiRootWorkspace) {
    workflowTypeOptions.push({
      label: 'Cross-Repository',
      description: 'Multi-repository coordination workflow',
      detail: 'Coordinate feature development across multiple repositories',
      value: 'cross-repository' as WorkflowType
    });
  }

  workflowTypeOptions.push({
    label: 'Review (Coming Soon)',
    description: 'Code review workflow',
    detail: 'Structured review of existing code changes',
    value: 'review' as WorkflowType
  });

  // Present Quick Pick menu with workflow type options
  const typeSelection = await vscode.window.showQuickPick(workflowTypeOptions, {
    placeHolder: 'Select workflow type',
    title: 'Workflow Type Selection'
  });

  if (!typeSelection) {
    outputChannel.appendLine('[INFO] Workflow type selection cancelled');
    return undefined;
  }

  // Handle selection of coming soon Review option
  if (typeSelection.value === 'review') {
    outputChannel.appendLine('[INFO] Review workflow selected but not yet available');
    vscode.window.showWarningMessage(
      'Review workflows through the extension are coming soon.'
    );
    return undefined;
  }

  return typeSelection.value;
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
    const customInstructions = await vscode.window.showInputBox({
      prompt: 'Describe your desired workflow stages (e.g., "skip docs, single branch, multi-phase plan")',
      placeHolder: 'skip spec and docs, use local review strategy',
      validateInput: (value: string) => {
        if (!value || value.trim().length < 10) {
          return 'Custom instructions must be at least 10 characters';
        }
        return undefined;
      }
    });

    if (customInstructions === undefined) {
      outputChannel.appendLine('[INFO] Custom instructions input cancelled');
      return undefined;
    }

    return {
      mode: 'custom',
      customInstructions: customInstructions.trim()
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
 * Collect handoff mode selection from user.
 * 
 * Presents a Quick Pick menu with three handoff mode options:
 * - Manual: User commands each stage transition
 * - Semi-Auto: Automatic at research/review, pause at decisions
 * - Auto: Full automation with only tool approvals
 * 
 * If auto mode is selected with prs strategy, shows error and returns undefined.
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @param reviewStrategy - The selected review strategy (affects validation)
 * @returns Promise resolving to handoff mode, or undefined if user cancelled or validation failed
 */
export async function collectHandoffMode(
  outputChannel: vscode.OutputChannel,
  reviewStrategy: ReviewStrategy
): Promise<HandoffMode | undefined> {
  // Build handoff mode options based on review strategy
  // Auto mode is only available with local strategy (PRs require human review)
  const handoffOptions = [
    {
      label: "Manual",
      description: "Full control - you command each stage transition",
      detail:
        "Best for learning PAW or when you want to review and decide at each step",
      value: "manual" as HandoffMode,
    },
    {
      label: "Semi-Auto",
      description:
        "Thoughtful automation - automatic at research/review, pause at decisions",
      detail:
        "Best for experienced users who want speed with control at key decision points",
      value: "semi-auto" as HandoffMode,
    },
  ];

  // Only include Auto option when using local review strategy
  if (reviewStrategy === "local") {
    handoffOptions.push({
      label: "Auto",
      description: "Full automation - agents chain through all stages",
      detail:
        "Best for routine work where you trust the agents to complete the workflow",
      value: "auto" as HandoffMode,
    });
  }

  // Present Quick Pick menu with handoff mode options
  const modeSelection = await vscode.window.showQuickPick(handoffOptions, {
    placeHolder: "Select handoff mode",
    title: "Handoff Mode Selection",
  });

  if (!modeSelection) {
    outputChannel.appendLine("[INFO] Handoff mode selection cancelled");
    return undefined;
  }

  return modeSelection.value;
}

/**
 * Collect user inputs for work item initialization.
 * 
 * Presents sequential input prompts to the user:
 * 1. Workflow type (required) - determines the overall workflow pattern
 * 2. Issue or work item URL (optional) - validates GitHub issue or Azure DevOps work item formats if provided
 * 3. Target branch name (required) - basic validation ensures valid git branch characters
 * 4. Workflow mode (required) - determines which stages are included
 * 5. Review strategy (required) - determines how work is reviewed (auto-selected for minimal mode)
 * 6. Handoff mode (required) - determines stage transition behavior
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
  // Collect workflow type first (required)
  const workflowType = await collectWorkflowType(outputChannel);
  if (!workflowType) {
    return undefined;
  }

  // Collect issue URL (optional)
  // This enables future phases to customize branch input prompt based on issue URL presence
  const issueUrl = await vscode.window.showInputBox({
    prompt: 'Enter issue or work item URL (optional, press Enter to skip)',
    placeHolder: 'https://github.com/owner/repo/issues/123 or https://dev.azure.com/org/project/_workitems/edit/123',
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        return undefined;
      }

      if (!isValidIssueUrl(value)) {
        return 'Invalid issue URL format. Expected GitHub issue or Azure DevOps work item URL.';
      }

      return undefined;
    }
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

  // Collect handoff mode (validates auto mode + prs strategy combination)
  const handoffMode = await collectHandoffMode(outputChannel, reviewStrategy);
  if (!handoffMode) {
    return undefined;
  }

  return {
    workflowType,
    targetBranch: targetBranch.trim(),
    workflowMode,
    reviewStrategy,
    handoffMode,
    issueUrl: issueUrl.trim() === '' ? undefined : issueUrl.trim()
  };
}
