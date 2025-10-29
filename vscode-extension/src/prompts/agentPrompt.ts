import * as fs from 'fs';
import * as path from 'path';
import { formatCustomInstructions, loadCustomInstructions } from './customInstructions';

/**
 * Template variable substitutions for the work item initialization prompt.
 */
interface PromptVariables {
  TARGET_BRANCH: string;
  GITHUB_ISSUE_URL: string;
  GITHUB_ISSUE_FIELD: string;
  WORKSPACE_PATH: string;
  WORK_TITLE_STRATEGY: string;
  WORK_TITLE_FALLBACK_INDICATOR: string;
  CUSTOM_INSTRUCTIONS: string;
}

/**
 * Load the prompt template file.
 */
function loadPromptTemplate(): string {
  const compiledPath = path.join(__dirname, 'workItemInitPrompt.template.md');
  if (fs.existsSync(compiledPath)) {
    return fs.readFileSync(compiledPath, 'utf-8');
  }

  const sourcePath = path.join(__dirname, '..', '..', 'src', 'prompts', 'workItemInitPrompt.template.md');
  if (fs.existsSync(sourcePath)) {
    return fs.readFileSync(sourcePath, 'utf-8');
  }

  throw new Error('workItemInitPrompt.template.md not found in compiled or source locations');
}

/**
 * Simple template variable substitution.
 * Replaces all occurrences of {{VAR_NAME}} with the corresponding value.
 */
function substituteVariables(template: string, variables: PromptVariables): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }
  
  return result;
}

/**
 * Construct the agent prompt that instructs the Copilot agent how to initialize the work item.
 */
export function constructAgentPrompt(
  targetBranch: string,
  githubIssueUrl: string | undefined,
  workspacePath: string
): string {
  const customInstructions = loadCustomInstructions(workspacePath);
  const customInstructionsSection = formatCustomInstructions(customInstructions);

  // Build Work Title strategy section based on whether GitHub issue URL is provided
  const workTitleStrategy = githubIssueUrl
    ? `**Preferred - Fetch From GitHub Issue:**
- Retrieve the issue title from ${githubIssueUrl}
- Use the issue title as the Work Title (shorten for clarity if necessary)
- If the fetch fails, fall back to the branch-based generation rules below

`
    : '';
  
  const workTitleFallbackIndicator = githubIssueUrl ? ' (Fallback)' : '';
  
  // Prepare template variables
  const variables: PromptVariables = {
    TARGET_BRANCH: targetBranch,
    GITHUB_ISSUE_URL: githubIssueUrl || 'Not provided',
    GITHUB_ISSUE_FIELD: githubIssueUrl || 'none',
    WORKSPACE_PATH: workspacePath,
    WORK_TITLE_STRATEGY: workTitleStrategy,
    WORK_TITLE_FALLBACK_INDICATOR: workTitleFallbackIndicator,
    CUSTOM_INSTRUCTIONS: customInstructionsSection
  };
  
  // Load template and substitute variables
  const template = loadPromptTemplate();
  return substituteVariables(template, variables);
}
