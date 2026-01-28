---
name: paw-spec-review
description: Specification review skill for PAW workflow. Validates Spec.md against quality criteria and returns structured feedback for iteration.
---

# Spec Review

Review specifications for quality, completeness, and clarity before planning proceeds. Return structured feedback—do not make orchestration decisions.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Review Spec.md for quality, completeness, and clarity
- Validate against specification quality criteria
- Identify specific sections needing revision
- Return structured feedback with pass/fail status

## Desired End State

After review, the PAW agent receives:
- Pass/fail determination
- For passing specs: confirmation of readiness for planning (with optional polish suggestions)
- For failing specs: specific issues by criterion, affected sections, and suggestions for fixing

## Review Process

Evaluate the specification at `.paw/work/<work-id>/Spec.md` against the Quality Criteria Checklist below. For failing items, note the specific issue, identify affected section(s), and suggest what needs to change without prescribing exact wording.

## Quality Criteria Checklist

### Content Quality
- [ ] **User value focus**: Describes WHAT & WHY, no implementation details
- [ ] **No code artifacts**: No code snippets, file paths, API signatures, class names
- [ ] **Story priorities**: Clear priority order (P1 highest, descending)
- [ ] **Testable stories**: Each user story is independently testable
- [ ] **Acceptance scenarios**: Each story has ≥1 acceptance scenario (Given/When/Then)
- [ ] **Edge cases**: Edge conditions and error modes enumerated

### Narrative Quality
- [ ] **Overview present**: 2-4 paragraphs of flowing prose (not bullets)
- [ ] **Objectives present**: Bulleted behavioral goals (not implementation)
- [ ] **User perspective**: Overview and Objectives focus on WHAT/WHY from user viewpoint
- [ ] **Specific content**: Uses measurable language, not vague terms
- [ ] **No duplication**: Overview doesn't duplicate User Stories/FRs/SCs verbatim

### Requirement Completeness
- [ ] **FRs testable**: All functional requirements are observable and testable
- [ ] **FRs mapped**: Each FR linked to supporting user stories
- [ ] **SCs measurable**: Success criteria are measurable and technology-agnostic
- [ ] **SCs linked**: Success criteria reference relevant FR IDs
- [ ] **Assumptions documented**: No silently implied assumptions
- [ ] **Dependencies listed**: External dependencies and constraints captured

### Ambiguity Control
- [ ] **No unresolved questions**: No clarification markers or TBDs in spec body
- [ ] **Precise language**: No vague adjectives without metrics (e.g., "fast", "easy")

### Scope & Risk
- [ ] **Boundaries defined**: Clear In Scope and Out of Scope sections
- [ ] **Risks captured**: Known risks with impact and mitigation noted

### Research Integration (if SpecResearch.md exists)
- [ ] **Research incorporated**: System research questions answered or converted to assumptions
- [ ] **External questions listed**: Optional external questions preserved for manual completion

## Feedback Guidance

**For passing specs**: Indicate readiness for planning. Include minor polish suggestions if any.

**For failing specs**: List each failing criterion with the specific issue, affected section(s), and a suggestion for what to fix. Include count of passing vs total criteria.

## Review Guidelines

### Be Specific

Instead of: "FRs are incomplete"
Say: "FR-003 lacks story mapping. Add (Stories: P2) reference."

### Focus on Criteria

Only flag issues that violate a checklist item. Personal preferences don't count unless they affect testability or clarity.

### Don't Rewrite

Identify what's wrong and suggest direction. Don't prescribe exact wording—the Spec Agent makes those decisions.

### Context Matters

Consider workflow mode when reviewing:
- **Full mode**: Expect comprehensive coverage
- **Minimal mode**: Accept lighter spec with core FRs only
- **Custom mode**: Reference Custom Workflow Instructions for expected depth

## Completion Response

Report to PAW agent: pass/fail result, criteria passing count, issues found count, and detailed feedback per Feedback Guidance above. Do NOT make orchestration decisions—return status only.
