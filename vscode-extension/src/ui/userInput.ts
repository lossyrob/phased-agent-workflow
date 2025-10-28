import * as vscode from 'vscode';

/**
 * User inputs collected for work item initialization.
 */
export interface WorkItemInputs {
  targetBranch: string;
  githubIssueUrl?: string;
}

/**
 * Collect user inputs for work item initialization.
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
