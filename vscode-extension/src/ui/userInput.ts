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
  
  /** Optional GitHub issue URL to associate with the work item */
  githubIssueUrl?: string;
}

/**
 * Collect user inputs for work item initialization.
 * 
 * Presents two sequential input prompts to the user:
 * 1. Target branch name (required) - basic validation ensures valid git branch characters
 * 2. GitHub issue URL (optional) - validates GitHub issue URL format if provided
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

      if (!/^[a-zA-Z0-9/_-]+$/.test(value)) {
        return 'Branch name contains invalid characters';
      }

      return undefined;
    }
  });

  if (!targetBranch) {
    outputChannel.appendLine('[INFO] Branch name input cancelled');
    return undefined;
  }

  const githubIssueUrl = await vscode.window.showInputBox({
    prompt: 'Enter GitHub issue URL (optional, press Enter to skip)',
    placeHolder: 'https://github.com/owner/repo/issues/123',
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        return undefined;
      }

      if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(value)) {
        return 'Invalid GitHub issue URL format. Expected: https://github.com/owner/repo/issues/123';
      }

      return undefined;
    }
  });

  if (githubIssueUrl === undefined) {
    outputChannel.appendLine('[INFO] GitHub issue URL input cancelled');
    return undefined;
  }

  return {
    targetBranch: targetBranch.trim(),
    githubIssueUrl: githubIssueUrl.trim() === '' ? undefined : githubIssueUrl.trim()
  };
}
