# Workflow Configuration Presets

## Overview

Workflow configuration presets allow users to define named bundles of WorkflowContext settings that can be referenced by shorthand during PAW initialization. Instead of specifying workflow mode, review strategy, review policy, and review configurations individually each time, users say "paw this with thorough" and get a pre-configured workflow.

The system provides four built-in presets (quick, standard, thorough, team) and supports user-defined presets stored as YAML files in `~/.paw/presets/`. Presets support inheritance via `extends`, a default mechanism via `default: true`, and follow a clear precedence model: table defaults → user-level defaults → preset → explicit overrides.

## Architecture and Design

### How Preset Resolution Works

Preset resolution is agent-driven — the agent reads preset definitions (embedded in paw-init SKILL.md for built-ins, or YAML files on disk for user presets) and reasons about merging values. There is no programmatic YAML parser; the agent reads files as text.

Resolution flow during paw-init:
1. Apply table defaults from the Input Parameters table
2. Apply user-level defaults from `copilot-instructions.md` / `AGENTS.md`
3. If a preset was specified (or a default preset found), apply preset config — overrides steps 1-2
4. Apply explicit overrides from the user's current request
5. Run Configuration Validation on the merged result
6. Present configuration summary with provenance and confirm

### Design Decisions

**Presets override user-level defaults**: When a user explicitly names a preset, that intent should win over static config files they may have forgotten about. This was the primary cross-artifact consistency finding during planning review — all three review models converged on this ordering.

**Built-in presets embedded in SKILL.md**: Rather than separate reference files, the four built-in presets are defined as a table in the paw-init skill. This avoids file discovery complexity and keeps the presets as inline documentation. Token cost is ~700 tokens for the entire preset system addition.

**User presets as YAML files**: YAML is human-readable and widely understood. Each file is a self-contained preset. The `~/.paw/` directory is already established as PAW's user config home.

**Presetable field boundary**: Only workflow configuration fields (mode, strategy, policy, review settings, lifecycle) are presetable. Per-workflow fields (work title, branch, issue URL) are ignored with a warning if present in a preset.

### Integration Points

- **paw-init** (`skills/paw-init/SKILL.md`): Primary integration — accepts `preset` parameter, resolves and merges preset config
- **paw-status** (`skills/paw-status/SKILL.md`): Preset discovery — lists available presets from paw-init and `~/.paw/presets/`
- **`~/.paw/presets/`**: User preset storage, following the `~/.paw/` convention from CLI paths

## User Guide

### Basic Usage

Reference a built-in preset when starting a workflow:

- "paw this with quick" — minimal mode, no final review
- "paw this with standard" — full mode with balanced review gates
- "paw this with thorough" — full mode with SoT final review
- "paw this with team" — PR-based with every-stage review

### Creating Custom Presets

Create a YAML file in `~/.paw/presets/`:

```yaml
# ~/.paw/presets/my-setup.yaml
name: my-setup
description: My preferred workflow
config:
  workflow_mode: full
  review_strategy: local
  review_policy: planning-only
  final_review_mode: society-of-thought
  final_review_interaction_mode: debate
```

### Overrides

Combine a preset with explicit overrides:
- "paw this with thorough but final-pr-only review"
- Explicit values always win over preset values

### Inheritance

Use `extends` to create variations:

```yaml
name: quick-reviewed
extends: quick
config:
  final_agent_review: enabled
```

### Default Preset

Mark one preset as `default: true` for zero-config startup — just say "paw this".

## Configuration Options

### Preset File Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Preset name (matches filename) |
| `description` | Yes | Short description for listing |
| `default` | No | If `true`, applied when no preset specified |
| `extends` | No | Name of parent preset to inherit from |
| `config` | Yes | Map of WorkflowContext field overrides |

## Testing

### How to Test

1. Start a workflow with a built-in preset: "paw this with quick" — verify WorkflowContext.md reflects minimal/local/final-pr-only
2. Create a user preset YAML file, reference it by name — verify it resolves correctly
3. Use extends — verify inheritance merges correctly
4. Override a preset value — verify explicit override wins
5. Reference an unknown preset — verify error lists available presets
6. Set `default: true` on a preset, start without naming one — verify default applies

### Edge Cases

- Unknown fields in preset YAML are warned but don't fail (forward compatibility)
- Empty preset file is a no-op (all defaults apply)
- Missing `~/.paw/presets/` directory is skipped gracefully
- Circular extends chains are detected and reported
- Multiple presets with `default: true` triggers a conflict resolution prompt

## Limitations and Future Work

- **VS Code quick-pick integration**: Presets currently resolve from natural language in the chat panel. VS Code quick-pick UI integration is deferred.
- **No CLI management commands**: Users create/edit/delete preset YAML files directly. CLI commands for preset management may be added later.
- **Platform portability**: Presets with `session_policy` may behave differently on VS Code vs CLI. Avoid platform-specific fields or accept responsibility for cross-platform compatibility.
