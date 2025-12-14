# Final PR Open Questions Resolution - Implementation Plan

## Overview

Enhance the PAW-05 PR agent to systematically review all workflow artifacts for open questions, map them to resolutions, and document this audit trail in the final PR description. This creates transparency for reviewers by surfacing the decision-making process that occurred throughout the workflow.

## Current State Analysis

The PAW-05 PR agent currently:
- Performs 5 categories of pre-flight validation checks ([PAW-05 PR.agent.md](../../../agents/PAW-05%20PR.agent.md#L117-L145))
- Uses a "block-then-override" pattern for failures (line 145)
- Has an 11-section PR description template (lines 148-202)
- Adapts to workflow mode via artifact discovery pattern (lines 52-60)

What's missing:
- No pre-flight check for open questions resolution
- No extraction logic for open questions from artifacts
- No "Open Questions Resolution" section in PR description

### Key Discoveries:
- Open questions use consistent section headers: `## Open Unknowns` (SpecResearch), `## Open Questions` (CodeResearch, ImplementationPlan), `## Assumptions` (Spec.md)
- ImplementationPlan.md should have no open questions per Guideline 6—populated section indicates incomplete plan
- Out-of-scope items (`## Scope` → `Out of Scope:`, `## What We're NOT Doing`) are resolved decisions, not uncertainties
- PR description insertion point: after `## Acceptance Criteria`, before `## Deployment Considerations`

## Desired End State

After implementation:
1. The Final PR agent performs a new pre-flight check (Section 6) that extracts and reviews open questions from all artifacts
2. Unresolved questions block PR creation with clear messaging and user override option
3. The PR description includes an "Open Questions Resolution" section documenting each question's origin and how it was resolved
4. Reviewers can understand the decision-making journey by reading this section

### Verification:
- Create a test workflow with open questions in artifacts; Final PR should include populated "Open Questions Resolution" section
- Create a test workflow with no open questions; section should indicate "No open questions were raised"
- If ImplementationPlan.md has open questions (Guideline 6 violation), agent should flag this in pre-flight

## What We're NOT Doing

- Modifying how earlier agents document open questions (question format is fixed)
- Adding open question tracking to intermediate PRs (Phase PRs, Docs PRs)
- Automated resolution of questions (agent documents, doesn't decide)
- Creating a separate agent for this functionality

## Implementation Approach

Single-phase modification to the PAW-05 PR agent file. The changes are localized additions:
1. Add pre-flight check section 6 for open questions
2. Add extraction instructions for each artifact type
3. Extend the PR description template with new section
4. Add quality checklist items

Since this is agent markdown (not code), the "implementation" is documentation of agent behavior that the LLM follows.

## Phase Summary

1. **Phase 1: Enhance Final PR Agent** - Add open questions pre-flight check and PR description section to PAW-05 PR agent

---

## Phase 1: Enhance Final PR Agent

### Overview
Modify PAW-05 PR.agent.md to add open questions resolution capabilities: pre-flight validation, extraction instructions, and PR description section.

### Changes Required:

#### 1. Add Pre-flight Check Section 6
**File**: `agents/PAW-05 PR.agent.md`

**Changes**:
- Add new section `### 6. Open Questions Resolved` after the existing section 5 (Build and Tests)
- Include checklist items for reviewing each artifact's open questions section
- Document the extraction algorithm inline (which headers to find, what to extract)
- Specify the "unresolved question" blocking behavior with user override

**Content to add (between section 5 and "If checks fail" line):**
```markdown
### 6. Open Questions Resolved
- [ ] SpecResearch.md `## Open Unknowns` reviewed and resolutions identified
- [ ] CodeResearch.md `## Open Questions` reviewed and resolutions identified
- [ ] Spec.md `## Assumptions` documented (assumptions are resolved decisions)
- [ ] ImplementationPlan.md `## Open Questions` is empty or "None" (Guideline 6 compliance)
- [ ] All questions mapped to resolution or flagged for user input

**Extraction Instructions:**
For each existing artifact, find the relevant section header and extract content until the next `##` heading:
- SpecResearch.md: `## Open Unknowns` — unanswered internal questions
- CodeResearch.md: `## Open Questions` — technical implementation questions
- Spec.md: `## Assumptions` — documented design decisions (these ARE the resolutions)
- ImplementationPlan.md: `## Open Questions` — should be empty/None per Guideline 6

**Resolution Mapping:**
- Questions from SpecResearch should be resolved in Spec.md Assumptions or via explicit clarification
- Questions from CodeResearch should be resolved in ImplementationPlan decisions or implementation (file:line)
- If ImplementationPlan has open questions, flag as incomplete plan

**Unresolved Questions Handling:**
If a question cannot be mapped to a resolution:
1. Report the unresolved question with source artifact and full context
2. Provide a recommendation (suggest resolution approach or explicit deferral)
3. Block PR creation until user provides resolution or deferral explanation
4. Include user-provided explanation in the Open Questions Resolution section

**Note:** Out-of-scope items (`## Scope` → `Out of Scope:`, `## What We're NOT Doing`) are resolved decisions, NOT uncertainties. Do not include them as open questions.
```

**Tests**:
- Lint agent with `./scripts/lint-agent.sh agents/PAW-05\ PR.agent.md`
- Manual verification: Trace through the agent file structure to confirm section numbering is consistent

#### 2. Add PR Description Section
**File**: `agents/PAW-05 PR.agent.md`

**Changes**:
- Insert new `## Open Questions Resolution` section in the PR template between `## Acceptance Criteria` and `## Deployment Considerations`
- Document the expected format with grouping by source artifact

**Content to insert in PR Description Template:**
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

**Tests**:
- Manual verification: Read the template and confirm the new section appears between Acceptance Criteria and Deployment Considerations
- The section format matches the research findings for how questions are documented

#### 3. Add Quality Checklist Items
**File**: `agents/PAW-05 PR.agent.md`

**Changes**:
- Add checklist items to the existing Quality Checklist section to verify open questions handling

**Items to add:**
```markdown
- [ ] Open Questions Resolution section included in PR description
- [ ] All questions from research artifacts have documented resolutions
- [ ] Any unresolved questions have user-provided deferral explanations
```

**Tests**:
- Lint agent with `./scripts/lint-agent.sh agents/PAW-05\ PR.agent.md`

### Success Criteria:

#### Automated Verification:
- [x] Agent linter passes: `./scripts/lint-agent.sh agents/PAW-05\ PR.agent.md`
- [x] MkDocs build passes: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] Pre-flight check section 6 appears after section 5 with correct format
- [ ] PR description template includes "Open Questions Resolution" between "Acceptance Criteria" and "Deployment Considerations"
- [ ] Quality checklist includes new items for open questions
- [ ] Extraction instructions clearly document which headers to find in each artifact
- [ ] Unresolved question handling follows the block-then-override pattern
- [ ] Out-of-scope exclusion is clearly documented

### Phase 1 Complete

**Status**: ✅ Complete  
**Commit**: ccea599  
**Date**: 2025-12-13

All automated verification passed:
- Agent linter passes with warning (5155 tokens, exceeds 5000 token warning threshold)
- MkDocs build passes

Changes implemented:
1. Added `### 6. Open Questions Resolved` pre-flight check section with checklist items for each artifact
2. Added extraction instructions documenting which headers to find in each artifact
3. Added resolution mapping and unresolved questions handling with block-then-override pattern
4. Added `## Open Questions Resolution` section in PR template between Acceptance Criteria and Deployment Considerations
5. Added 3 quality checklist items for open questions verification

**Review Notes**: The token count warning (5155 tokens) is expected since we added substantial content. The agent file remains well under critical thresholds.

---

## Cross-Phase Testing Strategy

### Integration Tests:
- Run the Final PR agent on a real feature workflow and verify:
  - Pre-flight checks include open questions review
  - PR description includes Open Questions Resolution section
  - Questions are properly grouped by source artifact

### Manual Testing Steps:
1. Create a test workflow with open questions in SpecResearch.md and CodeResearch.md
2. Run Final PR agent and verify the "Open Questions Resolution" section is populated
3. Verify questions from each artifact are grouped correctly
4. Test with a workflow that has no open questions—section should indicate this clearly
5. Test with ImplementationPlan.md that has open questions—should flag as Guideline 6 violation

## Performance Considerations

Open question extraction is lightweight text processing performed on small markdown files. No performance impact expected.

## Migration Notes

None. This is an additive change to the agent file with no backward compatibility concerns. Existing workflows without open questions sections will simply show "No open questions were raised."

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/132
- Spec: `.paw/work/final-pr-review-open-questions/Spec.md`
- Research: `.paw/work/final-pr-review-open-questions/SpecResearch.md`, `.paw/work/final-pr-review-open-questions/CodeResearch.md`
- Agent to modify: `agents/PAW-05 PR.agent.md`
