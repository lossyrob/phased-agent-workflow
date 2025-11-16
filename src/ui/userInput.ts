import * as vscode from 'vscode';

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
  
  /** Custom instructions for workflow stages (required when mode is 'custom') */
  customInstructions?: string;
}

/**
 * User inputs collected for work item initialization.
 * 
 * This interface represents the minimal set of parameters required to initialize
 * a PAW work item. Additional parameters (feature slug, work title, etc.) are
 * derived by the agent during initialization.
 */
export interface WorkItemInputs {
  /** Git branch name for the work item (e.g., "feature/my-feature") */
  targetBranch: string;
  
  /** Workflow mode selection including optional custom instructions */
  workflowMode: WorkflowModeSelection;
  
  /** Review strategy for how work is reviewed and merged */
  reviewStrategy: ReviewStrategy;
  
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
 * Collect user inputs for work item initialization.
 * 
 * Presents sequential input prompts to the user:
 * 1. Target branch name (required) - basic validation ensures valid git branch characters
 * 2. Workflow mode (required) - determines which stages are included
 * 3. Review strategy (required) - determines how work is reviewed (auto-selected for minimal mode)
 * 4. Issue or work item URL (optional) - validates GitHub issue or Azure DevOps work item formats if provided
 * 
 * The agent will perform additional validation and normalization of these inputs
 * (e.g., converting branch name to feature slug, fetching issue title).
 * 
 * @param outputChannel - Output channel for logging user interaction events
 * @returns Promise resolving to collected inputs, or undefined if user cancelled
 */
export async function collectUserInputs(
  outputChannel: vscode.OutputChannel
): Promise<WorkItemInputs | undefined> {
  const targetBranch = await vscode.window.showInputBox({
    prompt: 'Enter target branch name (e.g., feature/my-feature)',
    placeHolder: 'feature/my-feature',
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Branch name is required';
      }

      if (!isValidBranchName(value)) {
        return 'Branch name contains invalid characters';
      }

      return undefined;
    }
  });

  if (!targetBranch) {
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

  return {
    targetBranch: targetBranch.trim(),
    workflowMode,
    reviewStrategy,
    issueUrl: issueUrl.trim() === '' ? undefined : issueUrl.trim()
  };
}
