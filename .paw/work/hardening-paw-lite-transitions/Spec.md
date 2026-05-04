# Feature Specification: Hardening PAW-Lite Transitions

**Branch**: feature/hardening-paw-lite-transitions  |  **Created**: 2026-05-04  |  **Status**: Draft
**Input Brief**: Harden PAW-Lite workflow boundaries and preset adherence without embedding mutable runtime state in WorkflowContext.md.

## Overview

PAW users need agents to honor workflow boundaries, configured review procedures, and final PR handoffs during long autonomous runs. Recent reports show that agents can skip or blur PAW-Lite transitions, final-review requirements, preset-selected review behavior, and final-PR routing, especially when the workflow relies on prose loaded early in the session rather than recurring boundary reminders.

The desired behavior is a cleaner alternative to heavy runtime bookkeeping. WorkflowContext.md should remain a stable configuration artifact, while PAW-Lite should make boundaries visible and self-perpetuating through compact transition briefs and TODO chaining. This preserves PAW's flexible, reasoning-driven model while improving reliability at the moments where agents most often drift.

The feature should also lightly tighten standard PAW transition guidance without adding hook enforcement, broad tool-call inspection, or embedded control-state databases. Preset-derived choices must be treated as active workflow obligations throughout the run, and final PR creation must remain routed through the dedicated final PR activity.

## Objectives

- Preserve WorkflowContext.md as durable workflow configuration rather than mutable runtime state.
- Make PAW-Lite stage boundaries explicit, recurring, and visible across turns.
- Ensure preset-selected planning review and final review procedures are treated as mandatory workflow obligations.
- Distinguish human review pause policy from automated workflow quality gates.
- Ensure PAW-Lite final PR creation is handed off to the final PR activity instead of being performed inline.
- Tighten standard PAW transition guidance where it reinforces mandatory automated gates and final-review/final-PR routing.

## User Scenarios & Testing

### User Story P1 - PAW-Lite Boundary Attention

Narrative: As a PAW-Lite user, I want the agent to pause at each stage boundary long enough to restate what completed, what comes next, and what must not be skipped, so that autonomous runs do not drift past required steps.

Independent Test: Run a PAW-Lite workflow through plan, optional planning review, implementation, final review, and final PR transitions and verify each boundary produces the expected compact guidance.

Acceptance Scenarios:
1. Given PAW-Lite planning completes and planning docs review is enabled, When the workflow advances, Then the boundary guidance states that planning docs review must run before implementation.
2. Given PAW-Lite planning completes and planning docs review is disabled, When the workflow advances, Then the boundary guidance states that implementation begins and all plan work items must be tracked.
3. Given PAW-Lite implementation completes and final review is enabled, When the workflow advances, Then the boundary guidance states that final review must run using the configured mode before final PR creation.
4. Given PAW-Lite final review completes, When the workflow advances, Then the boundary guidance routes final PR creation through the final PR activity.

### User Story P2 - Preset Adherence

Narrative: As a user who selects a preset or explicit review configuration, I want those choices to be surfaced as workflow obligations at relevant boundaries, so that agents do not silently substitute easier procedures.

Independent Test: Initialize PAW-Lite with preset-derived planning and final review settings, then verify boundary guidance names and enforces those settings.

Acceptance Scenarios:
1. Given planning docs review is enabled by preset or configuration, When the workflow reaches the planning boundary, Then the guidance treats planning docs review as required before implementation.
2. Given final agent review is enabled by preset or configuration, When implementation completes, Then the guidance treats final review as required before final PR creation.
3. Given final review mode is society-of-thought, When final review is required, Then the guidance names the SoT procedure rather than allowing an ad-hoc review substitute.
4. Given review policy is set to reduce human pauses, When an automated gate is required, Then the guidance states that review policy does not disable automated gates.

### User Story P3 - Final PR Handoff Safety

Narrative: As a maintainer, I want PAW-Lite to hand off final PR creation to the dedicated PR activity, so that artifact lifecycle, stop-tracking behavior, push behavior, and PR creation remain centralized.

Independent Test: Run a PAW-Lite final-review-to-final-PR transition and verify the guidance calls inline PR creation, stop-tracking, or push commands an incorrect shortcut.

Acceptance Scenarios:
1. Given PAW-Lite is ready for final PR, When final PR guidance is produced, Then it directs the agent to use the final PR activity.
2. Given artifact lifecycle requires cleanup, When final PR guidance is produced, Then cleanup remains owned by the final PR activity.
3. Given an agent could create a PR inline, When final PR guidance is produced, Then inline PR creation is identified as incorrect.

### User Story P4 - Standard PAW Transition Reinforcement

Narrative: As a standard PAW user, I want existing transition output to clearly reinforce mandatory gates and configured review procedures, so that the standard workflow benefits from the same boundary attention without adding new runtime state.

Independent Test: Exercise standard PAW transition outputs around planning review, final review, and final PR readiness and verify they name mandatory gates, configured review mode, and PR routing.

Acceptance Scenarios:
1. Given standard PAW reaches a transition after plan review, When transition output is produced, Then it reminds the agent that automated gates remain mandatory regardless of review policy.
2. Given standard PAW reaches a final-review transition, When transition output is produced, Then it names the configured final review mode and procedure.
3. Given standard PAW reaches final PR readiness, When transition output is produced, Then it routes final PR creation through the final PR activity.

### Edge Cases

- Planning docs review disabled: boundary guidance must not require it, but must still create or maintain the next implementation boundary TODO.
- Final agent review disabled: boundary guidance must explicitly route to final PR through the final PR activity rather than running review.
- Society-of-thought configured: guidance must require the SoT procedure and must not allow a generic single-model review substitute.
- Review policy set to final-pr-only or planning-only: guidance must preserve automated gates while reducing only human pause points.
- No preset selected: explicit configuration still supplies obligations; defaults must be reflected accurately.
- Existing standard PAW transition behavior: changes must preserve the current transition chain while tightening wording.

## Requirements

### Functional Requirements

- FR-001: WorkflowContext.md generation must remain limited to durable configuration and must not add runtime activity status, gate status, reconciliation markers, SQL mirror data, or other mutable control-state sections. (Stories: P1,P2)
- FR-002: PAW-Lite must produce compact boundary guidance at plan-to-planning-review, plan-to-implementation, planning-review-to-implementation, implementation-to-final-review, implementation-to-final-PR, and final-review-to-final-PR transitions as applicable. (Stories: P1)
- FR-003: Each PAW-Lite boundary brief must state what completed, what comes next, what must happen before the next advance, the applicable configured mode or preset choice, the shortcut that would be incorrect, and the TODOs needed for the next stage or boundary. (Stories: P1,P2)
- FR-004: PAW-Lite must create or maintain TODOs for the next boundary checkpoint so the transition chain remains visible across turns. (Stories: P1)
- FR-005: Boundary guidance must treat preset-derived planning docs review and final review settings as mandatory procedure choices unless the user explicitly changes configuration. (Stories: P2)
- FR-006: Boundary guidance must clearly state that review policy controls human pauses and does not disable automated workflow gates or configured review procedures. (Stories: P2,P4)
- FR-007: When final review mode is society-of-thought, boundary guidance must direct the agent to run the SoT procedure through the appropriate activity and must reject ad-hoc review substitution. (Stories: P2)
- FR-008: PAW-Lite final PR guidance must route through the final PR activity and identify inline PR creation, inline stop-tracking, or inline remote push as incorrect shortcuts. (Stories: P3)
- FR-009: Standard PAW transition output must continue queuing next activity and transition TODOs while more explicitly naming mandatory automated gates, configured final review procedure, and final PR routing. (Stories: P4)
- FR-010: The feature must avoid adding deny hooks, broad tool-call inspection, MCP requirements, or embedded runtime databases as required mechanisms. (Stories: P1,P4)

### Key Entities

- WorkflowContext.md: Durable workflow configuration artifact.
- PAW-Lite boundary checkpoint: A recurring transition reminder between PAW-Lite stages.
- Boundary TODO: A visible TODO representing the next PAW-Lite boundary checkpoint.
- Preset-derived obligation: A workflow procedure or mode selected by preset or explicit configuration.
- Final PR activity: The dedicated activity responsible for final PR preparation and creation.

## Success Criteria

- SC-001: No generated WorkflowContext.md contains a runtime control-state section, reconciliation marker, mutable activity status list, gate status list, or SQL mirror data. (FR-001)
- SC-002: PAW-Lite boundary guidance exists for every applicable boundary listed in FR-002. (FR-002, FR-003)
- SC-003: At least one automated test verifies PAW-Lite boundary TODO chaining across successive stages. (FR-004)
- SC-004: Automated tests verify preset-derived planning docs review and final review obligations appear in relevant PAW-Lite boundary guidance. (FR-005, FR-007)
- SC-005: Automated tests verify review policy is described as controlling human pauses rather than automated gates. (FR-006)
- SC-006: Automated tests verify PAW-Lite final PR guidance routes through the final PR activity and identifies inline shortcuts as incorrect. (FR-008)
- SC-007: Standard PAW transition coverage verifies tightened output still queues next activity and transition TODOs. (FR-009)
- SC-008: The implementation introduces no required hook, MCP, or broad tool-inspection dependency for boundary enforcement. (FR-010)

## Assumptions

- PAW-Lite can maintain boundary visibility using existing session TODO mechanisms without adding runtime state to WorkflowContext.md.
- The exact boundary guidance format may be concise and agent-facing as long as it includes the required obligations and shortcut warnings.
- Existing integration test infrastructure can be extended to validate prompt/skill behavior without requiring a full manual PAW-Lite run for every case.
- Standard PAW hardening should be wording and TODO-chain clarification only unless code research identifies a tightly coupled gap.

## Scope

In Scope:
- PAW-Lite boundary checkpoint guidance for planning, optional planning docs review, implementation, final review, and final PR transitions.
- PAW-Lite boundary TODO chain creation or maintenance.
- Preset/config obligation surfacing for planning docs review, final review mode, review policy, and artifact lifecycle handoff.
- Standard PAW transition instruction tightening where it reinforces existing transition behavior.
- Tests covering PAW-Lite boundary guidance, TODO chaining, preset-derived review behavior, review policy distinction, and final PR handoff.

Out of Scope:
- Runtime control-state sections or mutable workflow databases embedded in WorkflowContext.md.
- Deny hooks, broad tool-call inspection, new MCP requirements, or external attention layers.
- A full redesign of standard PAW transitions beyond clarifying current behavior.
- Changes to the meaning of user-selected review policy other than clarifying that it affects human pauses only.

## Dependencies

- Existing PAW-Lite skill behavior and TODO tracking facilities.
- Existing standard PAW transition guidance.
- Existing preset resolution and WorkflowContext.md generation paths.
- Existing integration test harness for PAW skills and workflow behavior.

## Risks & Mitigations

- Risk: Boundary guidance becomes too verbose and dilutes actionable signal. Mitigation: Keep boundary briefs compact and focused on next action, required gate, configured obligation, and incorrect shortcut.
- Risk: TODO chaining creates stale TODOs if stages are retried. Mitigation: Require create-or-maintain behavior and tests for successive boundary updates.
- Risk: Removing embedded control state weakens standard PAW resume behavior. Mitigation: Preserve standard PAW transition TODO chaining and avoid changing durable configuration semantics beyond removing runtime state from generated contexts.
- Risk: Preset-derived obligations may be missed when values come from defaults rather than named presets. Mitigation: Treat resolved configuration values as obligations regardless of source.
- Risk: Final PR guidance could duplicate responsibilities owned by the final PR activity. Mitigation: Boundary guidance should route to the activity and identify shortcuts, not inline the procedure.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/306
