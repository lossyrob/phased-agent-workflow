---
date: 2026-02-25T16:45:00Z
git_commit: bcfbbb73577f2cbe71ce288c133fa8f2a2567015
branch: feature/discovery-journey-grounding
repository: erdemtuna/phased-agent-workflow
topic: "PAW Discovery workflow patterns for Journey Grounding implementation"
tags: [research, codebase, discovery, skills, agents]
status: complete
last_updated: 2026-02-25
---

# Research: Discovery Workflow Patterns

## Research Question

What patterns and structures exist in the PAW Discovery workflow that the Journey Grounding feature should follow?

## Summary

PAW Discovery is a 4-stage workflow (Extraction → Mapping → Correlation → Prioritization) with mandatory review skills after each stage. Each stage follows a consistent pattern: activity skill produces an artifact, review skill validates it, stage boundary may pause based on Review Policy. Journey Grounding should fit between Correlation and Prioritization as a new stage following these established patterns.

## Documentation System

- **Framework**: mkdocs with Material theme
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml:1-40`
- **Style Conventions**: Markdown with mermaid diagrams, code blocks, tables
- **Build Command**: `mkdocs build` (serve: `mkdocs serve`)
- **Standard Files**: `docs/index.md`, `docs/guide/discovery-workflow.md`

## Verification Commands

- **Test Command**: `npm test` (runs `node ./out/test/runTest.js`)
- **Lint Command**: `npm run lint` (runs `eslint src --ext ts`)
- **Build Command**: `npm run compile` (runs `tsc -p ./`)
- **Type Check**: Included in compile
- **Agent Lint**: `npm run lint:agent:all` or `./scripts/lint-prompting.sh`

## Detailed Findings

### Discovery Workflow Structure

The PAW Discovery workflow is orchestrated by `agents/PAW Discovery.agent.md:1-221` with 4 stages:

| Stage | Activity Skill | Review Skill | Artifact |
|-------|---------------|--------------|----------|
| Extraction | `paw-discovery-extraction` | `paw-discovery-extraction-review` | Extraction.md |
| Mapping | `paw-discovery-mapping` | `paw-discovery-mapping-review` | CapabilityMap.md |
| Correlation | `paw-discovery-correlation` | `paw-discovery-correlation-review` | Correlation.md |
| Prioritization | `paw-discovery-prioritize` | `paw-discovery-prioritize-review` | Roadmap.md |

After all stages, `paw-discovery-final-review` runs (if enabled).

**Stage transitions** defined at `agents/PAW Discovery.agent.md:16-27`:
- Activity → Review is always immediate (no pause)
- Stage boundaries check Review Policy (`every-stage` or `final-only`)

### Skill File Pattern

All Discovery skills follow consistent structure at `skills/paw-discovery-*/SKILL.md`:

```markdown
---
name: paw-discovery-{stage}
description: [Purpose] skill for PAW Discovery workflow
---

# Discovery [Stage Name]

> **Execution Context**: [Direct in session | Subagent]

[Capabilities list]
[Input/Output specs]
[Process details]
[Artifact template with YAML frontmatter]
[Quality checklist]
[Completion Response]
```

**Execution contexts** (`agents/PAW Discovery.agent.md:96-107`):
- **Direct execution** (interactive): extraction, mapping, correlation, prioritize
- **Subagent delegation** (context isolation): all review skills, code-research

### Activity Skill Pattern (from paw-discovery-extraction)

Key elements at `skills/paw-discovery-extraction/SKILL.md`:

1. **Execution context header** (line 8-9): States whether skill runs direct or subagent
2. **Capabilities section** (lines 12-22): Bulleted list of what skill can do
3. **Process sections** (lines 96-177): Detailed how-to including edge cases
4. **Artifact template** (lines 188-276): Complete markdown template with YAML frontmatter
5. **Quality checklist** (lines 296-305): Verification items before completion
6. **Completion response** (lines 307-318): What to report back to orchestrator

**Artifact frontmatter pattern** (`skills/paw-discovery-extraction/SKILL.md:193-212`):
```yaml
---
date: [ISO timestamp]
work_id: [work-id]
# artifact-specific fields
status: complete
---
```

### Review Skill Pattern (from paw-discovery-correlation-review)

Key elements at `skills/paw-discovery-correlation-review/SKILL.md`:

1. **Execution context** (line 8-9): Always subagent
2. **Review criteria** (lines 12-53): Checklist of validation points
3. **Verdict** (lines 55-58): PASS or REVISE
4. **Feedback format** (lines 60-78): Structured format for REVISE verdict
5. **Quality thresholds** (lines 80-88): Measurable criteria table
6. **Completion response** (lines 90-98): Verdict + issues + next stage ready

**Review feedback structure**:
```markdown
## [Stage] Review: REVISE

### Issues Found
1. **[Category]**: [Specific issue]
   - Evidence: [What was found/missing]
   - Required action: [What needs to change]

### Recommended Actions
1. [Specific action]
```

### DiscoveryContext.md Template

Configuration and state tracking at `skills/paw-discovery-init/SKILL.md:79-110`:

```markdown
# Discovery Context

## Work Identity
- **Work Title**: [Title]
- **Work ID**: `[work-id]`
- **Created**: [ISO date]

## Configuration
- **Review Policy**: [every-stage|final-only]
- **Final Review**: [enabled|disabled]
- **Final Review Mode**: [single-model|multi-model|society-of-thought]

## Stage Progress
| Stage | Status | Artifact |
|-------|--------|----------|
| Extraction | pending | - |
...

## Input Tracking
- **last_extraction_inputs**: []
- **stages_requiring_rerun**: []
```

**Current configuration options** (`skills/paw-discovery-init/SKILL.md:21-27`):
- `review_policy`: `every-stage`, `final-only`
- `final_review`: `enabled`, `disabled`
- `final_review_mode`: `single-model`, `multi-model`, `society-of-thought`

Journey Grounding adds: `scoping_style`: `per-journey`, `batch`, `bulk-guidance`

### Prioritization Skill Integration Points

The prioritize skill at `skills/paw-discovery-prioritize/SKILL.md` will need modification:

**Current inputs** (line 13-14):
- Reads Correlation.md for theme-capability relationships

**Prioritization factors** (lines 22-71):
1. Value (user/business impact)
2. Effort (work required)
3. Dependencies (blocker/enabler/independent)
4. Risk (uncertainty level)
5. Leverage (reuse of existing capabilities)

**Journey Grounding adds new factors**:
- Journey criticality (is feature required for a complete journey?)
- Pain point severity (how bad is the problem this solves?)
- MVP scope (what depth was scoped for V1?)

### Agent Orchestration Pattern

Stage boundary handling at `agents/PAW Discovery.agent.md:33-56`:

```
Stage Boundary | every-stage | final-only
---------------|-------------|------------
Extraction → Mapping | PAUSE | continue
Mapping → Correlation | PAUSE | continue
Correlation → Prioritization | PAUSE | continue
Prioritization → Complete | PAUSE | PAUSE
```

**New boundary** (Journey Grounding insertion):
```
Correlation Review → Journey Grounding | check policy
Journey Grounding Review → Journey Scoping | always proceed (interactive checkpoint)
Journey Scoping → Prioritization | check policy
```

### Interactive Checkpoint Pattern

Journey Scoping is not a full stage but an interactive checkpoint. Similar pattern exists in:
- `paw-work-shaping` - interactive Q&A utility skill
- `paw-discovery-extraction` - has Q&A phase within activity (lines 136-161)

**Work Shaping pattern** reference: Loads skill, runs interactive Q&A, produces artifact, completes. No review stage for user decisions.

### Documentation Location

Discovery workflow docs at `docs/guide/discovery-workflow.md:1-100`:
- Describes stages with mermaid diagram
- Lists input formats
- Documents artifact outputs

Will need update to include Journey Grounding stage in workflow diagram and stage descriptions.

## Code References

- `agents/PAW Discovery.agent.md:16-27` - Mandatory transitions table
- `agents/PAW Discovery.agent.md:33-56` - Stage boundary handling
- `agents/PAW Discovery.agent.md:96-107` - Execution model (direct vs subagent)
- `skills/paw-discovery-init/SKILL.md:21-27` - Configuration parameters
- `skills/paw-discovery-init/SKILL.md:79-110` - DiscoveryContext.md template
- `skills/paw-discovery-extraction/SKILL.md:8-9` - Direct execution context pattern
- `skills/paw-discovery-extraction/SKILL.md:188-276` - Artifact template pattern
- `skills/paw-discovery-correlation-review/SKILL.md:55-78` - Review verdict pattern
- `skills/paw-discovery-prioritize/SKILL.md:22-71` - Prioritization factors
- `skills/paw-discovery-workflow/SKILL.md:43-55` - Activity table
- `docs/guide/discovery-workflow.md:5-12` - Workflow diagram location

## Architecture Documentation

### Skill Directory Structure

All Discovery skills follow pattern:
```
skills/paw-discovery-{name}/
└── SKILL.md
```

No supporting files (scripts/, references/, assets/) - content is self-contained.

### Artifact Directory Structure

```
.paw/discovery/<work-id>/
├── inputs/              # User source documents
├── DiscoveryContext.md  # Configuration and state
├── Extraction.md        # Stage 1 output
├── CapabilityMap.md     # Stage 2 output
├── Correlation.md       # Stage 3 output
├── JourneyMap.md        # NEW: Stage 4 output (Journey Grounding)
└── Roadmap.md           # Stage 5 output (was Stage 4)
```

### Execution Flow Pattern

For new Journey Grounding stage:
1. `paw-discovery-journey-grounding` (direct execution, interactive)
   - Reads: inputs/, Extraction.md, Correlation.md
   - Produces: JourneyMap.md
2. `paw-discovery-journey-grounding-review` (subagent)
   - Validates: JourneyMap.md
   - Returns: PASS/REVISE verdict
3. `paw-discovery-journey-scoping` (direct execution, interactive checkpoint)
   - Reads: JourneyMap.md
   - Updates: JourneyMap.md with MVP depth annotations
   - No review (user decisions are authoritative)

## Open Questions

1. Should Journey Grounding stage appear in the mermaid diagram as one box or two (grounding + scoping)?
2. Does the Stage Progress table need new rows for Journey Grounding + Review + Scoping, or just Journey Grounding + Scoping?
