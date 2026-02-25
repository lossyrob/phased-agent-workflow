---
name: paw-discovery-journey-grounding-review
description: Review skill for PAW Discovery journey grounding stage. Validates JourneyMap.md quality before proceeding to scoping.
---

# Discovery Journey Grounding Review

> **Execution Context**: This skill runs in a **subagent** session, delegated by the PAW Discovery orchestrator. Return structured verdict to the orchestrator.

Review JourneyMap.md artifact for quality and completeness before the journey scoping checkpoint proceeds.

## Review Criteria

### Pain Point Quality

- [ ] Pain points have direct quotes from source documents
- [ ] Source citations include document path and location
- [ ] Severity ratings (High/Medium/Low) are assigned
- [ ] Severity rationale is provided

### Journey Model Validity

- [ ] Journey model is present (grounded or synthesized)
- [ ] If grounded, source citation is provided
- [ ] If synthesized, marked with [SYNTHESIS] tag
- [ ] Model steps are explained in user terms

### Journey Completeness

- [ ] Each journey has a clear user goal
- [ ] Journeys reference pain points they address
- [ ] Steps include user actions and system responses
- [ ] Required features are mapped to each step
- [ ] MVP options (Full/Partial/Minimal) are defined

### Source Tracing Accuracy

- [ ] All content is marked with [SOURCE] or [SYNTHESIS]
- [ ] Source citations are verifiable (document exists, location reasonable)
- [ ] Synthesis is used appropriately (connections, inferences, not fabrication)
- [ ] Source Tracing Summary counts are accurate

### Feature Mapping Quality

- [ ] Feature-to-Journey mapping table is complete
- [ ] Feature IDs match those in Correlation.md
- [ ] All journey-required features are listed
- [ ] Features not required for any journey are identified

### Artifact Integrity

- [ ] YAML frontmatter is valid and complete
- [ ] Counts in frontmatter match actual counts
- [ ] `status: complete` in frontmatter
- [ ] All sections are populated appropriately

## Verdict

Return one of:
- **PASS**: All criteria met, proceed to journey scoping
- **REVISE**: Issues found, return to journey grounding with specific feedback

## Feedback Format

When returning REVISE, provide:

```markdown
## Journey Grounding Review: REVISE

### Issues Found

1. **[Category]**: [Specific issue]
   - Evidence: [What was found/missing]
   - Required action: [What needs to change]

2. **[Category]**: [Specific issue]
   ...

### Recommended Actions

1. [Specific action to address issue 1]
2. [Specific action to address issue 2]
```

## Quality Thresholds

| Criterion | Threshold |
|-----------|-----------|
| Pain point source citations | 100% have [SOURCE] tags with document references |
| Journey model | Present (grounded or synthesized with appropriate marking) |
| Journey completeness | All journeys have goal, steps, feature mapping, MVP options |
| Source tracing | 100% of content marked [SOURCE] or [SYNTHESIS] |
| Feature mapping | 100% of journey-required features listed |
| Synthesis ratio | No threshold, but must be accurately calculated |

## Completion Response

Report to PAW Discovery agent:
- Verdict: PASS or REVISE
- Issues found (if REVISE)
- Recommended actions (if REVISE)
- Source tracing summary (grounded vs. synthesized counts)
- Ready for journey scoping checkpoint (if PASS)
