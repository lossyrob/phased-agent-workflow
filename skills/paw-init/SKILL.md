---
name: paw-init
description: Bootstrap skill for PAW workflow initialization. Creates WorkflowContext.md, directory structure, and git branch. Runs before workflow skill is loaded.
---

# PAW Initialization

Bootstrap skill that initializes the PAW workflow directory structure. This runs **before** the workflow skill is loaded—WorkflowContext.md must exist for the workflow to function.

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

## Desired End States

### Work Title
- A 2-4 word human-readable name exists
- Sources (priority order): issue title → branch name → work description
- Capitalized appropriately (e.g., `User Auth System`)

### Feature Slug
- Unique within `.paw/work/`
- Format: lowercase letters, numbers, hyphens only; 1-100 chars
- No leading/trailing/consecutive hyphens
- Not reserved (`.`, `..`, `node_modules`, `.git`, `.paw`)
- If conflict: append `-2`, `-3`, etc.

### Configuration Validation
- If `workflow_mode` is `minimal`, `review_strategy` MUST be `local`
- Invalid combinations: STOP and report error

### Directory Structure
```
.paw/work/<feature-slug>/
├── WorkflowContext.md
└── prompts/
```

### WorkflowContext.md
Created at `.paw/work/<feature-slug>/WorkflowContext.md` with all input parameters:

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

### Git Branch
> Branch creation and checkout follows `paw-git-operations` patterns.

- Target branch exists and is checked out
- If explicit branch provided: use as-is (prompt if exists)
- If auto-derive: `feature/<feature-slug>`

### Artifact Tracking
- **If tracking enabled**: WorkflowContext.md committed with message `Initialize PAW workflow for <Work Title>`
- **If tracking disabled**: `.gitignore` with `*` created in work directory

### User Review
- WorkflowContext.md presented for user review/confirmation

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
