# Spec Research: Final PR Open Questions Resolution

## Summary

Research confirms that the Final PR agent has a pre-flight check framework that blocks PR creation on failures but allows explicit user override. Open questions are documented in consistent section headers across artifacts: "Open Unknowns" (SpecResearch.md), "Open Questions" (CodeResearch.md), and "Assumptions" (Spec.md). The Specification agent handles out-of-scope items in a dedicated "Out of Scope" section within the "Scope" section. The Implementation Plan explicitly prohibits open questions (guideline: "No Open Questions in Final Plan"). The PR description template has a logical insertion point after "Acceptance Criteria" and before "Deployment Considerations" for an "Open Questions Resolution" section.

## Agent Notes

The issue raises three explicit clarification questions that inform requirement decisions:
1. Should unresolved questions block PR creation, or just be flagged?
2. How to handle questions that were deemed "out of scope"?
3. Should this be a separate agent or integrated into existing Final PR agent?

For question 3, I've made an explicit assumption: integrate into existing Final PR agent (consistent with PAW's philosophy of minimizing agent proliferation). This is documented in Scope.

For questions 1 and 2, I need research on current agent behavior to inform the decision. The research below focuses on understanding how existing agents handle blocking conditions and out-of-scope items.

Additionally, we need to understand the exact format of open question documentation across artifacts to design extraction logic.

## Research Findings

### Question 1: How does the existing Final PR agent handle pre-flight check failures—does it block PR creation or allow user override?

**Answer**: The Final PR agent blocks PR creation when pre-flight checks fail, but allows the user to explicitly confirm proceeding despite failures.

The agent's documented behavior states:
- "Block PR creation if checks fail" (Core Responsibilities)
- "If checks fail, report status and recommendations. If the user explicitly confirms to proceed, continue with PR creation."
- Process step 2: "If any fail, STOP and inform the user"

This establishes a pattern of:
1. Report the failure with status and recommendations
2. Block automatic progression
3. Allow explicit user override to proceed

**Evidence**: PAW-05 PR agent file, Core Responsibilities and Pre-flight Validation Checks sections.

**Implications**: Unresolved open questions should follow this same pattern—flag them during pre-flight checks, block by default, but allow user to explicitly proceed. This provides consistency with existing behavior.

### Question 2: What is the exact section structure for open questions in SpecResearch.md, CodeResearch.md, and ImplementationPlan.md? What headers and formats are used?

**Answer**: Each artifact uses specific section headers and formats for documenting uncertainties:

**SpecResearch.md**:
- Header: `## Open Unknowns`
- Format: Unanswered internal questions with rationale explaining why they couldn't be answered
- Purpose: Questions that couldn't be resolved through research (internal system behavior)
- Example pattern from spec: "None. All internal questions have been answered through repository inspection."

**CodeResearch.md**:
- Header: `## Open Questions`
- Format: Numbered list or bullet points with areas that need further investigation
- Purpose: Technical implementation questions that remain after code research
- Example from codebase: Numbered questions about template location, continue target format, scope boundaries

**ImplementationPlan.md**:
- Header: `## Open Questions` (but constrained by guideline)
- The Implementation Plan agent has an explicit guideline: "No Open Questions in Final Plan" (Guideline 6)
- This means: "STOP when you encounter unresolved questions—resolve before continuing"
- The plan prohibits placeholders (`TBD`, `???`)—all decisions must be explicit
- If the section exists, it should be empty or the plan is incomplete

**Evidence**: Spec Research agent document format section, Code Research agent research document template, Implementation Planner agent Guideline 6.

**Implications**: Extraction logic should search for these specific headers:
- `## Open Unknowns` (SpecResearch.md)
- `## Open Questions` (CodeResearch.md)
- `## Open Questions` (ImplementationPlan.md - should be empty if plan is complete)

### Question 3: How does the Specification agent handle "out of scope" items—where are they documented and in what format?

**Answer**: The Specification agent documents out-of-scope items in a dedicated "Scope" section with explicit "In Scope" and "Out of Scope" subsections.

Format from Spec.md template:
```markdown
## Scope
In Scope:
- <included boundary>
Out of Scope:
- <explicit exclusion>
```

The Specification agent's Quality Checklist requires: "Clear In/Out of Scope boundaries" as a pass criteria for finalization.

Out-of-scope items are explicit exclusions that represent conscious decisions NOT to include something in the current work. These are different from open questions—they are resolved decisions to defer or exclude functionality.

**Evidence**: PAW-01A Specification agent inline template and Quality Checklist section.

**Implications**: The "Out of Scope" section items should be treated separately from open questions. They represent resolved decisions (chose not to do X) rather than uncertainties. The Open Questions Resolution section should NOT include out-of-scope items since these are already resolved decisions.

### Question 4: Does the Implementation Plan agent document any "deferred" or "out of scope" decisions? If so, where and how?

**Answer**: Yes, the Implementation Plan agent documents out-of-scope items in a section titled "What We're NOT Doing".

Template structure:
```markdown
## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]
```

Quality Checklist item: '"What We're NOT Doing" section prevents scope creep and out-of-scope work'

This section serves a similar purpose to Spec.md's "Out of Scope" but is framed as explicit exclusions from the implementation plan to prevent scope creep during development.

**Evidence**: PAW-02B Implementation Planner agent template structure and Quality Checklist.

**Implications**: Like Spec.md's Out of Scope, these are resolved decisions (explicit exclusions) not uncertainties. They should not appear in Open Questions Resolution. However, if any "What We're NOT Doing" items were controversial or had associated discussion, that context might be valuable to surface—but this is a design decision, not a research finding.

### Question 5: What is the current PR description template structure in the Final PR agent, and where would an "Open Questions Resolution" section logically fit?

**Answer**: The current PR description template has this structure:

1. `# [Feature/Task Name]`
2. `## Summary` - 1-2 paragraph overview from Spec.md
3. `## Related Issues` - Closes issue at <Issue URL>
4. `## Artifacts` - Links to all workflow artifacts
5. `## Implementation Phases` - List of phase PRs
6. `## Documentation Updates` - Docs PR reference
7. `## Changes Summary` - High-level summary with Key Changes subsection
8. `## Testing` - Unit, integration, manual testing status
9. `## Acceptance Criteria` - Spec.md criteria with completion status
10. `## Deployment Considerations` - Deployment notes, migrations
11. `## Breaking Changes` - Breaking changes or "None"

Logical insertion point: After `## Acceptance Criteria` and before `## Deployment Considerations`.

Rationale: The "Acceptance Criteria" section verifies that requirements are met. An "Open Questions Resolution" section would document how uncertainties were handled in meeting those criteria—a natural follow-on. Deployment and Breaking Changes are operational concerns that belong at the end.

**Evidence**: PAW-05 PR agent PR Description Template section.

**Implications**: The new section should be inserted between Acceptance Criteria and Deployment Considerations. This positions it after functional verification (acceptance criteria) and before operational concerns (deployment).

## Open Unknowns

None. All internal questions about existing system behavior have been answered through artifact inspection.

## User-Provided External Knowledge (Manual Fill)

The following optional external/context questions may be filled in manually if additional guidance is desired:

- [ ] Are there industry best practices or examples of PR templates that include decision documentation?
