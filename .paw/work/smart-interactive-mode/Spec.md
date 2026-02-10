# Feature Specification: Smart Interactive Mode for Multi-Model Reviews

**Branch**: feature/smart-interactive-mode  |  **Created**: 2026-02-10  |  **Status**: Draft
**Input Brief**: Add a smart interaction mode to multi-model reviews that auto-applies clear consensus fixes and only pauses for genuine user decisions.

## Overview

Multi-model reviews in PAW (final-review and planning-docs-review) currently offer two interaction modes: fully interactive, where every finding is presented individually for user approval, and fully automatic, where all actionable findings are applied without user input. In practice, interactive mode has poor signal-to-noise — consensus must-fix items like fixing a skill count or adding a missing milestone entry are rubber-stamp approvals where the user repeatedly presses enter for obvious fixes before reaching the few findings that genuinely need human judgment.

Smart interactive mode bridges this gap by using the agreement level and severity metadata that the synthesis already produces to classify each finding as auto-applicable or requiring user input. Consensus fixes with a single clear resolution path are applied automatically as a batch, while findings involving model disagreement, design decisions, or multiple valid approaches pause for interactive resolution. The result is a workflow where users engage only when their judgment adds value.

This applies to both `paw-final-review` and `paw-planning-docs-review`, which share the same multi-model → synthesize → resolve pattern. The smart mode logic is implemented consistently across both, with each skill adapting the classification to its resolution model (direct apply vs artifact routing).

## Objectives

- Reduce user interaction fatigue by auto-applying findings that don't benefit from human review
- Preserve user agency for findings that involve genuine decisions (model disagreement, design choices, multiple approaches)
- Provide clear visibility into what was auto-applied and what was decided interactively
- Make `smart` the default interaction mode for new workflows, replacing `true`

## User Scenarios & Testing

### User Story P1 – Auto-Apply Consensus Fixes
Narrative: A developer runs a multi-model final review. The synthesis produces 6 findings: 4 are consensus must-fix items with a single clear proposed change, and 2 involve partial model agreement. Smart mode auto-applies the 4 consensus fixes and presents the 2 ambiguous findings interactively.
Independent Test: Run a multi-model review in smart mode with mixed consensus/partial findings and verify only partial-agreement findings prompt for user input.
Acceptance Scenarios:
1. Given a synthesis with 3 consensus must-fix findings each having one proposed fix, When smart mode resolves findings, Then all 3 are applied without user interaction
2. Given a synthesis with a consensus should-fix finding where models propose different fixes, When smart mode resolves findings, Then the finding is presented interactively with model perspectives
3. Given a synthesis with a partial-agreement must-fix finding, When smart mode resolves findings, Then the finding is presented interactively

### User Story P2 – Batch Summary of Auto-Applied Findings
Narrative: After smart mode auto-applies consensus fixes, the user sees a concise summary of what was applied so they have full visibility without needing to approve each one.
Independent Test: Run smart mode with auto-applicable findings and verify a batch summary is displayed before interactive findings begin.
Acceptance Scenarios:
1. Given smart mode auto-applies 4 findings, When the batch phase completes, Then a summary lists each auto-applied finding with its title and severity
2. Given smart mode has both auto-applied and interactive findings, When all findings are resolved, Then a final summary shows all actions taken (auto-applied + user decisions)

### User Story P3 – Consider Findings Reported Without Application
Narrative: Findings with `consider` severity are neither auto-applied nor presented interactively — they appear in the final summary for awareness.
Independent Test: Run smart mode with consider-severity findings and verify they appear in the summary but are not applied or prompted.
Acceptance Scenarios:
1. Given a synthesis with 2 consider-severity findings, When smart mode resolves findings, Then neither finding is applied and both appear in the summary as "reported"

### User Story P4 – Smart Mode in Planning Docs Review
Narrative: A developer runs planning-docs-review in smart mode. Consensus findings that affect a single artifact (spec or plan) are auto-routed and applied. Findings affecting both artifacts or with model disagreement pause for user routing decisions.
Independent Test: Run planning-docs-review in smart mode and verify single-artifact consensus findings are auto-routed without prompting.
Acceptance Scenarios:
1. Given a consensus must-fix finding affecting only the spec, When smart mode resolves it, Then the finding is auto-routed to paw-spec without user interaction
2. Given a consensus should-fix finding affecting both spec and plan, When smart mode resolves it, Then the user is prompted for routing (apply-to-spec, apply-to-plan, apply-to-both)

### User Story P5 – Default Configuration Change
Narrative: New workflows initialized via paw-init default to `smart` interaction mode, so users get the improved experience without configuration changes.
Independent Test: Initialize a new workflow and verify both interactive config fields default to `smart`.
Acceptance Scenarios:
1. Given a new workflow initialized with default settings, When WorkflowContext.md is created, Then both `Final Review Interactive` and `Planning Review Interactive` are set to `smart`

### Edge Cases
- All findings are auto-applicable: no interactive phase, show batch summary only
- All findings require interaction: behaves identically to `Interactive: true`
- No findings produced by synthesis: skip resolution entirely (existing behavior)
- Single-model review mode: agreement level is always "single-model", so all findings pause for interaction (smart mode degrades gracefully to interactive)
- Existing workflows with `true`/`false` values continue to work unchanged (backward compatibility)

## Requirements

### Functional Requirements
- FR-001: Classification of each synthesis finding into auto-apply or interactive based on agreement level, severity, and fix clarity (Stories: P1)
- FR-002: Batch auto-application of classified auto-apply findings without user interaction (Stories: P1, P2)
- FR-003: Interactive presentation of classified interactive findings with full context (Stories: P1)
- FR-004: Batch summary display showing auto-applied findings before interactive phase begins (Stories: P2)
- FR-005: Final summary showing all actions taken (auto-applied, user-applied, user-skipped, reported) (Stories: P2, P3)
- FR-006: Skip application of consider-severity findings, reporting them in summary only (Stories: P3)
- FR-007: Smart routing in planning-docs-review: auto-route single-artifact consensus findings, pause for multi-artifact or ambiguous findings (Stories: P4)
- FR-008: Update default value for `Final Review Interactive` and `Planning Review Interactive` from `true` to `smart` in paw-init (Stories: P5)
- FR-009: Backward compatibility — existing `true` and `false` values continue to work with current behavior (Stories: P5)
- FR-010: Fix clarity determination — consensus agreement in the synthesis implies models converged on the fix; partial or single-model agreement signals ambiguity requiring user input (Stories: P1)

### Key Entities
- **Finding Classification**: The result of applying the smart heuristic to a synthesis finding — either `auto-apply`, `interactive`, or `report-only`
- **Smart Heuristic**: The decision matrix combining agreement level, severity, and fix clarity to produce a classification

### Cross-Cutting / Non-Functional
- Smart mode must not add perceptible latency beyond the existing synthesis time
- Classification logic must be deterministic given the same synthesis input

## Success Criteria
- SC-001: In smart mode, consensus must-fix findings with a single clear fix are applied without user interaction (FR-001, FR-002)
- SC-002: In smart mode, findings with model disagreement on fix approach are presented interactively (FR-001, FR-003, FR-010)
- SC-003: Users see a batch summary of auto-applied findings before interactive resolution begins (FR-004)
- SC-004: A final summary shows all finding dispositions after resolution completes (FR-005)
- SC-005: Consider-severity findings appear in summary but are not applied (FR-006)
- SC-006: Planning-docs-review auto-routes single-artifact consensus findings in smart mode (FR-007)
- SC-007: New workflows default to smart mode for both review interactive fields (FR-008)
- SC-008: Workflows configured with `true` or `false` interactive values behave identically to current behavior (FR-009)

## Assumptions
- The multi-model synthesis merges per-model proposals into consensus findings; consensus agreement level is sufficient to determine fix clarity without cross-referencing individual model review files
- "Fix clarity" is determined by agreement level: consensus = clear fix, partial/single-model = ambiguous
- Single-model review mode (1 model) will treat all findings as interactive since there's no agreement signal

## Scope

In Scope:
- Smart classification heuristic in paw-final-review
- Smart classification heuristic with routing awareness in paw-planning-docs-review
- Batch summary and final summary UX
- Default configuration change in paw-init
- Documentation updates for new config value

Out of Scope:
- Changes to the multi-model-review synthesis skill output format
- Changes to the individual model review prompts
- Smart mode for any future review skills not yet implemented
- User-configurable heuristic thresholds (the heuristic is fixed per the decision matrix)
- Integration tests for smart mode — deferred to follow-up work item; manual verification is sufficient for prompt-only changes

## Dependencies
- Multi-model-review skill synthesis output structure (existing)
- paw-final-review skill resolution flow (existing)
- paw-planning-docs-review skill resolution flow (existing)
- paw-init skill configuration defaults (existing)

## Risks & Mitigations
- **Risk**: Classification heuristic may auto-apply a finding the user would have rejected. Mitigation: conservative heuristic — only auto-apply when all three conditions met (consensus, actionable severity, clear single fix). Batch summary provides visibility for user to catch issues.
- **Risk**: "Fix clarity" determination may be unreliable when comparing proposed changes across models. Mitigation: treat any ambiguity as "unclear" (default to interactive). Err on the side of pausing.
- **Risk**: Single-model mode degrades to fully interactive, which may confuse users expecting smart behavior. Mitigation: document that smart mode requires multi-model review for meaningful auto-apply behavior.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/219
- Related: #212 (planning-docs-review, where the UX friction was observed)
