---
name: paw-discovery-mapping-review
description: Review skill for PAW Discovery mapping stage. Validates CapabilityMap.md quality before proceeding to correlation.
---

# Discovery Mapping Review

> **Execution Context**: This skill runs in a **subagent** session, delegated by the PAW Discovery orchestrator. Return structured verdict to the orchestrator.

Review CapabilityMap.md artifact for quality and completeness before the correlation stage proceeds.

## Review Criteria

### Capability Evidence

- [ ] Each capability has file:line references
- [ ] References are specific (not just directory paths)
- [ ] Descriptions accurately reflect referenced code
- [ ] No fabricated or hallucinated capabilities

### Theme Coverage

- [ ] Theme Coverage table is complete
- [ ] All themes from Extraction.md are listed
- [ ] Coverage status (Full/Partial/Gap) is assigned
- [ ] Related Themes links use valid IDs from Extraction.md

### Capability Quality

- [ ] Descriptions are clear and actionable
- [ ] Capabilities are distinct (no duplicates)
- [ ] Notes provide useful context
- [ ] Capability count meets threshold (≥3 for non-trivial codebases)

### Gap Identification

- [ ] Gaps section lists themes without capabilities
- [ ] Gap explanations are reasonable
- [ ] No obvious capabilities were missed

### Artifact Integrity

- [ ] YAML frontmatter is valid and complete
- [ ] `status: complete` in frontmatter
- [ ] Capability count matches actual count
- [ ] Summary accurately reflects findings

## Verdict

Return one of:
- **PASS**: All criteria met, proceed to correlation
- **REVISE**: Issues found, return to mapping with specific feedback

## Feedback Format

When returning REVISE, provide:

```markdown
## Mapping Review: REVISE

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
| File:line references | 100% of capabilities |
| Theme coverage | 100% of themes listed |
| Capability count | ≥3 for non-trivial codebases |
| Artifact validity | Valid YAML, complete sections |

## Completion Response

Report to PAW Discovery agent:
- Verdict: PASS or REVISE
- Issues found (if REVISE)
- Recommended actions (if REVISE)
- Ready for correlation stage (if PASS)
