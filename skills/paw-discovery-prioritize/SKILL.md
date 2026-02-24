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
- Categorize items into MVP-Critical / MVP-Nice-to-Have / Post-MVP
- Generate prioritized roadmap autonomously
- Offer single Q&A pass for adjustments
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

## Autonomous Prioritization

### Process

Generate the **complete roadmap autonomously** using the 5-factor framework:
1. Score all candidate items against the factors
2. Apply dependency ordering and value-to-effort ranking
3. Categorize into priority buckets (see below)
4. Present the full roadmap to user

**One Q&A pass at the end**: After presenting the full roadmap, offer a single opportunity for adjustments:
- "Here's the prioritized roadmap. Would you like to adjust any items before finalizing?"
- If user requests changes, update and present the revised roadmap
- Do NOT ask for confirmation on each individual item

### Priority Categories (Not Numbers)

Use meaningful categories instead of numeric priority:

| Category | Meaning | Criteria |
|----------|---------|----------|
| **MVP-Critical** | Must ship in MVP | High value + blocker/enabler + manageable effort |
| **MVP-Nice-to-Have** | Should ship if time allows | Medium-high value, no blockers |
| **Post-MVP** | Defer to future releases | Lower value OR high risk OR high effort |

Within each category, order by dependency (blockers first) then value-to-effort ratio.

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
mvp_critical_count: [N]
mvp_nice_to_have_count: [N]
post_mvp_count: [N]
top_item: [item-name]
paw_handoff_ready: true
status: complete
---

# Roadmap: [Work Title]

## Summary

[2-3 sentences describing the prioritization outcome and recommended first steps]

## Priority Categories

| Category | Count | Description |
|----------|-------|-------------|
| MVP-Critical | N | Must ship in MVP |
| MVP-Nice-to-Have | N | Should ship if time allows |
| Post-MVP | N | Deferred to future releases |

## Prioritized Items

### MVP-Critical

Each MVP-Critical item includes a **self-contained handoff brief** so any item can start a PAW workflow without cross-referencing other Discovery artifacts.

#### [Item Name]
- **Theme**: [Theme ID]: [Full description from Extraction.md — not just ID]
- **What exists**: [Relevant capability summary from CapabilityMap.md]
- **Integration path**: [From Correlation.md — Match/Extend/Gap + what's needed]
- **Why critical**: [Rationale - value, dependency role, blockers]
- **Constraints**: [Relevant C1-Cn constraints that apply]
- **Success criteria**: [What "done" looks like for this item]
- **Suggested approach**: [Implementation guidance if correlation provided insights]

#### [Item Name]
...

### MVP-Nice-to-Have

Nice-to-Have items use condensed format (full details available in Extraction/Correlation):

#### [Item Name]
- **Theme**: [Theme ID and brief description]
- **Correlation**: [Match/Gap/Combination]
- **Why nice-to-have**: [Rationale]

### Post-MVP

#### [Item Name]
- **Theme**: [Theme ID and description]
- **Why deferred**: [Rationale - high effort, risk, lower priority, etc.]

## How to Use This Roadmap

### For Humans
- **Quick review**: Read Summary + MVP-Critical items
- **Deep dive**: Each MVP-Critical item is self-contained with context, constraints, and success criteria
- **Cross-reference**: Nice-to-Have and Post-MVP items reference theme IDs — see Extraction.md for full details

### For PAW Handoff
- **Any MVP-Critical item** can start a PAW workflow directly
- Copy the item's content as the initial brief
- Discovery artifacts path provided for additional context during Spec/Planning

## PAW Handoff Brief

**Ready for implementation**: [Top item name]

(Note: Any MVP-Critical item above can serve as a PAW handoff brief. This section highlights the recommended first item.)

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
- [ ] Items categorized as MVP-Critical / MVP-Nice-to-Have / Post-MVP
- [ ] Dependency order is logical within categories
- [ ] Top MVP-Critical item identified for PAW handoff
- [ ] PAW handoff brief is actionable
- [ ] YAML frontmatter is complete

## Completion Response

Report to PAW Discovery agent:
- Artifact path: `.paw/discovery/<work-id>/Roadmap.md`
- Item count and priority distribution
- Top priority item identified
- PAW handoff ready (yes/no)
- Ready for prioritization review
