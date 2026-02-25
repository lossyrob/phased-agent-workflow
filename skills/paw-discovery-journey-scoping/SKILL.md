---
name: paw-discovery-journey-scoping
description: Interactive checkpoint skill for PAW Discovery workflow. Enables user to define MVP depth per journey before prioritization.
---

# Discovery Journey Scoping

> **Execution Context**: This skill runs **directly** in the PAW Discovery session (not a subagent), as an interactive checkpoint requiring user decisions.

Interactive checkpoint where users define MVP depth for each journey. This is not a full stage—user decisions are authoritative and don't require agent review.

## Capabilities

- Present journeys with MVP depth options (Full/Partial/Minimal)
- Support three scoping styles: per-journey, batch, bulk-guidance
- Suggest batch mode when journey count exceeds threshold
- Update JourneyMap.md with MVP depth annotations
- Handle user requests to restart or adjust scoping

## Scoping Styles

Read `scoping_style` from DiscoveryContext.md Configuration section. Default: `per-journey`.

### Per-Journey (Default)

Walk through each journey individually:

```
Journey 1 of N: "[Journey Name]"

Goal: [What user wants to accomplish]
Addresses: PP-1, PP-3

Full journey (4 steps):
  1. [Step 1] - requires: F-1, F-2
  2. [Step 2] - requires: F-2, F-3
  3. [Step 3] - requires: F-3, F-4
  4. [Step 4] - requires: F-5

MVP options:
  A) Full (all 4 steps) - requires: F-1, F-2, F-3, F-4, F-5
  B) Partial (steps 1-3) - requires: F-1, F-2, F-3, F-4
  C) Minimal (steps 1-2) - requires: F-1, F-2, F-3

Which depth for V1? [A/B/C]
```

**Threshold behavior**: When journey count exceeds 5 and style is per-journey, suggest:
```
You have N journeys. Per-journey scoping may take a while.
Would you like to:
  1) Continue per-journey (thorough but slower)
  2) Switch to batch (see all at once)
  3) Use bulk-guidance (apply same depth to all)
```

### Batch

Present all journeys at once for simultaneous scoping:

```
Journey Scoping: [N] journeys to scope

| # | Journey | Goal | Full Steps | Partial | Minimal | Your Choice |
|---|---------|------|------------|---------|---------|-------------|
| 1 | [Name]  | [Goal] | 1-4 | 1-3 | 1-2 | [?] |
| 2 | [Name]  | [Goal] | 1-5 | 1-3 | 1-2 | [?] |
| 3 | [Name]  | [Goal] | 1-3 | 1-2 | 1 | [?] |

For each journey, choose: F (Full), P (Partial), M (Minimal)
Example: "1:F, 2:P, 3:M" or "all:P"
```

### Bulk-Guidance

User provides high-level direction, agent applies:

```
Bulk scoping mode. Provide guidance for all journeys:

Options:
  - "full" - All journeys at full depth
  - "partial" - All journeys at partial depth
  - "minimal" - All journeys at minimal depth
  - "critical full, others minimal" - Full for high-severity pain points, minimal for others
  - Custom guidance (describe your criteria)

Your guidance:
```

Apply user's guidance programmatically, then present summary for confirmation.

## MVP Depth Definitions

| Depth | Meaning | Typical Use |
|-------|---------|-------------|
| **Full** | Complete journey with all steps | Core journeys, competitive differentiators |
| **Partial** | Essential steps, some advanced features deferred | Most MVP scenarios |
| **Minimal** | Bare minimum to demonstrate value | Risk reduction, fast validation |

## Execution Flow

1. Read JourneyMap.md to get journey list
2. **If journey list is empty, handle edge case** (see Empty Journeys below)
3. Read DiscoveryContext.md for scoping_style
4. Check journey count against threshold (5) if per-journey style
5. Execute scoping per selected style
6. Update JourneyMap.md with MVP depth annotations
7. Update Feature-to-Journey Mapping "MVP Critical" column

## JourneyMap.md Updates

After scoping, update each journey:

```markdown
### J-1: [Journey Name]

- **Goal**: [unchanged]
- **Addresses**: PP-1, PP-3
- **MVP Depth**: Partial  ← ADDED

#### Steps
[unchanged]

#### MVP Options
[unchanged]

**Scoped**: Partial (V1), Full (V2)  ← ADDED
```

Update Feature-to-Journey Mapping:

```markdown
| Feature ID | Feature Name | Required For Journeys | MVP Critical | Notes |
|------------|--------------|----------------------|--------------|-------|
| F-1 | [name] | J-1, J-2 | Yes | Required for J-1 (Partial), J-2 (Full) |
| F-3 | [name] | J-1 | No (V2) | Only needed for J-1 Full depth |
```

## Edge Cases

### User Skips Scoping

If user requests to skip ("skip", "default", "proceed"):
- Apply Full depth to all journeys
- Note in JourneyMap.md: "Scoped: Full (default - scoping skipped)"
- Proceed to prioritization

### User Wants to Restart

If user requests restart ("restart", "start over"):
- Clear existing MVP Depth annotations
- Begin scoping from the first journey
- Use same scoping style unless user requests change

### Style Change Mid-Scoping

If user requests style change during scoping:
- Confirm current progress (N of M journeys scoped)
- Offer to keep progress or restart
- Switch to new style for remaining journeys

### Empty Journeys

If JourneyMap.md has no journeys:
- Report issue to user
- Suggest returning to Journey Grounding stage
- Do not proceed to prioritization

## Quality Checklist

- [ ] All journeys have MVP Depth annotation
- [ ] All journeys have Scoped field with version assignment
- [ ] Feature-to-Journey Mapping has MVP Critical column populated
- [ ] JourneyMap.md frontmatter `status` remains `complete`

## Completion Response

Report to PAW Discovery agent:
- Scoping style used
- Journey count and depth distribution (N Full, M Partial, K Minimal)
- Features marked MVP Critical vs. V2
- Ready for prioritization stage

**State Update**: Update DiscoveryContext.md:
- Stage Progress table: Mark Journey Scoping as `complete`
