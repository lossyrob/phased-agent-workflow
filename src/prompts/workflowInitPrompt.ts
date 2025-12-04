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
  /** Branch auto-derivation instructions (conditional, included when branch is 'auto') */
  BRANCH_AUTO_DERIVE_SECTION: string;
  /** Work description collection instructions (conditional, included when no issue URL) */
  WORK_DESCRIPTION_SECTION: string;
  /** Initial Prompt field for WorkflowContext.md (conditional) */
  INITIAL_PROMPT_FIELD: string;
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
 * Build branch auto-derivation instructions for the agent.
 * 
 * When the user skips providing a branch name, the agent needs instructions
 * on how to derive an appropriate branch name from context.
 * 
 * @param issueUrl - Optional issue URL that can provide context for branch derivation
 * @returns Markdown content with branch derivation instructions
 */
function buildBranchAutoDeriveSection(issueUrl: string | undefined): string {
  if (issueUrl) {
    // Issue URL provided - derive branch from issue title
    return `1. **Check Current Branch First:**
   - Run \`git branch --show-current\` to see current branch
   - If already on a feature/fix branch (not main/master/develop), offer to use it
   - Ask user: "You're on branch '<current>'. Use this branch or derive a new one from the issue?"

2. **Derive From Issue Title:**
   - Fetch the issue title from ${issueUrl}
   - Extract the issue number from the URL
   - Generate branch name: \`feature/<issue-number>-<slugified-title>\`
   - Slugify: lowercase, replace spaces with hyphens, remove special characters
   - Keep title portion to 3-5 words
   - Example: Issue #42 "Add User Authentication Flow" → \`feature/42-add-user-authentication\`

3. **Check Remote Branch Conventions:**
   - Run \`git branch -r\` to list remote branches
   - Analyze existing branch naming patterns
   - Common prefixes: feature/, bugfix/, fix/, hotfix/, feat/
   - Use detected convention or fall back to \`feature/\` for features, \`fix/\` for bugs

4. **Check for Conflicts:**
   - Compare derived name against remote branches
   - If conflict exists, append suffix (-2, -3, etc.) until unique
   - Inform user of the derived branch name before creating`;
  } else {
    // No issue URL - derive branch from work description
    return `1. **Check Current Branch First:**
   - Run \`git branch --show-current\` to see current branch
   - If already on a feature/fix branch (not main/master/develop), offer to use it
   - Ask user: "You're on branch '<current>'. Use this branch or derive a new one?"

2. **Derive From Work Description:**
   - Use the Initial Prompt (work description) provided by the user
   - Slugify: lowercase, replace spaces with hyphens, remove special characters
   - Keep reasonably short (3-5 words worth)
   - Determine appropriate prefix based on description content:
     - Bug/fix descriptions → \`fix/\`
     - Feature/add/implement descriptions → \`feature/\`
   - Example: "Add rate limiting to API" → \`feature/api-rate-limiting\`

3. **Check Remote Branch Conventions:**
   - Run \`git branch -r\` to list remote branches
   - Analyze existing branch naming patterns
   - Common prefixes: feature/, bugfix/, fix/, hotfix/, feat/
   - Use detected convention or fall back to \`feature/\` for features, \`fix/\` for bugs

4. **Check for Conflicts:**
   - Compare derived name against remote branches
   - If conflict exists, append suffix (-2, -3, etc.) until unique
   - Inform user of the derived branch name before creating`;
  }
}

/**
 * Build work description collection instructions for the agent.
 * 
 * When no issue URL is provided, the agent should ask the user to describe
 * what they want to work on. This description is used for:
 * - Deriving the branch name (if branch was also skipped)
 * - Deriving the Work Title
 * - Storing as Initial Prompt in WorkflowContext.md
 * 
 * @returns Markdown content with work description collection instructions
 */
function buildWorkDescriptionSection(): string {
  return `Since no issue URL was provided, ask the user to describe their work:

1. **Pause and Ask:**
   - Ask: "What would you like to work on? Please describe the feature, bug fix, or task."
   - Wait for the user's response in the chat

2. **Capture the Response:**
   - Store the user's description as the Initial Prompt
   - This will be saved to WorkflowContext.md for downstream agents

3. **Use the Description For:**
   - Deriving the branch name (if branch was skipped)
   - Deriving the Work Title (extract key concepts, 2-4 words)
   - Providing context to downstream agents via the Initial Prompt field

4. **Example Flow:**
   - User says: "I want to add rate limiting to the API endpoints to prevent abuse"
   - Initial Prompt: "I want to add rate limiting to the API endpoints to prevent abuse"
   - Derived Work Title: "API Rate Limiting"
   - Derived Branch: \`feature/api-rate-limiting\``;
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

  // Build branch auto-derivation section when branch mode is "auto-derive"
  // This section instructs the agent how to derive the branch name
  const branchAutoDeriveSectionContent = branchMode === 'auto-derive'
    ? buildBranchAutoDeriveSection(issueUrl)
    : '';

  // Build work description section when no issue URL is provided
  // This section instructs the agent to ask the user what they want to work on
  const workDescriptionSectionContent = !issueUrl
    ? buildWorkDescriptionSection()
    : '';

  // Build Initial Prompt field placeholder for WorkflowContext.md
  // When no issue URL is provided, the agent captures user's work description
  // and stores it in the Initial Prompt field
  const initialPromptFieldContent = !issueUrl
    ? 'Initial Prompt: <user_work_description>\n'
    : '';
  
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
    CUSTOM_INSTRUCTIONS: customInstructionsSection,
    BRANCH_AUTO_DERIVE_SECTION: branchAutoDeriveSectionContent,
    WORK_DESCRIPTION_SECTION: workDescriptionSectionContent,
    INITIAL_PROMPT_FIELD: initialPromptFieldContent
  };
  
  // Load template and substitute variables
  const template = loadPromptTemplate();
  return substituteVariables(template, variables);
}
