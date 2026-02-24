---
name: paw-discovery-correlation
description: Correlation activity skill for PAW Discovery workflow. Cross-references extracted themes with mapped capabilities to identify matches, gaps, and combination opportunities.
---

# Discovery Correlation

> **Execution Context**: This skill runs **directly** in the PAW Discovery session, as it may require interactive clarification for relevance mismatches.

Cross-reference extracted themes with mapped codebase capabilities to identify relationships, gaps, and opportunities for strategic leverage.

## Capabilities

- Read Extraction.md for themes (features, needs, constraints, vision)
- Read CapabilityMap.md for existing capabilities
- Generate correlation matrix: Theme × Capability relationships
- Identify direct matches (theme maps to existing capability)
- Identify gaps (theme requires new capability)
- Identify combinations (multiple capabilities combine for larger outcome)
- Surface relevance mismatches for user confirmation
- Generate Correlation.md artifact

## Correlation Types

### Direct Match
A theme maps directly to an existing capability.
- The capability fully or substantially addresses the theme
- Implementation would extend/modify existing code
- Lower effort than net-new development

### Gap
A theme has no matching capability in the codebase.
- Requires net-new implementation
- No existing code to extend
- Higher effort, but also higher differentiation

### Combination
Multiple capabilities can combine to address a theme.
- Strategic leverage opportunity
- Individual capabilities exist but aren't connected
- Implementation creates emergent value

### Partial Match
A theme partially maps to a capability.
- Capability addresses some aspects of the theme
- Additional work needed to fully address
- Hybrid of extension and new development

## Correlation Analysis Process

### Step 1: Load Artifacts

Read both Extraction.md and CapabilityMap.md:
- Build theme list with IDs (F1, N1, C1, V1, etc.)
- Build capability list with IDs (CAP-1, CAP-2, etc.)
- Note existing coverage from CapabilityMap.md theme coverage table

### Step 2: Analyze Each Theme

For each theme, determine:
1. Which capabilities relate (if any)
2. Correlation type (match, gap, combination, partial)
3. Confidence level (high/medium/low)
4. Rationale for the correlation

### Step 3: Identify Combinations

Look for combination opportunities:
- Multiple capabilities that together address a complex theme
- Capabilities that could be connected for emergent value
- Themes that benefit from coordinated capability enhancement

### Step 4: Surface Relevance Issues

If extracted themes seem unrelated to codebase domain:
1. Flag the mismatch
2. Ask user: Is this intentional (greenfield) or wrong target repo?
3. Document decision in Correlation.md

## Interactive Clarification

### When to Ask

- Relevance mismatch between themes and codebase domain
- Ambiguous correlation (could be match or gap)
- Combination opportunities that need validation
- Theme that seems important but has no correlation

### Question Format

- One question at a time
- Provide context from both artifacts
- Offer recommendation when you have one

## Correlation.md Artifact

Save to: `.paw/discovery/<work-id>/Correlation.md`

### Template

```markdown
---
date: [ISO timestamp]
work_id: [work-id]
theme_count: [N from Extraction.md]
capability_count: [M from CapabilityMap.md]
match_count: [direct matches]
gap_count: [gaps]
combination_count: [combinations]
partial_count: [partial matches]
status: complete
---

# Correlation: [Work Title]

## Summary

[2-3 sentences describing the correlation landscape and key findings]

## Correlation Matrix

| Theme | Type | Related Capabilities | Confidence | Notes |
|-------|------|---------------------|------------|-------|
| F1 | Match | CAP-1 | High | Extends existing auth |
| F2 | Gap | - | High | Net-new capability |
| F3 | Combination | CAP-2, CAP-3 | Medium | Requires integration |
| N1 | Partial | CAP-1 | Medium | Covers 60% |
| C1 | Match | CAP-4 | High | Already enforced |

## Direct Matches

### F1 → CAP-1: [Correlation Name]
- **Theme**: [F1 description from Extraction.md]
- **Capability**: [CAP-1 description from CapabilityMap.md]
- **Rationale**: [Why this is a match]
- **Implementation Impact**: [What extending this means]

...

## Gaps

### F2: [Theme Name]
- **Theme**: [F2 description]
- **Why Gap**: [Why no capability matches]
- **New Work Required**: [What needs to be built]

...

## Combinations

### F3 → CAP-2 + CAP-3: [Combination Name]
- **Theme**: [F3 description]
- **Capabilities**: [CAP-2 and CAP-3 descriptions]
- **Synergy**: [How they combine for greater value]
- **Integration Required**: [What connects them]

...

## Partial Matches

### N1 ↔ CAP-1: [Partial Match Name]
- **Theme**: [N1 description]
- **Capability**: [CAP-1 description]
- **Coverage**: [What's covered, what's not]
- **Gap to Fill**: [Additional work needed]

...

## Relevance Assessment

[Any notes about domain alignment between themes and codebase]
[User decisions if relevance mismatch was surfaced]

## Strategic Insights

- [Key insight 1 about the correlation landscape]
- [Key insight 2 about leverage opportunities]
- [Key insight 3 about gap patterns]
```

## Edge Cases

### Relevance Mismatch

If themes describe capabilities far outside codebase domain:
1. Surface explicitly: "Extracted themes appear unrelated to this codebase's domain"
2. Ask user: "Is this intentional (greenfield development) or should we target a different repo?"
3. Document decision in Relevance Assessment section

### No Matches

If all themes are gaps (no matching capabilities):
1. This is valid for greenfield or new domain
2. Document that correlations are primarily gaps
3. Note this affects prioritization (all new work)

## Quality Checklist

- [ ] All themes from Extraction.md are in correlation matrix
- [ ] Correlation types are assigned (match/gap/combination/partial)
- [ ] Confidence levels are assigned
- [ ] Rationale provided for each correlation
- [ ] Relevance issues surfaced (if any)
- [ ] YAML frontmatter counts are accurate
- [ ] Strategic insights section provides value for prioritization

## Completion Response

Report to PAW Discovery agent:
- Artifact path: `.paw/discovery/<work-id>/Correlation.md`
- Correlation summary (X matches, Y gaps, Z combinations)
- Relevance assessment (aligned / mismatch resolved)
- Ready for correlation review
