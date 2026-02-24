---
name: paw-discovery-prioritize-review
description: Review skill for PAW Discovery prioritization stage. Validates Roadmap.md quality before workflow completion.
---

# Discovery Prioritization Review

> **Execution Context**: This skill runs in a **subagent** session, delegated by the PAW Discovery orchestrator. Return structured verdict to the orchestrator.

Review Roadmap.md artifact for quality and completeness before Discovery workflow completes.

## Review Criteria

### Multi-Factor Rationale

- [ ] All 5 factors scored for each item (value, effort, dependencies, risk, leverage)
- [ ] Scores are justified with evidence
- [ ] User adjustments are documented (if any)
- [ ] Tradeoffs are explicitly discussed

### Priority Logic

- [ ] Priority order is logically consistent
- [ ] Dependency relationships are respected
- [ ] Blocker items are prioritized appropriately
- [ ] High-value, low-effort items are favored

### Item Completeness

- [ ] All prioritized items have theme reference
- [ ] Correlation type is specified
- [ ] Rationale explains the priority position
- [ ] No placeholder content

### PAW Handoff Quality

- [ ] Top priority item is clearly identified
- [ ] Handoff brief is actionable
- [ ] Work title is appropriate
- [ ] Description is sufficient for PAW initialization
- [ ] Context references Discovery artifacts

### Coverage

- [ ] All themes from Correlation.md are accounted for
- [ ] Deferred items have clear deferral rationale
- [ ] No themes are orphaned (missing from both roadmap and deferred)

### Artifact Integrity

- [ ] YAML frontmatter is valid and complete
- [ ] Item count matches actual count
- [ ] `status: complete` in frontmatter
- [ ] `paw_handoff_ready: true` if handoff brief exists

## Verdict

Return one of:
- **PASS**: All criteria met, Discovery workflow complete
- **REVISE**: Issues found, return to prioritization with specific feedback

## Feedback Format

When returning REVISE, provide:

```markdown
## Prioritization Review: REVISE

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
| Factor scoring | 5 factors for each item |
| Item completeness | All fields populated |
| Handoff quality | Actionable brief present |
| Theme coverage | 100% accounted for |
| Artifact validity | Valid YAML, complete sections |

## Completion Response

Report to PAW Discovery agent:
- Verdict: PASS or REVISE
- Issues found (if REVISE)
- Recommended actions (if REVISE)
- Discovery workflow complete (if PASS)
- PAW handoff ready (if PASS)
