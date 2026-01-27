---
name: paw-init
description: Bootstrap skill for PAW workflow initialization. Creates WorkflowContext.md, directory structure, and git branch. Runs before workflow skill is loaded.
---

# PAW Initialization

Bootstrap skill that initializes the PAW workflow directory structure. This runs **before** the workflow skill is loaded—WorkflowContext.md must exist for the workflow to function.

> **Note**: This is a bootstrap skill, not an activity skill. The PAW agent invokes it directly when no WorkflowContext.md exists.

## Capabilities

- Generate Work Title from issue URL, branch name, or user description
- Generate Feature Slug from Work Title (normalized, unique)
- Create `.paw/work/<feature-slug>/` directory structure
- Generate WorkflowContext.md with all configuration fields
- Create and checkout git branch (explicit or auto-derived)
- Commit initial artifacts if tracking is enabled
- Open WorkflowContext.md for review

## Input Parameters

| Parameter | Required | Values | Description |
|-----------|----------|--------|-------------|
| `target_branch` | Yes* | branch name or empty | Git branch for work (*empty = auto-derive) |
| `workflow_mode` | Yes | `full`, `minimal`, `custom` | Workflow complexity |
| `review_strategy` | Yes | `prs`, `local` | PR creation strategy |
| `review_policy` | No | `always`, `milestones`, `never` | When to pause for review (default: `milestones`) |
| `session_policy` | No | `per-stage`, `continuous` | Session context management (default: `per-stage`) |
| `track_artifacts` | No | boolean | Commit PAW artifacts (default: true) |
| `issue_url` | No | URL or empty | GitHub/Azure DevOps issue URL |
| `custom_instructions` | Conditional | text | Required if workflow_mode is `custom` |
| `work_description` | No | text | User-provided work description |

## Execution Steps

### 1. Generate Work Title

**If Issue URL provided:**
- Fetch issue title and use as Work Title basis
- Keep concise (2-4 words), capitalize appropriately

**If branch name provided (no issue):**
- Remove standard prefixes (`feature/`, `bugfix/`, `hotfix/`)
- Split on hyphens, underscores, slashes
- Capitalize first letter of each word
- Example: `feature/user-auth-system` → `User Auth System`

**If work description provided (no issue, no branch):**
- Extract key noun phrases (2-4 words)
- Capitalize appropriately

### 2. Generate Feature Slug

Create normalized slug from Work Title:

**Format rules:**
- Lowercase letters (a-z), numbers (0-9), hyphens (-) only
- No leading, trailing, or consecutive hyphens
- Length: 1-100 characters
- Not reserved: `.`, `..`, `node_modules`, `.git`, `.paw`

**Uniqueness:**
- Verify `.paw/work/<slug>/` doesn't exist
- If conflict: append `-2`, `-3`, etc. until unique

### 3. Validate Review Strategy

**Constraint:** If `workflow_mode` is `minimal`, `review_strategy` MUST be `local`.

If mismatch detected: STOP and report error to user.

### 4. Create Directory Structure

```
.paw/work/<feature-slug>/
├── WorkflowContext.md
└── prompts/
```

### 5. Generate WorkflowContext.md

Create `.paw/work/<feature-slug>/WorkflowContext.md`:

```markdown
# WorkflowContext

Work Title: <generated_work_title>
Feature Slug: <generated_feature_slug>
Target Branch: <target_branch>
Workflow Mode: <workflow_mode>
Review Strategy: <review_strategy>
Review Policy: <review_policy>
Session Policy: <session_policy>
Custom Workflow Instructions: <custom_instructions or "none">
Initial Prompt: <work_description or "none">
Issue URL: <issue_url or "none">
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**Field Descriptions:**

| Field | Description |
|-------|-------------|
| Work Title | 2-4 word human-readable name for PR titles |
| Feature Slug | Normalized identifier for artifact directory |
| Target Branch | Git branch holding completed work |
| Workflow Mode | `full`, `minimal`, or `custom` |
| Review Strategy | `prs` (intermediate PRs) or `local` (direct commits) |
| Review Policy | `always`, `milestones`, or `never` |
| Session Policy | `per-stage` or `continuous` |
| Custom Workflow Instructions | Free-text for custom mode, or "none" |
| Initial Prompt | User's work description if no issue, or "none" |
| Issue URL | Associated issue/work item URL, or "none" |
| Remote | Git remote name (default: "origin") |
| Artifact Paths | Location hint (default: "auto-derived") |
| Additional Inputs | Extra parameters, or "none" |

### 6. Create Git Branch

> Reference `paw-git-operations` for branch creation mechanics.

**If target_branch provided:**
- Create and checkout `target_branch`
- If branch exists: prompt user for resolution or checkout existing

**If auto-derive:**
- Derive branch name: `feature/<feature-slug>`
- Create and checkout derived branch
- If conflict: append suffix or prompt user

### 7. Artifact Tracking

**If track_artifacts is true:**
1. Stage WorkflowContext.md: `git add .paw/work/<feature-slug>/WorkflowContext.md`
2. Commit: `Initialize PAW workflow for <Work Title>`

**If track_artifacts is false:**
1. Create `.paw/work/<feature-slug>/.gitignore` with content `*`
2. Skip commit—artifacts remain local only

### 8. Open WorkflowContext.md

Open `.paw/work/<feature-slug>/WorkflowContext.md` in editor for review.

## Completion Response

Return to PAW agent:

```
Initialization complete.

Feature Slug: <feature-slug>
Workflow Mode: <workflow_mode>
Target Branch: <target_branch>

Next step based on Workflow Mode:
- full: Proceed to specification (`paw-spec`)
- minimal: Proceed to code research (`paw-code-research`)
- custom: Follow Custom Workflow Instructions
```

## Error Handling

| Error | Action |
|-------|--------|
| Slug conflict | Append suffix or prompt user |
| Branch exists | Prompt user: checkout existing or choose new name |
| Git error | Provide clear message with recovery guidance |
| Network failure | Fall back to branch-derived titles |
| Invalid review strategy | Stop and report constraint violation |

## Validation Checklist

- [ ] Feature slug is unique and valid format
- [ ] Review strategy valid for workflow mode
- [ ] WorkflowContext.md created with all fields
- [ ] Git branch created and checked out
- [ ] Artifacts committed (if tracking enabled)
- [ ] WorkflowContext.md opened for review
