import * as fs from 'fs';
import * as path from 'path';

/**
 * Maximum number of characters to include from paw-specification.md in the agent prompt.
 * 
 * This limit prevents the prompt from becoming too large while still providing enough
 * specification context for the agent. The full specification remains available in the
 * workspace for the agent to reference if needed.
 */
const SPEC_SNIPPET_LIMIT = 10000;

/** Loads a truncated snippet of the PAW specification when present. */
function loadPawSpecificationSnippet(workspacePath: string): string | undefined {
  try {
    const specPath = path.join(workspacePath, 'paw-specification.md');
    if (!fs.existsSync(specPath)) {
      return undefined;
    }

    const content = fs.readFileSync(specPath, 'utf-8');
    if (content.length <= SPEC_SNIPPET_LIMIT) {
      return content;
    }

    return `${content.slice(0, SPEC_SNIPPET_LIMIT)}\n...\n(Truncated - open paw-specification.md for the complete text.)`;
  } catch {
    return undefined;
  }
}

/**
 * Construct the agent prompt that instructs the Copilot agent how to initialize the work item.
 */
export function constructAgentPrompt(
  targetBranch: string,
  githubIssueUrl: string | undefined,
  workspacePath: string
): string {
  const specSnippet = loadPawSpecificationSnippet(workspacePath);
  const lines: string[] = [];

  lines.push('# PAW Work Item Initialization');
  lines.push('');
  lines.push('You are tasked with creating a complete PAW (Phased Agent Workflow) work item directory structure.');
  lines.push('');
  lines.push('## Parameters Provided');
  lines.push('');
  lines.push(`- **Target Branch**: ${targetBranch}`);
  lines.push(githubIssueUrl ? `- **GitHub Issue URL**: ${githubIssueUrl}` : '- **GitHub Issue URL**: Not provided');
  lines.push(`- **Workspace Path**: ${workspacePath}`);
  lines.push('');
  lines.push('## Your Tasks');
  lines.push('');
  lines.push('### 1. Generate Feature Slug');
  lines.push('');
  lines.push('Normalize the target branch name into a valid feature slug following PAW rules:');
  lines.push('');
  lines.push('**Normalization Steps:**');
  lines.push('1. Remove standard prefixes like "feature/", "bugfix/", or "hotfix/" to extract the descriptive portion');
  lines.push('2. Convert the remaining text to lowercase');
  lines.push('3. Replace spaces and special characters with hyphens');
  lines.push('4. Remove any characters that are not lowercase letters, numbers, or hyphens');
  lines.push('5. Collapse consecutive hyphens into a single hyphen');
  lines.push('6. Trim leading and trailing hyphens');
  lines.push('7. Enforce a maximum length of 100 characters');
  lines.push('');
  lines.push('**Validation Requirements:**');
  lines.push('- Length must be between 1 and 100 characters');
  lines.push('- Allowed characters: lowercase letters, numbers, hyphens');
  lines.push('- No leading or trailing hyphens');
  lines.push('- No consecutive hyphens');
  lines.push('- Disallow reserved names: ., .., node_modules, .git, .paw');
  lines.push('');
  lines.push('**Uniqueness Check:**');
  lines.push('- Verify that .paw/work/<slug>/ does not already exist');
  lines.push('- If a conflict is detected, append -2, -3, etc. until a unique slug is found');
  lines.push('');
  lines.push('### 2. Generate Work Title');
  lines.push('');

  if (githubIssueUrl) {
    lines.push('**Preferred - Fetch From GitHub Issue:**');
    lines.push(`- Retrieve the issue title from ${githubIssueUrl}`);
    lines.push('- Use the issue title as the Work Title (shorten for clarity if necessary)');
    lines.push('- If the fetch fails, fall back to the branch-based generation rules below');
    lines.push('');
  }

  lines.push(`**Branch-Based Generation (Fallback${githubIssueUrl ? '' : ' - Primary'}):**`);
  lines.push('- Remove prefixes such as feature/, bugfix/, or hotfix/');
  lines.push('- Split the remaining name on hyphens, underscores, and slashes');
  lines.push('- Capitalize the first letter of each word');
  lines.push('- Join words with spaces and keep the title concise (ideally 2-4 words)');
  lines.push('- Example: feature/user-auth-system → User Auth System');
  lines.push('');
  lines.push('### 3. Create Directory Structure');
  lines.push('');
  lines.push('Create the following structure within the workspace:');
  lines.push('');
  lines.push('```');
  lines.push('.paw/work/<feature-slug>/');
  lines.push('├── WorkflowContext.md');
  lines.push('└── prompts/');
  lines.push('    ├── 01A-spec.prompt.md');
  lines.push('    ├── 01B-spec-research.prompt.md');
  lines.push('    ├── 02A-code-research.prompt.md');
  lines.push('    ├── 02B-impl-plan.prompt.md');
  lines.push('    ├── 03A-implement.prompt.md');
  lines.push('    ├── 03B-review.prompt.md');
  lines.push('    ├── 04-docs.prompt.md');
  lines.push('    ├── 05-pr.prompt.md');
  lines.push('    └── 0X-status.prompt.md');
  lines.push('```');
  lines.push('');
  lines.push('### 4. Generate WorkflowContext.md');
  lines.push('');
  lines.push('Create .paw/work/<feature-slug>/WorkflowContext.md using the exact format below:');
  lines.push('');
  lines.push('```markdown');
  lines.push('# WorkflowContext');
  lines.push('');
  lines.push('Work Title: <generated_work_title>');
  lines.push('Feature Slug: <generated_feature_slug>');
  lines.push(`Target Branch: ${targetBranch}`);
  lines.push(githubIssueUrl ? `GitHub Issue: ${githubIssueUrl}` : 'GitHub Issue: none');
  lines.push('Remote: origin');
  lines.push('Artifact Paths: auto-derived');
  lines.push('Additional Inputs: none');
  lines.push('```');
  lines.push('');
  lines.push('### 5. Call Language Model Tool to Generate Prompt Templates');
  lines.push('');
  lines.push('After creating WorkflowContext.md, invoke the registered language model tool to create all nine prompt templates:');
  lines.push('');
  lines.push('**Tool Call:**');
  lines.push('```');
  lines.push('paw_create_prompt_templates(');
  lines.push('  feature_slug: "<generated_feature_slug>",');
  lines.push(`  workspace_path: "${workspacePath}"`);
  lines.push(')');
  lines.push('```');
  lines.push('');
  lines.push('The tool must produce these files under .paw/work/<feature-slug>/prompts/:');
  lines.push('- 01A-spec.prompt.md');
  lines.push('- 01B-spec-research.prompt.md');
  lines.push('- 02A-code-research.prompt.md');
  lines.push('- 02B-impl-plan.prompt.md');
  lines.push('- 03A-implement.prompt.md');
  lines.push('- 03B-review.prompt.md');
  lines.push('- 04-docs.prompt.md');
  lines.push('- 05-pr.prompt.md');
  lines.push('- 0X-status.prompt.md');
  lines.push('');
  lines.push('If the tool reports errors, surface the failure details to the user and stop the workflow.');
  lines.push('');
  lines.push('### 6. Git Branch Operations');
  lines.push('');
  lines.push(`1. Check whether branch ${targetBranch} already exists locally with git rev-parse --verify ${targetBranch}`);
  lines.push('   - If it exists, prompt the user to either checkout the existing branch or provide a different name');
  lines.push('2. Check for uncommitted changes with git status --porcelain');
  lines.push('   - If changes exist, warn the user and confirm they want to proceed before creating the branch');
  lines.push(`3. Create and checkout the branch with git checkout -b ${targetBranch}`);
  lines.push('   - Handle command failures gracefully and provide actionable guidance if the operation cannot complete');
  lines.push('');
  lines.push('### 7. Open WorkflowContext.md');
  lines.push('');
  lines.push('When all steps succeed, open .paw/work/<feature-slug>/WorkflowContext.md in the editor so the user can review the generated details immediately.');
  lines.push('');
  lines.push('## Error Handling Expectations');
  lines.push('');
  lines.push('- **Slug conflicts**: Offer the user options to append a numeric suffix automatically, choose an alternate slug, or cancel the workflow');
  lines.push('- **Existing branches**: Allow users to reuse the branch or choose a new name');
  lines.push('- **Uncommitted changes**: Warn users before continuing and respect their decision');
  lines.push('- **Git errors**: Provide clear error messages and suggested fixes (for example, commit changes or resolve conflicts)');
  lines.push('- **Network failures**: If the GitHub issue cannot be fetched, fall back to branch-derived titles and inform the user');
  lines.push('- **Tool failures**: If paw_create_prompt_templates fails, show exact errors and do not continue to git operations');
  lines.push('');
  lines.push('## Success Confirmation');
  lines.push('');
  lines.push('Announce completion with a summary containing:');
  lines.push('✅ Created directory: .paw/work/<feature-slug>/');
  lines.push('✅ Generated WorkflowContext.md with all required fields');
  lines.push('✅ Successfully called paw_create_prompt_templates');
  lines.push('✅ Created nine prompt template files');
  lines.push(`✅ Created and checked out branch: ${targetBranch}`);
  lines.push('✅ Opened WorkflowContext.md in the editor');
  lines.push('');
  lines.push('## PAW Specification Reference');
  lines.push('');

  if (specSnippet) {
    lines.push(`The PAW specification is available for reference (truncated to ${SPEC_SNIPPET_LIMIT} characters):`);
    lines.push('');
    lines.push(...specSnippet.split('\n'));
  } else {
    lines.push('PAW specification not found in workspace - follow the inline rules above.');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Begin initialization now and provide progress updates as each major step completes.');

  return lines.join('\n');
}
