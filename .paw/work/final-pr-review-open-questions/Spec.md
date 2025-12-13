# Feature Specification: Final PR Open Questions Resolution

**Branch**: feature/132-final-pr-review-open-questions  |  **Created**: 2025-12-13  |  **Status**: Complete
**Input Brief**: Final PR agent should review and document resolution of open questions from workflow

## Overview

Throughout a PAW workflow, teams naturally encounter uncertainties that require investigation and decision-making. Spec Research uncovers behavioral unknowns. Code Research surfaces implementation questions. Specifications document assumptions where definitive answers aren't available. As agents progress through stages, these open questions get resolved—sometimes explicitly through clarification, sometimes implicitly through implementation choices—but the reasoning often remains scattered across artifacts or exists only in the implementer's mind.

The Final PR represents the culmination of all this work, yet reviewers currently lack a consolidated view of what questions arose, how they were answered, and whether the final implementation properly accounts for them. A developer reviewing the PR might wonder why a particular approach was chosen without understanding the constraints discovered during research, or they might unknowingly approve code that sidesteps an edge case that was flagged but never explicitly addressed.

By having the Final PR agent systematically review all prior artifacts for open questions and document their resolution, we create a valuable audit trail. Reviewers gain visibility into the decision-making process, catching potential oversights before merge. The feature transforms the PR description from a summary of changes into a narrative of how the team navigated uncertainty to arrive at a sound implementation.

This transparency serves both immediate and long-term purposes. During review, it surfaces the reasoning behind implementation choices. After merge, it provides historical context for why the code evolved as it did—invaluable when future developers need to understand or modify the feature.

## Objectives

- Surface all open questions from workflow artifacts in a single, reviewable location
- Document the decisions made to resolve each question (Rationale: enables reviewers to evaluate decision quality, not just code quality)
- Provide traceability from question to implementation (Rationale: reviewers can verify the code actually addresses the concern)
- Flag any questions that remain genuinely unanswered (Rationale: last opportunity to catch gaps before merging to main)
- Create an audit trail of uncertainty resolution for future reference (Rationale: helps future maintainers understand the reasoning behind implementation choices)

## User Scenarios & Testing

### User Story P1 – Open Questions Surface in PR Description
Narrative: A reviewer opens the final PR and immediately sees a dedicated section listing all open questions that arose during the workflow, along with how each was resolved and where in the code the resolution is implemented.

Independent Test: Open a final PR created by the agent and verify the "Open Questions Resolution" section exists with at least one documented question-decision-implementation mapping.

Acceptance Scenarios:
1. Given a workflow with open questions in SpecResearch.md, When the Final PR is created, Then the PR description contains an "Open Questions Resolution" section listing each question with its resolution.
2. Given a workflow with open questions in multiple artifacts (SpecResearch.md, CodeResearch.md, Spec.md), When the Final PR is created, Then questions from all sources are consolidated and organized by source artifact.
3. Given a workflow with no open questions in any artifact, When the Final PR is created, Then the "Open Questions Resolution" section indicates that no open questions were raised.

### User Story P2 – Unresolved Questions Flagged Before PR Creation
Narrative: An implementer runs the Final PR agent and discovers that an open question from research was never explicitly addressed. The agent flags this, giving the team a chance to resolve it before the PR is created.

Independent Test: Run the Final PR agent on a workflow where an open question remains genuinely unaddressed and verify the agent warns about it before creating the PR.

Acceptance Scenarios:
1. Given an open question from research that has no clear resolution in subsequent artifacts or implementation, When the Final PR agent performs pre-flight checks, Then the agent blocks PR creation and reports the unresolved question with a recommendation.
2. Given a blocked pre-flight check due to unresolved questions, When the user explicitly confirms to proceed (providing resolution or deferral explanation), Then the agent continues with PR creation including the user-provided explanation.

### User Story P3 – Reviewer Validates Decision Quality
Narrative: A reviewer reads the Open Questions Resolution section and evaluates whether the decisions made were sound. For questionable decisions, the reviewer understands the context and can provide targeted feedback.

Independent Test: Review a PR description and verify each documented question includes enough context (the original question, the decision made, and implementation reference) to assess decision quality.

Acceptance Scenarios:
1. Given a documented question resolution in the PR, When a reviewer reads it, Then they can understand the original uncertainty, the decision made, and where to look in the code.
2. Given a decision the reviewer disagrees with, When they review the Open Questions Resolution section, Then they can reference the documented question when providing feedback.

### Edge Cases
- Artifact missing entirely (e.g., SpecResearch.md skipped) — agent should gracefully handle by noting the artifact was not present
- Open question section empty in an artifact — agent should not report false positives
- Question resolved in one artifact but contradicted in another — agent should flag the discrepancy
- Workflow run in minimal mode without Spec.md — agent should only check artifacts that exist
- Question marked "out of scope" in earlier artifact — agent should NOT include these in Open Questions section (they are resolved decisions, not uncertainties); however, if an open question references an out-of-scope item, that context should be noted

## Requirements

### Functional Requirements
- FR-001: Final PR agent reviews all prior artifacts for documented open questions and uncertainties (Stories: P1, P2)
- FR-002: Agent maps each open question to its resolution by checking subsequent artifacts and implementation (Stories: P1, P2)
- FR-003: Agent generates an "Open Questions Resolution" section in the PR description, placed after "Acceptance Criteria" and before "Deployment Considerations", organized by source artifact (Stories: P1, P3)
- FR-004: Agent blocks PR creation when questions cannot be mapped to a clear resolution, reporting status and recommendations to the user (Stories: P2)
- FR-005: Agent allows explicit user override to proceed despite unresolved questions when user provides resolution or deferral explanation (Stories: P2)
- FR-006: Agent adapts question extraction based on workflow mode and present artifacts (Stories: P1, edge cases)

### Key Entities
- Open Question: An uncertainty or unknown documented in a workflow artifact, with attributes including source artifact, question text, and status
- Resolution: A decision that addresses an open question, with attributes including decision text, implementation reference (file/section), and rationale
- Question-Resolution Mapping: The linkage between an open question and its resolution, forming the audit trail

### Cross-Cutting / Non-Functional
- Performance: Open question extraction and resolution mapping should complete within the agent's normal pre-flight check time (no significant delay)
- Consistency: Question extraction logic should produce the same results when run multiple times on the same artifacts
- Graceful Degradation: Missing artifacts should not cause agent failure; agent should note which artifacts were unavailable

## Success Criteria
- SC-001: PR descriptions include an Open Questions Resolution section when open questions exist in any artifact (FR-001, FR-003)
- SC-002: Each documented resolution includes the original question, decision made, and implementation reference (FR-002, FR-003)
- SC-003: Genuinely unresolved questions are flagged before PR creation with user prompted for guidance (FR-004, FR-005)
- SC-004: Agent successfully processes workflows regardless of which optional artifacts are present (FR-006)
- SC-005: PR reviewers can use the Open Questions Resolution section to understand and validate decision-making (FR-003)

## Assumptions
- Open questions are documented in specific recognizable sections: `## Open Unknowns` (SpecResearch.md), `## Open Questions` (CodeResearch.md, ImplementationPlan.md), and `## Assumptions` (Spec.md)
- The Implementation Plan's "zero open questions" principle (Guideline 6: "No Open Questions in Final Plan") means most questions will have been resolved by the time Final PR runs
- Out-of-scope items in Spec.md (`Out of Scope` section) and ImplementationPlan.md (`What We're NOT Doing` section) represent resolved decisions, not open questions
- The PR template's "Open Questions Resolution" section fits logically after "Acceptance Criteria" and before "Deployment Considerations"
- Reviewers find value in understanding the reasoning behind decisions, not just the final code
- The existing pre-flight check pattern (block on failure, allow explicit user override) applies to unresolved questions

## Scope

In Scope:
- Extracting open questions from SpecResearch.md, CodeResearch.md, Spec.md (Assumptions section), and ImplementationPlan.md
- Generating Open Questions Resolution section in Final PR description
- Flagging unresolved questions during pre-flight checks
- Handling user input for flagged questions (resolve or defer)
- Adapting to workflow mode (full, minimal, custom)

Out of Scope:
- Modifying how earlier agents document open questions (question format standardization)
- Automated resolution of questions (agent facilitates documentation, not decision-making)
- Adding open question tracking to intermediate PRs (Phase PRs, Docs PRs)
- Creating a separate agent for this functionality (integrated into existing Final PR agent)

## Dependencies
- Existing artifact structure in `.paw/work/<feature-slug>/`
- Current Final PR agent pre-flight check framework (block-then-override pattern)
- PR description template structure (11-section format with Acceptance Criteria → Deployment Considerations ordering)

## Risks & Mitigations
- Risk: Open questions documented inconsistently across artifacts may be missed. Mitigation: Search for specific section headers (`## Open Unknowns`, `## Open Questions`, `## Assumptions`) and document extraction heuristics in the agent.
- Risk: Resolution mapping may produce false positives (claiming question is resolved when it isn't). Mitigation: Conservative matching—flag uncertain mappings for user confirmation rather than assuming resolution.
- Risk: Adding this step may slow down PR creation. Mitigation: Question extraction is lightweight text processing; parallelize where possible.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/132
- Research: .paw/work/final-pr-review-open-questions/SpecResearch.md
- External: None
