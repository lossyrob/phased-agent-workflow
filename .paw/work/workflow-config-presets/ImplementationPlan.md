# Workflow Configuration Presets Implementation Plan

## Overview
Add named workflow configuration presets to PAW, enabling users to reference shorthand names (e.g., "paw this with quick") instead of specifying individual configuration fields. Built-in presets are embedded in the paw-init skill; user presets are YAML files in `~/.paw/presets/`. Presets support inheritance via `extends` and a default mechanism via `default: true`.

## Current State Analysis
- paw-init (`skills/paw-init/SKILL.md`) has a 3-step parameter resolution: table defaults → user-level defaults → confirmation summary
- No preset mechanism exists; users must specify all non-default config verbally each time
- paw-sot provides the closest precedence pattern: built-in → project → user → workflow with most-specific-wins
- `~/.paw/` is established as user config directory (`cli/lib/paths.js:53-54`); `~/.paw/personas/` and `~/.paw/perspectives/` already follow this convention
- paw-status can enumerate directories (`.paw/work/` scan pattern at `SKILL.md:126-129`)
- Skills in `skills/` can have `references/` directories read by agents at runtime (paw-sot demonstrates this)

## Desired End State
- paw-init resolves preset names to configuration bundles with precedence: table defaults → preset → user-level defaults → explicit overrides
- 4 built-in presets available without setup: `quick`, `standard`, `thorough`, `team`
- Users create custom YAML presets in `~/.paw/presets/` with inheritance via `extends`
- One preset can be marked `default: true` for zero-config startup
- paw-status lists available presets with descriptions
- All existing paw-init behavior preserved when no preset specified

## What We're NOT Doing
- CLI commands for preset CRUD (users edit YAML directly)
- VS Code quick-pick UI for preset selection (agent resolves from natural language)
- Custom aliases/shorthand mappings beyond `extends`
- Preset sharing, publishing, versioning, or migration
- Programmatic YAML parsing — agent reads and reasons over YAML text

## Phase Status
- [x] **Phase 1: Preset Support in paw-init** - Built-in presets, user preset loading, inheritance, defaults, validation, provenance
- [ ] **Phase 2: Preset Discovery & Documentation** - paw-status preset listing, user guide, Docs.md

## Phase Candidates
<!-- None currently -->

---

## Phase 1: Preset Support in paw-init

### Design Decisions

**Built-in preset storage**: Embed as YAML blocks in `skills/paw-init/SKILL.md`. Only 4 presets (~40 lines of YAML total). Avoids file discovery complexity and follows the pattern of embedding configuration directly in the skill. This is preferred over `references/presets/` files since the overhead is minimal and the presets serve as inline documentation.

**Preset YAML schema**: Use snake_case field names matching paw-init's parameter table (e.g., `review_policy`, not `Review Policy`). More natural for YAML, avoids space-handling issues, and aligns with how the agent already thinks about parameters.

**Preset file format**:
```yaml
name: my-preset
description: Short description for listing
default: false          # optional, default false
extends: base-preset    # optional, inheritance
config:
  workflow_mode: full
  review_strategy: local
  review_policy: planning-only
  # ... only fields to override
```

**Presetable fields** (configuration that belongs in `config:` block): `workflow_mode`, `review_strategy`, `review_policy`, `session_policy`, `artifact_lifecycle`, `final_agent_review`, `final_review_mode`, `final_review_interactive`, `final_review_models`, `final_review_specialists`, `final_review_interaction_mode`, `final_review_specialist_models`, `plan_generation_mode`, `plan_generation_models`, `planning_docs_review`, `planning_review_mode`, `planning_review_interactive`, `planning_review_models`.

**Not presetable** (per-workflow, ignored if present in preset): `work_title`, `work_id`, `base_branch`, `target_branch`, `custom_workflow_instructions`, `initial_prompt`, `issue_url`, `remote`, `artifact_paths`, `additional_inputs`.

**Resolution precedence**: table defaults → user-level defaults (copilot-instructions.md) → preset config → explicit user overrides → confirmation. An explicitly requested preset overrides user-level defaults because the user's intent to use that preset should win over background config files.

### Changes Required

- **`skills/paw-init/SKILL.md`**: 
  - Add new `preset` input parameter (optional, default: none) to parameter table
  - Add `## Preset System` section after Handling Missing Parameters defining:
    - Preset file schema (YAML format with name, description, default, extends, config)
    - Built-in preset definitions as embedded YAML blocks:
      - `quick`: `workflow_mode: minimal`, `review_strategy: local`, `review_policy: final-pr-only`, `planning_docs_review: disabled`, `final_agent_review: disabled`
      - `standard`: `workflow_mode: full`, `review_strategy: local`, `review_policy: milestones`, `planning_docs_review: enabled`, `planning_review_mode: multi-model`, `final_agent_review: enabled`, `final_review_mode: single-model`
      - `thorough`: `workflow_mode: full`, `review_strategy: local`, `review_policy: planning-only`, `planning_docs_review: enabled`, `planning_review_mode: multi-model`, `final_agent_review: enabled`, `final_review_mode: society-of-thought`, `final_review_interaction_mode: debate`
      - `team`: `workflow_mode: full`, `review_strategy: prs`, `review_policy: every-stage`, `planning_docs_review: enabled`, `planning_review_mode: multi-model`, `final_agent_review: enabled`, `final_review_mode: multi-model`
    - Model fields use intent strings (e.g., `latest GPT`) for portability; paw-init resolves to concrete names
    - Built-in preset definitions (quick, standard, thorough, team) as embedded YAML blocks
    - User preset location (`~/.paw/presets/<name>.yaml`)
    - Resolution algorithm: detect preset name → check user presets first (`~/.paw/presets/`), then built-in (user overrides built-in on name conflict per FR-010) → resolve `extends` chains (max depth 5, detect cycles) → merge with precedence
    - Default preset: if no preset specified and no explicit config, scan for `default: true` preset
    - Provenance tracking: configuration summary shows source of each field (preset/override/default)
  - Update parameter resolution flow (currently 3-step) to 4-step: table defaults → user-level defaults → preset → explicit overrides → confirmation
  - Note: presets override user-level defaults because an explicitly requested preset represents the user's current intent
  - Update Configuration Validation section to note validation runs on merged result (after preset + overrides)
  - Add error handling: unknown preset → list available; invalid YAML → report; circular extends → report; multiple defaults → ask user; unknown fields in config → warn but don't fail (forward compatibility); empty preset file → no-op (all defaults apply); missing `~/.paw/presets/` directory → skip gracefully

### Success Criteria

#### Automated Verification:
- [ ] Skill lint passes: `./scripts/lint-prompting.sh skills/paw-init/SKILL.md`

#### Manual Verification:
- [ ] Built-in preset definitions match Spec FR-002 table (quick, standard, thorough, team)
- [ ] Resolution flow clearly describes 5-step precedence
- [ ] Extends chain resolution documented with cycle detection
- [ ] Default preset mechanism documented with conflict handling
- [ ] Error cases covered (unknown preset, invalid YAML, circular extends, multiple defaults)
- [ ] Provenance display documented for configuration summary
- [ ] Preset schema defined with all fields

---

## Phase 2: Preset Discovery & Documentation

### Changes Required

- **`skills/paw-status/SKILL.md`**:
  - Add "List available presets" to Capabilities section
  - Add preset listing behavior: read built-in preset definitions from `skills/paw-init/SKILL.md` (the canonical source) + scan `~/.paw/presets/` directory for user presets
  - Display format: name, description, source (built-in/user), extends (if any), default marker
  - Add preset guidance to Help Mode ("Available presets: ..., create custom at ~/.paw/presets/")

- **`.paw/work/workflow-config-presets/Docs.md`**: Technical reference (load `paw-docs-guidance`)

- **`docs/guide/`**: Add presets section to relevant guide page (likely `getting-started.md` or create `presets.md`)
  - How to use built-in presets
  - How to create custom presets (YAML format, field reference)
  - Inheritance with `extends`
  - Setting a default preset
  - Listing available presets

- **`docs/specification/`**: Update workflow specification if preset behavior needs documenting at spec level

### Success Criteria

#### Automated Verification:
- [ ] Skill lint passes: `./scripts/lint-prompting.sh skills/paw-status/SKILL.md`
- [ ] Agent lint passes: `npm run lint:agent:all`
- [ ] Docs build passes: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] paw-status lists built-in and user presets with descriptions
- [ ] Help mode mentions presets as an option
- [ ] Docs.md covers preset system architecture and usage
- [ ] User guide covers preset creation and usage with examples
- [ ] All links valid in docs build

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/278
- Spec: `.paw/work/workflow-config-presets/Spec.md`
- Research: `.paw/work/workflow-config-presets/CodeResearch.md`
