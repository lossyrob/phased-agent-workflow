/**
 * Construct the agent prompt that instructs the Copilot agent how to initialize the work item.
 *
 * Phase 3 replaces this placeholder with the full prompt content.
 */
export function constructAgentPrompt(
  targetBranch: string,
  githubIssueUrl: string | undefined,
  workspacePath: string
): string {
  const issueDetail = githubIssueUrl ? `GitHub issue: ${githubIssueUrl}` : 'No GitHub issue provided';
  return `Initialize PAW work item for branch: ${targetBranch}\n${issueDetail}\nWorkspace: ${workspacePath}`;
}
