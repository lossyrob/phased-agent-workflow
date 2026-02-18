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
- Commit initial artifacts if lifecycle mode allows it
- Open WorkflowContext.md for review

## Input Parameters

| Parameter | Required | Default | Values |
|-----------|----------|---------|--------|
| `base_branch` | No | `main` | branch name |
| `target_branch` | No | auto-derive from work ID | branch name |
| `workflow_mode` | No | `full` | `full`, `minimal`, `custom` |
| `review_strategy` | No | `prs` (`local` if minimal) | `prs`, `local` |
| `review_policy` | No | `milestones` | `every-stage`, `milestones`, `planning-only`, `final-pr-only` |
{{#vscode}}
| `session_policy` | No | `per-stage` | `per-stage`, `continuous` |
{{/vscode}}
{{#cli}}
| `session_policy` | No | `continuous` | `continuous` |
{{/cli}}
| `artifact_lifecycle` | No | `commit-and-clean` | `commit-and-clean`, `commit-and-persist`, `never-commit` |
| `issue_url` | No | none | URL |
| `custom_instructions` | Conditional | — | text (required if `workflow_mode` is `custom`) |
| `work_description` | No | none | text |
| `final_agent_review` | No | `enabled` | `enabled`, `disabled` |
| `final_review_mode` | No | `multi-model` | `single-model`, `multi-model`, `society-of-thought` |
| `final_review_interactive` | No | `smart` | `true`, `false`, `smart` |
| `final_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |
| `final_review_specialists` | No | `all` | `all`, comma-separated names, or `adaptive:<N>` (e.g., `adaptive:3`) |
| `final_review_interaction_mode` | No | `parallel` | `parallel`, `debate` |
| `final_review_specialist_models` | No | `none` | `none`, model pool, pinned pairs, or mixed (see below) |
| `planning_docs_review` | No | `enabled` (`disabled` if minimal) | `enabled`, `disabled` |
| `planning_review_mode` | No | `multi-model` | `single-model`, `multi-model` |
| `planning_review_interactive` | No | `smart` | `true`, `false`, `smart` |
| `planning_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |

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
- If `review_policy` is `planning-only` or `final-pr-only`, `review_strategy` MUST be `local`
- If `final_review_mode` is `society-of-thought`, `final_agent_review` MUST be `enabled`
- Invalid combinations: STOP and report error

### Model Resolution (multi-model only)
When `final_review_mode` is `multi-model`:
- Resolve model intents to concrete model names (e.g., "latest GPT" → `gpt-5.2`, "latest Gemini" → `gemini-3-pro-preview`, "latest Claude Opus" → `claude-opus-4.6`)
- Present the resolved models for user confirmation as part of the configuration summary
- If user requests changes, update the model list accordingly
- Store the **resolved concrete model names** in WorkflowContext.md (not the intent strings)

This ensures model selection is a one-time upfront decision during init, not a per-review-gate interruption.

### Society-of-Thought Configuration (society-of-thought only)
When `final_review_mode` is `society-of-thought`:
- `final_review_specialists` and `final_review_interaction_mode` become relevant
- Validate specialist values: `all`, comma-separated specialist names, or `adaptive:<N>` where N is a positive integer
- Validate interaction mode: `parallel` or `debate`
- `final_review_specialist_models` becomes relevant — validate format:
  - `none` (default): all specialists use session default model
  - **Pool**: comma-separated model names (e.g., `gpt-5.3-codex, claude-opus-4.6`) — distributed round-robin across specialists
  - **Pinning**: `specialist:model` pairs (e.g., `security:claude-opus-4.6, architecture:gpt-5.3-codex`) — explicit assignment
  - **Mixed**: combination of pinned pairs and pool models (e.g., `security:claude-opus-4.6, gpt-5.3-codex, gemini-3-pro-preview`) — pinned specialists get their model, unpinned draw from pool round-robin
  - Resolve model intents (e.g., `latest GPT`) using existing model intent resolution
- `final_review_models` is ignored (use `final_review_specialist_models` for model diversity with society-of-thought)
- Present society-of-thought config as part of the configuration summary

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
Final Review Specialists: <final_review_specialists>
Final Review Interaction Mode: <final_review_interaction_mode>
Final Review Specialist Models: <final_review_specialist_models>
Planning Docs Review: <planning_docs_review>
Planning Review Mode: <planning_review_mode>
Planning Review Interactive: <planning_review_interactive>
Planning Review Models: <planning_review_models>
Custom Workflow Instructions: <custom_instructions or "none">
Initial Prompt: <work_description or "none">
Issue URL: <issue_url or "none">
Remote: origin
Artifact Lifecycle: <artifact_lifecycle>
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

### Artifact Lifecycle
- **`commit-and-clean` or `commit-and-persist`**: WorkflowContext.md committed with message `Initialize PAW workflow for <Work Title>`
- **`never-commit`**: `.gitignore` with `*` created in work directory; WorkflowContext.md is NOT committed

### User Review
- WorkflowContext.md presented for user review/confirmation

## Completion Response

Report initialization results to PAW agent including: work ID, workflow mode, target branch, and the recommended next step based on workflow mode (full → spec, minimal → code research, custom → per instructions).

## Validation Checklist

- [ ] Work ID is unique and valid format
- [ ] Review strategy valid for workflow mode
- [ ] WorkflowContext.md created with all fields
- [ ] Git branch created and checked out
- [ ] Artifacts committed (if lifecycle is `commit-and-clean` or `commit-and-persist`)
- [ ] WorkflowContext.md opened for review
