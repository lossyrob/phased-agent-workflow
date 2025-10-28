/**
 * Git Operations Module
 * 
 * This module will be fully implemented in Phase 4.
 * For Phase 2, we provide a stub implementation of getGitRemotes.
 */

/**
 * Gets list of all git remotes
 * 
 * STUB IMPLEMENTATION: This is a temporary placeholder that returns
 * a hardcoded list for Phase 2 testing. The real implementation will
 * execute `git remote` command in Phase 4.
 * 
 * @param _cwd - The working directory (unused in stub)
 * @returns Array of remote names
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getGitRemotes(_cwd: string): Promise<string[]> {
  // Stub implementation - will be replaced in Phase 4
  // For now, return a default remote to allow Phase 2 testing
  return ['origin'];
}
