# Feature Specification: Workflow Hardening

**Branch**: feature/workflow-hardening  |  **Created**: 2026-03-31  |  **Status**: Draft
**Input Brief**: Externalize mandatory workflow state and review-state markers so PAW and PAW Review enforce gates, configured procedures, and external-review progression consistently across long-running workflows.

## Overview

Workflow operators and reviewers need the system to stop when required work is unfinished, preserve prior review state, and report status that matches reality. In long or multi-stage sessions today, the workflow can appear to make progress while still skipping required steps, choosing a different review path than the one configured, or acting on stale external state.

This feature ensures required workflow steps, review-stage state, and completion conditions are recorded in a form the workflow can check before it pauses, delegates, reports status, or changes external review state. When a required condition is unresolved or a terminal review state is already recorded, the workflow must either preserve that state correctly or stop and name the blocking condition.

The result should be the same observable workflow behavior across Copilot CLI and VS Code: required gates are enforced, terminal review state is preserved in durable control state, configured procedures run as chosen, and reported status matches the current workflow, artifact, and external-review conditions.

## Objectives

- Prevent continuation when required workflow steps or gates are still unresolved.
- Ensure review workflows record explicit stage and terminal external-review state so status and progression do not rely on prompt memory.
- Check current workflow, artifact, and relevant external state before pause, delegation, status reporting, or external mutation.
- Run the configured review procedure or stop and report the blocking condition.
- Preserve the same gate, control-state, and status outcomes across Copilot CLI and VS Code.

## User Scenarios & Testing

### User Story P1 - Enforce Mandatory Workflow Gates

Narrative: As a workflow operator, I want each required activity and gate tracked explicitly so long sessions and multi-step runs cannot skip required review or transition work while still claiming progress.

Independent Test: Attempt to advance a workflow past an implementation step with its required review or transition still unresolved and confirm the workflow blocks instead of advancing.

Acceptance Scenarios:
1. Given a workflow with an implementation step complete and its required review still unresolved, When the workflow attempts to continue, Then it remains blocked until the review work item is resolved.
2. Given a workflow with a required transition still unresolved, When the workflow tries to yield or advance to the next step, Then it does not proceed until the transition work item is resolved.

### User Story P1 - Track Review State and Terminal Outcomes Explicitly

Narrative: As a reviewer, I want review workflows to record required review stages and terminal external-review outcomes explicitly so resumed or long-running reviews can report accurate state instead of relying on prompt memory.

Independent Test: Resume a review with an already-created pending review and confirm the workflow reports that terminal state instead of reverting the review to an earlier inferred stage.

Acceptance Scenarios:
1. Given a review workflow has already created a pending external review, When the workflow resumes or reports status, Then it records and reports that pending review as the current terminal state for that review job.
2. Given a review workflow's required feedback, critique, or finalization stages remain unresolved, When the workflow attempts to advance, Then it remains blocked until those tracked review-stage items are resolved.

### User Story P1 - Honor Configured Procedures Exactly

Narrative: As a workflow operator, I want configured procedures such as society-of-thought planning-docs review and final review enforced exactly so the system does not improvise a "close enough" path during long sessions.

Independent Test: Configure planning-docs review or final review for a specific review procedure and confirm the workflow either executes that exact procedure or blocks with an explicit reason.

Acceptance Scenarios:
1. Given a workflow configured for a specific planning-docs review or final review procedure, When the workflow reaches that stage, Then it executes the configured procedure instead of substituting another approach.
2. Given a workflow configured for a specific planning-docs review or final review procedure that cannot run, When the workflow reaches that stage, Then it blocks with an explicit explanation rather than silently choosing another path.

### User Story P2 - Report Reconciled Status Across Runtimes

Narrative: As a maintainer, I want workflow status and orchestration behavior derived from reconciled state so I can trust final reports and verify the behavior across both supported runtimes.

Independent Test: Compare reported workflow status against work items, artifacts, and live external state after manual state changes and confirm the report matches reconciled reality.

Acceptance Scenarios:
1. Given workflow state or external review state has changed outside the current session, When the workflow reports status, Then the reported state reflects a fresh reconciliation instead of previously assumed progress.
2. Given the same workflow is exercised through each supported runtime, When it passes the same orchestration checkpoints, Then it preserves the same gate, control-state, and reconciliation outcomes.

### Edge Cases

- A workflow resumes after manual or external changes to artifacts or GitHub review state.
- Two sessions encounter the same review job or phase boundary.
- A configured procedure is unavailable or partially configured.
- A terminal external state exists and the workflow resumes or reports status later.
- A resumed workflow or review lacks hardened state and therefore continues in legacy best-effort behavior.
- Legacy workflow contexts use older review or handoff settings that need mapping to current behavior.

## Requirements

### Functional Requirements

- FR-001: The workflow must represent each mandatory activity and gate as explicit, queryable work items with clear unresolved and resolved states. (Stories: P1)
- FR-002: The workflow must prevent advancement past a required gate while any prerequisite work item remains unresolved. (Stories: P1)
- FR-003: Review-related external outcomes that affect workflow progression or status, including pending review creation, must be represented explicitly in the durable control state for each review job so resumed workflows preserve terminal external-review facts instead of re-inferring them from prompt memory. (Stories: P1)
- FR-004: Before pause, yield, delegation, status reporting, or external mutation, the workflow must reconcile work items, relevant artifacts, and live external state where applicable. Mutation-affecting decisions must not proceed from unknown or conflicting reconciled state, while status/reporting may return stale or unverified results only when they are clearly labeled. (Stories: P1, P2)
- FR-005: If a workflow is configured to use a specific procedure mode, the workflow must execute that mode exactly or block with an explanation that names the unavailable or unresolved condition instead of substituting another path. (Stories: P1)
- FR-006: The workflow must recognize and preserve terminal external review states in durable control state and status reporting rather than reverting to inferred earlier-stage progress. (Stories: P1)
- FR-007: The workflow state model must work across Copilot CLI and VS Code even if each runtime presents or mirrors the state differently, while preserving the same meanings for shared item IDs, status values, reconciliation markers, and terminal review markers. (Stories: P2)
- FR-008: End-to-end orchestrator coverage must verify gate progression, control-state tracking, reconciliation, and configured-procedure compliance for long-running workflows. (Stories: P2)
- FR-009: When hardened workflow state is absent, the system may continue in legacy best-effort mode, but it must indicate that hardened gate, review-state, and configured-procedure protections are not active. (Stories: P1, P2)

### Key Entities

- Required Workflow Item: A visible record of a required workflow step, gate, or completion condition.
- Review Job: The unit of review work that owns review evaluation state and any external review mutations.
- Terminal External Review State: A durable marker for review-related external outcomes, such as pending review creation, that affect workflow status or progression.
- Reconciliation Check: A mandatory comparison of workflow state, artifacts, and relevant live external state before the workflow pauses, delegates, reports status, or mutates external systems.

### Cross-Cutting / Non-Functional

- People resuming a workflow can see which required items are pending, blocked, or complete without inferring hidden state.
- Repeating reconciliation with unchanged workflow, artifact, and external inputs yields the same status decision.
- Shared control-state identifiers, status values, reconciliation markers, and terminal review markers retain the same meaning across PAW, PAW Review, and VS Code surfaces.
- The feature preserves the same workflow outcome rules across supported runtimes even if each runtime presents them differently.

## Success Criteria

- SC-001: In validation runs, the workflow never completes or advances past a required implementation gate while its required review or transition work items remain unresolved. (FR-001, FR-002)
- SC-002: For a review job with an existing terminal external-review state, validation runs show that durable control state and reported status preserve that terminal state rather than reverting to inferred earlier-stage progress. (FR-003, FR-006)
- SC-003: When a workflow is configured for a specific planning-docs review or final review procedure mode, validation runs show that the configured mode executes exactly, or the workflow blocks with an explanation that names why the configured mode could not run. (FR-005)
- SC-004: After manual or external state changes, reported workflow status matches reconciled work-item, artifact, and relevant external state instead of assumed progress; when full reconciliation cannot complete, read-only status remains clearly marked as stale or unverified. (FR-004, FR-007)
- SC-005: End-to-end workflow validation covers long-session or multi-step paths for both supported runtimes and confirms gate progression, control-state tracking, reconciliation, configured-procedure compliance, and matching interpretation of the same embedded state across runtimes. (FR-007, FR-008)
- SC-006: Validation runs show workflows with hardened state enforce the new protections, while workflows without hardened state continue in legacy best-effort mode and clearly report that hardened protections are inactive. (FR-009)

## Assumptions

- Existing workflow artifacts remain the primary user-facing record of work content; the new state model governs orchestration and gating rather than replacing those artifacts.
- A runtime may present required workflow state through its own UI, but the feature must not depend on a specific UI implementation.
- The system does not need to reconstruct full hardened state automatically for older workflows; workflows that lack hardened state may remain in legacy best-effort mode.
- Linked bugs may still require issue-specific follow-up work after the shared control-state substrate lands.
- Linked bugs #298, #297, and #268 are treated as representative failure modes that this feature should address through a common control-plane design.

## Scope

In Scope:
- Externalized workflow state for mandatory activities, gates, review-stage state, and terminal conditions
- Reconciliation rules before pause, delegation, status reporting, and external mutation
- Enforcement of configured procedure modes such as society-of-thought review
- Cross-runtime behavior that works in Copilot CLI and VS Code
- End-to-end orchestration validation for long and multi-stage workflows

Out of Scope:
- Unrelated feature work outside PAW or PAW Review orchestration behavior
- A required dependency on any single TODO UI or platform-specific presentation layer
- Automatic reconstruction of full hardened state for all pre-existing workflows and review jobs
- Issue-specific safeguards such as preventing PAW Review from launching itself for the same review job, or fully resolving linked review-mutation bugs beyond the shared control-state substrate
- General concurrent ownership or takeover protocols for review mutations
- Expanding review features beyond what is needed to externalize state, review-state tracking, reconciliation, and configured-procedure enforcement
- Directly solving unrelated bugs that do not stem from implicit workflow state

## Dependencies

- PAW implementation workflow orchestration
- PAW Review orchestration and GitHub review integration
- Existing artifact lifecycle and status reporting flows
- Access to live external review state when reconciliation requires it

## Risks & Mitigations

- Cross-runtime divergence could cause different orchestration behavior in CLI and VS Code. Mitigation: keep a small shared control-state core for common field meanings and validate it end-to-end in both runtimes.
- Explicit state could become stale if reconciliation is incomplete. Mitigation: require reconciliation before pause, delegation, reporting, and external mutation, and clearly label degraded read-only status when full reconciliation cannot complete.
- The shared control-state substrate may not fully close every linked bug on its own. Mitigation: land the shared tracking model here and evaluate linked issues for follow-up safeguards separately.
- The feature could fix the cited bugs narrowly without addressing the shared cause. Mitigation: use the shared workflow acceptance criteria as the definition of done and validate against representative long-session scenarios.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/299
- Related Issues: https://github.com/lossyrob/phased-agent-workflow/issues/298, https://github.com/lossyrob/phased-agent-workflow/issues/297, https://github.com/lossyrob/phased-agent-workflow/issues/268
