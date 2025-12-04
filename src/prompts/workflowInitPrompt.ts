import * as fs from 'fs';
import * as path from 'path';
import { formatCustomInstructions, loadCustomInstructions } from './customInstructions';
import { WorkflowModeSelection, ReviewStrategy } from '../ui/userInput';

/**
 * Relative path from workspace root to workflow initialization custom instructions file.
 */
const WORKFLOW_INIT_CUSTOM_INSTRUCTIONS_PATH = path.join(
  '.paw',
  'instructions',
  'init-instructions.md'
);

/**
 * Template variable substitutions for the workflow initialization prompt.
 * 
 * These variables are replaced in the prompt template to customize instructions
 * for the specific workflow being initialized.
 */
interface PromptVariables {
  /** Git branch name for the workflow, or "auto" for agent-derived branch */
  TARGET_BRANCH: string;
  /** Branch derivation mode: "explicit" (user provided) or "auto-derive" (agent derives) */
  BRANCH_MODE: string;
  /** Workflow mode (full, minimal, or custom) */
  WORKFLOW_MODE: string;
  /** Review strategy (prs or local) */
  REVIEW_STRATEGY: string;
  /** Custom workflow instructions section (for custom mode) */
  CUSTOM_INSTRUCTIONS_SECTION: string;
  /** Custom workflow instructions field for WorkflowContext.md */
  CUSTOM_INSTRUCTIONS_FIELD: string;
  /** Issue or work item URL (GitHub or Azure DevOps), or "Not provided" */
  ISSUE_URL: string;
  /** Issue URL field value for WorkflowContext.md, or "none" */
  ISSUE_URL_FIELD: string;
  /** Absolute path to the workspace root directory */
  WORKSPACE_PATH: string;
  /** Optional work title strategy section when issue URL is provided */
  WORK_TITLE_STRATEGY: string;
  /** Fallback indicator text for branch-based work title generation */
  WORK_TITLE_FALLBACK_INDICATOR: string;
  /** Formatted custom instructions section from .paw/instructions/init-instructions.md */
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
 * Construct the agent prompt that instructs the Copilot agent how to initialize the workflow.
 * 
 * @param targetBranch - The git branch name where work will be committed
 * @param workflowMode - Workflow mode selection including optional custom instructions
 * @param reviewStrategy - Review strategy (prs or local)
 * @param issueUrl - Optional issue or work item URL (GitHub Issue or Azure DevOps Work Item)
 * @param workspacePath - Absolute path to the workspace root directory
 * @returns Complete prompt text with all variables substituted
 */
export function constructAgentPrompt(
  targetBranch: string,
  workflowMode: WorkflowModeSelection,
  reviewStrategy: ReviewStrategy,
  issueUrl: string | undefined,
  workspacePath: string
): string {
  const customInstructions = loadCustomInstructions(
    workspacePath,
    WORKFLOW_INIT_CUSTOM_INSTRUCTIONS_PATH
  );
  const customInstructionsSection = formatCustomInstructions(customInstructions);

  // Build custom workflow instructions section for the prompt if custom mode with instructions
  // This section appears in the "Parameters Provided" area of the generated prompt
  const customWorkflowInstructionsSection = workflowMode.customInstructions
    ? `- **Custom Workflow Instructions**: ${workflowMode.customInstructions}\n`
    : '';

  // Build custom workflow instructions field for WorkflowContext.md
  // This field is included in the generated WorkflowContext.md when custom mode is used
  const customWorkflowInstructionsField = workflowMode.customInstructions
    ? `Custom Workflow Instructions: ${workflowMode.customInstructions}\n`
    : '';

  // Build Work Title strategy section based on whether an issue or work item URL is provided
  // When an issue URL is provided, the agent attempts to fetch the title from the issue
  // Otherwise, the work title is derived from the branch name
  const workTitleStrategy = issueUrl
    ? `**Preferred - Fetch From Issue:**
- Retrieve the issue or work item title from ${issueUrl}
- Use the title as the Work Title (shorten for clarity if necessary)
- If the fetch fails, fall back to the branch-based generation rules below

`
    : '';
  
  // Add fallback indicator when issue URL is provided to clarify branch-based generation is fallback
  const workTitleFallbackIndicator = issueUrl ? ' (Fallback)' : '';

  // Determine branch mode based on whether a branch was provided
  // Empty branch triggers auto-derivation by the agent
  const branchMode = targetBranch.trim() === '' ? 'auto-derive' : 'explicit';
  const resolvedBranch = targetBranch.trim() === '' ? 'auto' : targetBranch;
  
  // Prepare template variables for substitution
  const variables: PromptVariables = {
    TARGET_BRANCH: resolvedBranch,
    BRANCH_MODE: branchMode,
    WORKFLOW_MODE: workflowMode.mode,
    REVIEW_STRATEGY: reviewStrategy,
    CUSTOM_INSTRUCTIONS_SECTION: customWorkflowInstructionsSection,
    CUSTOM_INSTRUCTIONS_FIELD: customWorkflowInstructionsField,
    ISSUE_URL: issueUrl || 'Not provided',
    ISSUE_URL_FIELD: issueUrl || 'none',
    WORKSPACE_PATH: workspacePath,
    WORK_TITLE_STRATEGY: workTitleStrategy,
    WORK_TITLE_FALLBACK_INDICATOR: workTitleFallbackIndicator,
    CUSTOM_INSTRUCTIONS: customInstructionsSection
  };
  
  // Load template and substitute variables
  const template = loadPromptTemplate();
  return substituteVariables(template, variables);
}
