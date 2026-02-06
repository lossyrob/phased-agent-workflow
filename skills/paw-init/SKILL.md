---
name: paw-init
description: Bootstrap skill for PAW workflow initialization. Creates WorkflowContext.md, directory structure, and git branch. Runs before workflow skill is loaded.
---

# PAW Initialization

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), as bootstrap requires user input for workflow parameters.

Bootstrap skill that initializes the PAW workflow directory structure. This runs **before** the workflow skill is loaded—WorkflowContext.md must exist for the workflow to function.

## Capabilities

- Generate Work Title from issue URL, branch name, or user description
- Generate Work ID from Work Title (normalized, unique)
- Create `.paw/work/<work-id>/` directory structure
- Generate WorkflowContext.md with all configuration fields
- Create and checkout git branch (explicit or auto-derived)
- Commit initial artifacts if tracking is enabled
- Open WorkflowContext.md for review

## Input Parameters

| Parameter | Required | Default | Values |
|-----------|----------|---------|--------|
| `base_branch` | No | `main` | branch name |
| `target_branch` | No | auto-derive from work ID | branch name |
| `workflow_mode` | No | `full` | `full`, `minimal`, `custom` |
| `review_strategy` | No | `prs` (`local` if minimal) | `prs`, `local` |
| `review_policy` | No | `milestones` | `always`, `milestones`, `planning-only`, `never` |
| `session_policy` | No | `per-stage` | `per-stage`, `continuous` |
| `track_artifacts` | No | `true` | boolean |
| `issue_url` | No | none | URL |
| `custom_instructions` | Conditional | — | text (required if `workflow_mode` is `custom`) |
| `work_description` | No | none | text |
| `final_agent_review` | No | `enabled` | `enabled`, `disabled` |
| `final_review_mode` | No | `multi-model` | `single-model`, `multi-model` |
| `final_review_interactive` | No | `true` | boolean |
| `final_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |
| `planning_mode` | No | `single-model` | `single-model`, `multi-model`, `multi-model-deep` |
| `planning_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |
| `plan_review_mode` | No | `single-model` | `single-model`, `multi-model` |
| `plan_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |

### Handling Missing Parameters

When parameters are not provided:
1. Apply defaults from the table above
2. Check user-level defaults in `copilot-instructions.md` or `AGENTS.md` (these override table defaults)
3. **Present configuration summary** and ask for confirmation before proceeding
4. If user requests changes, update values and re-confirm

This mirrors the VS Code command flow which prompts sequentially but allows skipping with defaults.

## Desired End States

### Work Title
- A 2-4 word human-readable name exists
- Sources (priority order): issue title → branch name → work description
- Capitalized appropriately (e.g., `User Auth System`)

### Work ID
- Unique within `.paw/work/`
- Format: lowercase letters, numbers, hyphens only; 1-100 chars
- No leading/trailing/consecutive hyphens
- Not reserved (`.`, `..`, `node_modules`, `.git`, `.paw`)
- If conflict: append `-2`, `-3`, etc.

### Configuration Validation
- If `workflow_mode` is `minimal`, `review_strategy` MUST be `local`
- If `review_policy` is `planning-only` or `never`, `review_strategy` MUST be `local`
- Invalid combinations: STOP and report error

### Directory Structure
```
.paw/work/<work-id>/
└── WorkflowContext.md
```

### WorkflowContext.md
Created at `.paw/work/<work-id>/WorkflowContext.md` with all input parameters:

```markdown
# WorkflowContext

Work Title: <generated_work_title>
Work ID: <generated_work_id>
Base Branch: <base_branch>
Target Branch: <target_branch>
Workflow Mode: <workflow_mode>
Review Strategy: <review_strategy>
Review Policy: <review_policy>
Session Policy: <session_policy>
Final Agent Review: <final_agent_review>
Final Review Mode: <final_review_mode>
Final Review Interactive: <final_review_interactive>
Final Review Models: <final_review_models>
Planning Mode: <planning_mode>
Planning Models: <planning_models>
Plan Review Mode: <plan_review_mode>
Plan Review Models: <plan_review_models>
Custom Workflow Instructions: <custom_instructions or "none">
Initial Prompt: <work_description or "none">
Issue URL: <issue_url or "none">
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

### Git Branch
> Branch creation and checkout follows `paw-git-operations` patterns.

**Branch creation sequence** (REQUIRED):
1. Checkout base branch: `git checkout <base_branch>`
2. Update base: `git pull origin <base_branch> --ff-only`
3. Create feature branch: `git checkout -b <target_branch>`

Never create feature branch from current HEAD without explicit checkout of base.

- Target branch exists and is checked out
- If explicit branch provided: use as-is (prompt if exists)
- If auto-derive: `feature/<work-id>`

### Artifact Tracking
- **If tracking enabled**: WorkflowContext.md committed with message `Initialize PAW workflow for <Work Title>`
- **If tracking disabled**: `.gitignore` with `*` created in work directory

### User Review
- WorkflowContext.md presented for user review/confirmation

## Completion Response

Report initialization results to PAW agent including: work ID, workflow mode, target branch, and the recommended next step based on workflow mode (full → spec, minimal → code research, custom → per instructions).

## Validation Checklist

- [ ] Work ID is unique and valid format
- [ ] Review strategy valid for workflow mode
- [ ] WorkflowContext.md created with all fields
- [ ] Git branch created and checked out
- [ ] Artifacts committed (if tracking enabled)
- [ ] WorkflowContext.md opened for review
