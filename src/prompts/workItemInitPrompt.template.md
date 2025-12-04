# PAW Workflow Initialization

You are tasked with creating a complete PAW (Phased Agent Workflow) workflow directory structure.

## Parameters Provided

- **Target Branch**: {{TARGET_BRANCH}}
- **Branch Mode**: {{BRANCH_MODE}}
- **Workflow Mode**: {{WORKFLOW_MODE}}
- **Review Strategy**: {{REVIEW_STRATEGY}}
{{CUSTOM_INSTRUCTIONS_SECTION}}- **Issue URL**: {{ISSUE_URL}}
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
{{CUSTOM_INSTRUCTIONS_FIELD}}{{INITIAL_PROMPT_FIELD}}Issue URL: {{ISSUE_URL_FIELD}}
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
- **Custom Workflow Instructions** (Optional): Free-text workflow instructions for custom mode
- **Initial Prompt** (Optional): User's work description when no issue URL provided
- **Issue URL** (Optional): URL to associated issue/work item, or "none"
- **Remote** (Required): Git remote name (default: "origin")
- **Artifact Paths** (Required): Location hint for artifacts (default: "auto-derived")
- **Additional Inputs** (Optional): Comma-separated extra inputs, or "none"

### 5. Call Tool to Generate Prompt Templates

Determine which stages to include based on the workflow mode:

**Workflow Mode: full**
- All stages: spec, code-research, plan, implementation, implementation-review, pr-review-response, documentation, final-pr, status
- Generate all 10 prompt files

**Workflow Mode: minimal**
- Core stages only: code-research, plan, implementation, implementation-review, final-pr, status
- Generate 6 prompt files (skip spec and documentation stages)

**Workflow Mode: custom**
- Interpret the Custom Workflow Instructions to determine which stages to include
- Parse the instructions and generate only the required prompt files

**Review Strategy Validation:**
- If Workflow Mode is 'minimal', verify Review Strategy is 'local' (required constraint)
- If mismatch detected, stop and report error to user

Invoke the language model tool to create prompt template files:

```
paw_create_prompt_templates(
  feature_slug: "<generated_feature_slug>",
  workspace_path: "{{WORKSPACE_PATH}}",
  workflow_mode: "{{WORKFLOW_MODE}}",
  review_strategy: "{{REVIEW_STRATEGY}}"
)
```

If the tool reports errors, surface them to the user and stop.

### 6. Create and Checkout Git Branch

**If Branch Mode is "explicit":**
Ensure the branch `{{TARGET_BRANCH}}` is created and checked out. Handle conflicts (existing branch names) by prompting the user for resolution.

**If Branch Mode is "auto-derive":**
Use the branch name derived from the steps above. Create and checkout the derived branch. If conflicts exist with existing branches, append a suffix (-2, -3, etc.) or prompt user for resolution.

### 7. Open WorkflowContext.md

Open `.paw/work/<feature-slug>/WorkflowContext.md` in the editor for review.

## Error Handling

- **Slug conflicts**: Prompt user for alternate slug or auto-append suffix
- **Existing branches**: Ask user to checkout existing or choose new name
- **Git errors**: Provide clear messages with recovery guidance
- **Network failures**: Fall back to branch-derived titles
- **Tool failures**: Show errors and do not continue

---

Begin initialization now. After completion, instruct the user on the next step based on workflow mode:

- **Full mode**: Run the `01A-spec.prompt.md` to create the specification
- **Minimal mode**: Run the `02A-code-research.prompt.md` to begin code research
- **Custom mode**: Run the appropriate first prompt file based on custom instructions
