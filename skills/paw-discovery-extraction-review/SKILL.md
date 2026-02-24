---
name: paw-discovery-extraction-review
description: Review skill for PAW Discovery extraction stage. Validates Extraction.md quality before proceeding to mapping.
---

# Discovery Extraction Review

> **Execution Context**: This skill runs in a **subagent** session, delegated by the PAW Discovery orchestrator. Return structured verdict to the orchestrator.

Review Extraction.md artifact for quality and completeness before the mapping stage proceeds.

## Review Criteria

### Document Coverage

- [ ] All files in `inputs/` folder were processed
- [ ] Source documents listed in YAML frontmatter match actual inputs
- [ ] Token counts are reasonable (no obvious truncation)

### Theme Quality

- [ ] Each theme has a clear, actionable description
- [ ] Source attribution present for every theme (document path + quote)
- [ ] Confidence levels assigned (high/medium/low)
- [ ] No placeholder or TBD content

### Category Completeness

- [ ] Features section populated (unless inputs contain none)
- [ ] User Needs section populated (unless inputs contain none)
- [ ] At least one category has meaningful content
- [ ] Categories reflect actual input content (not fabricated)

### Conflict Handling

- [ ] Document conflicts were detected (if any exist)
- [ ] Conflicts were surfaced for user resolution
- [ ] Conflict Resolutions section documents outcomes
- [ ] No unresolved `[CONFLICT]` tags remain

### Interactive Refinement

- [ ] Q&A phase was conducted (or explicitly skipped by user)
- [ ] Ambiguous items were clarified
- [ ] Open Questions section captures unresolved items

### Artifact Integrity

- [ ] YAML frontmatter is valid and complete
- [ ] `status: complete` in frontmatter
- [ ] Theme count in frontmatter matches actual theme count
- [ ] Document is well-structured with clear sections

## Verdict

Return one of:
- **PASS**: All criteria met, proceed to mapping
- **REVISE**: Issues found, return to extraction with specific feedback

## Feedback Format

When returning REVISE, provide:

```markdown
## Extraction Review: REVISE

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
| Document coverage | 100% of inputs processed |
| Source attribution | 100% of themes attributed |
| Category population | ≥1 category with ≥1 theme |
| Conflict resolution | 0 unresolved conflicts |
| Artifact validity | Valid YAML, complete sections |

## Completion Response

Report to PAW Discovery agent:
- Verdict: PASS or REVISE
- Issues found (if REVISE)
- Recommended actions (if REVISE)
- Ready for mapping stage (if PASS)
