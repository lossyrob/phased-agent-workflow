import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
