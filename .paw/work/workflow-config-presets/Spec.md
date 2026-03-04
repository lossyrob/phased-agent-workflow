# Feature Specification: Workflow Configuration Presets

**Branch**: feature/workflow-config-presets  |  **Created**: 2026-03-04  |  **Status**: Draft
**Input Brief**: Named bundles of WorkflowContext configuration for quick PAW initialization

## Overview

Starting a PAW workflow requires specifying numerous configuration fields — workflow mode, review strategy, review policy, final review settings, planning review configuration, artifact lifecycle, and more. Users who have developed preferred configurations must re-specify them verbally every time they start a new workflow, leading to verbose startup prompts and risk of misconfiguration.

Workflow configuration presets solve this by letting users define named bundles of WorkflowContext settings that can be referenced by shorthand during initialization. A user can say "paw this with thorough" instead of listing every field. Presets support inheritance, allowing lightweight aliases that extend a base preset with overrides.

The system ships with built-in presets covering common patterns (quick fixes, standard workflows, thorough review pipelines, team collaboration). Users create custom presets as YAML files in `~/.paw/presets/`, and can set a default so that "paw this" applies their preferred configuration automatically. paw-init resolves presets at initialization time using a clear precedence: explicit user instructions override preset values, which override PAW defaults.

## Objectives

- Enable users to start workflows with minimal configuration by referencing named presets
- Provide sensible built-in presets covering common workflow patterns
- Allow users to define, customize, and share preset configurations
- Support preset inheritance so aliases and variations are lightweight
- Maintain backward compatibility — presets are optional, explicit configuration still works

## User Scenarios & Testing

### User Story P1 – Start Workflow with Built-in Preset
Narrative: A developer starting a quick bug fix says "paw this with quick" and gets a minimal-ceremony workflow without specifying individual settings.
Independent Test: User references a built-in preset name during paw-init and WorkflowContext.md reflects the preset's configuration.
Acceptance Scenarios:
1. Given paw-init receives "use the quick preset", When initialization completes, Then WorkflowContext.md contains the quick preset's configuration values
2. Given user says "paw this with standard", When initialization completes, Then WorkflowContext.md reflects standard preset values with PAW defaults filling unspecified fields
3. Given user references an unknown preset name, When paw-init processes it, Then paw-init reports the preset was not found and lists available presets

### User Story P2 – Create and Use Custom Preset
Narrative: A power user creates a YAML file in `~/.paw/presets/` defining their preferred workflow configuration, then references it by name in future workflows.
Independent Test: User creates a preset file, then starts a workflow referencing it, and WorkflowContext.md reflects the custom configuration.
Acceptance Scenarios:
1. Given a valid preset YAML file exists at `~/.paw/presets/my-setup.yaml`, When user says "paw this with my-setup", Then WorkflowContext.md reflects the preset's configuration
2. Given a preset file has invalid field values, When paw-init loads it, Then paw-init reports validation errors before proceeding
3. Given a user preset has the same name as a built-in preset, When referenced, Then the user preset takes precedence

### User Story P3 – Override Preset Values
Narrative: A user applies a preset but needs one setting different for this particular workflow, saying "paw this with thorough but final-pr-only review."
Independent Test: User references a preset with explicit overrides and WorkflowContext.md reflects the merged configuration.
Acceptance Scenarios:
1. Given user says "use thorough preset but with final-pr-only review", When initialization completes, Then WorkflowContext.md has thorough preset values except review_policy is final-pr-only
2. Given multiple overrides on a preset, When initialization completes, Then all overrides are applied and remaining fields come from preset

### User Story P4 – Set Default Preset
Narrative: A user who always uses the same configuration marks a preset as default so they can say "paw this" without specifying a preset name.
Independent Test: User marks a preset as default, starts a workflow without naming a preset, and WorkflowContext.md reflects the default preset's configuration.
Acceptance Scenarios:
1. Given a preset file contains `default: true`, When user starts a workflow without specifying a preset, Then the default preset is applied
2. Given multiple presets have `default: true`, When paw-init loads presets, Then paw-init reports the conflict and asks user to resolve
3. Given no default preset exists, When user starts without a preset, Then paw-init uses standard PAW defaults (current behavior)

### User Story P5 – Preset Inheritance (Aliases)
Narrative: A user creates a lightweight preset that extends another, only overriding specific fields — effectively creating an alias with modifications.
Independent Test: User creates a preset with `extends` field and references it; WorkflowContext.md reflects the merged base + override configuration.
Acceptance Scenarios:
1. Given a preset with `extends: thorough` and `config.review_policy: final-pr-only`, When referenced, Then configuration inherits all thorough values with review_policy overridden
2. Given a chain of extends (a extends b extends c), When resolved, Then fields merge in order: c → b → a (most specific wins)
3. Given extends references a nonexistent preset, When paw-init loads it, Then paw-init reports the missing base preset

### User Story P6 – Discover Available Presets
Narrative: A user wants to see what presets are available before starting a workflow.
Independent Test: User asks to list presets and sees built-in and custom presets with descriptions.
Acceptance Scenarios:
1. Given built-in and user presets exist, When user asks paw-status to list presets, Then both sets are displayed with names and descriptions
2. Given a preset has the `extends` field, When listed, Then the base preset is shown alongside the preset name

### Edge Cases
- Preset YAML with unknown fields: Warn but don't fail (forward compatibility)
- Preset with fields that violate validation rules (e.g., `planning-only` review with `prs` strategy): Fail fast with clear error during init
- Empty preset file: Treated as no-op (all PAW defaults apply)
- Circular extends chain: Detect and report error
- Preset directory doesn't exist yet: Create it on first preset save, or skip gracefully when loading

## Requirements

### Functional Requirements
- FR-001: paw-init accepts a preset name parameter and resolves it to configuration values (Stories: P1, P2)
- FR-002: Built-in presets are shipped with the PAW repository and discoverable by paw-init without user setup (Stories: P1)
- FR-003: User presets are YAML files in `~/.paw/presets/` with a defined schema (Stories: P2)
- FR-004: Explicit user instructions override preset values, which override PAW defaults (Stories: P3)
- FR-005: A preset can declare `default: true` to be applied when no preset is specified (Stories: P4)
- FR-006: A preset can declare `extends: <preset-name>` to inherit from another preset (Stories: P5)
- FR-007: Preset inheritance chains are resolved with most-specific-wins merge semantics (Stories: P5)
- FR-008: paw-init validates merged configuration and reports errors before creating WorkflowContext.md (Stories: P1, P2, P3)
- FR-009: Available presets (built-in and user) are discoverable via paw-status (Stories: P6)
- FR-010: User presets with the same name as built-in presets take precedence (Stories: P2)
- FR-011: paw-init presents the resolved configuration summary (showing which values came from preset vs override vs default) for user confirmation (Stories: P1, P2, P3)

### Key Entities
- **Preset**: A named bundle of WorkflowContext configuration fields with optional metadata (description, default flag, extends reference)
- **Built-in Preset**: A preset shipped with the PAW repository, available without user configuration
- **User Preset**: A preset created by the user in `~/.paw/presets/`

### Cross-Cutting / Non-Functional
- Preset loading adds negligible overhead to paw-init (directory scan of small YAML files)
- Preset schema is forward-compatible (unknown fields warned, not rejected)

## Success Criteria
- SC-001: A user can start a workflow by referencing a preset name and get correct WorkflowContext.md configuration (FR-001, FR-002, FR-003)
- SC-002: Explicit overrides on top of a preset are correctly merged into the final configuration (FR-004)
- SC-003: A default preset is automatically applied when no preset is specified (FR-005)
- SC-004: Preset inheritance produces correctly merged configuration with most-specific-wins semantics (FR-006, FR-007)
- SC-005: Invalid preset configurations are caught and reported before WorkflowContext.md creation (FR-008)
- SC-006: Users can discover all available presets with descriptions (FR-009)
- SC-007: User presets override built-in presets of the same name (FR-010)

## Assumptions
- The `~/.paw/` directory is an acceptable location for user presets (aligns with existing PAW CLI conventions)
- YAML is the appropriate format for preset files (human-readable, widely understood)
- Built-in presets can be embedded in the paw-init skill's prompt text or stored as reference files in the repo
- paw-init is prompt-driven (not programmatic) so preset resolution happens through agent reasoning over file contents, not code execution
- Preset files are small (< 1KB each) and few in number (< 20), so full directory scan is acceptable

## Scope

In Scope:
- Built-in preset definitions (quick, standard, thorough, team)
- User preset file format and storage at `~/.paw/presets/`
- Preset resolution in paw-init (name lookup, inheritance, merge, validation)
- Override precedence (explicit > preset > defaults)
- Default preset mechanism
- Preset inheritance via `extends`
- Preset discovery via paw-status
- paw-init configuration summary showing preset provenance
- Documentation updates for preset usage

Out of Scope:
- CLI commands for preset management (create/edit/delete) — users edit YAML directly
- Preset sharing or publishing mechanism
- Preset versioning or migration
- GUI/TUI for preset selection
- Preset templates or generators

## Dependencies
- paw-init skill (primary integration point)
- paw-status skill (preset discovery)
- `~/.paw/` directory convention (established by CLI)

## Risks & Mitigations
- **Preset drift from paw-init schema**: New WorkflowContext fields added to paw-init may not be reflected in presets. Mitigation: Unknown fields in presets are warned, and presets are partial by design (unspecified fields use defaults).
- **Agent reasoning reliability**: Preset resolution relies on agent reasoning over YAML content, not programmatic code. Mitigation: Keep preset format simple; validate merged output against known constraints.
- **Discovery of ~/.paw/presets/**: Users need to know presets exist. Mitigation: paw-init mentions presets when presenting configuration summary; documentation covers setup.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/278
- Research: .paw/work/workflow-config-presets/SpecResearch.md
