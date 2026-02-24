---
name: paw-discovery-workflow
description: Reference documentation for PAW Discovery workflow. Provides activity tables, artifact structure, stage guidance, and review integration. Orchestration execution is owned by PAW Discovery.agent.md.
---

# PAW Discovery Workflow Skill

**Reference Documentation**: This skill provides guidance on Discovery workflow patterns, artifact structure, and stage sequences. Orchestration execution (mandatory transitions, state tracking, pause rules) is owned by the PAW Discovery agent, not this skill.

## Core Discovery Principles

These principles apply to ALL Discovery stages.

### 1. Document-Centric Synthesis

Discovery transforms scattered input documents into actionable roadmaps:
- Extract structured themes from heterogeneous inputs
- Map themes against existing codebase capabilities
- Correlate and prioritize for MVP definition

### 2. Evidence-Based Attribution

All extracted themes and correlations MUST be traceable:
- Source document attribution for each theme
- File:line references for capability claims
- Explicit rationale for prioritization decisions

### 3. Interactive Refinement

Discovery is collaborative, not fully autonomous:
- Q&A during extraction to validate understanding
- User confirmation for relevance mismatches
- Tradeoff discussion during prioritization

### 4. Human Authority

Humans have final authority over all Discovery decisions:
- Review pauses honor user preferences
- Prioritization can be overridden
- Roadmap items are advisory until human-approved

## Activities

| Skill | Capabilities | Primary Artifacts |
|-------|--------------|-------------------|
| `paw-discovery-extraction` | Process input docs, extract themes, interactive Q&A | Extraction.md |
| `paw-discovery-extraction-review` | Review extraction quality | Review feedback |
| `paw-discovery-mapping` | Delegate to paw-code-research, format capability inventory | CapabilityMap.md |
| `paw-discovery-mapping-review` | Review mapping quality | Review feedback |
| `paw-discovery-correlation` | Cross-reference themes with capabilities | Correlation.md |
| `paw-discovery-correlation-review` | Review correlation quality | Review feedback |
| `paw-discovery-prioritize` | Multi-factor prioritization, PAW handoff | Roadmap.md |
| `paw-discovery-prioritize-review` | Review roadmap quality | Review feedback |
| `paw-discovery-final-review` | Comprehensive SoT/multi-model review before handoff | reviews/ |

**Utility skills**: `paw-code-research` (invoked by mapping), `paw-sot` (invoked by final-review).

## Artifact Directory Structure

All Discovery artifacts are stored in a consistent directory structure:

```
.paw/discovery/<work-id>/
├── inputs/              # User-provided source documents (.md, .txt, .docx, .pdf)
├── DiscoveryContext.md  # Configuration, state, and input tracking
├── Extraction.md        # Stage 1 output: normalized themes with source attribution
├── CapabilityMap.md     # Stage 2 output: codebase capabilities inventory
├── Correlation.md       # Stage 3 output: theme ↔ capability connections
└── Roadmap.md           # Stage 4 output: prioritized MVP items with rationale
```

**Work ID Derivation**: Normalized from user-provided title, lowercase with hyphens (e.g., "Q1 Planning" → "q1-planning").

## DiscoveryContext.md Template

```markdown
# Discovery Context

## Work Identity
- **Work Title**: <title>
- **Work ID**: <work-id>
- **Created**: <YYYY-MM-DD>

## Configuration
- **Review Policy**: <every-stage | final-only>

## Input Documents
| File | Type | Added | Status |
|------|------|-------|--------|
| inputs/doc1.md | markdown | 2026-01-15 | processed |
| inputs/doc2.docx | docx | 2026-01-15 | processed |

## Stage Progress
| Stage | Status | Artifact |
|-------|--------|----------|
| Extraction | complete | Extraction.md |
| Extraction Review | complete | - |
| Mapping | in-progress | CapabilityMap.md |
| Mapping Review | pending | - |
| Correlation | pending | Correlation.md |
| Correlation Review | pending | - |
| Prioritization | pending | Roadmap.md |
| Prioritization Review | pending | - |

## Re-invocation State
- **Last Extraction Inputs**: [list of files processed in last extraction]
- **Stages Requiring Rerun**: [none | extraction | mapping | correlation | prioritization]

## Notes
[User notes, decisions, context]
```

## Default Flow Guidance

Typical Discovery progression (adapt based on user intent and workflow state):

### Extraction Stage
1. `paw-discovery-extraction`: Process input documents, extract themes
2. `paw-discovery-extraction-review`: Review extraction quality

### Mapping Stage
1. `paw-discovery-mapping`: Delegate to paw-code-research, format findings
2. `paw-discovery-mapping-review`: Review mapping quality

### Correlation Stage
1. `paw-discovery-correlation`: Cross-reference themes with capabilities
2. `paw-discovery-correlation-review`: Review correlation quality

### Prioritization Stage
1. `paw-discovery-prioritize`: Multi-factor analysis, generate roadmap
2. `paw-discovery-prioritize-review`: Review roadmap quality

### Completion
- Offer PAW handoff for top-priority roadmap item
- User can invoke PAW workflow with roadmap item as brief

## Supported Input Formats

| Format | Extension | Conversion |
|--------|-----------|------------|
| Markdown | .md | Native |
| Plain text | .txt | Native |
| Word document | .docx | mammoth → markdown |
| PDF (text-based) | .pdf | pdf-parse → text |

**Note**: Image-based PDFs and image files are not supported.

## Edge Case Handling

| Scenario | Handling |
|----------|----------|
| Relevance mismatch | Surface warning, ask user to confirm intent |
| Contradictory documents | Interactive Q&A to resolve, surface in Extraction.md |
| Scale limits (token overflow) | Warn user, suggest prioritizing inputs |
| No doc-code connection | Highlight as net-new capability in Correlation.md |

## Re-invocation Support

Discovery supports iterative refinement (FR-012):

1. **Input change detection**: Compare current `inputs/` file list with `Last Extraction Inputs` in DiscoveryContext.md
2. **Cascade invalidation**: When extraction re-runs, downstream artifacts (CapabilityMap.md, Correlation.md, Roadmap.md) are marked stale
3. **Selective re-run**: User can re-invoke specific stages; downstream stages auto-invalidate

### Trigger Commands

User can request re-invocation with:
- "Re-run extraction with the new documents"
- "I added a new document, update the extraction"
- "Refresh the extraction stage"
- "Re-analyze the inputs"

The agent detects input changes by comparing `inputs/` with `Last Extraction Inputs` in DiscoveryContext.md.

## PAW Handoff

At completion, guide user to choose their PAW entry point:

### Two Valid Paths

| Path | When to Use | Entry Point |
|------|-------------|-------------|
| **Work Shaping** | Multiple items to scope/group | `paw-work-shaping` with roadmap items |
| **Direct PAW** | Single clear item | `paw-init` with item as brief |

### Scale Guidance

| MVP-Critical Count | Suggested Path |
|--------------------|----------------|
| 1-3 items | Direct PAW likely sufficient |
| 4-7 items | Either path works |
| 8+ items | Work Shaping to scope batch first |

### Completion Message

```
Discovery complete! Roadmap has N MVP-Critical items.

Next steps:
1. "Start Work Shaping with [items]" — scope/refine first
2. "Start PAW for [item]" — implement directly

Which would you like?
```

## Execution Model

**Direct execution**: `paw-discovery-extraction`, `paw-discovery-mapping`, `paw-discovery-correlation`, `paw-discovery-prioritize`

**Subagent delegation**: `paw-discovery-extraction-review`, `paw-discovery-mapping-review`, `paw-discovery-correlation-review`, `paw-discovery-prioritize-review`, `paw-code-research` (invoked by mapping)

**Orchestrator-handled**: Stage transitions (inline Review Policy checks), input change detection, artifact invalidation
