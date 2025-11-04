# PAW Workflow Initialization

You are tasked with creating a complete PAW (Phased Agent Workflow) workflow directory structure.

## Parameters Provided

- **Target Branch**: {{TARGET_BRANCH}}
- **Issue URL**: {{ISSUE_URL}}
- **Workspace Path**: {{WORKSPACE_PATH}}

{{CUSTOM_INSTRUCTIONS}}

## Your Tasks

### 1. Generate Feature Slug

Normalize the target branch name into a valid feature slug following PAW rules:

**Normalization Steps:**
1. Remove standard prefixes like "feature/", "bugfix/", or "hotfix/" to extract the descriptive portion
2. Convert the remaining text to lowercase
3. Replace spaces and special characters with hyphens
4. Remove any characters that are not lowercase letters, numbers, or hyphens
5. Collapse consecutive hyphens into a single hyphen
6. Trim leading and trailing hyphens
7. Enforce a maximum length of 100 characters

**Validation Requirements:**
- Length must be between 1 and 100 characters
- Allowed characters: lowercase letters (a-z), numbers (0-9), hyphens (-) only
- No leading or trailing hyphens
- No consecutive hyphens
- Disallow reserved names: ".", "..", "node_modules", ".git", ".paw"

**Uniqueness Check:**
- Verify that `.paw/work/<slug>/` does not already exist
- If a conflict is detected, append -2, -3, etc. until a unique slug is found

**Normalization Examples:**
| Input | Normalized Slug |
|-------|-----------------|
| "User Authentication System" | user-authentication-system |
| "API Refactor v2" | api-refactor-v2 |
| "Fix: Rate Limit Bug" | fix-rate-limit-bug |
| "my_FEATURE--test" | my-feature-test |

### 2. Generate Work Title

{{WORK_TITLE_STRATEGY}}

**Branch-Based Generation{{WORK_TITLE_FALLBACK_INDICATOR}}:**
- Remove prefixes such as feature/, bugfix/, or hotfix/
- Split the remaining name on hyphens, underscores, and slashes
- Capitalize the first letter of each word
- Join words with spaces and keep the title concise (ideally 2-4 words)
- Example: feature/user-auth-system → User Auth System

### 3. Create Directory Structure

Create the following structure within the workspace:

```
.paw/work/<feature-slug>/
├── WorkflowContext.md
└── prompts/
    ├── 01A-spec.prompt.md
    ├── 01B-spec-research.prompt.md
    ├── 02A-code-research.prompt.md
    ├── 02B-impl-plan.prompt.md
    ├── 03A-implement.prompt.md
    ├── 03B-review.prompt.md
    ├── 04-docs.prompt.md
    ├── 05-pr.prompt.md
    └── 0X-status.prompt.md
```

### 4. Generate WorkflowContext.md

Create `.paw/work/<feature-slug>/WorkflowContext.md` using the exact format below:

```markdown
# WorkflowContext

Work Title: <generated_work_title>
Feature Slug: <generated_feature_slug>
Target Branch: {{TARGET_BRANCH}}
Issue URL: {{ISSUE_URL_FIELD}}
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**WorkflowContext.md Field Definitions:**

- **Work Title** (Required): 2-4 word human-readable name used in PR titles. Examples: "User Auth", "API Refactor", "Rate Limit Fix"
- **Feature Slug** (Required): Normalized identifier for artifact directory (e.g., "auth-system", "api-refactor-v2")
- **Target Branch** (Required): Git branch that will hold completed work (e.g., "feature/auth-system")
- **Issue URL** (Optional): URL to associated issue or work item (GitHub Issue or Azure DevOps Work Item), or "none" if not provided
- **Remote** (Required): Git remote name (default: "origin")
- **Artifact Paths** (Required): Location hint for workflow artifacts (default: "auto-derived" uses `.paw/work/<slug>/`)
- **Additional Inputs** (Optional): Comma-separated list of extra input files/URLs, or "none"

### 5. Call Language Model Tool to Generate Prompt Templates

After creating WorkflowContext.md, invoke the registered language model tool to create all nine prompt templates:

**Tool Call:**
```
paw_create_prompt_templates(
  feature_slug: "<generated_feature_slug>",
  workspace_path: "{{WORKSPACE_PATH}}"
)
```

The tool must produce these files under `.paw/work/<feature-slug>/prompts/`:
- 01A-spec.prompt.md
- 01B-spec-research.prompt.md
- 02A-code-research.prompt.md
- 02B-impl-plan.prompt.md
- 03A-implement.prompt.md
- 03B-review.prompt.md
- 04-docs.prompt.md
- 05-pr.prompt.md
- 0X-status.prompt.md

Each prompt template must follow this exact format:

```markdown
---
mode: <PAW-XX Agent Name>
---

<Instruction text> .paw/work/<feature-slug>/WorkflowContext.md
```

If the tool reports errors, surface the failure details to the user and stop the workflow.

### 6. Git Branch Operations

1. Check whether branch `{{TARGET_BRANCH}}` already exists locally with `git rev-parse --verify {{TARGET_BRANCH}}`
   - If it exists, prompt the user to either checkout the existing branch or provide a different name
2. Check for uncommitted changes with `git status --porcelain`
   - If changes exist, warn the user and confirm they want to proceed before creating the branch
3. Create and checkout the branch with `git checkout -b {{TARGET_BRANCH}}`
   - Handle command failures gracefully and provide actionable guidance if the operation cannot complete

### 7. Open WorkflowContext.md

When all steps succeed, open `.paw/work/<feature-slug>/WorkflowContext.md` in the editor so the user can review the generated details immediately.

## Error Handling Expectations

- **Slug conflicts**: Offer the user options to append a numeric suffix automatically, choose an alternate slug, or cancel the workflow
- **Existing branches**: Allow users to reuse the branch or choose a new name
- **Uncommitted changes**: Warn users before continuing and respect their decision
- **Git errors**: Provide clear error messages and suggested fixes (for example, commit changes or resolve conflicts)
- **Network failures**: If the issue or work item cannot be fetched, fall back to branch-derived titles and inform the user
- **Tool failures**: If `paw_create_prompt_templates` fails, show exact errors and do not continue to git operations

## Success Confirmation

Announce completion with a summary containing:
✅ Created directory: `.paw/work/<feature-slug>/`
✅ Generated WorkflowContext.md with all required fields
✅ Successfully called `paw_create_prompt_templates`
✅ Created nine prompt template files
✅ Created and checked out branch: `{{TARGET_BRANCH}}`
✅ Opened WorkflowContext.md in the editor

---

Begin initialization now and provide progress updates as each major step completes.
