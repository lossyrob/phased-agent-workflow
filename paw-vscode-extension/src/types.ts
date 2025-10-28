/**
 * PAW Workflow Extension - Type Definitions
 * 
 * This module contains TypeScript type definitions for the PAW workflow extension.
 * These types provide strong typing for work item metadata, user inputs, and external
 * API responses (e.g., GitHub issues).
 * 
 * Design Note: Interfaces are preferred over types for extensibility and better
 * error messages. All interfaces document the purpose and usage of each field.
 */

/**
 * User input collected during work item initialization.
 * 
 * This interface represents the raw user input gathered through VS Code's
 * input boxes and quick picks during the initialization flow.
 */
export interface WorkItemInputs {
  /** The target branch name for the work item (e.g., "feature/my-feature") */
  targetBranch: string;
  
  /** Optional GitHub issue URL (e.g., "https://github.com/owner/repo/issues/123") */
  githubIssueUrl?: string;
  
  /** The git remote to use for the work item (e.g., "origin") */
  remote: string;
}

/**
 * Generated work item metadata.
 * 
 * This interface represents the complete metadata for a PAW work item after
 * processing user inputs and generating derived values (e.g., feature slug,
 * Work Title). This metadata is persisted in the WorkflowContext.md file.
 */
export interface WorkItemMetadata {
  /** Human-readable Work Title (2-4 words, e.g., "Add User Auth") */
  workTitle: string;
  
  /** Filesystem-safe feature slug derived from branch name (e.g., "feature-add-user-auth") */
  featureSlug: string;
  
  /** The target branch name provided by the user */
  targetBranch: string;
  
  /** GitHub issue URL or "none" if not provided */
  githubIssue: string;
  
  /** The git remote to use (e.g., "origin") */
  remote: string;
  
  /** Artifact paths (typically "auto-derived" in Phase 1) */
  artifactPaths: string;
  
  /** Additional inputs (typically "none" in Phase 1) */
  additionalInputs: string;
}

/**
 * GitHub issue metadata fetched from API.
 * 
 * This interface represents the subset of GitHub issue data needed for
 * Work Title generation and metadata population. The full GitHub API
 * response contains many more fields, but we only extract what's needed.
 */
export interface GitHubIssue {
  /** The issue title from GitHub */
  title: string;
  
  /** The issue number */
  number: number;
  
  /** The full URL to the issue */
  url: string;
}
