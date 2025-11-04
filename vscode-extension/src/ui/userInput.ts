import * as vscode from 'vscode';

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
 * Collect user inputs for work item initialization.
 * 
 * Presents two sequential input prompts to the user:
 * 1. Target branch name (required) - basic validation ensures valid git branch characters
 * 2. Issue or work item URL (optional) - validates GitHub issue or Azure DevOps work item formats if provided
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
    issueUrl: issueUrl.trim() === '' ? undefined : issueUrl.trim()
  };
}
