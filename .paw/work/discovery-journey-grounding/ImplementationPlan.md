# Discovery Journey Grounding Implementation Plan

## Overview

Add a Journey Grounding stage to PAW Discovery workflow between Correlation and Prioritization. This stage extracts user pain points from source documents, synthesizes user journeys with source tracing, and enables interactive MVP depth scoping before prioritization.

## Current State Analysis

From CodeResearch.md:
- Discovery has 4 stages (Extraction → Mapping → Correlation → Prioritization)
- Each stage follows pattern: activity skill → review skill → stage boundary check
- Skills at `skills/paw-discovery-*/SKILL.md` with consistent structure
- Agent orchestration at `agents/PAW Discovery.agent.md`
- DiscoveryContext.md tracks configuration and stage progress
- Prioritization reads Correlation.md for theme-capability relationships

Key patterns identified:
- Activity skills run directly (interactive), review skills run as subagents
- Artifacts have YAML frontmatter with date, work_id, status fields
- Review skills return PASS/REVISE verdict with structured feedback
- Stage boundaries check Review Policy (every-stage vs final-only)

## Desired End State

1. Discovery workflow includes Journey Grounding after Correlation
2. JourneyMap.md artifact captures pain points, journey model, user journeys, feature mapping
3. All content in JourneyMap.md marked with source type ([SOURCE] or [SYNTHESIS])
4. Interactive scoping checkpoint allows user to define MVP depth per journey
5. Prioritization considers journey criticality and pain point severity
6. DiscoveryContext.md includes Scoping Style configuration option

## What We're NOT Doing

- Changes to Extraction, Mapping, or Correlation stages
- New visualization tools for journeys
- Integration with external journey mapping tools
- Automated journey discovery from code
- Multi-language support for source documents
- Changes to the Final Review stage (it continues to review Roadmap.md)

## Phase Status

- [x] **Phase 1: Journey Grounding Skill** - Create activity skill that extracts pain points and synthesizes journeys
- [x] **Phase 2: Journey Grounding Review Skill** - Create review skill that validates JourneyMap.md
- [x] **Phase 3: Journey Scoping Skill** - Create interactive checkpoint for MVP depth scoping
- [x] **Phase 4: Prioritization Updates** - Update prioritize skill to consume JourneyMap.md
- [x] **Phase 5: Orchestration Updates** - Update Discovery agent, workflow skill, init skill
- [ ] **Phase 6: Documentation** - Update docs and create Docs.md

## Phase Candidates

<!-- All phases defined, no candidates remaining -->

---

## Phase 1: Journey Grounding Skill

### Objective
Create `paw-discovery-journey-grounding` activity skill that extracts pain points from source documents and synthesizes user journeys with source tracing.

### Changes Required

- **`skills/paw-discovery-journey-grounding/SKILL.md`** (new file):
  - Execution context: Direct in PAW Discovery session (interactive)
  - Capabilities: Extract pain points, identify journey models, synthesize journeys, map features
  - Inputs: `inputs/`, Extraction.md, Correlation.md
  - Output: JourneyMap.md with YAML frontmatter
  - Source tracing discipline: Mark each insight as [SOURCE: doc, location] or [SYNTHESIS]
  - Follow pattern from `skills/paw-discovery-extraction/SKILL.md`
  - Include artifact template matching Spec.md structure

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-discovery-journey-grounding/SKILL.md`
- [ ] File structure matches `skills/paw-discovery-*/` pattern

#### Manual Verification:
- [ ] Skill has execution context header stating "direct in session"
- [ ] Capabilities section covers: pain point extraction, journey model identification, journey synthesis, feature mapping, source tracing
- [ ] Artifact template includes: Pain Points, Journey Model, User Journeys, Feature-to-Journey Mapping, Source Tracing Summary
- [ ] JourneyMap.md YAML frontmatter includes: date, work_id, pain_point_count, journey_count, status

---

## Phase 2: Journey Grounding Review Skill

### Objective
Create `paw-discovery-journey-grounding-review` skill that validates JourneyMap.md quality before scoping.

### Changes Required

- **`skills/paw-discovery-journey-grounding-review/SKILL.md`** (new file):
  - Execution context: Subagent session
  - Review criteria: Pain point accuracy, journey coherence, source tracing accuracy, feature mapping validity
  - Verdict: PASS or REVISE with structured feedback
  - Follow pattern from `skills/paw-discovery-correlation-review/SKILL.md`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-discovery-journey-grounding-review/SKILL.md`

#### Manual Verification:
- [ ] Skill has execution context header stating "subagent session"
- [ ] Review criteria cover: pain point extraction accuracy, journey coherence, source tracing accuracy, feature mapping reasonableness
- [ ] Quality thresholds defined (100% pain points have source citations, etc.)
- [ ] Feedback format matches existing review skills (Issues Found, Recommended Actions)

---

## Phase 3: Journey Scoping Skill

### Objective
Create `paw-discovery-journey-scoping` interactive checkpoint skill for MVP depth scoping.

### Changes Required

- **`skills/paw-discovery-journey-scoping/SKILL.md`** (new file):
  - Execution context: Direct in PAW Discovery session (interactive checkpoint)
  - Capabilities: Present journeys with MVP options, support per-journey/batch/bulk-guidance styles
  - Input: JourneyMap.md
  - Output: JourneyMap.md updated with MVP depth annotations
  - Behavior: Suggest batch mode when journey count > 5 with per-journey style
  - Follow interactive patterns from `paw-work-shaping`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-discovery-journey-scoping/SKILL.md`

#### Manual Verification:
- [ ] Skill supports three scoping styles: per-journey, batch, bulk-guidance
- [ ] Per-journey mode presents each journey individually with Full/Partial/Minimal options
- [ ] Batch mode presents all journeys at once
- [ ] Bulk-guidance mode accepts high-level direction ("start minimal", "full depth")
- [ ] Agent suggests batch mode when journey count exceeds 5
- [ ] JourneyMap.md update pattern adds "MVP Depth" and "Scoped" fields to each journey

---

## Phase 4: Prioritization Updates

### Objective
Update `paw-discovery-prioritize` skill to consume JourneyMap.md and consider journey factors in prioritization.

### Changes Required

- **`skills/paw-discovery-prioritize/SKILL.md`** (modify):
  - Add JourneyMap.md to inputs (line ~13-14 area)
  - Add new prioritization factors:
    - Journey criticality (is feature required for MVP-scoped journey?)
    - Pain point severity (how bad is the problem this solves?)
    - MVP scope (what depth was scoped for V1?)
  - Update autonomous prioritization process to incorporate journey factors
  - Update Roadmap.md template to reference journey rationale

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-discovery-prioritize/SKILL.md`

#### Manual Verification:
- [ ] Inputs section lists JourneyMap.md alongside Correlation.md
- [ ] Prioritization factors section includes journey criticality, pain point severity, MVP scope
- [ ] Roadmap.md template shows journey rationale in MVP-Critical item descriptions
- [ ] Features not enabling any journey can be deprioritized with rationale

---

## Phase 5: Orchestration Updates

### Objective
Update Discovery agent, workflow skill, and init skill to orchestrate the new Journey Grounding stage.

### Changes Required

- **`agents/PAW Discovery.agent.md`** (modify):
  - Add Journey Grounding to mandatory transitions table (after correlation-review, before prioritize)
  - Add Journey Scoping checkpoint (after journey-grounding-review, before prioritize)
  - Update stage boundary table to include new boundaries
  - Update execution model section to list new skills (journey-grounding direct, journey-grounding-review subagent, journey-scoping direct)

- **`skills/paw-discovery-workflow/SKILL.md`** (modify):
  - Add Journey Grounding and Journey Scoping to activities table
  - Add JourneyMap.md to artifact directory structure
  - Document Scoping Style configuration options
  - Update default flow guidance section

- **`skills/paw-discovery-init/SKILL.md`** (modify):
  - Add `scoping_style` parameter with options: `per-journey`, `batch`, `bulk-guidance`
  - Add Scoping Style to DiscoveryContext.md template Configuration section
  - Add Journey Grounding and Journey Scoping to Stage Progress table template

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint:agent:all`

#### Manual Verification:
- [ ] Agent mandatory transitions include: correlation-review → journey-grounding → journey-grounding-review → journey-scoping → prioritize
- [ ] Stage boundary table shows Journey Grounding boundaries with Review Policy behavior
- [ ] Workflow skill activities table includes journey-grounding, journey-grounding-review, journey-scoping
- [ ] Init skill includes scoping_style parameter with default `per-journey`
- [ ] DiscoveryContext.md template shows Scoping Style in Configuration section

---

## Phase 6: Documentation

### Objective
Update project documentation and create Docs.md technical reference.

### Changes Required

- **`.paw/work/discovery-journey-grounding/Docs.md`** (new file):
  - Technical reference for Journey Grounding implementation
  - Load `paw-docs-guidance` for template and conventions

- **`docs/guide/discovery-workflow.md`** (modify):
  - Add Journey Grounding stage to workflow description
  - Update mermaid diagram to show: Extraction → Mapping → Correlation → Journey Grounding → Prioritization
  - Add Stage 4: Journey Grounding section with skill, description, output
  - Renumber Prioritization to Stage 5

- **`paw-specification.md`** (check if Discovery documented here):
  - If Discovery workflow is documented, add Journey Grounding stage

### Success Criteria

#### Automated Verification:
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] Docs.md covers: feature overview, usage, JourneyMap.md structure, scoping styles
- [ ] discovery-workflow.md mermaid diagram includes Journey Grounding
- [ ] Stage numbering is consistent throughout docs

---

## References

- Issue: none (derived from WorkShaping.md)
- Spec: `.paw/work/discovery-journey-grounding/Spec.md`
- Research: `.paw/work/discovery-journey-grounding/CodeResearch.md`
- WorkShaping: `.paw/work/discovery-journey-grounding/WorkShaping.md`
