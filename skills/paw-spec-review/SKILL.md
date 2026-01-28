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

## Execution Steps

### 1. Load Specification

Read `Spec.md` from `.paw/work/<work-id>/Spec.md`

### 2. Evaluate Against Quality Criteria

Review each criterion in the checklist below. For each failing item:
- Note the specific issue
- Identify the section(s) affected
- Suggest what needs to change (without prescribing exact wording)

### 3. Return Structured Feedback

Return findings to PAW agent—do NOT decide next steps.

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

## Feedback Format

### Pass

```
Spec Review: PASS

Specification meets quality criteria. Ready for planning stage.

Minor suggestions (optional):
- <any polish recommendations>
```

### Fail

```
Spec Review: FAIL

Issues requiring revision:

1. [Criterion]: <specific issue>
   Section: <which section(s)>
   Suggestion: <what to fix>

2. [Criterion]: <specific issue>
   Section: <which section(s)>
   Suggestion: <what to fix>

Items passing: <count>/<total>
```

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

Return structured feedback to PAW agent:

```
Spec review complete.

Result: <PASS | FAIL>
Criteria passing: <count>/<total>
Issues found: <count>

<Detailed feedback per format above>
```
