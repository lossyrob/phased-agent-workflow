---
name: paw-discovery-correlation-review
description: Review skill for PAW Discovery correlation stage. Validates Correlation.md quality before proceeding to prioritization.
---

# Discovery Correlation Review

> **Execution Context**: This skill runs in a **subagent** session, delegated by the PAW Discovery orchestrator. Return structured verdict to the orchestrator.

Review Correlation.md artifact for quality and completeness before the prioritization stage proceeds.

## Review Criteria

### Theme Coverage

- [ ] All themes from Extraction.md are in correlation matrix
- [ ] No themes are missing or orphaned
- [ ] Theme IDs match between artifacts

### Correlation Completeness

- [ ] Every theme has a correlation type assigned
- [ ] Correlation types are valid (match, gap, combination, partial)
- [ ] Confidence levels are assigned (high/medium/low)
- [ ] Rationale is provided for each correlation

### Evidence Quality

- [ ] Matches reference valid capability IDs from CapabilityMap.md
- [ ] Gaps have clear explanations for why no capability matches
- [ ] Combinations identify specific capabilities involved
- [ ] Partial matches specify coverage percentage or scope

### Logical Consistency

- [ ] No obvious correlations are missed
- [ ] Correlation types match the relationship described
- [ ] Confidence levels are justified by evidence
- [ ] Strategic insights are supported by correlation data

### Relevance Assessment

- [ ] Relevance mismatch was addressed (if applicable)
- [ ] User decision is documented (if mismatch occurred)
- [ ] Domain alignment is reasonable

### Artifact Integrity

- [ ] YAML frontmatter is valid and complete
- [ ] Counts in frontmatter match actual counts
- [ ] `status: complete` in frontmatter
- [ ] All sections are populated appropriately

## Verdict

Return one of:
- **PASS**: All criteria met, proceed to prioritization
- **REVISE**: Issues found, return to correlation with specific feedback

## Feedback Format

When returning REVISE, provide:

```markdown
## Correlation Review: REVISE

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
| Theme coverage | 100% of themes correlated |
| Correlation type assignment | 100% have valid type |
| Confidence levels | 100% assigned |
| Rationale | Present for all correlations |
| Artifact validity | Valid YAML, complete sections |

## Completion Response

Report to PAW Discovery agent:
- Verdict: PASS or REVISE
- Issues found (if REVISE)
- Recommended actions (if REVISE)
- Ready for prioritization stage (if PASS)
