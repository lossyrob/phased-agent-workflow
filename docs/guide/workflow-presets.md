# Workflow Presets

Presets are named bundles of workflow configuration that simplify PAW initialization. Instead of specifying individual settings each time, reference a preset by name.

## Using Presets

Reference a preset when starting a workflow:

```
paw this with quick
paw this issue with thorough
paw this with my-setup but final-pr-only review
```

Explicit overrides always take precedence over preset values.

## Built-in Presets

PAW ships with four presets covering common patterns:

| Preset | Description |
|--------|-------------|
| **quick** | Minimal mode, local strategy, final-pr-only review. No planning docs review or final review. |
| **standard** | Full mode with milestones review, multi-model planning review, single-model final review. |
| **thorough** | Full mode with planning-only review, multi-model planning review, SoT debate final review. |
| **team** | Full mode with PRs strategy, every-stage review, multi-model planning and final review. |

See `skills/paw-init/SKILL.md` for the canonical YAML definitions with exact field values. Fields not specified by a preset use PAW's standard defaults.

## Custom Presets

Create YAML files in `~/.paw/presets/` to define custom presets:

```yaml
name: my-setup
description: My preferred workflow configuration
config:
  workflow_mode: full
  review_strategy: local
  review_policy: planning-only
  planning_docs_review: enabled
  planning_review_mode: multi-model
  final_agent_review: enabled
  final_review_mode: society-of-thought
  final_review_interaction_mode: debate
  artifact_lifecycle: commit-and-clean
```

The filename (minus `.yaml`) is the preset name. Only include fields you want to override — unspecified fields use PAW defaults.

### Inheritance

A preset can extend another using the `extends` field:

```yaml
name: quick-with-review
description: Quick preset but with final review enabled
extends: quick
config:
  final_agent_review: enabled
  final_review_mode: single-model
```

Extends chains are supported (up to 5 levels deep). The most-specific preset wins for each field.

### Default Preset

Mark a preset as default to apply it automatically when no preset is specified:

```yaml
name: my-default
description: Applied automatically
default: true
config:
  review_policy: planning-only
  planning_docs_review: enabled
```

Only one preset can be marked as default. If multiple defaults exist, PAW reports the conflict.

## Precedence

When resolving configuration, PAW applies values in this order (lowest to highest priority):

1. **Table defaults** — PAW's built-in default values
2. **User-level defaults** — Settings from `copilot-instructions.md` or `AGENTS.md`
3. **Preset** — Values from the referenced (or default) preset
4. **Explicit overrides** — Values specified in the current request

This means an explicitly requested preset overrides any background configuration files.

## Discovering Presets

Ask PAW to list available presets:

```
paw status — list presets
what presets are available?
```

This shows both built-in and user-defined presets with descriptions.

## User Presets Override Built-ins

If you create a user preset with the same name as a built-in (e.g., `~/.paw/presets/quick.yaml`), your version takes precedence.
