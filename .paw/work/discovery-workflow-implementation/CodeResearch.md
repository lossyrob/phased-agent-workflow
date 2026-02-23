---
date: 2026-02-23T20:15:00+00:00
git_commit: e999fda7c8bb1eaf1f1ebcb5a6aba82082cb2ff4
branch: feature/discovery-workflow-implementation
repository: phased-agent-workflow
topic: "PAW Discovery Workflow Implementation"
tags: [research, codebase, paw, workflow, skills, discovery]
status: complete
last_updated: 2026-02-23
---

# Research: PAW Discovery Workflow Implementation

## Research Question

What existing PAW patterns, skills, and infrastructure can be leveraged to implement the Discovery workflow (5-skill architecture for document→MVP synthesis)?

## Summary

PAW has well-established patterns for multi-skill workflows with orchestrator + activity skills, artifact directory structures, and subagent delegation. The Discovery workflow can mirror these patterns closely:

1. **Workflow structure**: PAW uses orchestrator agents (`PAW.agent.md`) + activity skills in `skills/`. Discovery can follow this pattern.
2. **Directory conventions**: `.paw/work/<work-id>/` for implementation, `.paw/reviews/<id>/` for review. Discovery should use `.paw/discovery/<work-id>/`.
3. **Skill patterns**: Each skill has `SKILL.md` with metadata frontmatter, execution context, desired end states, and quality checklist.
4. **Subagent delegation**: Research/review skills run via subagent; interactive skills run directly in session.
5. **Code research delegation**: `paw-code-research` skill can be invoked via subagent for the mapping stage.

## Documentation System

- **Framework**: mkdocs with Material theme
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml:61-77`
- **Style Conventions**: Admonitions, code blocks with copy, tabbed sections
- **Build Command**: `mkdocs build` (or `mkdocs serve` for local preview)
- **Standard Files**: `README.md` (root), `docs/index.md`, `DEVELOPING.md`, `LICENSE`

## Verification Commands

- **Test Command**: `npm test` (VS Code extension tests)
- **Lint Command**: `npm run lint` (ESLint for TypeScript)
- **Build Command**: `npm run compile` (TypeScript compilation)
- **Type Check**: Implicit via `npm run compile` (tsc)
- **Agent Linting**: `npm run lint:agent:all` or `./scripts/lint-prompting.sh --all`
- **Skills Linting**: `npm run lint:skills`
- **Integration Tests**: `npm run test:integration:workflows`

## Detailed Findings

### Existing Workflow Structure

#### PAW Agent Architecture (`agents/PAW.agent.md:1-50`)

The PAW implementation workflow uses a hybrid execution model:
- Interactive activities execute directly in session (preserving user collaboration)
- Research and review activities delegate to subagents (context isolation)

Key patterns at `agents/PAW.agent.md:14-29`:
- Mandatory transitions table defining skill sequences
- Stage boundary rules requiring `paw-transition` delegation
- Review policy behavior controlling pause points

#### PAW Review Workflow (`skills/paw-review-workflow/SKILL.md:1-50`)

A sibling workflow demonstrating multi-stage orchestration:
- Uses `.paw/reviews/<identifier>/` directory structure
- Coordinates activity skills through subagent execution
- Produces multiple artifacts per stage (ReviewContext.md, DerivedSpec.md, etc.)

### Skill Structure Patterns

#### Skill Metadata Format (`skills/paw-workflow/SKILL.md:1-4`)

```yaml
---
name: skill-name
description: Brief description
---
```

#### Execution Context Declaration (`skills/paw-init/SKILL.md:8-9`)

Skills declare their execution context:
- **Direct execution**: `> **Execution Context**: This skill runs **directly** in the PAW session`
- **Subagent execution**: `> **Execution Context**: This skill runs in a **subagent** session`

#### Activity Table Pattern (`skills/paw-workflow/SKILL.md:57-73`)

```markdown
| Skill | Capabilities | Primary Artifacts |
|-------|--------------|-------------------|
| `paw-spec` | Create spec, revise spec | Spec.md |
```

#### Desired End States Pattern (`skills/paw-init/SKILL.md:66-113`)

Skills define desired end states rather than prescriptive steps:
- Work Title exists with sources and format
- Work ID is unique and valid
- Configuration validation rules
- Directory structure created

### Directory Structure Conventions

#### Work Directory (`skills/paw-workflow/SKILL.md:79-99`)

```
.paw/work/<work-id>/
├── WorkflowContext.md
├── Spec.md
├── SpecResearch.md
├── CodeResearch.md
├── ImplementationPlan.md
├── Docs.md
├── planning/
└── reviews/
```

#### Review Directory (`skills/paw-review-workflow/SKILL.md:99-113`)

```
.paw/reviews/<identifier>/
├── ReviewContext.md
├── CodeResearch.md
├── DerivedSpec.md
├── ImpactAnalysis.md
└── ReviewComments.md
```

### Subagent Delegation Pattern

#### Code Research Delegation (`skills/paw-code-research/SKILL.md:6-9`)

```markdown
> **Execution Context**: This skill runs in a **subagent** session, 
> delegated by the PAW orchestrator. Return structured results to 
> the orchestrator upon completion.
```

The mapping stage in Discovery should delegate to `paw-code-research` similarly.

#### Work Shaping Codebase Research (`skills/paw-work-shaping/SKILL.md:46-47`)

```markdown
When questions arise about existing system behavior, patterns, or 
integration points, delegate to `paw-code-research` skill via subagent 
with specific questions.
```

### Interactive Q&A Pattern

#### Work Shaping Session Flow (`skills/paw-work-shaping/SKILL.md:21-61`)

- Opening: Set expectations
- Progressive clarification: Agent-led Q&A
- Completion detection: Signal "complete enough"
- Artifact generation: Synthesize conversation

This pattern can inform the extraction stage's interactive refinement.

#### Spec Clarification Phase (`skills/paw-spec/SKILL.md:35-79`)

- When to clarify (high-impact gaps)
- Question guidelines (one at a time, prefer multiple choice)
- Exit conditions (~5-10 questions)

### Artifact Format Patterns

#### YAML Frontmatter (`skills/paw-code-research/SKILL.md:92-102`)

```yaml
---
date: [ISO timestamp with timezone]
git_commit: [commit hash]
branch: [branch name]
repository: [repo name]
topic: "[Research topic]"
tags: [research, codebase, component-names]
status: complete
last_updated: [YYYY-MM-DD]
---
```

#### WorkflowContext Structure (`skills/paw-init/SKILL.md:117-149`)

Configuration artifact with all workflow parameters:
- Work identity (title, ID, branches)
- Workflow configuration (mode, strategy, policy)
- Review settings (final review, planning docs review)

### Existing Skills Inventory (`skills/`)

30 skills total. Key categories:

**Implementation workflow skills**:
- `paw-init`, `paw-workflow`, `paw-transition`
- `paw-spec`, `paw-spec-research`, `paw-spec-review`
- `paw-code-research`, `paw-planning`, `paw-plan-review`
- `paw-implement`, `paw-impl-review`
- `paw-final-review`, `paw-pr`

**Review workflow skills**:
- `paw-review-workflow`, `paw-review-understanding`
- `paw-review-baseline`, `paw-review-impact`, `paw-review-gap`
- `paw-review-feedback`, `paw-review-critic`, `paw-review-github`

**Utility skills**:
- `paw-git-operations`, `paw-docs-guidance`
- `paw-work-shaping`, `paw-status`, `paw-rewind`
- `paw-sot` (society-of-thought engine)

### Test Infrastructure

#### Integration Tests (`package.json:16-18`)

```json
"test:integration": "cd tests/integration && npx tsx --test tests/**/*.test.ts",
"test:integration:skills": "cd tests/integration && npx tsx --test tests/skills/*.test.ts",
"test:integration:workflows": "cd tests/integration && npx tsx --test tests/workflows/*.test.ts"
```

Tests exist at `tests/integration/tests/` for workflow validation.

## Code References

- `agents/PAW.agent.md:1-150` - PAW orchestrator agent with workflow rules
- `agents/PAW Review.agent.md` - Review workflow orchestrator
- `skills/paw-workflow/SKILL.md:1-160` - Core workflow reference documentation
- `skills/paw-init/SKILL.md:1-183` - Initialization skill with config patterns
- `skills/paw-spec/SKILL.md:1-256` - Specification skill with clarification patterns
- `skills/paw-code-research/SKILL.md:1-208` - Code research skill for delegation
- `skills/paw-work-shaping/SKILL.md:1-98` - Work shaping with Q&A patterns
- `skills/paw-review-workflow/SKILL.md:1-276` - Review workflow as sibling pattern
- `mkdocs.yml:1-78` - Documentation configuration
- `package.json:11-19` - NPM scripts for verification commands

## Architecture Documentation

### Patterns to Reuse

1. **Skill structure**: YAML frontmatter + execution context + capabilities + desired end states + quality checklist
2. **Directory convention**: `.paw/discovery/<work-id>/` mirrors `.paw/work/` and `.paw/reviews/`
3. **Artifact progression**: Sequential artifacts feeding downstream stages
4. **Subagent delegation**: Research-type activities delegate; interactive activities run directly
5. **Review integration**: If full review enabled, artifacts go through review stages

### Implementation Approach

1. **Orchestrator skill** (`paw-discovery-workflow`): Mirror `paw-workflow` structure with activity table and stage guidance
2. **Extraction skill** (`paw-discovery-extraction`): Combine work-shaping Q&A pattern with document processing
3. **Mapping skill** (`paw-discovery-mapping`): Thin wrapper that delegates to `paw-code-research`
4. **Correlation skill** (`paw-discovery-correlation`): Cross-reference extraction with mapping outputs
5. **Prioritization skill** (`paw-discovery-prioritize`): Multi-factor analysis with interactive tradeoff discussion

### Directory Structure for Discovery

```
.paw/discovery/<work-id>/
├── inputs/              # User-provided documents
├── DiscoveryContext.md  # Configuration and state (mirrors WorkflowContext.md)
├── Extraction.md        # Normalized themes with YAML frontmatter
├── CapabilityMap.md     # Codebase capabilities inventory
├── Correlation.md       # Theme ↔ capability connections
└── Roadmap.md           # Prioritized MVP items
```

## Open Questions

1. **Word-to-Markdown conversion**: Should this use an external tool (pandoc, mammoth) or an agent-based approach? The `docx` skill in the available skills list suggests there may be existing infrastructure.

2. **Discovery agent file**: Should Discovery have its own agent file (`PAW Discovery.agent.md`) or be invocable from the main PAW agent? Review has its own agent (`PAW Review.agent.md`), suggesting separate agent file is the pattern.

3. **Review stages**: The spec requires "full review integration matching PAW pattern" - should Discovery have its own review skills (paw-discovery-extraction-review, etc.) or reuse existing review infrastructure?
