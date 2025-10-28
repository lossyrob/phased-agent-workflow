/**
 * User input collected during work item initialization
 */
export interface WorkItemInputs {
  targetBranch: string;
  githubIssueUrl?: string;
  remote: string;
}

/**
 * Generated work item metadata
 */
export interface WorkItemMetadata {
  workTitle: string;
  featureSlug: string;
  targetBranch: string;
  githubIssue: string;
  remote: string;
  artifactPaths: string;
  additionalInputs: string;
}

/**
 * GitHub issue metadata fetched from API
 */
export interface GitHubIssue {
  title: string;
  number: number;
  url: string;
}
