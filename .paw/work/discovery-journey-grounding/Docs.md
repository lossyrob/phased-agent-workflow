# Discovery Journey Grounding - Technical Reference

## Overview

Journey Grounding adds user-centric analysis to PAW Discovery by extracting pain points from source documents and synthesizing user journeys. This fills the gap where Discovery produces technically-correct feature lists but lacks the "why" and "how" of user experience.

## New Skills

### paw-discovery-journey-grounding

**Purpose**: Extract pain points and synthesize user journeys from source documents.

**Inputs**:
- `inputs/` folder (source documents)
- `Extraction.md` (themes)
- `Correlation.md` (feature-capability relationships)

**Output**: `JourneyMap.md`

**Key Features**:
- Pain point extraction with direct quotes and source citations
- Journey model identification from sources
- User journey synthesis with step-by-step flows
- Feature-to-journey mapping
- Source tracing discipline (`[SOURCE]` vs `[SYNTHESIS]` markers)

### paw-discovery-journey-grounding-review

**Purpose**: Validate JourneyMap.md quality before scoping.

**Review Criteria**:
- Pain point quality (quotes, citations, severity)
- Journey model validity
- Journey completeness (goals, steps, features)
- Source tracing accuracy
- Feature mapping quality

**Returns**: PASS or REVISE verdict with structured feedback.

### paw-discovery-journey-scoping

**Purpose**: Interactive checkpoint for user to define MVP depth per journey.

**Scoping Styles** (configured in DiscoveryContext.md):
- `per-journey` (default): Walk through each journey individually
- `batch`: Present all journeys at once
- `bulk-guidance`: User provides high-level direction

**Updates**: JourneyMap.md with MVP Depth and Scoped annotations.

## JourneyMap.md Structure

```markdown
---
date: [ISO timestamp]
work_id: [work-id]
pain_point_count: [N]
journey_count: [N]
grounded_items: [N]
synthesized_items: [N]
synthesis_ratio: [percentage]
status: complete
---

# Journey Map: [Work Title]

## Pain Points
### PP-1: [Title]
> "[Quote]" [SOURCE: doc.ext, location]
- Severity: High|Medium|Low
- Affected Users: [segment]

## Journey Model
[Pattern from sources or synthesized]
[SOURCE or SYNTHESIS marker]

## User Journeys
### J-1: [Journey Name]
- Goal: [user goal]
- Addresses: PP-1, PP-3
- MVP Depth: [set by scoping]

#### Steps
1. **[Step]** [SOURCE or SYNTHESIS]
   - User action: ...
   - Required features: F-1, F-2

#### MVP Options
- Full: Steps 1-N, requires [features]
- Partial: Steps 1-M, requires [features]
- Minimal: Steps 1-K, requires [features]

Scoped: [set by scoping]

## Feature-to-Journey Mapping
| Feature | Journeys | MVP Critical |
|---------|----------|--------------|
| F-1 | J-1, J-2 | Yes |

## Source Tracing Summary
- Grounded: N items
- Synthesized: M items
- Ratio: X%
```

## Configuration

New option in DiscoveryContext.md:

```markdown
## Configuration
- **Review Policy**: every-stage | final-only
- **Scoping Style**: per-journey | batch | bulk-guidance
- **Final Review**: enabled | disabled
- **Final Review Mode**: single-model | multi-model | society-of-thought
```

## Workflow Integration

Updated Discovery flow:

```
Extraction → Mapping → Correlation → Journey Grounding → Journey Scoping → Prioritization
```

Journey factors now influence prioritization:
- **Journey Criticality**: Is feature required for MVP-scoped journey?
- **Pain Point Severity**: How severe is the addressed pain point?
- **MVP Scope**: Is feature within scoped MVP depth?

## Verification

Run lint on all Discovery skills:
```bash
npm run lint:skills
```

Build documentation:
```bash
source .venv/bin/activate && mkdocs build --strict
```
