# PAW Workflow Initialization

You are tasked with creating a complete PAW (Phased Agent Workflow) workflow directory structure.

## Parameters Provided

- **Target Branch**: {{TARGET_BRANCH}}
- **Workflow Mode**: {{WORKFLOW_MODE}}
- **Review Strategy**: {{REVIEW_STRATEGY}}
- **Handoff Mode**: {{HANDOFF_MODE}}
{{CUSTOM_INSTRUCTIONS_SECTION}}- **Issue URL**: {{ISSUE_URL}}
- **Workspace Path**: {{WORKSPACE_PATH}}

{{CUSTOM_INSTRUCTIONS}}

## Your Tasks

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

Create the following structure:

```
.paw/work/<feature-slug>/
├── WorkflowContext.md
└── prompts/
```

### 4. Generate WorkflowContext.md

Create `.paw/work/<feature-slug>/WorkflowContext.md`:

```markdown
# WorkflowContext

Work Title: <generated_work_title>
Feature Slug: <generated_feature_slug>
Target Branch: {{TARGET_BRANCH}}
Workflow Mode: {{WORKFLOW_MODE}}
Review Strategy: {{REVIEW_STRATEGY}}
Handoff Mode: {{HANDOFF_MODE}}
{{CUSTOM_INSTRUCTIONS_FIELD}}Issue URL: {{ISSUE_URL_FIELD}}
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**Field Definitions:**

- **Work Title** (Required): 2-4 word human-readable name for PR titles
- **Feature Slug** (Required): Normalized identifier for artifact directory
- **Target Branch** (Required): Git branch that will hold completed work
- **Workflow Mode** (Required): Workflow mode selection ('full', 'minimal', or 'custom')
- **Review Strategy** (Required): Review strategy ('prs' or 'local')
- **Handoff Mode** (Required): Handoff mode ('manual', 'semi-auto', or 'auto')
- **Custom Workflow Instructions** (Optional): Free-text workflow instructions for custom mode
- **Issue URL** (Optional): URL to associated issue/work item, or "none"
- **Remote** (Required): Git remote name (default: "origin")
- **Artifact Paths** (Required): Location hint for artifacts (default: "auto-derived")
- **Additional Inputs** (Optional): Comma-separated extra inputs, or "none"

### 5. Review Strategy Validation

**Review Strategy Validation:**
- If Workflow Mode is 'minimal', verify Review Strategy is 'local' (required constraint)
- If mismatch detected, stop and report error to user

### 6. Create and Checkout Git Branch

Ensure the branch `{{TARGET_BRANCH}}` is created and checked out. Handle conflicts (existing branch names) by prompting the user for resolution.

### 7. Commit WorkflowContext.md

After creating the workflow structure and checking out the target branch, commit the WorkflowContext.md file:

1. Stage the WorkflowContext.md file: `git add .paw/work/<feature-slug>/WorkflowContext.md`
2. Create an initial commit with message: `Initialize PAW workflow for <Work Title>`

This ensures the workflow context is tracked in version control from the start.

### 8. Open WorkflowContext.md

Open `.paw/work/<feature-slug>/WorkflowContext.md` in the editor for review.

## Error Handling

- **Slug conflicts**: Prompt user for alternate slug or auto-append suffix
- **Existing branches**: Ask user to checkout existing or choose new name
- **Git errors**: Provide clear messages with recovery guidance
- **Network failures**: Fall back to branch-derived titles
- **Tool failures**: Show errors and do not continue

---

Begin initialization now. After completion, inform the user:

1. **Workflow structure created** at `.paw/work/<feature-slug>/`
2. **WorkflowContext.md ready** for review and editing
3. **Prompt files available on-demand**: Use `paw_generate_prompt` to create customizable prompt files when needed
4. **Next step**: Based on workflow mode, tell the user what command or action to take:
   - **Full mode**: Say `spec` to start the specification stage with the Spec Agent
   - **Minimal mode**: Say `research` to start code research with the Code Research Agent
   - **Custom mode**: Describe the appropriate first step based on custom instructions

Tell the user they can say `continue` to immediately start the first stage, or use the specific command shown above. Mention that `status` or `help` is available at any time, and `generate prompt for <stage>` creates a customizable prompt file if needed.

When the user says `continue`, use the `paw_call_agent` tool to invoke the handoff:
- **Full mode**: Hand off to PAW-01A Specification
- **Minimal mode**: Hand off to PAW-02A Code Researcher
- **Custom mode**: Hand off to the appropriate first agent based on custom instructions

Pass the generated feature slug as the work_id.
