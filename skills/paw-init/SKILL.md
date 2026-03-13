---
name: paw-init
description: Bootstrap skill for PAW workflow initialization. Creates WorkflowContext.md, directory structure, and git branch. Runs before workflow skill is loaded.
---

# PAW Initialization

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), as bootstrap requires user input for workflow parameters.

Bootstrap skill that initializes the PAW workflow directory structure. This runs **before** the workflow skill is loaded—WorkflowContext.md must exist for the workflow to function.

## Capabilities

- Generate Work Title from issue URL, branch name, or user description
- Generate Work ID from Work Title (normalized, unique) unless `work_id` is provided explicitly
- Create `.paw/work/<work-id>/` directory structure
- Generate WorkflowContext.md with all configuration fields
- Create and checkout git branch (explicit or auto-derived)
- Commit initial artifacts if lifecycle mode allows it
- Open WorkflowContext.md for review

## Input Parameters

| Parameter | Required | Default | Values |
|-----------|----------|---------|--------|
| `base_branch` | No | `main` | branch name |
| `work_id` | No | auto-derived from Work Title | lowercase slug |
| `target_branch` | No | auto-derive from work ID | branch name |
| `execution_mode` | No | `current-checkout` | `current-checkout`, `worktree` |
| `repository_identity` | No | `none` | portable repository identity string |
| `execution_binding` | No | `none` | portable execution binding string |
| `preset` | No | none | preset name (built-in or user-defined) |
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
| `final_review_perspectives` | No | `auto` | `none`, `auto`, comma-separated perspective names |
| `final_review_perspective_cap` | No | `2` | positive integer |
| `implementation_model` | No | `none` | `none` (session default), or model name/intent (e.g., `gpt-5.4`, `claude-opus-4.6-1m`, `latest Claude Opus`) |
| `plan_generation_mode` | No | `single-model` | `single-model`, `multi-model` |
| `plan_generation_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |
| `planning_docs_review` | No | `enabled` (`disabled` if minimal) | `enabled`, `disabled` |
| `planning_review_mode` | No | `multi-model` | `single-model`, `multi-model`, `society-of-thought` |
| `planning_review_interactive` | No | `smart` | `true`, `false`, `smart` |
| `planning_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |
| `planning_review_specialists` | No | `all` | `all`, comma-separated names, or `adaptive:<N>` (e.g., `adaptive:3`) |
| `planning_review_interaction_mode` | No | `parallel` | `parallel`, `debate` |
| `planning_review_specialist_models` | No | `none` | `none`, model pool, pinned pairs, or mixed (see below) |
| `planning_review_perspectives` | No | `auto` | `none`, `auto`, comma-separated perspective names |
| `planning_review_perspective_cap` | No | `2` | positive integer |

### Handling Missing Parameters

When parameters are not provided:
1. Apply defaults from the table above
2. Check user-level defaults in `copilot-instructions.md` or `AGENTS.md` (these override table defaults)
3. If a `preset` was specified, apply preset configuration (overrides steps 1-2 for fields the preset defines)
4. Apply any explicit user overrides from the current request (override everything)
5. **Present configuration summary** showing the source of each non-default field (preset, user-default, or explicit override) and ask for confirmation
6. If user requests changes, update values and re-confirm

Precedence (lowest → highest): table defaults → user-level defaults → preset → explicit overrides.

This mirrors the VS Code command flow which prompts sequentially but allows skipping with defaults.

## Preset System

Presets are named bundles of configuration fields that simplify workflow initialization. Users reference a preset by name (e.g., "paw this with quick") instead of specifying individual fields.

### Preset File Schema

```yaml
name: my-preset
description: Short description for listing
default: false          # optional; if true, applied when no preset specified
extends: base-preset    # optional; inherit from another preset
initial_activity: spec  # optional; spec (default), work-shaping, code-research
config:
  workflow_mode: full
  review_strategy: local
  # ... only fields to override
```

**Presetable fields**: All configuration fields from the Input Parameters table above. **Not presetable** (per-workflow, ignored with warning if present in `config:`): `base_branch`, `target_branch`, `preset`, `issue_url`, `custom_instructions`, `work_description`. Fields not in the Input Parameters table (e.g., `work_title`, `work_id`, `remote`) are always non-presetable.

### Built-in Presets

Canonical definitions live in `references/presets/<name>.yaml`. Load the specific preset file when resolving.

| Preset | Description |
|--------|-------------|
| `quick` | Minimal ceremony — burns through with no reviews |
| `standard` | Balanced local workflow with milestone review gates |
| `thorough` | Maximum rigor — multi-model planning, SoT debate final |
| `team` | PR-based collaboration with every-stage review |
| `auto` | Autonomous full workflow, only pauses at final PR |
| `auto-full` | Auto + multi-model planning with perspectives + SoT debate final |
| `shaping-full` | Work shaping then auto-full (interactive shaping, auto everything else) |

### User Presets

User presets are YAML files at `~/.paw/presets/<name>.yaml`. The filename (minus extension) is the preset name.

### Preset Resolution

When a preset is specified (explicitly or via default):

1. **Lookup**: Check `~/.paw/presets/` first, then `references/presets/` for built-in. User presets override built-in presets of the same name.
2. **Inheritance**: If preset has `extends`, resolve the base preset recursively (max depth 5). Detect circular chains and report error.
3. **Merge**: Apply fields from base → child (most-specific-wins for each field).
4. **Validate**: Run Configuration Validation on the merged result.
5. **Initial activity**: If the resolved preset has `initial_activity`, use it for the completion response recommendation instead of the workflow-mode default.

**Default preset**: If no preset specified, scan user presets for one with `default: true`. If found, apply it. If multiple defaults found, report conflict and ask user. If none found, use standard PAW defaults. The precedence chain ensures explicit overrides still win over default preset values.

### Error Handling

- **Unknown preset**: Report not found, list available (built-in + user)
- **Invalid YAML / circular extends / multiple defaults**: Report error, ask user to resolve
- **Unknown fields in `config:`**: Warn but don't fail (forward compatibility)
- **Empty preset / missing `~/.paw/presets/`**: Skip gracefully (no-op / no user presets)

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
- If `work_id` is provided explicitly, validate and use it instead of regenerating it from the Work Title
- If conflict: append `-2`, `-3`, etc.

### Configuration Validation
- If `workflow_mode` is `minimal`, `review_strategy` MUST be `local`
- If `review_policy` is `planning-only` or `final-pr-only`, `review_strategy` MUST be `local`
- If `final_review_mode` is `society-of-thought`, `final_agent_review` MUST be `enabled`
- If `planning_review_mode` is `society-of-thought`, `planning_docs_review` MUST be `enabled`
- Invalid combinations: STOP and report error

### Model Resolution
Resolve model intents to concrete model names wherever they appear (e.g., "latest GPT" → `gpt-5.2`, "latest Gemini" → `gemini-3-pro-preview`, "latest Claude Opus" → `claude-opus-4.6`). This applies to `final_review_models`, `plan_generation_models`, `implementation_model`, and all specialist model fields. Present resolved models for user confirmation and store **resolved concrete model names** in WorkflowContext.md (not the intent strings).

This ensures model selection is a one-time upfront decision during init, not a per-stage interruption.

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
- `final_review_perspectives` becomes relevant — validate: `none`, `auto`, or comma-separated perspective names
- `final_review_perspective_cap` becomes relevant — validate: positive integer
- Present society-of-thought config as part of the configuration summary

### Planning Review Society-of-Thought Configuration (society-of-thought only)
When `planning_review_mode` is `society-of-thought`:
- `planning_review_specialists` and `planning_review_interaction_mode` become relevant — validate using the same rules as final review (specialist values, interaction mode)
- `planning_review_specialist_models` becomes relevant — validate format using the same rules as `final_review_specialist_models` (none, pool, pinning, mixed)
- `planning_review_models` is ignored (use `planning_review_specialist_models` for model diversity with society-of-thought)
- `planning_review_perspectives` becomes relevant — validate: `none`, `auto`, or comma-separated perspective names
- `planning_review_perspective_cap` becomes relevant — validate: positive integer
- Present planning review society-of-thought config as part of the configuration summary

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
Work ID: <work_id or generated_work_id>
Base Branch: <base_branch>
Target Branch: <target_branch>
Execution Mode: <execution_mode>
Repository Identity: <repository_identity or "none">
Execution Binding: <execution_binding or "none">
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
Final Review Perspectives: <final_review_perspectives>
Final Review Perspective Cap: <final_review_perspective_cap>
Implementation Model: <implementation_model or "none">
Plan Generation Mode: <plan_generation_mode>
Plan Generation Models: <plan_generation_models>
Planning Docs Review: <planning_docs_review>
Planning Review Mode: <planning_review_mode>
Planning Review Interactive: <planning_review_interactive>
Planning Review Models: <planning_review_models>
Planning Review Specialists: <planning_review_specialists>
Planning Review Interaction Mode: <planning_review_interaction_mode>
Planning Review Specialist Models: <planning_review_specialist_models>
Planning Review Perspectives: <planning_review_perspectives>
Planning Review Perspective Cap: <planning_review_perspective_cap>
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

Report initialization results to PAW agent including: work ID, workflow mode, target branch, and the recommended next step. Next step defaults by workflow mode (full → spec, minimal → code research, custom → per instructions) but is overridden by the preset's `initial_activity` if set (e.g., `work-shaping`).

## Validation Checklist

- [ ] Work ID is unique and valid format
- [ ] Review strategy valid for workflow mode
- [ ] WorkflowContext.md created with all fields
- [ ] Git branch created and checked out
- [ ] Artifacts committed (if lifecycle is `commit-and-clean` or `commit-and-persist`)
- [ ] WorkflowContext.md opened for review
