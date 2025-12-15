import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

/**
 * Represents a detected git repository in a workspace folder.
 */
export interface GitRepository {
  /** Absolute path to the repository root */
  path: string;
  /** Human-readable name (from workspace folder name) */
  name: string;
  /** Whether the folder is a valid git repository */
  isValid: boolean;
}

/**
 * Check if the workspace path points to a git repository.
 * 
 * Uses `git rev-parse --git-dir` to determine if the directory is part of a git
 * repository. This is a reliable method that works even in subdirectories of a
 * git repository.
 * 
 * @param workspacePath - Absolute path to the workspace root directory
 * @returns Promise resolving to true if git repository, false otherwise
 */
export async function validateGitRepository(workspacePath: string): Promise<boolean> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd: workspacePath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Determine if the repository has uncommitted changes.
 * 
 * Uses `git status --porcelain` to check for uncommitted changes (staged or unstaged).
 * This is useful for warning users before performing operations that may affect
 * the working tree.
 * 
 * Note: This function is implemented but not currently used in Phase 2. It will be
 * integrated when the agent prompt includes uncommitted changes warnings.
 * 
 * @param workspacePath - Absolute path to the workspace root directory
 * @returns Promise resolving to true if there are uncommitted changes, false otherwise
 * @throws Error if git command fails (e.g., not a git repository)
 */
export async function hasUncommittedChanges(workspacePath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: workspacePath });
    return stdout.trim().length > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check git status: ${message}`);
  }
}

/**
 * Detect all git repositories across workspace folders.
 * 
 * Iterates through all provided workspace folders and validates each as a git
 * repository using the existing validateGitRepository() function. Returns a list
 * of GitRepository objects with path, name, and validity status for each folder.
 * 
 * This function is used during cross-repository workflow initialization to identify
 * which workspace folders contain git repositories that can participate in the
 * multi-repository workflow.
 * 
 * @param workspaceFolders - Array of VS Code workspace folders to check
 * @returns Promise resolving to array of GitRepository objects (one per folder)
 * 
 * @example
 * const folders = vscode.workspace.workspaceFolders;
 * if (folders) {
 *   const repos = await detectGitRepositories(folders);
 *   const validRepos = repos.filter(r => r.isValid);
 * }
 */
export async function detectGitRepositories(
  workspaceFolders: readonly vscode.WorkspaceFolder[]
): Promise<GitRepository[]> {
  // Process all folders in parallel for better performance
  return Promise.all(
    workspaceFolders.map(async (folder) => {
      const isValid = await validateGitRepository(folder.uri.fsPath);
      return {
        path: folder.uri.fsPath,
        name: folder.name,
        isValid
      };
    })
  );
}
