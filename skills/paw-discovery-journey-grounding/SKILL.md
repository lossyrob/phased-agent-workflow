---
name: paw-discovery-journey-grounding
description: Journey grounding activity skill for PAW Discovery workflow. Extracts pain points from source documents, synthesizes user journeys with source tracing, and produces JourneyMap.md artifact.
---

# Discovery Journey Grounding

> **Execution Context**: This skill runs **directly** in the PAW Discovery session (not a subagent), preserving user interactivity for Q&A refinement during journey synthesis.

Extract user pain points and synthesize user journeys from source documents. Produces JourneyMap.md with explicit source tracing distinguishing grounded insights from agent synthesis.

## Capabilities

- Read source documents from `inputs/` folder
- Extract pain points with direct quotes and source references
- Identify journey models/patterns stated in sources
- Synthesize concrete user journey scenarios
- Map features from Correlation.md to journey steps
- Produce JourneyMap.md with source tracing discipline
- Support image analysis for wireframes/mockups via LLM vision

## Inputs

| Artifact | Purpose |
|----------|---------|
| `Extraction.md` | Primary source for themes, features, user needs, constraints, and pain points |
| `Correlation.md` | Theme-capability relationships, feature IDs |
| `inputs/` folder | Reference only for source tracing citations |

> **Note**: Journey Grounding builds on Extraction.md content—it does NOT re-read original source documents. Pain points, user needs, and quotes should already be captured in Extraction.md. If Extraction is missing pain point details, request re-extraction rather than bypassing.

## Source Tracing Discipline

Every insight MUST be marked with its origin:

- **`[SOURCE: document.ext, location]`** - Directly grounded in source material
  - Include document path and page/section reference
  - Use direct quotes when capturing pain points
  - Example: `[SOURCE: requirements.pdf, p.12]`

- **`[SYNTHESIS]`** - Agent interpretation or creative connection
  - Journey step sequences connecting multiple sources
  - Feature-to-journey mappings inferred from context
  - User goals derived (not directly stated) from pain points

### Synthesis Guidelines

Synthesis is valuable but must be transparent:
- Connect dots between sources when logical
- Create concrete journey scenarios from abstract requirements
- Infer user goals from stated pain points
- Map features to journeys based on capability analysis

Always mark synthesized content clearly so stakeholders can evaluate what's evidence vs. interpretation.

## Extraction Process

### Pain Point Extraction

Extract user problems from Extraction.md content:

1. Scan Extraction.md for problem statements, user needs, complaints, frustrations
2. Reference original source citations from Extraction.md for tracing
3. Assess severity (High/Medium/Low) based on:
   - Frequency mentioned across themes
   - Impact on user workflow
   - Explicit priority indicators in Extraction.md
4. Identify affected user segments when stated

### Journey Model Identification

Look for stated patterns or flows from Extraction.md:

1. Search for explicit journey descriptions ("users will...", "the flow is...")
2. Identify step sequences mentioned in requirements
3. Capture any named models (e.g., "Load → Slice → Drill → Action")
4. Mark as [SOURCE] with attribution

If no explicit journey model exists in sources, note this gap and proceed with theme-based synthesis.

### User Journey Synthesis

Create concrete journey scenarios:

1. For each significant pain point or user need:
   - Define the user goal being addressed
   - Outline steps to achieve the goal
   - Map required features to each step
   - Define MVP options (Full/Partial/Minimal)

2. Mark synthesized content with [SYNTHESIS]

3. Reference feature IDs from Correlation.md

### Feature-to-Journey Mapping

Cross-reference journeys with Correlation.md:

1. For each journey step, identify required features
2. Check if features exist (match), need extension (partial), or are gaps
3. Build mapping table showing which features enable which journeys
4. Flag features not required for any journey (may be deprioritized)

**Feature ID format**: Reference features using the IDs from Correlation.md (e.g., F-1, F-2). If Correlation.md uses theme-based IDs (T-1, T-2), reference those instead. The review skill validates that all referenced IDs exist in Correlation.md.

## Image Handling

When source documents include images (wireframes, mockups, diagrams):

1. Pass images to LLM for visual analysis
2. Extract journey implications from UI mockups
3. Reference images in journey steps: `[SOURCE: mockup.png, "login screen"]`
4. Include wireframe references in relevant journey steps

## Edge Case Handling

### Few or No Pain Points in Sources

If sources lack explicit pain points:
1. Note the gap explicitly in JourneyMap.md
2. Suggest user provide additional context
3. Proceed with theme-based journeys derived from Extraction.md features
4. Mark all journeys as [SYNTHESIS] with lower confidence

### No Journey Model in Sources

If no explicit journey pattern exists:
1. Create synthesized journey model based on user needs
2. Mark as [SYNTHESIS: derived from themes]
3. Note that journey model is agent-created, not source-grounded

### Contradictory Pain Points

If sources contain conflicting user problems:
1. Surface conflict explicitly
2. Include both versions with source attribution
3. Ask user to clarify priority during Q&A
4. Document resolution in JourneyMap.md

## JourneyMap.md Artifact

Save to: `.paw/discovery/<work-id>/JourneyMap.md`

### Template

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

## Summary

[2-3 sentences describing pain points found, journey model, and key journeys synthesized]

## Pain Points

### PP-1: [Pain Point Title]

> "[Direct quote from source]" [SOURCE: document.ext, location]

- **Severity**: High | Medium | Low
- **Affected Users**: [user segment if stated]
- **Rationale**: [why this severity, brief]

### PP-2: [Pain Point Title]
...

## Journey Model

[Pattern/flow extracted from sources OR synthesized from themes]

[SOURCE: document.ext, location] OR [SYNTHESIS: derived from themes]

**Model**: [e.g., "Load → Slice → Drill → Action"]

**Explanation**: [What each step means in user terms]

## User Journeys

### J-1: [Journey Name]

- **Goal**: [What user wants to accomplish]
- **Addresses**: PP-1, PP-3
- **MVP Depth**: [To be set by scoping]

#### Steps

1. **[Step Name]** [SOURCE or SYNTHESIS]
   - User action: [what user does]
   - System response: [what system shows/does]
   - Required features: [F-ID, F-ID from Correlation.md]

2. **[Step Name]** [SOURCE or SYNTHESIS]
   ...

#### MVP Options

- **Full**: Steps 1-N, requires [feature list]
- **Partial**: Steps 1-M, requires [feature list]
- **Minimal**: Steps 1-K, requires [feature list]

**Scoped**: [To be set by scoping checkpoint]

### J-2: [Journey Name]
...

## Feature-to-Journey Mapping

| Feature ID | Feature Name | Required For Journeys | MVP Critical | Notes |
|------------|--------------|----------------------|--------------|-------|
| F-1 | [name] | J-1, J-2, J-3 | TBD | [from Correlation.md] |
| F-2 | [name] | J-1 | TBD | |
| F-3 | [name] | - | TBD | Not required for any journey |

## Source Tracing Summary

- **Grounded content**: [N] items with source citations
- **Synthesized content**: [N] items marked [SYNTHESIS]
- **Synthesis ratio**: [percentage]
- **Confidence assessment**: [High/Medium/Low based on grounding ratio]

## Gaps and Observations

- [Gap 1]: [Journey requires feature not in CapabilityMap]
- [Observation 1]: [Notable pattern or insight]
```

## Interactive Q&A Phase

After initial extraction, engage user to validate understanding:

### When to Ask

- Ambiguous pain points that could be interpreted multiple ways
- Conflicts between sources on user priorities
- Gaps where expected pain points aren't documented
- Journey steps that seem incomplete

### Question Guidelines

- One question at a time
- Prefer multiple choice when options are enumerable
- Include recommendation when you have one
- Exit after ~5-7 questions or when user signals done

## Quality Checklist

- [ ] All source documents processed
- [ ] Pain points have direct quotes and source citations
- [ ] Journey model identified (grounded or synthesized)
- [ ] User journeys have steps mapped to features
- [ ] All content marked with [SOURCE] or [SYNTHESIS]
- [ ] Feature-to-Journey mapping complete
- [ ] Source Tracing Summary calculated
- [ ] JourneyMap.md has valid YAML frontmatter

## Completion Response

Report to PAW Discovery agent:
- Artifact path: `.paw/discovery/<work-id>/JourneyMap.md`
- Pain point count and severity distribution
- Journey count
- Source tracing summary (grounded vs. synthesized ratio)
- Any gaps or observations worth noting
- Ready for journey grounding review

**State Update**: Update DiscoveryContext.md:
- Stage Progress table: Mark Journey Grounding as `complete`
