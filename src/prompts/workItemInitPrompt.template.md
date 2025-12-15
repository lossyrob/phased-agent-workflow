# PAW Workflow Initialization

You are tasked with creating a complete PAW (Phased Agent Workflow) workflow directory structure.

## Parameters Provided

- **Workflow Type**: {{WORKFLOW_TYPE}}
- **Target Branch**: {{TARGET_BRANCH}}
- **Branch Mode**: {{BRANCH_MODE}}
- **Workflow Mode**: {{WORKFLOW_MODE}}
- **Review Strategy**: {{REVIEW_STRATEGY}}
- **Handoff Mode**: {{HANDOFF_MODE}}
{{CUSTOM_INSTRUCTIONS_SECTION}}{{AFFECTED_REPOSITORIES}}- **Storage Root**: {{STORAGE_ROOT}}
- **Issue URL**: {{ISSUE_URL}}
- **Workspace Path**: {{WORKSPACE_PATH}}

{{CUSTOM_INSTRUCTIONS}}

## Your Tasks

{{WORK_DESCRIPTION_SECTION}}

{{BRANCH_AUTO_DERIVE_SECTION}}

### 1. Generate Work Title

{{WORK_TITLE_STRATEGY}}

**Branch-Based Generation{{WORK_TITLE_FALLBACK_INDICATOR}}:**
- Remove standard prefixes (feature/, bugfix/, hotfix/)
- Split on hyphens, underscores, and slashes
- Capitalize first letter of each word
- Keep concise (ideally 2-4 words)
- Example: feature/user-auth-system → User Auth System

### 2. Generate Feature Slug

Generate a normalized slug from the Work Title:

**Expected Format:**
- Lowercase letters (a-z), numbers (0-9), hyphens (-) only
- No leading, trailing, or consecutive hyphens
- Length between 1-100 characters
- Not reserved names (., .., node_modules, .git, .paw)

**Uniqueness:**
- Verify `.paw/work/<slug>/` doesn't exist
- If conflict, append -2, -3, etc. until unique

### 3. Create Directory Structure

**For implementation or review workflows:**

Create the following structure at workspace root:
```
.paw/work/<feature-slug>/
├── WorkflowContext.md
└── prompts/
```

**For cross-repository workflows:**

Use the selected **Storage Root** as the base folder for coordinator artifacts:
```
<Storage Root>/.paw/multi-work/<feature-slug>/
├── CrossRepoContext.md
└── prompts/
```

**Important for cross-repository**: The coordinator artifacts live in `.paw/multi-work/` (not `.paw/work/`). Child workflows (per repository) will use each repository's `.paw/work/<feature-slug>/` directories later.

**Uniqueness Check:**
- For standard workflows: Verify `.paw/work/<slug>/` doesn't exist
- For cross-repository: Verify `<Storage Root>/.paw/multi-work/<slug>/` doesn't exist
- If conflict, append -2, -3, etc. until unique

### 4. Generate Context File

**For implementation or review workflows**, create `.paw/work/<feature-slug>/WorkflowContext.md`:

**For cross-repository workflows**, create `<Storage Root>/.paw/multi-work/<feature-slug>/CrossRepoContext.md`:

{{CONTEXT_FILE_TEMPLATE}}

**Field Definitions:**

- **Work Title** (Required): 2-4 word human-readable name for PR titles
- **Feature Slug** / **Work ID** (Required): Normalized identifier for artifact directory
- **Workflow Type** (Cross-repository only): Always "Cross-Repository" for cross-repo workflows
- **Target Branch** (Required): Git branch that will hold completed work
- **Workflow Mode** (Required): Workflow mode selection ('full', 'minimal', or 'custom')
- **Review Strategy** (Required): Review strategy ('prs' or 'local')
- **Handoff Mode** (Required): Handoff mode ('manual', 'semi-auto', or 'auto')
- **Custom Workflow Instructions** (Optional): Free-text workflow instructions for custom mode
- **Initial Prompt** (Optional): User's work description when no issue URL provided
- **Issue URL** (Optional): URL to associated issue/work item, or "none"
- **Storage Root** (Cross-repository only): Workspace folder containing `.paw/multi-work/`
- **Affected Repositories** (Cross-repository only): List of repositories involved in cross-repo workflow
- **Remote** (Required): Git remote name (default: "origin")
- **Artifact Paths** (Required): Location hint for artifacts (default: "auto-derived")
- **Additional Inputs** (Optional): Comma-separated extra inputs, or "none"

### 5. Review Strategy Validation

**Review Strategy Validation:**
- If Workflow Mode is 'minimal', verify Review Strategy is 'local' (required constraint)
- If mismatch detected, stop and report error to user

### 6. Create and Checkout Git Branch

**If Branch Mode is "explicit":**
Ensure the branch `{{TARGET_BRANCH}}` is created and checked out. Handle conflicts (existing branch names) by prompting the user for resolution.

**If Branch Mode is "auto-derive":**
Use the branch name derived from the steps above. Create and checkout the derived branch. If conflicts exist with existing branches, append a suffix (-2, -3, etc.) or prompt user for resolution.

### 7. Commit Context File

After creating the workflow structure and checking out the target branch, commit the context file:

**For implementation or review workflows:**
1. Stage the file: `git add .paw/work/<feature-slug>/WorkflowContext.md`
2. Create an initial commit with message: `Initialize PAW workflow for <Work Title>`

**For cross-repository workflows:**
- Note: The storage root folder may not be a git repository. Only commit if the storage root is inside a git repository.
- If in a git repo, stage: `git add .paw/multi-work/<feature-slug>/CrossRepoContext.md`
- Create an initial commit with message: `Initialize PAW cross-repo workflow for <Work Title>`
- If not in a git repo, skip the commit step and inform the user that CrossRepoContext.md is created but not version controlled.

This ensures the workflow context is tracked in version control from the start (when applicable).

### 8. Open Context File

**For implementation or review workflows:**
Open `.paw/work/<feature-slug>/WorkflowContext.md` in the editor for review.

**For cross-repository workflows:**
Open `<Storage Root>/.paw/multi-work/<feature-slug>/CrossRepoContext.md` in the editor for review.

## Error Handling

- **Slug conflicts**: Prompt user for alternate slug or auto-append suffix
- **Existing branches**: Ask user to checkout existing or choose new name
- **Git errors**: Provide clear messages with recovery guidance
- **Network failures**: Fall back to branch-derived titles
- **Tool failures**: Show errors and do not continue

---

Begin initialization now. After completion, inform the user:

**For implementation or review workflows:**
1. **Workflow structure created** at `.paw/work/<feature-slug>/`
2. **WorkflowContext.md ready** for review and editing

**For cross-repository workflows:**
1. **Workflow structure created** at `<Storage Root>/.paw/multi-work/<feature-slug>/`
2. **CrossRepoContext.md ready** for review and editing
3. **Affected repositories**: List the selected repositories

**For all workflows:**
- **Prompt files available on-demand**: Use `paw_generate_prompt` to create customizable prompt files when needed
- **Next step**: Based on workflow type and mode, tell the user what command or action to take:
  - **Implementation workflow (Full mode)**: Say `spec` to start the specification stage with the Spec Agent
  - **Implementation workflow (Minimal mode)**: Say `research` to start code research with the Code Research Agent
  - **Implementation workflow (Custom mode)**: Describe the appropriate first step based on custom instructions
  - **Cross-Repository workflow**: Say `spec` to start with the Cross-Repo Spec Agent
  - **Review workflow**: Say `review` to start the review process

Tell the user they can say `continue` to immediately start the first stage, or use the specific command shown above. Mention that `status` or `help` is available at any time, and `generate prompt for <stage>` creates a customizable prompt file if needed.

When the user says `continue`, use the `paw_call_agent` tool to invoke the handoff:
- **Implementation workflow (Full mode)**: Hand off to PAW-01A Specification
- **Implementation workflow (Minimal mode)**: Hand off to PAW-02A Code Researcher
- **Implementation workflow (Custom mode)**: Hand off to the appropriate first agent based on custom instructions
- **Cross-Repository workflow**: Hand off to PAW-M01A Cross-Repo Spec
- **Review workflow**: Hand off to PAW-R1A Understanding

Pass the generated feature slug as the work_id.
