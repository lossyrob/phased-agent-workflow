import * as vscode from 'vscode';
import { WorkItemInputs } from '../types';

/**
 * Validates branch name against git naming rules
 */
function validateBranchName(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return 'Branch name is required';
  }
  
  // Git branch name validation rules
  if (value.includes('..')) {
    return 'Branch name cannot contain ".."';
  }
  if (value.startsWith('/') || value.endsWith('/') || value.endsWith('.')) {
    return 'Branch name cannot start/end with "/" or end with "."';
  }
  if (/[\s~^:?*[\\]/.test(value)) {
    return 'Branch name contains invalid characters';
  }
  
  return undefined;
}

/**
 * Validates GitHub issue URL format
 */
function validateGitHubIssueUrl(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined; // Optional field
  }
  
  const githubIssuePattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/issues\/\d+$/;
  if (!githubIssuePattern.test(value)) {
    return 'Invalid GitHub issue URL format (expected: https://github.com/owner/repo/issues/123)';
  }
  
  return undefined;
}

/**
 * Collects target branch name from user
 */
export async function collectBranchName(): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt: 'Enter target branch name for the work item',
    placeHolder: 'feature/my-feature',
    validateInput: validateBranchName,
    ignoreFocusOut: true
  });
}

/**
 * Collects optional GitHub issue URL from user
 */
export async function collectGitHubIssueUrl(): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt: 'Enter GitHub issue URL (optional, press Enter to skip)',
    placeHolder: 'https://github.com/owner/repo/issues/123',
    validateInput: validateGitHubIssueUrl,
    ignoreFocusOut: true
  });
}

/**
 * Prompts user to select git remote when multiple exist
 */
export async function selectGitRemote(remotes: string[]): Promise<string | undefined> {
  if (remotes.length === 0) {
    throw new Error('No git remotes found in repository');
  }
  
  if (remotes.length === 1) {
    return remotes[0];
  }
  
  // Find 'origin' and make it the default if it exists
  const defaultRemote = remotes.includes('origin') ? 'origin' : remotes[0];
  
  const items = remotes.map(remote => ({
    label: remote,
    description: remote === defaultRemote ? '(default)' : undefined
  }));
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select git remote',
    ignoreFocusOut: true
  });
  
  return selected?.label;
}

/**
 * Orchestrates collection of all user inputs
 */
export async function collectWorkItemInputs(remotes: string[]): Promise<WorkItemInputs | undefined> {
  // Collect branch name
  const targetBranch = await collectBranchName();
  if (!targetBranch) {
    return undefined; // User cancelled
  }
  
  // Collect optional GitHub issue URL
  const githubIssueUrl = await collectGitHubIssueUrl();
  // Note: undefined or empty string both mean no issue URL provided
  
  // Select git remote
  const remote = await selectGitRemote(remotes);
  if (!remote) {
    return undefined; // User cancelled
  }
  
  return {
    targetBranch,
    githubIssueUrl: githubIssueUrl && githubIssueUrl.trim() ? githubIssueUrl : undefined,
    remote
  };
}
