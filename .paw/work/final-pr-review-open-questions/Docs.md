# Final PR Open Questions Resolution

## Overview

The Final PR Open Questions Resolution feature enhances the PAW-05 PR agent to systematically review all workflow artifacts for open questions, map them to resolutions, and document this audit trail in the final PR description. This creates transparency for reviewers by surfacing the decision-making process that occurred throughout the workflow.

Throughout a PAW workflow, teams naturally encounter uncertainties—behavioral unknowns during spec research, implementation questions during code research, and assumptions documented when definitive answers aren't available. By the time the Final PR is created, these questions have typically been resolved through clarification or implementation choices. However, without explicit documentation, this reasoning remains scattered across artifacts or exists only in the implementer's memory.

This feature transforms the Final PR description from a summary of changes into a narrative of how the team navigated uncertainty to arrive at a sound implementation. Reviewers gain visibility into the decision-making process, catching potential oversights before merge. After merge, it provides historical context for why the code evolved as it did—invaluable when future developers need to understand or modify the feature.

## Architecture and Design

### Pre-flight Check Integration

The open questions resolution is implemented as a new validation section (Section 6) within the existing pre-flight check framework in the PAW-05 PR agent. This follows the established pattern of numbered check categories with checklist items.

The check validates:
1. `SpecResearch.md` → `## Open Unknowns` reviewed with resolutions identified
2. `CodeResearch.md` → `## Open Questions` reviewed with resolutions identified  
3. `Spec.md` → `## Assumptions` documented (assumptions ARE the resolutions)
4. `ImplementationPlan.md` → `## Open Questions` is empty or "None" (per Guideline 6)
5. All questions mapped to resolution or flagged for user input

### Block-Then-Override Pattern

Following the established PAW pattern, unresolved questions block PR creation by default but allow explicit user override:

1. Report the unresolved question with source artifact and full context
2. Provide a recommendation (suggest resolution approach or explicit deferral)
3. Block PR creation until user provides resolution or deferral explanation
4. Include user-provided explanation in the Open Questions Resolution section

This ensures the final PR always documents how uncertainties were handled, even if the resolution is an explicit deferral.

### Design Decisions

**Question extraction by section header**: Each artifact uses specific headers for documenting uncertainties. The extraction algorithm finds the relevant header and extracts content until the next `##` heading:
- `SpecResearch.md`: `## Open Unknowns` — unanswered internal questions about system behavior
- `CodeResearch.md`: `## Open Questions` — technical implementation questions
- `Spec.md`: `## Assumptions` — documented design decisions (these ARE resolutions)
- `ImplementationPlan.md`: `## Open Questions` — should be empty per Guideline 6

**Out-of-scope exclusion**: Items in `## Scope` → `Out of Scope:` (Spec.md) and `## What We're NOT Doing` (ImplementationPlan.md) are explicitly NOT treated as open questions. These represent resolved decisions to exclude functionality, not uncertainties requiring resolution.

**Resolution mapping approach**: The agent maps questions to resolutions by checking subsequent artifacts:
- SpecResearch questions → resolved in Spec.md Assumptions or via explicit clarification
- CodeResearch questions → resolved in ImplementationPlan decisions or implementation code (with file:line references)
- ImplementationPlan questions → should not exist if plan is complete (Guideline 6 violation indicates incomplete plan)

**PR description placement**: The "Open Questions Resolution" section is inserted after "Acceptance Criteria" and before "Deployment Considerations". This positions it after functional verification (acceptance criteria passed) and before operational concerns (deployment).

## User Guide

### Prerequisites

Before the Final PR agent runs:
- All implementation phases must be complete and merged/committed
- All required artifacts must exist in `.paw/work/<feature-slug>/`
- Implementation should have addressed questions raised during research

### How It Works

When you invoke the Final PR agent, it automatically:

1. **Extracts open questions** from each artifact by searching for the designated section headers
2. **Maps questions to resolutions** by checking where each was addressed
3. **Reports unresolved questions** if any cannot be mapped to a clear resolution
4. **Blocks PR creation** for unresolved questions, prompting for user input
5. **Generates PR description** with "Open Questions Resolution" section documenting the audit trail

### Handling Unresolved Questions

If the agent cannot map a question to a resolution:

```
⚠️ Unresolved Open Question

Source: CodeResearch.md
Question: Should the API use pagination or cursor-based iteration?

Recommendation: Document which approach was implemented and why.

Please provide:
1. Resolution explanation, or
2. Explicit deferral reason (e.g., "Deferred to v2 per stakeholder decision")
```

You can then provide an explanation that will be included in the PR description.

### Workflow Mode Adaptation

The open questions check adapts to workflow mode:

- **Full mode**: Checks all four artifacts (SpecResearch, CodeResearch, Spec, ImplementationPlan)
- **Minimal mode**: Only checks existing artifacts (typically CodeResearch and ImplementationPlan)
- **Custom mode**: Adapts based on which artifacts exist and Custom Workflow Instructions

## Technical Reference

### Section Formats by Artifact

| Artifact | Header | Purpose |
|----------|--------|---------|
| `SpecResearch.md` | `## Open Unknowns` | Unanswered questions about current system behavior |
| `CodeResearch.md` | `## Open Questions` | Technical implementation questions needing investigation |
| `Spec.md` | `## Assumptions` | Design decisions made where definitive answers unavailable |
| `ImplementationPlan.md` | `## Open Questions` | Should be empty—per Guideline 6, no open questions in final plan |

### PR Description Section Format

The generated "Open Questions Resolution" section follows this structure:

```markdown
## Open Questions Resolution
[Document how uncertainties raised during the workflow were resolved]

### From SpecResearch.md (Open Unknowns)
- **[Question summary]**: [Resolution] — [Implementation reference or "Documented in Spec.md Assumptions"]

### From CodeResearch.md (Open Questions)
- **[Question summary]**: [Resolution] — [Implementation reference file:line]

### From Spec.md (Assumptions)
[List key assumptions that represent design decisions]
- [Assumption]: [Rationale summary]

*If no open questions were raised in any artifact, state: "No open questions were raised during the workflow."*
*If questions remain unresolved, document the deferral explanation provided during pre-flight checks.*
```

### Quality Checklist Items

The feature adds three quality checklist items for verification:
- Open Questions Resolution section included in PR description
- All questions from research artifacts have documented resolutions
- Any unresolved questions have user-provided deferral explanations

## Usage Examples

### Example 1: Workflow with Resolved Questions

Given a workflow where SpecResearch.md contained:
```markdown
## Open Unknowns
- How does the current auth system handle token expiration?
```

And Spec.md later documented:
```markdown
## Assumptions
- Auth tokens expire after 24 hours based on current system behavior
```

The Final PR will generate:
```markdown
## Open Questions Resolution

### From SpecResearch.md (Open Unknowns)
- **Token expiration behavior**: Resolved — Documented in Spec.md Assumptions (24-hour expiration)

### From Spec.md (Assumptions)
- Auth tokens expire after 24 hours: Based on current system behavior observed during research
```

### Example 2: Workflow with No Open Questions

For a straightforward implementation:
```markdown
## Open Questions Resolution

No open questions were raised during the workflow.
```

### Example 3: Deferred Question

When a question is explicitly deferred:
```markdown
## Open Questions Resolution

### From CodeResearch.md (Open Questions)
- **Pagination vs cursor-based iteration**: Deferred to v2 per stakeholder decision. Current implementation uses simple offset pagination. User provided explanation: "Performance optimization will be addressed in follow-up work item #456."
```

## Edge Cases and Limitations

### Graceful Degradation
- **Missing artifacts**: If an artifact doesn't exist (e.g., SpecResearch.md skipped in minimal mode), the check notes the artifact was not present rather than failing
- **Empty sections**: If an open questions section exists but is empty, no false positives are reported

### Known Limitations
- **Contradiction detection**: If a question is resolved in one artifact but contradicted in another, the agent flags the discrepancy but may not automatically resolve it
- **Heuristic matching**: Resolution mapping uses heuristics; edge cases may require user clarification
- **Section header dependency**: Extraction depends on exact section headers; non-standard formatting may not be detected

## Testing Guide

### How to Test This Feature

1. **Create a workflow with open questions**: Run PAW on a feature where research surfaces questions
2. **Complete implementation**: Ensure questions are addressed in subsequent artifacts or implementation
3. **Invoke Final PR agent**: Run `PAW-05 PR` and observe:
   - Pre-flight check includes "6. Open Questions Resolved"
   - Agent extracts questions from each artifact
   - PR description includes "Open Questions Resolution" section
4. **Verify resolution mapping**: Check that questions are correctly linked to their resolutions

### Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Open questions in SpecResearch, resolved in Spec Assumptions | Questions listed with "Documented in Spec.md Assumptions" |
| Open questions in CodeResearch, resolved in implementation | Questions listed with file:line references |
| Unresolved question | Pre-flight blocks, prompts user for explanation |
| No open questions in any artifact | Section states "No open questions were raised" |
| ImplementationPlan has open questions | Flagged as Guideline 6 violation (incomplete plan) |
| Missing artifact (minimal mode) | Gracefully skipped, noted as not present |

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/132
- Implementation: [PAW-05 PR.agent.md](../../../agents/PAW-05%20PR.agent.md)
- Related Specification: [Spec.md](./Spec.md)
- Research: [SpecResearch.md](./SpecResearch.md), [CodeResearch.md](./CodeResearch.md)
