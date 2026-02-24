# PAW Discovery Workflow Implementation Plan

## Overview

Implementing a strategic Discovery workflow that transforms scattered input documents into prioritized MVP roadmaps by correlating product vision with existing codebase capabilities. This adds a new sibling workflow to PAW (alongside Implementation and Review) with 5 activity skills, an orchestrator agent, and dedicated review skills per stage.

## Current State Analysis

From CodeResearch.md:
- PAW has established patterns for orchestrator + activity skills (`agents/PAW.agent.md`, `skills/paw-workflow/`)
- Directory conventions exist: `.paw/work/` for implementation, `.paw/reviews/` for review
- Skill structure pattern: YAML frontmatter + execution context + desired end states + quality checklist
- Subagent delegation pattern for research/review activities
- `paw-code-research` skill available for codebase mapping delegation
- Interactive Q&A patterns in `paw-work-shaping` and `paw-spec` for extraction

Key gaps:
- No `.paw/discovery/` directory structure
- No document conversion infrastructure (docx/PDF → markdown)
- No discovery-specific skills or agent

## Desired End State

A complete Discovery workflow where:
1. User invokes `PAW Discovery` agent with input documents
2. Extraction stage processes documents (including docx/PDF conversion) with interactive refinement
3. Mapping stage delegates to `paw-code-research` for codebase inventory
4. Correlation stage cross-references themes with capabilities
5. Prioritization stage produces ranked MVP roadmap
6. Each stage has dedicated review skill for quality validation
7. Workflow offers PAW handoff for top roadmap item

Verification: User can place heterogeneous documents in `inputs/`, invoke Discovery, and receive `Roadmap.md` with traceable connections to both source documents and codebase capabilities.

## What We're NOT Doing

- Multi-repository correlation (single repo scope for MVP)
- PDF/image OCR (text-based PDF only)
- External tool integrations (Jira, Linear, Notion)
- Auto-detection when documents appear in folder
- Automated effort estimation (qualitative only)

## Phase Status

- [x] **Phase 1: Core Infrastructure** - Directory structure, DiscoveryContext.md, orchestrator skill
- [x] **Phase 2: Extraction Skill** - Document processing with docx/PDF conversion and interactive Q&A
- [x] **Phase 3: Extraction Review Skill** - Quality validation for Extraction.md
- [x] **Phase 4: Mapping Skill** - Thin wrapper delegating to paw-code-research
- [x] **Phase 5: Mapping Review Skill** - Quality validation for CapabilityMap.md
- [x] **Phase 6: Correlation Skill** - Cross-reference themes with capabilities
- [ ] **Phase 7: Correlation Review Skill** - Quality validation for Correlation.md
- [ ] **Phase 8: Prioritization Skill** - Multi-factor MVP ranking with PAW handoff
- [ ] **Phase 9: Prioritization Review Skill** - Quality validation for Roadmap.md
- [ ] **Phase 10: Discovery Agent** - Orchestrator agent file with workflow rules
- [ ] **Phase 11: Documentation** - Docs.md, user guide updates
- [ ] **Phase 12: Integration Testing** - Workflow test for full Discovery flow

## Phase Candidates

<!-- Candidates discovered during implementation go here -->

---

## Phase 1: Core Infrastructure

### Objective
Establish directory structure, configuration artifact, and orchestrator skill that coordinates the Discovery workflow.

### Changes Required

- **`skills/paw-discovery-workflow/SKILL.md`**: Reference documentation skill (not orchestrator)
  - Activity table (extraction → mapping → correlation → prioritize)
  - Artifact directory structure documentation
  - Stage guidance and artifact progression
  - Review integration points
  - **Note**: This skill provides reference documentation only. Orchestration execution is owned by `PAW Discovery.agent.md` (Phase 10).

- **Directory structure template** (documented in skill):
  ```
  .paw/discovery/<work-id>/
  ├── inputs/              # User-provided documents
  ├── DiscoveryContext.md  # Configuration and state
  ├── Extraction.md        # Stage 1 output
  ├── CapabilityMap.md     # Stage 2 output
  ├── Correlation.md       # Stage 3 output
  └── Roadmap.md           # Stage 4 output
  ```

- **DiscoveryContext.md template** (defined in skill):
  - Work identity (title, ID)
  - Configuration (review policy)
  - Stage progress tracking
  - Source document inventory

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Skill follows metadata format from `skills/paw-workflow/SKILL.md:1-4`
- [ ] Activity table present with all 4 activity skills + review skills
- [ ] Directory structure clearly documented
- [ ] DiscoveryContext.md template complete

---

## Phase 2: Extraction Skill

### Objective
Create skill that processes input documents (including docx/PDF conversion), extracts structured themes, and supports interactive Q&A for refinement.

### Changes Required

- **`skills/paw-discovery-extraction/SKILL.md`**: Extraction activity skill
  - Execution context: Direct (interactive Q&A)
  - Document conversion: docx→markdown using mammoth, PDF→text using pdf-parse (structure inferred from headings/formatting)
  - Theme extraction: Features, user needs, constraints, vision statements
  - Interactive refinement: Q&A to validate understanding (pattern from `paw-work-shaping`)
  - Source attribution: Track which themes came from which documents

- **Extraction.md artifact template** (YAML frontmatter + prose):
  ```yaml
  ---
  date: [timestamp]
  work_id: [work-id]
  source_documents:
    - path: inputs/doc1.md
      type: markdown
    - path: inputs/doc2.docx
      type: docx (converted)
  theme_count: [N]
  status: complete
  ---
  ```
  Followed by structured sections: Features, User Needs, Constraints, Vision, Open Questions

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Skill declares direct execution context
- [ ] Document conversion approach documented (mammoth for docx, pdf-parse for PDF)
- [ ] Interactive Q&A flow matches pattern from `paw-work-shaping:21-61`
- [ ] Extraction.md template has YAML frontmatter with source attribution
- [ ] Quality checklist included
- [ ] Edge case handling documented: scale limits (token warnings), contradictory documents (conflict detection/surfacing)

---

## Phase 3: Extraction Review Skill

### Objective
Create review skill that validates Extraction.md quality before proceeding to mapping.

### Changes Required

- **`skills/paw-discovery-extraction-review/SKILL.md`**: Review skill
  - Execution context: Subagent
  - Review criteria:
    - All input documents processed
    - Themes are well-formed (clear description, source attributed)
    - No unresolved conflicts between documents
    - Interactive clarifications completed
  - Pass/fail with specific feedback

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Skill declares subagent execution context
- [ ] Review criteria checklist complete
- [ ] Feedback format matches `paw-spec-review` pattern

---

## Phase 4: Mapping Skill

### Objective
Create thin wrapper skill that delegates codebase capability mapping to existing `paw-code-research`.

### Changes Required

- **`skills/paw-discovery-mapping/SKILL.md`**: Mapping activity skill
  - Execution context: Direct (coordinates delegation)
  - Reads Extraction.md to formulate research questions about relevant capabilities
  - Delegates to `paw-code-research` via subagent with specific questions
  - Reformats findings into CapabilityMap.md

- **CapabilityMap.md artifact template**:
  ```yaml
  ---
  date: [timestamp]
  work_id: [work-id]
  capability_count: [N]
  research_source: CodeResearch.md
  status: complete
  ---
  ```
  Followed by capability inventory: Name, Description, Location (file:line), Relevance to extracted themes

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Skill describes delegation to `paw-code-research`
- [ ] Research question formulation documented
- [ ] CapabilityMap.md template structured for correlation stage consumption

---

## Phase 5: Mapping Review Skill

### Objective
Create review skill that validates CapabilityMap.md quality.

### Changes Required

- **`skills/paw-discovery-mapping-review/SKILL.md`**: Review skill
  - Execution context: Subagent
  - Review criteria:
    - Capabilities have file:line references
    - Descriptions are clear and accurate
    - Coverage is reasonable for codebase size
  - Pass/fail with specific feedback

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Review criteria verify file:line evidence
- [ ] Feedback format consistent with other review skills

---

## Phase 6: Correlation Skill

### Objective
Create skill that cross-references extracted themes with mapped capabilities to identify matches, gaps, and combination opportunities.

### Changes Required

- **`skills/paw-discovery-correlation/SKILL.md`**: Correlation activity skill
  - Execution context: Direct (may need interactive clarification)
  - Reads Extraction.md and CapabilityMap.md
  - Generates correlation matrix: Theme × Capability relationships
  - Identifies: Direct matches, gaps (new work needed), combination opportunities
  - Surfaces relevance mismatches for user confirmation

- **Correlation.md artifact template**:
  ```yaml
  ---
  date: [timestamp]
  work_id: [work-id]
  theme_count: [N]
  capability_count: [M]
  match_count: [X]
  gap_count: [Y]
  combination_count: [Z]
  status: complete
  ---
  ```
  Followed by: Correlation Matrix, Matches (theme→capability), Gaps (themes with no capability), Combinations (multiple capabilities → bigger outcome)

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Correlation types clearly defined (match, gap, combination)
- [ ] Relevance mismatch handling documented
- [ ] Artifact format enables prioritization stage consumption

---

## Phase 7: Correlation Review Skill

### Objective
Create review skill that validates Correlation.md quality.

### Changes Required

- **`skills/paw-discovery-correlation-review/SKILL.md`**: Review skill
  - Execution context: Subagent
  - Review criteria:
    - All themes have correlation status (matched, gap, or combination)
    - Correlations are justified with evidence
    - No obvious connections missed
  - Pass/fail with specific feedback

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Review criteria verify completeness
- [ ] Feedback format consistent

---

## Phase 8: Prioritization Skill

### Objective
Create skill that applies multi-factor prioritization to produce MVP roadmap with PAW handoff option.

### Changes Required

- **`skills/paw-discovery-prioritize/SKILL.md`**: Prioritization activity skill
  - Execution context: Direct (interactive tradeoff discussion)
  - Reads Correlation.md
  - Applies prioritization factors: Value, Effort, Dependencies, Risk, Leverage
  - Interactive discussion of tradeoffs for each candidate
  - Generates ranked roadmap items
  - Offers PAW handoff for top item

- **Roadmap.md artifact template**:
  ```yaml
  ---
  date: [timestamp]
  work_id: [work-id]
  item_count: [N]
  top_priority: [item-name]
  paw_handoff_ready: true
  status: complete
  ---
  ```
  Followed by: Prioritization Criteria, Ranked Items (with rationale per factor), Recommended First Item, PAW Handoff Brief

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] All 5 prioritization factors documented
- [ ] Tradeoff discussion approach described
- [ ] PAW handoff offer mechanism documented
- [ ] Roadmap.md template includes multi-factor rationale

---

## Phase 9: Prioritization Review Skill

### Objective
Create review skill that validates Roadmap.md quality before workflow completion.

### Changes Required

- **`skills/paw-discovery-prioritize-review/SKILL.md`**: Review skill
  - Execution context: Subagent
  - Review criteria:
    - All roadmap items have multi-factor rationale
    - Prioritization is logical and consistent
    - Top item is clearly identified
    - PAW handoff brief is actionable
  - Pass/fail with specific feedback

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:skills`

#### Manual Verification
- [ ] Review criteria verify multi-factor rationale
- [ ] Handoff brief quality validated

---

## Phase 10: Discovery Agent

### Objective
Create orchestrator agent that coordinates the Discovery workflow, mirroring PAW.agent.md and PAW Review.agent.md patterns.

### Changes Required

- **`agents/PAW Discovery.agent.md`**: Discovery orchestrator agent
  - Description: Orchestrates PAW Discovery workflow
  - Initialization: Detect/create `.paw/discovery/<work-id>/` directory
  - Workflow rules:
    - Mandatory transitions (extraction → extraction-review → mapping → ...)
    - Stage boundary handling: Delegate to `paw-transition` skill (reuse existing infrastructure)
    - Review policy behavior (supports iteration via FR-012)
  - Re-invocation mechanics (FR-012):
    - Detect new/changed files in `inputs/` folder via file list comparison in DiscoveryContext.md
    - On re-run: Invalidate downstream artifacts (mark stale or delete)
    - DiscoveryContext.md tracks: `last_extraction_inputs` list, `stages_requiring_rerun` flags
  - Skill loading references
  - PAW handoff mechanism at completion

### Success Criteria

#### Automated Verification
- [ ] Lint passes: `npm run lint:agent:all`

#### Manual Verification
- [ ] Agent follows pattern from `agents/PAW.agent.md:1-150`
- [ ] Mandatory transitions table complete
- [ ] Review policy integration documented
- [ ] PAW handoff mechanism clear

---

## Phase 11: Documentation

### Objective
Create technical documentation and update user guide.

### Changes Required

- **`.paw/work/discovery-workflow-implementation/Docs.md`**: Technical reference
  - Architecture overview
  - Skill responsibilities
  - Artifact formats
  - Integration points

- **`docs/guide/discovery-workflow.md`**: User guide page
  - When to use Discovery
  - How to invoke
  - Input document preparation
  - Workflow stages explained
  - PAW handoff usage

- **`mkdocs.yml`**: Add navigation entry for discovery guide

- **`docs/specification/discovery.md`** (optional): Specification page if warranted

### Success Criteria

#### Automated Verification
- [ ] Docs build: `mkdocs build --strict`

#### Manual Verification
- [ ] Docs.md follows `paw-docs-guidance` patterns
- [ ] User guide is clear for first-time users
- [ ] Navigation entry added correctly

---

## Phase 12: Integration Testing

### Objective
Create integration test validating the full Discovery workflow flow.

### Changes Required

- **`tests/integration/tests/workflows/discovery-workflow.test.ts`**: Full workflow test
  - Use `TestFixture.clone("minimal-ts")` for isolated test repo
  - Seed input documents in `.paw/discovery/<work-id>/inputs/`
  - Use `RuleBasedAnswerer` to simulate user responses during interactive Q&A
  - Drive workflow through extraction → mapping → correlation → prioritization
  - Assert artifact structure for each stage output
  - Validate PAW handoff brief is actionable

### Success Criteria

#### Automated Verification
- [ ] Test passes: `npm run test:integration:workflows`

#### Manual Verification
- [ ] Test follows patterns from existing workflow tests
- [ ] RuleBasedAnswerer rules cover interactive Q&A scenarios
- [ ] Assertions verify artifact YAML frontmatter and key sections

---

## References

- Issue: none
- Spec: `.paw/work/discovery-workflow-implementation/Spec.md`
- Research: `.paw/work/discovery-workflow-implementation/CodeResearch.md`
- WorkShaping: `.paw/discovery/WorkShaping.md`
