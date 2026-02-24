---
name: paw-discovery-prioritize
description: Prioritization activity skill for PAW Discovery workflow. Applies multi-factor analysis to produce MVP roadmap with PAW handoff option.
---

# Discovery Prioritization

> **Execution Context**: This skill runs **directly** in the PAW Discovery session, as tradeoff discussion requires interactive user collaboration.

Apply multi-factor prioritization to correlated themes to produce a ranked MVP roadmap. Offer to initiate PAW workflow for the top-priority item.

## Capabilities

- Read Correlation.md for theme-capability relationships
- Apply 5-factor prioritization framework
- Facilitate interactive tradeoff discussion
- Generate prioritized roadmap with rationale
- Offer PAW workflow handoff for top item
- Generate Roadmap.md artifact

## Prioritization Factors

### 1. Value
**Question**: How much user/business value does this deliver?

| Score | Meaning |
|-------|---------|
| High | Core to user workflow, high demand, competitive differentiator |
| Medium | Useful enhancement, some user demand |
| Low | Nice-to-have, minimal user impact |

### 2. Effort
**Question**: How much work is required to implement?

| Score | Meaning |
|-------|---------|
| Low | Small change, existing patterns, clear path |
| Medium | Moderate work, some complexity |
| High | Large change, new patterns, significant complexity |

Consider correlation type: matches/partials = lower effort; gaps = higher effort

### 3. Dependencies
**Question**: What must be built first? What does this enable?

| Score | Meaning |
|-------|---------|
| Blocker | Nothing else can proceed without this |
| Enabler | Unlocks multiple downstream items |
| Independent | Can be built in isolation |

### 4. Risk
**Question**: What could go wrong? How uncertain is this?

| Score | Meaning |
|-------|---------|
| Low | Well-understood, proven approach |
| Medium | Some unknowns, manageable risk |
| High | Significant unknowns, potential for failure |

### 5. Leverage
**Question**: How much does this leverage existing capabilities?

| Score | Meaning |
|-------|---------|
| High | Extends existing capabilities significantly |
| Medium | Some reuse, some new work |
| Low | Mostly net-new, limited reuse |

From Correlation.md: matches/combinations = high leverage; gaps = low leverage

## Interactive Tradeoff Discussion

### Process

For each candidate roadmap item:
1. Present the item with current scores
2. Highlight key tradeoffs
3. Ask user to confirm or adjust
4. Document final decision

### Example Dialogue

```
**Item: User Authentication System (F1)**
- Value: High (core user workflow)
- Effort: Medium (partial match to CAP-1)
- Dependencies: Blocker (other features need auth)
- Risk: Low (well-understood pattern)
- Leverage: High (extends existing auth)

Recommendation: Priority 1 (high value, foundational)

Do you agree with this assessment? [Confirm / Adjust / Discuss]
```

### Adjustment Guidelines

If user disagrees:
1. Ask which factor they see differently
2. Understand their reasoning
3. Update score with user rationale
4. Document the adjustment

## Roadmap Generation

### Priority Calculation

Suggested priority formula (can be adjusted):
- High priority: High value + (Blocker or Enabler) + Low/Medium effort
- Medium priority: Medium value OR High effort with High value
- Low priority: Low value OR High risk without mitigation

### Ranking

Order items by:
1. Dependency order (blockers first)
2. Value-to-effort ratio
3. Risk (lower risk preferred for MVP)

## PAW Handoff

### When to Offer

After roadmap generation:
1. Identify the top-priority item
2. Offer to initiate PAW workflow
3. If user accepts, prepare handoff brief

### Handoff Brief

Generate brief for PAW workflow including:
- Work title from roadmap item name
- Description from item rationale
- Reference to Discovery artifacts
- Relevant capabilities from CapabilityMap.md
- Context from Correlation.md

## Roadmap.md Artifact

Save to: `.paw/discovery/<work-id>/Roadmap.md`

### Template

```markdown
---
date: [ISO timestamp]
work_id: [work-id]
item_count: [N]
top_priority: [item-name]
paw_handoff_ready: true
status: complete
---

# Roadmap: [Work Title]

## Summary

[2-3 sentences describing the prioritization outcome and recommended first steps]

## Prioritization Criteria

| Factor | Weight | Description |
|--------|--------|-------------|
| Value | High | User/business impact |
| Effort | Medium | Implementation complexity |
| Dependencies | High | Blocking/enabling relationships |
| Risk | Medium | Uncertainty and potential issues |
| Leverage | Medium | Reuse of existing capabilities |

## Prioritized Items

### Priority 1: [Item Name]
- **Theme**: [Theme ID and description]
- **Correlation**: [Match/Gap/Combination with capabilities]
- **Scores**:
  - Value: High | Effort: Medium | Dependencies: Blocker | Risk: Low | Leverage: High
- **Rationale**: [Why this is priority 1]
- **User Adjustments**: [Any user modifications to default scores]

### Priority 2: [Item Name]
- **Theme**: [Theme ID and description]
- **Correlation**: [Match/Gap/Combination]
- **Scores**:
  - Value: Medium | Effort: Low | Dependencies: Enabler | Risk: Low | Leverage: High
- **Rationale**: [Why this is priority 2]
- **User Adjustments**: [Any user modifications]

### Priority 3: [Item Name]
...

## Dependency Graph

```
[Priority 1] → [Priority 2] → [Priority 4]
                ↘ [Priority 3]
```

## Deferred Items

Items not recommended for MVP:

- **[Item Name]**: [Reason for deferral - high risk, low value, etc.]

## PAW Handoff Brief

**Ready for implementation**: [Top item name]

### Work Title
[Derived from top priority item]

### Description
[Brief for PAW workflow initialization]

### Context
- Discovery artifacts: `.paw/discovery/[work-id]/`
- Related capabilities: [CAP IDs from CapabilityMap.md]
- Correlation type: [Match/Gap/Combination]

### Suggested Approach
[Any implementation guidance from correlation analysis]
```

## Quality Checklist

- [ ] All correlated themes considered for roadmap
- [ ] 5 factors scored for each item
- [ ] Tradeoff discussion completed with user
- [ ] Dependency order is logical
- [ ] Top priority item clearly identified
- [ ] PAW handoff brief is actionable
- [ ] Deferred items have clear rationale
- [ ] YAML frontmatter is complete

## Completion Response

Report to PAW Discovery agent:
- Artifact path: `.paw/discovery/<work-id>/Roadmap.md`
- Item count and priority distribution
- Top priority item identified
- PAW handoff ready (yes/no)
- Ready for prioritization review
