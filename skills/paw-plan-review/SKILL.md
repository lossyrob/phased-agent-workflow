---
name: paw-plan-review
description: Plan review activity skill for PAW workflow. Reviews implementation plans for feasibility, completeness, and spec alignment before implementation proceeds.
---

# Plan Review

Review implementation plans for quality, feasibility, and alignment with specification before implementation proceeds.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Review ImplementationPlan.md for feasibility, completeness, and spec alignment
- Validate against quality criteria
- Identify specific phases or sections needing revision
- Return structured feedback with pass/fail status

## Desired End State

- Plan reviewed against all quality criteria
- Specific issues identified with actionable feedback
- Structured PASS/FAIL response returned to PAW agent

## Quality Criteria

### Spec Coverage

- [ ] All spec requirements mapped to plan phases
- [ ] User stories have corresponding implementation work
- [ ] Success criteria from spec reflected in phase success criteria
- [ ] No spec requirements orphaned (missing from plan)

### Phase Feasibility

- [ ] Each phase has clear, testable success criteria
- [ ] Phase boundaries are logical (not too large, not too small)
- [ ] Dependencies between phases are explicit
- [ ] Phases build incrementally and can be reviewed independently

### Completeness

- [ ] No placeholder content or TBDs
- [ ] All file paths and components specified
- [ ] Unit tests specified alongside code they test
- [ ] "What We're NOT Doing" section exists

### Research Integration

- [ ] Code research findings incorporated (file:line references)
- [ ] Documentation System section from CodeResearch.md considered
- [ ] Existing patterns referenced where applicable

### Strategic Focus

- [ ] Changes describe WHAT not HOW (interfaces, responsibilities)
- [ ] Code blocks limited to architectural concepts (<10 lines)
- [ ] No implementation algorithms or pseudo-code
- [ ] Significant decisions include trade-off analysis

### Documentation Planning

- [ ] Documentation phase included (standard for all non-trivial changes)
- [ ] Docs.md specified for technical reference (always required)
- [ ] Project docs updates included if user-facing or API changes exist
- [ ] If project docs omitted: reason provided

## Review Process

1. Read ImplementationPlan.md completely
2. Cross-reference with Spec.md for coverage
3. Check CodeResearch.md integration
4. Evaluate each quality criteria category
5. Compile specific issues with locations
6. Determine overall PASS/FAIL status

## Feedback Categories

| Category | Description |
|----------|-------------|
| **BLOCKING** | Must fix before implementation (missing requirements, infeasible phases) |
| **IMPROVE** | Should address but not blocking (clarity, organization) |
| **NOTE** | Observation for awareness (minor suggestions, alternatives) |

## Completion Response

Return structured feedback to PAW agent:

**PASS**: Plan meets quality criteria, ready for implementation
- Confirm spec coverage complete
- Note any non-blocking observations

**FAIL**: Plan needs revision before implementation
- List blocking issues with specific locations
- Categorize issues (BLOCKING, IMPROVE)
- Suggest what needs to change (not how to change it)

### Response Content

Include in completion response:
- Overall status: PASS or FAIL
- Spec coverage assessment: which requirements are covered, any gaps
- Phase feasibility assessment: any phases too large, unclear, or missing dependencies
- Completeness check: any TBDs, missing tests, incomplete sections
- Specific issues: categorized with plan section references
- Recommendation: proceed to implementation or revise plan

## Non-Responsibilities

- Do NOT make orchestration decisions (PAW agent handles next steps)
- Do NOT modify the plan directly (return feedback for planning skill to address)
- Do NOT implement changes (review only)
- Do NOT handle handoffs (return status to PAW agent)
