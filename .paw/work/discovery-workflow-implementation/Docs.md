# Discovery Workflow - Technical Documentation

## Overview

The Discovery Workflow is a strategic layer that transforms scattered product documents into prioritized MVP roadmaps by correlating product vision with existing codebase capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAW Discovery Agent                       │
│              (Orchestrator: workflow coordination)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┬─────────────────┐
    ▼                 ▼                 ▼                 ▼
┌────────┐     ┌────────┐       ┌───────────┐     ┌──────────┐
│Extract │     │ Map    │       │ Correlate │     │Prioritize│
└────────┘     └────────┘       └───────────┘     └──────────┘
    │               │                 │                 │
    ▼               ▼                 ▼                 ▼
┌────────┐     ┌────────┐       ┌───────────┐     ┌──────────┐
│Review  │     │ Review │       │  Review   │     │  Review  │
└────────┘     └────────┘       └───────────┘     └──────────┘
```

## Skill Architecture

| Skill | Type | Context | Responsibility |
|-------|------|---------|----------------|
| `paw-discovery-workflow` | Reference | Direct | Documentation, activity tables, templates |
| `paw-discovery-extraction` | Activity | Direct | Document conversion and theme extraction |
| `paw-discovery-extraction-review` | Review | Subagent | Validates extraction quality |
| `paw-discovery-mapping` | Activity | Direct | Delegates codebase research |
| `paw-discovery-mapping-review` | Review | Subagent | Validates capability inventory |
| `paw-discovery-correlation` | Activity | Direct | Cross-references themes with capabilities |
| `paw-discovery-correlation-review` | Review | Subagent | Validates correlation completeness |
| `paw-discovery-prioritize` | Activity | Direct | Produces ranked roadmap |
| `paw-discovery-prioritize-review` | Review | Subagent | Validates prioritization rationale |

## Artifact Formats

### DiscoveryContext.md

Configuration and workflow state tracking:

```yaml
---
work_id: q1-planning
created: 2024-01-15
current_stage: extraction
review_policy: every-stage
---
```

### Extraction.md

```yaml
---
source_documents: [prd.md, meeting-notes.docx, design-rfc.pdf]
extraction_date: 2024-01-15
theme_count: 12
---
```

Body contains themes with:
- Theme name and description
- Source attribution (file:section)
- Requirements extracted
- Open questions

### CapabilityMap.md

```yaml
---
codebase_scope: src/
capability_count: 45
research_source: CodeResearch.md
---
```

Body contains capabilities with:
- Name and description
- Location (file:line)
- Relevance to extracted themes
- Reusability assessment

### Correlation.md

```yaml
---
theme_count: 12
capability_count: 45
match_count: 18
gap_count: 5
---
```

Body contains:
- Theme-to-capability mappings
- Coverage analysis (full/partial/none)
- Gap identification
- Combination opportunities
- Conflicts requiring resolution

### Roadmap.md

```yaml
---
item_count: 8
methodology: 5-factor-analysis
handoff_ready: true
---
```

Body contains prioritized items with:
- Rank and name
- 5-factor scores (Value, Feasibility, Effort, Dependencies, Risk)
- Implementation approach
- PAW handoff brief

## Integration Points

### With PAW Code Research

`paw-discovery-mapping` delegates to `paw-code-research` for systematic codebase analysis:

1. Formulates research questions from extracted themes
2. Invokes code research subagent
3. Transforms findings into capability inventory

### With PAW Transition

Stage boundaries delegate to `paw-transition`:

1. Reports completed stage
2. Receives pause decision based on policy
3. Proceeds or yields accordingly

### With PAW Implementation

At completion, Discovery can hand off to PAW:

1. User selects roadmap item
2. Discovery extracts brief from item
3. Initiates PAW workflow with context
4. References Discovery artifacts

## Re-invocation Support

Discovery tracks input changes for iterative refinement:

**DiscoveryContext.md fields:**
- `last_extraction_inputs`: File list at last extraction
- `stages_requiring_rerun`: Stages invalidated by changes

**Cascade logic:**
- New inputs → re-run extraction
- Extraction changes → invalidate mapping, correlation, roadmap
- Mapping changes → invalidate correlation, roadmap
- Correlation changes → invalidate roadmap

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Review failure | Report issues, re-invoke activity, re-review |
| Empty inputs folder | Prompt user for documents |
| Conversion failure (corrupt docx) | Report file, request alternative format |
| Image-based PDF | Report limitation, skip file |

## Testing

Integration tests in `tests/integration/tests/workflows/discovery-workflow.test.ts` validate:

1. End-to-end workflow execution
2. Stage transitions
3. Artifact generation
4. PAW handoff mechanism
