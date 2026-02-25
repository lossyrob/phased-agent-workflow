# WorkShaping: PAW Discovery Journey Grounding

## Problem Statement

**Who benefits**: Product teams using PAW Discovery to plan feature development.

**What problem is solved**: PAW Discovery currently produces a "shopping list" of features (what themes exist, what capabilities exist, how they correlate, what order to build). It's missing the **horizontal user experience story**:

- **Why** do users need this? (pain points, rationale)
- **How** will users experience it? (journeys, flows)
- **How** do features connect from the user's perspective? (not just technically)

Without this, Discovery outputs lack:
- Coherent experience vision stakeholders can evaluate
- Rationale explaining why features are prioritized
- Acceptance criteria based on user journeys (not just technical completion)
- Traceability showing what's grounded in sources vs. agent synthesis

## Proposed Solution

Add one new stage and one interactive checkpoint to PAW Discovery workflow:

```
Extraction → Mapping → Correlation → [Journey Grounding] → [Journey Grounding Review] → [Journey Scoping*] → Prioritization

* Interactive checkpoint, not a full stage
```

### Journey Grounding (Agent-Driven)

Extracts pain points and synthesizes user journeys from source documents.

**Inputs**:
- Original source documents (from `inputs/`)
- Extraction.md (themes from sources)
- Correlation.md (technical feasibility, feature matches)

**Outputs**: JourneyMap.md containing:

| Section | Content | Source Type |
|---------|---------|-------------|
| Pain Points | User problems with quotes and references | Grounded |
| User Goals | What users want to accomplish | Derived from pain points |
| Journey Model | The pattern/flow from sources (e.g., "Load → Slice → Drill → Action") | Grounded |
| Concrete Journeys | Scenario flows showing how users achieve goals | Synthesized |
| Feature-to-Journey Mapping | Which features from Correlation are required for which journeys | Synthesized |
| Source Tracing | Explicit marking of grounded vs. synthesized content | Meta |

**Source Tracing Discipline**: Each insight marked as:
- `[SOURCE: document, page/section]` - directly grounded in source material
- `[SYNTHESIS]` - agent interpretation or creative connection

### Journey Grounding Review

Validates JourneyMap.md before scoping:
- Pain points are accurately extracted from sources
- Journeys are coherent and complete
- Source tracing is accurate
- Feature mapping is reasonable

### Journey Scoping (Interactive Checkpoint)

User defines MVP depth per journey. This is an **interactive checkpoint** (not a full stage) that occurs after Journey Grounding Review passes, before Prioritization begins.

**Why a checkpoint, not a stage**: The user is making decisions, not the agent. There's nothing to "review" - the user's scoping choices are authoritative.

User defines MVP depth per journey. Agent presents options, user decides.

**Example interaction**:
```
Journey: "Database is blocked"

Full journey (4 steps):
  1. Overview → See blocked indicator
  2. Sessions → Find idle-in-transaction
  3. Locks → See blocking tree
  4. Action → Terminate blocker

MVP options:
  A) Full journey (all 4 steps) - requires: Sessions tab, Locks tab, termination action
  B) Partial (steps 1-3) - requires: Sessions tab, Locks tab (view only)
  C) Minimal (steps 1-2) - requires: Sessions tab only

Which depth for V1?
```

**Output**: JourneyMap.md updated with MVP depth annotations per journey.

### Impact on Prioritization

Prioritization now considers additional factors from JourneyMap.md:

| Factor | Source |
|--------|--------|
| Technical feasibility | Correlation.md |
| Journey criticality | JourneyMap.md (is feature required for a complete journey?) |
| Pain point severity | JourneyMap.md (how bad is the problem this solves?) |
| MVP scope | JourneyMap.md (what depth was scoped for V1?) |

Features that are technically easy but don't enable any journey may be deprioritized. Features required for core MVP journeys get elevated.

## Work Breakdown

### Core Functionality

1. **paw-discovery-journey-grounding skill**
   - Extract pain points from source documents with citations
   - Identify journey models/patterns in sources
   - Synthesize concrete user journey scenarios
   - Map features to journeys
   - Produce JourneyMap.md with source tracing

2. **paw-discovery-journey-grounding-review skill**
   - Validate pain point extraction accuracy
   - Check journey coherence and completeness
   - Verify source tracing discipline
   - Return structured verdict (pass/fail/concerns)

3. **paw-discovery-journey-scoping skill** (interactive checkpoint)
   - Triggered after Journey Grounding Review passes
   - Present journeys with MVP depth options
   - Interactive Q&A for user scoping decisions
   - Update JourneyMap.md with MVP annotations
   - Not a full stage - no review skill needed

4. **Update paw-discovery-prioritize skill**
   - Add JourneyMap.md to inputs
   - Consider journey criticality in prioritization logic
   - Consider pain point severity
   - Consider MVP scope constraints

5. **Update PAW Discovery.agent.md**
   - Add Journey Grounding stage after Correlation
   - Add Journey Scoping stage after Grounding Review
   - Update state machine transitions
   - Add Scoping Style configuration option

6. **Update paw-discovery-workflow skill**
   - Document new stages in activity tables
   - Document JourneyMap.md artifact structure
   - Document Scoping Style options

### Supporting Functionality

7. **Update paw-discovery-init skill**
   - Add Scoping Style to DiscoveryContext.md template
   - Document new configuration option

8. **Update paw-specification.md**
   - Add Journey Grounding stage to Discovery workflow
   - Add Journey Scoping stage
   - Document JourneyMap.md artifact

## Configuration

### New Discovery Option: Scoping Style

Added to DiscoveryContext.md:

```markdown
## Configuration
- **Review Policy**: <every-stage | final-only>
- **Scoping Style**: <per-journey | batch | bulk-guidance>
- **Final Review**: <enabled | disabled>
- **Final Review Mode**: <single-model | multi-model | society-of-thought>
```

| Scoping Style | Behavior | Best For |
|---------------|----------|----------|
| `per-journey` (default) | Walk through each journey interactively | Thoughtful scoping, complex journeys |
| `batch` | Present all journeys at once, user scopes together | Quick scoping, few journeys |
| `bulk-guidance` | User provides high-level direction, agent applies | Very fast, trust agent judgment |

## Edge Cases

### Few or No Pain Points in Sources
- Agent notes the gap and suggests user provide additional context
- Can proceed with theme-based journeys (less grounded)

### Journey Doesn't Map to Any Features
- Flag as "gap" - journey requires features not in CapabilityMap
- Correlation already handles gaps, but Journey Grounding surfaces user-facing impact

### User Skips Scoping
- Default to "full depth" for all journeys
- Prioritization uses ideal journeys (may be over-scoped for MVP)

### Scoping Style Change Mid-Workflow
- Honor current style for remaining journeys
- Allow restart of scoping stage if user requests

## Artifact: JourneyMap.md

### Structure

```markdown
# Journey Map

## Pain Points

### PP-1: [Pain Point Title]
> "Direct quote from source" [SOURCE: document.pdf, p.12]

**Severity**: High | Medium | Low
**Affected Users**: [user segment]

...

## Journey Model

[Pattern extracted from sources, e.g., "Load → Slice → Drill → Action"]

[SOURCE: document.pdf, p.5]

## User Journeys

### J-1: [Journey Name]

**Goal**: [What user wants to accomplish]
**Addresses**: PP-1, PP-3
**MVP Depth**: [Full | Partial | Minimal] ← Added by Scoping

#### Steps

1. **[Step Name]** [SYNTHESIS]
   - User action: ...
   - System response: ...
   - Required features: F-1, F-2

2. **[Step Name]** [SOURCE: doc, p.8]
   - ...

#### MVP Options
- **Full**: Steps 1-4, requires F-1, F-2, F-3, F-4
- **Partial**: Steps 1-3, requires F-1, F-2, F-3
- **Minimal**: Steps 1-2, requires F-1, F-2

**Scoped**: Partial (V1), Full (V2) ← Added by Scoping

...

## Feature-to-Journey Mapping

| Feature | Required For Journeys | MVP Critical |
|---------|----------------------|--------------|
| F-1 | J-1, J-2, J-3 | Yes |
| F-2 | J-1 | Yes |
| F-3 | J-2 | No (V2) |

## Source Tracing Summary

- **Grounded content**: 12 items
- **Synthesized content**: 8 items
- **Synthesis ratio**: 40%
```

## Critical Analysis

### Value Assessment

**High value**: This fills a real gap. Discovery without journey grounding produces technically-correct but user-disconnected roadmaps. Adding this:
- Grounds prioritization in user outcomes
- Creates acceptance criteria reviewers can evaluate
- Surfaces gaps between technical features and user needs

### Build vs. Modify Tradeoffs

**Additive, not disruptive**: New stages slot into existing workflow. Existing artifacts (Extraction, Correlation) remain unchanged. Only Prioritization needs modification to consume new input.

**Risk**: Adds complexity to Discovery workflow. Mitigation: Scoping Style options allow users to control interaction depth.

## Codebase Fit

### Similar Features
- `paw-discovery-extraction` - extracts themes from sources (similar pattern for pain points)
- `paw-discovery-correlation` - maps between artifacts (similar for feature-to-journey mapping)
- `paw-work-shaping` - interactive Q&A (similar for journey scoping)

### Reuse Opportunities
- Source document reading from extraction
- Artifact generation patterns from all Discovery skills
- Interactive Q&A patterns from work-shaping
- Review skill structure from existing review skills

## Risk Assessment

### Potential Issues

1. **Source documents may not contain explicit pain points**
   - Mitigation: Allow synthesis with clear marking
   
2. **Journey scoping adds workflow length**
   - Mitigation: Scoping Style options (bulk-guidance for speed)

3. **Prioritization logic becomes more complex**
   - Mitigation: Clear weighting rules, transparent reasoning

4. **JourneyMap.md could get large**
   - Mitigation: Focus on core journeys, allow "out of scope" designation

## Open Questions for Specification

1. What's the maximum number of journeys before suggesting "batch" or "bulk-guidance" style?
2. Should JourneyMap.md include wireframe/mockup references if present in sources?

## Session Notes

**Key decisions**:
- Two skills (grounding activity + scoping checkpoint) rather than two full stages
- Single artifact (JourneyMap.md) updated by both
- Review between grounding and scoping (validates ideal journeys before user scopes)
- Scoping is interactive checkpoint, not reviewable stage (user decisions are authoritative)

**Rationale for checkpoint vs stage**:
- User makes scoping decisions - no agent work to review
- Keeps workflow streamlined
- Matches pattern of paw-work-shaping (interactive utility, not reviewable stage)

**Source tracing discipline**:
- Each insight explicitly marked as grounded or synthesized
- Agent can synthesize/interpret but must be transparent about it
- Enables stakeholders to evaluate what's evidence vs. interpretation
