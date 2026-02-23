# Feature Specification: PAW Discovery Workflow

**Branch**: feature/discovery-workflow-implementation  |  **Created**: 2026-02-23  |  **Status**: Draft
**Input Brief**: Add a strategic Discovery workflow that transforms scattered input documents into prioritized MVP roadmaps by correlating product vision with existing codebase capabilities.

## Overview

Product and engineering teams frequently face a challenging landscape: multiple input artifacts—PRDs, meeting notes, RFCs, user research, competitor analysis—scattered across various sources, with no systematic way to synthesize them into actionable work. The gap between "what product envisions" and "what engineering can feasibly build" often leads to misaligned priorities, missed opportunities to leverage existing capabilities, and unclear MVP definitions.

The PAW Discovery workflow addresses this by providing a structured, multi-stage process that extracts key themes from heterogeneous documents, maps them against existing codebase capabilities, identifies connection opportunities and gaps, and produces a prioritized roadmap. Unlike ad-hoc synthesis, Discovery creates traceable artifacts at each stage, enabling teams to understand how conclusions were reached and iterate as new information emerges.

Discovery sits at a strategic layer above PAW's tactical implementation workflow. A single Discovery run may identify multiple MVP items, each of which can spawn its own PAW workflow for implementation. This separation ensures strategic thinking (what to build, in what order) remains distinct from tactical execution (how to build a specific feature).

The workflow supports iteration—teams can add documents, re-run extraction, and flow through correlation and prioritization again as their understanding evolves. This accommodates the reality that product discovery is rarely a one-shot process.

## Objectives

- Enable product/engineering alignment by systematically correlating product vision documents with existing codebase capabilities
- Transform scattered input artifacts into a single prioritized MVP roadmap with explicit tradeoff rationale
- Surface connection opportunities where new features can extend or combine existing capabilities (strategic leverage)
- Identify foundational work that must precede feature development (dependency discovery)
- Provide traceable, reviewable artifacts at each stage so teams understand how conclusions were derived
- Support iterative refinement as new documents or insights emerge
- Offer seamless handoff to PAW for implementing top-priority roadmap items

## User Scenarios & Testing

### User Story P1 – Product Manager Synthesizes Vision Documents

**Narrative**: A product manager has accumulated PRDs, meeting notes, and user research across multiple planning sessions. They invoke Discovery with these documents to produce a clear MVP roadmap that the engineering team can act on. The roadmap shows not just priorities but how proposed features connect with existing product capabilities.

**Independent Test**: User places 3+ documents in inputs folder, runs Discovery, receives Roadmap.md with prioritized items linked to both source documents and existing codebase features.

**Acceptance Scenarios**:
1. Given multiple input documents in `.paw/discovery/<work-id>/inputs/`, When user invokes Discovery workflow, Then all documents are processed and themes extracted into Extraction.md
2. Given extracted themes and codebase analysis complete, When correlation runs, Then Correlation.md shows explicit mappings between proposed features and existing capabilities
3. Given completed correlation, When prioritization runs, Then Roadmap.md contains ranked MVP items with multi-factor rationale (value, effort, dependencies, risk, leverage)

### User Story P2 – Engineer Validates Technical Feasibility

**Narrative**: An engineer reviews Discovery output to understand which proposed features align with existing architecture and which require significant new work. The CapabilityMap.md shows what the codebase can do today, and Correlation.md highlights gaps and opportunities.

**Independent Test**: Engineer reads CapabilityMap.md and identifies at least one existing capability relevant to proposed features, confirmed by correlation links.

**Acceptance Scenarios**:
1. Given Discovery workflow initiated, When mapping stage runs, Then CapabilityMap.md inventories existing codebase capabilities with descriptions
2. Given CapabilityMap exists, When user reviews Correlation.md, Then they can trace which existing capabilities relate to which proposed features
3. Given gaps identified in correlation, When user reviews Roadmap.md, Then foundational work items are surfaced with appropriate priority

### User Story P3 – Team Iterates on Discovery

**Narrative**: After initial Discovery run, the team receives new user research. They add the document to inputs and re-run extraction, then flow through correlation and prioritization again to see how priorities shift.

**Independent Test**: User adds document to inputs folder, re-invokes extraction stage, receives updated Extraction.md incorporating new content.

**Acceptance Scenarios**:
1. Given completed Discovery run with Roadmap.md, When user adds new document to inputs folder, Then extraction stage can be re-invoked
2. Given re-extraction complete, When correlation stage runs, Then it uses updated Extraction.md content
3. Given updated correlation, When prioritization runs, Then Roadmap.md reflects changes from new input

### User Story P4 – Seamless PAW Handoff

**Narrative**: After reviewing the Roadmap, the team decides to implement the top-priority item. Discovery offers to kick off a PAW workflow for that item, pre-populating context from the Discovery artifacts.

**Independent Test**: User accepts handoff offer for roadmap item #1, PAW workflow initializes with item description as brief.

**Acceptance Scenarios**:
1. Given completed Roadmap.md, When Discovery completes, Then user is offered option to start PAW for top item
2. Given user accepts PAW handoff, When PAW initializes, Then work description references Discovery findings

### Edge Cases

- **Relevance mismatch**: Documents describe features far outside codebase domain → Surface warning, ask user to confirm intent (greenfield vs wrong repo)
- **Contradictory documents**: Two inputs propose conflicting approaches → Interactive Q&A during extraction to resolve, surface conflict in Extraction.md
- **Scale limits**: Very long documents or many small documents exceed context → Warn user, suggest prioritizing which inputs matter most
- **No doc-code connection**: Proposed features have no relationship to existing code → Highlight as net-new capability in Correlation.md
- **Incomplete coverage**: Input documents don't address key product areas → Ask clarifying questions during extraction to surface implicit knowledge
- **Word documents**: Input includes .docx files → Convert to Markdown before extraction processing

## Requirements

### Functional Requirements

- FR-001: Workflow orchestration manages stage progression, directory setup, and state tracking (Stories: P1, P3)
- FR-002: Convert .docx files to clean Markdown before extraction processing (Stories: P1)
- FR-003: Extract structured themes from heterogeneous input documents with source attribution (Stories: P1)
- FR-004: Support interactive Q&A during extraction to validate and refine understanding (Stories: P1, P3)
- FR-005: Generate Extraction.md with YAML frontmatter and prose sections for downstream parsing (Stories: P1)
- FR-006: Delegate codebase capability mapping to existing paw-code-research skill (Stories: P2)
- FR-007: Generate CapabilityMap.md inventorying existing codebase capabilities (Stories: P2)
- FR-008: Cross-reference extracted themes with capability map to identify matches, gaps, and combination opportunities (Stories: P1, P2)
- FR-009: Generate Correlation.md showing document-to-code relationships (Stories: P1, P2)
- FR-010: Apply multi-factor prioritization (value, effort, dependencies, risk, leverage) with explicit tradeoff discussion (Stories: P1)
- FR-011: Generate Roadmap.md with prioritized MVP items and rationale (Stories: P1, P4)
- FR-012: Support stage re-invocation for iterative refinement when inputs change (Stories: P3)
- FR-013: Offer PAW workflow handoff for top-priority roadmap items (Stories: P4)
- FR-014: Discovery artifacts go through review stages matching PAW pattern (Stories: P1, P2)

### Key Entities

- **Discovery Work**: A single Discovery run identified by work-id, containing inputs and generated artifacts
- **Input Document**: User-provided source file (PRD, meeting notes, RFC, research) in inputs folder
- **Theme**: Normalized unit extracted from documents (proposed feature, user need, constraint, vision statement)
- **Capability**: Existing codebase feature or module identified during mapping
- **Correlation**: Relationship between a theme and capability (match, gap, combination opportunity)
- **Roadmap Item**: Prioritized work unit with rationale, ready for implementation

### Cross-Cutting / Non-Functional

- Single repository scope for MVP (no multi-repo correlation)
- Context-aware handling of document scale (warn users when approaching token limits)
- Explicit invocation only (no auto-detection when documents appear in folder)

## Success Criteria

- SC-001: User can invoke Discovery workflow and receive Roadmap.md within single workflow execution (FR-001, FR-011)
- SC-002: Word documents in inputs folder are readable by extraction stage without manual conversion (FR-002)
- SC-003: Extraction.md contains YAML frontmatter with structured themes parseable by downstream stages (FR-003, FR-005)
- SC-004: CapabilityMap.md documents at least 3 existing capabilities for any non-trivial codebase (FR-006, FR-007)
- SC-005: Correlation.md shows explicit links between at least one theme and one capability when relevant connections exist (FR-008, FR-009)
- SC-006: Roadmap.md items include explicit multi-factor scoring or rationale (FR-010, FR-011)
- SC-007: User can add document to inputs and re-run extraction without starting fresh workflow (FR-012)
- SC-008: PAW handoff initializes with roadmap item context pre-populated (FR-013)
- SC-009: Discovery artifacts pass review stage before workflow completion (FR-014)

## Assumptions

- Users will provide input documents in supported formats (Markdown, text, .docx) rather than PDFs or images
- Input documents are in English or a language the LLM can process effectively
- The target codebase has sufficient structure for meaningful capability mapping (not an empty/starter project)
- Users understand Discovery is strategic/exploratory—effort estimates are qualitative, not precise
- The paw-code-research skill exists and can be invoked via subagent delegation

## Scope

**In Scope:**
- Five-skill architecture (orchestrator + 4 activity skills)
- Directory structure at `.paw/discovery/<work-id>/`
- Four progressive artifacts: Extraction.md, CapabilityMap.md, Correlation.md, Roadmap.md
- Word-to-Markdown conversion for .docx inputs
- Interactive Q&A during extraction for clarification
- Delegation to paw-code-research for codebase mapping
- Stage re-invocation for iteration
- PAW workflow handoff for top roadmap item
- Review integration matching PAW pattern

**Out of Scope:**
- Multi-repository correlation (single repo only for MVP)
- PDF or image document processing
- Automated effort estimation (qualitative only)
- Direct integration with external tools (Jira, Linear, Notion)
- Real-time collaboration features
- Auto-detection/auto-invocation when documents appear

## Dependencies

- paw-code-research skill (for codebase capability mapping via subagent)
- PAW workflow infrastructure (for handoff to implementation)
- Word-to-Markdown conversion capability (mammoth, pandoc, or similar)
- Existing PAW directory conventions and state management patterns

## Risks & Mitigations

- **Context/token limits with many input docs**: Medium impact. Mitigation: Warn users when input volume is high, suggest prioritizing most important documents, implement chunked processing if needed.
- **Extraction quality varies with doc heterogeneity**: Medium impact. Mitigation: Interactive Q&A validates understanding, user can correct misinterpretations before proceeding.
- **Correlation may miss non-obvious connections**: Low impact. Mitigation: Interactive correlation stage allows user to add connections the agent missed.
- **Scope creep in synthesis**: Medium impact. Mitigation: Clear stage boundaries with focused outputs; each artifact has defined schema.
- **paw-code-research availability**: Low impact. Mitigation: Skill exists in current PAW; mapping stage gracefully degrades if unavailable.

## References

- WorkShaping: `.paw/discovery/WorkShaping.md`
- PAW Specification: `paw-specification.md`
- Related skills: `paw-code-research`, `paw-workflow`
