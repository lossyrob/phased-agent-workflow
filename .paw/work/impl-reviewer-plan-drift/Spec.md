# Feature Specification: Impl Reviewer Plan Drift

**Branch**: feature/147-impl-reviewer-plan-drift-sync  |  **Created**: 2025-12-14  |  **Status**: Draft
**Input Brief**: Ensure the implementation reviewer detects plan/spec drift, reports it clearly, and keeps artifacts aligned using commit-aware intent checks.

## Overview
In the implementation workflow, the implementation plan and (when present) the spec are meant to remain the shared reference for what was built and why. In practice, implementation details can evolve during development—steps may be reordered, approaches can shift, and tasks can be skipped or replaced—leaving the plan or spec behind the reality of what shipped. When that happens, reviewers and future maintainers lose the ability to reliably use the plan/spec as an explanation of the work.

This feature makes plan/spec alignment an explicit, visible part of the implementation review. During review, the reviewer compares the implemented changes to what the plan says should exist, and (when a spec exists) checks for requirement-level alignment. If differences exist, the reviewer summarizes them in a dedicated “Plan alignment” section so it’s immediately clear whether the artifacts still match the implementation.

When drift is found, the reviewer uses commit context to judge whether the change appears intentional. For small and clearly intentional adjustments, the reviewer keeps the artifacts accurate by updating the plan to match what was actually implemented and recording a brief note explaining why it changed. For large or ambiguous changes, the reviewer stops before rewriting the plan/spec and asks the user to confirm intent, so substantive decisions are not silently encoded into requirements artifacts.

## Objectives
- Make plan-vs-implementation validation a required part of implementation review (Rationale: prevents drift from accumulating unnoticed).
- Ensure review output always states whether artifacts are aligned (Rationale: makes readiness and discrepancy status obvious).
- Keep the implementation plan reliable over time by correcting minor, clearly intentional drift (Rationale: preserves the plan as a trustworthy source of truth).
- Avoid silently rewriting intent for significant or ambiguous drift by requiring user confirmation (Rationale: prevents accidental scope/requirement changes).
- Use commit history context to support drift intent judgments (Rationale: reduces false positives and unnecessary user interruptions).

## User Scenarios & Testing
### User Story P1 – Reviewer detects and reports alignment
Narrative: As a maintainer running the implementation review stage, I want the review to explicitly say whether the implementation matches the plan/spec so I can trust the artifacts and understand readiness quickly.
Independent Test: Run an implementation review and see an explicit “Plan alignment” outcome.
Acceptance Scenarios:
1. Given an existing implementation plan and implementation changes, When review runs, Then the review output includes a “Plan alignment” section stating either “Aligned” or “Drift detected”.
2. Given the spec exists, When review runs, Then the review includes requirement-level alignment notes when relevant to confirm outcomes match intended behavior.

### User Story P1 – Reviewer keeps plan in sync for minor drift
Narrative: As a maintainer, I want minor, clearly intentional deviations to be reflected in the plan so the plan remains accurate after review.
Independent Test: Introduce a small deviation and see the plan updated to match the implementation.
Acceptance Scenarios:
1. Given a minor difference between plan and implementation that appears intentional, When review runs, Then the plan is updated to reflect the implemented approach and includes a brief note explaining the change.

### User Story P1 – Reviewer pauses for significant or ambiguous drift
Narrative: As a maintainer, I want significant or unclear deviations to require confirmation before the plan/spec is rewritten, so requirements aren’t changed silently.
Independent Test: Introduce a large/unclear deviation and see the reviewer ask for confirmation.
Acceptance Scenarios:
1. Given a significant or ambiguous difference between plan/spec and implementation, When review runs, Then the reviewer asks the user to confirm intent before changing plan/spec artifacts.

### User Story P2 – Commit-aware intent support
Narrative: As a maintainer, I want the reviewer to use commit history context to infer whether deviations were intentional so the process is accurate and minimizes unnecessary interruptions.
Independent Test: Use commits with clear intent language and see drift treated as intentional.
Acceptance Scenarios:
1. Given drift exists and commit context clearly indicates intent, When review runs, Then drift is categorized as intentional and handled according to its magnitude.
2. Given drift exists and commit context does not clearly indicate intent, When review runs, Then drift is categorized as ambiguous and user confirmation is requested.

### Edge Cases
- Missing plan artifact: Review reports that drift assessment cannot be completed and requests user action to provide or generate the plan.
- Missing spec artifact (in workflows where spec is absent): Review proceeds with plan alignment only and states that spec alignment was not evaluated.
- Mixed drift: Some deviations are minor/intentional while others are significant/ambiguous; review reports both and only auto-updates the plan for the minor/intentional subset.
- Conflicting sources: The plan and spec describe different intended outcomes; review reports the discrepancy and asks the user how to reconcile before making edits.

## Requirements
### Functional Requirements
- FR-001: The implementation review process includes an explicit validation step comparing implementation against the implementation plan. (Stories: P1)
- FR-002: When a specification artifact exists, the implementation review process includes an explicit validation step comparing implementation outcomes against the specification where relevant. (Stories: P1)
- FR-003: The review output includes a clearly labeled “Plan alignment” section that states “Aligned” or “Drift detected” and enumerates detected differences when present. (Stories: P1)
- FR-004: When drift is detected, the reviewer performs a commit-aware intent assessment using available commit context to classify drift as likely intentional vs ambiguous. (Stories: P2)
- FR-005: For drift classified as minor and clearly intentional, the reviewer updates the implementation plan so it matches the implemented reality and adds a brief note explaining why the plan changed. (Stories: P1)
- FR-006: For drift classified as significant or ambiguous, the reviewer requests user confirmation before making changes to plan/spec artifacts. (Stories: P1)
- FR-007: The reviewer’s handling of drift preserves prior context in the implementation plan by favoring incremental updates plus brief explanatory notes over replacing historical context entirely. (Stories: P1)

### Key Entities
- Implementation Plan: The artifact that enumerates intended work items/phases and is expected to reflect what was built.
- Specification: The artifact that captures requirement-level intent and acceptance criteria when present.
- Drift: Any observed mismatch between artifacts (plan/spec) and the implemented changes.
- Intent Signal: Commit context cues indicating whether a change was likely deliberate.

### Cross-Cutting / Non-Functional
- Predictability: The drift classification criteria must be described clearly enough that different reviewers would generally reach the same “minor vs significant” and “intentional vs ambiguous” decisions for common cases.
- Minimal disruption: The review should avoid unnecessary user prompts by only blocking when ambiguity or impact makes auto-updating unsafe.

## Success Criteria
- SC-001: Every implementation review includes an explicit “Plan alignment” section with “Aligned” or “Drift detected”. (FR-003)
- SC-002: When drift is reported, the review output enumerates the differences in a way that can be cross-checked against artifacts and implementation changes. (FR-003)
- SC-003: For minor, clearly intentional drift, the implementation plan is updated during review and remains consistent with the implemented approach afterward. (FR-005, FR-007)
- SC-004: For significant or ambiguous drift, the reviewer asks for user confirmation before any plan/spec rewrite occurs. (FR-006)
- SC-005: When commit context clearly indicates intent, drift is treated as intentional in review output and subsequent actions follow the minor/significant policy. (FR-004, FR-005, FR-006)

## Assumptions
- “Update the plan” uses a hybrid approach: keep the plan accurate by updating the relevant sections and add a brief note explaining the reason for the change.
- “Spec alignment” is evaluated only when a spec artifact exists for the work item.
- Commit context is available during review in the form of commit messages and ordering information.

## Scope
In Scope:
- Adding explicit plan/spec alignment validation and drift handling behavior to the implementation reviewer stage.
- Producing review output that clearly communicates alignment status and differences.
- Updating the implementation plan for minor, clearly intentional drift with a short explanatory note.
Out of Scope:
- Introducing new workflow artifacts dedicated solely to drift tracking.
- Changing the workflow mode definitions or adding new workflow stages.
- Adding new user interface features beyond reviewer guidance/output expectations.

## Dependencies
- Existing implementation workflow artifacts (implementation plan, and spec when present).
- Availability of commit history context during review.

## Risks & Mitigations
- Risk: Over-eager plan updates could encode unintended decisions. Mitigation: require user confirmation for significant/ambiguous drift and make drift classification criteria explicit.
- Risk: Under-reporting drift reduces trust in artifacts. Mitigation: require a dedicated “Plan alignment” section on every review output.
- Risk: Inconsistent drift classification across reviewers. Mitigation: define “minor vs significant” and “intentional vs ambiguous” with concrete examples and encourage enumerating differences.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/147
- Research: .paw/work/impl-reviewer-plan-drift/SpecResearch.md
- External: None

## Glossary
- Plan Alignment: The review conclusion indicating whether artifacts match the implementation.
- Drift: A mismatch between artifacts (plan/spec) and implementation.
