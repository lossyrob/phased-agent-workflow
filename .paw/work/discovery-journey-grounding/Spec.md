# Feature Specification: PAW Discovery Journey Grounding

**Branch**: feature/discovery-journey-grounding  |  **Created**: 2026-02-25  |  **Status**: Draft
**Input Brief**: Add user journey grounding to PAW Discovery workflow

## Overview

PAW Discovery currently produces a technically-oriented "shopping list" of features. It extracts themes from source documents, maps existing codebase capabilities, correlates themes to capabilities, and prioritizes what to build. However, this vertical analysis misses the horizontal user experience story: why users need features, how they'll experience them, and how features connect from their perspective.

Without this user-centric layer, Discovery outputs lack coherent experience visions that stakeholders can evaluate, rationale explaining prioritization decisions, acceptance criteria based on user journeys rather than technical completion, and traceability showing what insights are grounded in sources versus agent synthesis.

Journey Grounding addresses this gap by extracting pain points and user goals from source documents, identifying journey models and patterns, synthesizing concrete user journey scenarios, and mapping features to the journeys they enable. An interactive scoping checkpoint then lets users define MVP depth per journey before prioritization, ensuring the roadmap reflects both technical feasibility and user experience coherence.

The result is a Discovery workflow that produces not just a list of features, but a coherent product vision grounded in user needs with clear rationale for every prioritization decision.

## Objectives

- Enable product teams to ground feature prioritization in explicit user pain points and journeys
- Provide stakeholders with coherent experience visions they can evaluate and approve
- Create acceptance criteria based on user journey completion rather than technical checkboxes
- Distinguish insights grounded in source documents from agent synthesis/interpretation
- Allow users to scope MVP depth per journey before prioritization begins
- Integrate journey criticality and pain point severity into prioritization logic

## User Scenarios & Testing

### User Story P1 – Extract Pain Points and Synthesize Journeys

Narrative: A product manager runs PAW Discovery on requirements documents. After Correlation completes, the agent reads the source documents and prior artifacts, extracts user pain points with citations, identifies journey patterns, and synthesizes concrete user journey scenarios. The JourneyMap.md artifact clearly marks what's grounded in sources versus synthesized by the agent.

Independent Test: After Journey Grounding completes, JourneyMap.md exists with at least one pain point citing a source document and at least one journey with steps mapped to features.

Acceptance Scenarios:
1. Given source documents with explicit user problems, When Journey Grounding runs, Then pain points are extracted with direct quotes and source references
2. Given a journey model described in sources, When Journey Grounding runs, Then the model is captured in JourneyMap.md with source citation
3. Given extracted pain points and themes, When Journey Grounding synthesizes journeys, Then synthesized content is marked with [SYNTHESIS] tags
4. Given features from Correlation.md, When journeys are created, Then each journey step maps to required features

### User Story P2 – Validate Journey Quality Before Scoping

Narrative: After JourneyMap.md is created, the review skill validates that pain points are accurately extracted, journeys are coherent and complete, source tracing is accurate, and feature mapping is reasonable. If issues exist, the review returns REVISE with specific feedback.

Independent Test: Running Journey Grounding Review on a valid JourneyMap.md returns PASS verdict.

Acceptance Scenarios:
1. Given a JourneyMap.md with accurate source citations, When review runs, Then source tracing validation passes
2. Given a journey with incomplete step mapping, When review runs, Then REVISE verdict identifies the gap
3. Given pain points without severity ratings, When review runs, Then REVISE verdict flags missing metadata

### User Story P3 – Scope MVP Depth Per Journey

Narrative: After Journey Grounding Review passes, the user enters the scoping checkpoint. The agent presents each journey with MVP depth options (Full, Partial, Minimal) showing which features each option requires. The user selects depth for each journey. JourneyMap.md is updated with MVP annotations.

Independent Test: After scoping completes, each journey in JourneyMap.md has an MVP Depth annotation and a Scoped field indicating version assignment.

Acceptance Scenarios:
1. Given per-journey scoping style, When 3 journeys exist, Then agent presents each journey individually for scoping
2. Given per-journey scoping style, When 6 journeys exist, Then agent suggests switching to batch mode
3. Given batch scoping style, When scoping starts, Then all journeys are presented together
4. Given bulk-guidance scoping style, When user says "start minimal", Then agent applies Minimal depth to all journeys
5. Given user selects "Partial" for a journey, When scoping completes, Then JourneyMap.md shows "MVP Depth: Partial" and "Scoped: Partial (V1)"

### User Story P4 – Inform Prioritization with Journey Data

Narrative: After scoping completes, Prioritization reads JourneyMap.md along with Correlation.md. Features required for MVP-scoped journeys get elevated priority. Features that don't enable any journey may be deprioritized. The Roadmap.md reflects journey criticality and pain point severity in its rationale.

Independent Test: Roadmap.md includes journey criticality as a factor in prioritization rationale for at least one feature.

Acceptance Scenarios:
1. Given a feature required for an MVP-critical journey, When Prioritization runs, Then that feature appears in early phases with journey rationale
2. Given a feature not required for any journey, When Prioritization runs, Then that feature may be deprioritized with rationale
3. Given pain point severity ratings, When Prioritization runs, Then severity influences feature ordering

### Edge Cases

- No pain points found in sources: Agent notes the gap, suggests user provide context, proceeds with theme-based journeys marked as less grounded
- Journey requires features not in CapabilityMap: Flag as gap in Feature-to-Journey Mapping table
- User skips scoping checkpoint: Default to Full depth for all journeys
- Source documents contain wireframes/mockups: Include references in journey steps for visualization
- More than 5 journeys with per-journey style: Agent suggests switching to batch mode

## Requirements

### Functional Requirements

- FR-001: Journey Grounding skill extracts pain points from source documents with direct quotes and source references (Stories: P1)
- FR-002: Journey Grounding skill identifies journey models/patterns from sources with citations (Stories: P1)
- FR-003: Journey Grounding skill synthesizes concrete user journey scenarios with step-by-step flows (Stories: P1)
- FR-004: Journey Grounding skill maps features from Correlation.md to journey steps (Stories: P1)
- FR-005: JourneyMap.md artifact marks content as [SOURCE: doc, location] or [SYNTHESIS] (Stories: P1)
- FR-006: Journey Grounding Review skill validates pain point extraction accuracy (Stories: P2)
- FR-007: Journey Grounding Review skill validates journey coherence and completeness (Stories: P2)
- FR-008: Journey Grounding Review skill validates source tracing accuracy (Stories: P2)
- FR-009: Journey Grounding Review skill returns structured verdict (PASS/REVISE) with feedback (Stories: P2)
- FR-010: Journey Scoping skill presents journeys with MVP depth options (Full/Partial/Minimal) (Stories: P3)
- FR-011: Journey Scoping skill supports per-journey interactive scoping (Stories: P3)
- FR-012: Journey Scoping skill supports batch scoping (all journeys at once) (Stories: P3)
- FR-013: Journey Scoping skill supports bulk-guidance scoping (user provides direction, agent applies) (Stories: P3)
- FR-014: Journey Scoping skill suggests batch mode when journeys exceed 5 with per-journey style (Stories: P3)
- FR-015: Journey Scoping skill updates JourneyMap.md with MVP depth annotations (Stories: P3)
- FR-016: Prioritization skill reads JourneyMap.md as additional input (Stories: P4)
- FR-017: Prioritization skill considers journey criticality in feature ordering (Stories: P4)
- FR-018: Prioritization skill considers pain point severity in feature ordering (Stories: P4)
- FR-019: Prioritization skill considers MVP scope constraints from scoping (Stories: P4)
- FR-020: Discovery agent orchestrates Journey Grounding stage after Correlation (Stories: P1, P2)
- FR-021: Discovery agent orchestrates Journey Scoping checkpoint after Grounding Review (Stories: P3)
- FR-022: DiscoveryContext.md includes Scoping Style configuration option (Stories: P3)
- FR-023: JourneyMap.md includes wireframe/mockup references when present in sources (Stories: P1)

### Key Entities

- **Pain Point**: User problem extracted from sources with severity, affected users, and source citation
- **Journey Model**: High-level pattern/flow identified in sources (e.g., "Load → Slice → Drill → Action")
- **User Journey**: Concrete scenario with goal, steps, required features, MVP options, and scoping decision
- **Source Tracing**: Metadata distinguishing grounded content from agent synthesis

### Cross-Cutting / Non-Functional

- Journey Grounding follows existing Discovery skill patterns (execution context, artifact format, completion response)
- Review skill follows existing review skill patterns (verdict format, feedback structure)
- Scoping checkpoint follows work-shaping interaction patterns
- All skills are resumable if session interrupts

## Success Criteria

- SC-001: JourneyMap.md contains at least one pain point with source citation after Journey Grounding (FR-001, FR-005)
- SC-002: JourneyMap.md contains at least one journey with steps mapped to features after Journey Grounding (FR-003, FR-004)
- SC-003: All content in JourneyMap.md is marked with source type (SOURCE or SYNTHESIS) (FR-005)
- SC-004: Journey Grounding Review returns PASS for valid JourneyMap.md, REVISE with actionable feedback for invalid (FR-006, FR-007, FR-008, FR-009)
- SC-005: Each journey has MVP Depth annotation after scoping completes (FR-010, FR-015)
- SC-006: Agent suggests batch mode when journey count exceeds 5 with per-journey style (FR-014)
- SC-007: Roadmap.md references journey criticality in prioritization rationale (FR-016, FR-017)
- SC-008: Discovery workflow completes successfully with new stages integrated (FR-020, FR-021)

## Assumptions

- Source documents provided to Discovery contain some form of user needs, pain points, or journey information (if absent, agent will note gap and proceed with theme-based synthesis)
- Users understand MVP depth concepts (Full/Partial/Minimal) without extensive explanation
- Prioritization skill can be modified to accept additional input artifact without breaking existing behavior
- Scoping Style default of per-journey is appropriate for most use cases

## Scope

**In Scope:**
- Journey Grounding skill (paw-discovery-journey-grounding)
- Journey Grounding Review skill (paw-discovery-journey-grounding-review)
- Journey Scoping skill (paw-discovery-journey-scoping)
- JourneyMap.md artifact structure
- Updates to paw-discovery-prioritize skill
- Updates to PAW Discovery.agent.md
- Updates to paw-discovery-workflow skill
- Updates to paw-discovery-init skill
- Updates to paw-specification.md
- Scoping Style configuration option

**Out of Scope:**
- Changes to Extraction, Mapping, or Correlation stages
- New visualization tools for journeys
- Integration with external journey mapping tools
- Automated journey discovery from code (journeys come from source documents)
- Multi-language support for source documents

## Dependencies

- Existing PAW Discovery workflow (Extraction, Mapping, Correlation, Prioritization stages)
- Source documents in Discovery inputs/ folder
- Correlation.md artifact (for feature mapping)
- Extraction.md artifact (for theme context)

## Risks & Mitigations

- **Source documents lack explicit pain points**: Impact: Less grounded journeys. Mitigation: Allow synthesis with clear marking; suggest user provide additional context.
- **Scoping adds workflow length**: Impact: User fatigue. Mitigation: Three scoping styles (per-journey, batch, bulk-guidance) let users control interaction depth.
- **Prioritization logic complexity increases**: Impact: Harder to understand/debug. Mitigation: Clear weighting rules; transparent reasoning in Roadmap.md.
- **JourneyMap.md becomes too large**: Impact: Hard to review. Mitigation: Focus on core journeys; allow "out of scope" designation for edge-case journeys.

## References

- Work Shaping: .paw/work/discovery-journey-grounding/WorkShaping.md
- PAW Discovery Specification: docs/specification/ (to be updated)
- Existing Discovery Skills: skills/paw-discovery-*
