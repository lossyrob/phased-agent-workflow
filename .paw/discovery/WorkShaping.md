# PAW Discovery Workflow — Work Shaping

## Problem Statement

Teams working on product development often face a landscape with many scattered input artifacts—PRDs, meeting notes, RFCs, user research, competitor analysis—but lack a systematic way to synthesize these into actionable work. The challenge is not just consolidating documents, but correlating proposed features with existing codebase capabilities to determine what fits the product and what should be built first.

**Who benefits**: Product and engineering teams seeking alignment between product vision and technical reality.

**What problem is solved**: Transforms scattered knowledge into a prioritized MVP plan that shows how new capabilities connect with existing features, enabling teams to identify foundational work and strategic leverage points.

## Work Breakdown

### Core Functionality

1. **Document extraction and normalization**
   - **Word-to-Markdown conversion**: Convert .docx files to clean Markdown before processing (critical for LLM input quality)
   - Process heterogeneous input documents (PRDs, meeting notes, RFCs, research)
   - Extract structured themes: proposed features, user needs, constraints, vision statements
   - Hybrid approach: autonomous extraction + interactive Q&A refinement
   - Output: Normalized themes with source attribution

2. **Codebase capability mapping**
   - Inventory existing features and modules in the target codebase
   - Focus on capabilities (not architecture)—what the product can do today
   - Delegate to existing `paw-code-research` skill via subagent
   - Output: Capability inventory structured for correlation

3. **Document-codebase correlation**
   - Cross-reference extracted themes with capability map
   - Identify: direct matches, gaps requiring new work, combination opportunities
   - Surface where new features can extend/combine existing capabilities
   - Output: Connection map showing proposed ↔ existing relationships

4. **Multi-factor MVP prioritization**
   - Apply prioritization criteria: value, effort, dependencies, risk, leverage
   - Explicit tradeoff discussion for each candidate item
   - Interactive refinement of priorities
   - Suggest top item and offer to kick off PAW workflow
   - Output: Prioritized roadmap with rationale

### Supporting Functionality

- Directory structure setup (`.paw/discovery/<work-id>/`)
- Stage progression management
- State tracking across stages
- Handoff to PAW for implementation of top-priority items

## Edge Cases

| Scenario | Expected Handling |
|----------|-------------------|
| Relevance mismatch (docs far outside codebase domain) | Surface explicitly, ask if intentional (greenfield) or wrong target repo |
| Contradictory documents (conflicting approaches) | Interactive Q&A to resolve, surface in correlation output |
| Scale issues (very long docs or many small docs) | Warn about token/context limits, suggest prioritizing inputs |
| No clear doc-code connection | Highlight as gap, discuss whether this is net-new capability |
| Incomplete input coverage | Ask clarifying questions to surface implicit knowledge |

## Architecture

### Skill Structure (5 skills, mirroring PAW pattern)

```
paw-discovery-workflow          # Orchestrator
    ├── paw-discovery-extraction    # Stage 1: Doc processing + interactive Q&A
    ├── paw-discovery-mapping       # Stage 2: Codebase capability inventory (delegates to paw-code-research)
    ├── paw-discovery-correlation   # Stage 3: Cross-reference docs ↔ code
    └── paw-discovery-prioritize    # Stage 4: MVP roadmap generation
```

### Directory Structure

```
.paw/discovery/<work-id>/
    ├── inputs/              # User-provided source documents
    ├── Extraction.md        # Stage 1 output: normalized themes
    ├── CapabilityMap.md     # Stage 2 output: codebase capabilities
    ├── Correlation.md       # Stage 3 output: doc ↔ code connections
    └── Roadmap.md           # Stage 4 output: prioritized MVP items
```

### Data Flow

```
Input Documents → [Extraction] → Extraction.md
                                      ↓
Codebase → [Mapping via code-research] → CapabilityMap.md
                                              ↓
                    [Correlation] → Correlation.md
                                         ↓
                    [Prioritization] → Roadmap.md → PAW handoff
```

### Skill Responsibilities

| Skill | Input | Output | Notes |
|-------|-------|--------|-------|
| `paw-discovery-workflow` | User invocation | Stage coordination | Manages flow, state, directory setup |
| `paw-discovery-extraction` | Input docs + user | `Extraction.md` | Doc-focused only; includes Word→Markdown conversion |
| `paw-discovery-mapping` | Extraction themes | `CapabilityMap.md` | Delegates to `paw-code-research` via subagent |
| `paw-discovery-correlation` | Extraction + CapabilityMap | `Correlation.md` | Cross-reference and gap analysis |
| `paw-discovery-prioritize` | Correlation output | `Roadmap.md` | Multi-factor analysis, tradeoff discussion |

## Critical Analysis

### Value Assessment

- **High value**: Addresses real pain point of scattered artifacts → no clear action
- **Strategic positioning**: Sits above PAW as strategic layer (one Discovery → multiple PAW workflows)
- **Leverage**: Reuses existing `paw-code-research` skill, follows established PAW patterns

### Build vs Modify Tradeoffs

- **New skills needed**: 5 new skills for Discovery workflow
- **Reuse opportunity**: `paw-code-research` (via delegation), PAW orchestration patterns
- **Pattern consistency**: Mirroring PAW structure reduces learning curve

### Design Decisions

- **Dedicated extraction skill** over parameterized work-shaping (cleaner separation of concerns)
- **Explicit invocation only** (no auto-detection when docs appear)
- **Separate mapping stage** with delegation (avoids duplicating code-research capabilities)

## Codebase Fit

### Similar Features

- PAW workflow structure (orchestrator + activity skills)
- Work shaping (interactive Q&A pattern)
- Code research (codebase analysis)
- PAW Review workflow (another sibling workflow with its own directory structure)

### Reuse Opportunities

- `paw-code-research` skill for codebase mapping stage
- PAW orchestration patterns for workflow management
- PAW directory conventions (`.paw/<workflow>/<work-id>/`)
- Existing stage progression and state tracking patterns

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Context/token limits with many input docs | Medium | Warn users, suggest prioritization, chunked processing |
| Extraction quality varies with doc heterogeneity | Medium | Interactive Q&A to validate/refine understanding |
| Correlation may miss non-obvious connections | Low | Interactive stage allows user correction |
| Scope creep—trying to do too much synthesis | Medium | Clear stage boundaries, focused outputs |

## Open Questions

1. **Artifact format details**: Should Extraction.md use a specific schema for themes (e.g., YAML frontmatter + prose) or free-form markdown?
2. **Multi-repo scenarios**: Should Discovery support correlating docs against multiple codebases?
3. **Iteration support**: Can users re-run stages (e.g., add more docs and re-extract)?
4. **Review integration**: Should Discovery artifacts go through review stages like PAW implementation artifacts?

## Session Notes

### Key Decisions Made

- **Workflow name**: "Discovery" (emphasizes finding/uncovering what to build)
- **Architecture**: Multiple activity skills mirroring PAW structure (over single monolithic skill)
- **Stage 1 scope**: Doc-focused extraction only, no codebase exploration (separation of concerns)
- **Stage 2 approach**: Delegate to existing paw-code-research rather than building new capability
- **Invocation**: Explicit user request only (no auto-detection)
- **Handoff**: Discovery suggests top item and offers to kick off PAW, but user chooses

### Insights

- Discovery is a **strategic layer above PAW**—one Discovery run may spawn multiple PAW workflows
- The workflow bridges **product vision with engineering reality**—a specific and valuable use case
- **Progressive artifact generation** (like PAW) preferred over single giant output document
- **Hybrid extraction** (autonomous + interactive) balances efficiency with accuracy
