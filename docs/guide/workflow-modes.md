# Workflow Modes

PAW supports three workflow modes to match your task scope and development style. Each mode determines which stages are included and how work is reviewed.

## Quick Overview

| Mode | Stages | Review Strategy | Best For |
|------|--------|-----------------|----------|
| **Full** | All stages (Spec → Docs) | PRs or Local | Large features, complex changes |
| **Minimal** | Core stages (Code Research → Final PR) | Local only | Bug fixes, small enhancements |
| **Custom** | User-defined | PRs or Local | Unique workflows |

## Full Mode

**Stages Included:** Spec → Spec Research → Code Research → Implementation Plan → Implementation → Documentation → Final PR → Status

Full mode is the complete PAW workflow with all stages from initial specification through comprehensive documentation.

### When to Use Full Mode

- Large features requiring comprehensive documentation
- Complex system changes needing formal specifications
- New features where requirements need refinement through the spec process
- Work that benefits from detailed technical documentation for future maintainers
- Projects where complete traceability and documentation are organizational requirements

### Review Strategies for Full Mode

Full mode supports both review strategies:

- **PRs strategy**: Creates intermediate PRs (planning, phase, docs branches) for review at multiple stages. Best for complex work requiring review checkpoints throughout development.

- **Local strategy**: Single branch workflow with all work on the target branch, only creating the final PR. Best when you prefer consolidated review but still want all stages executed.

## Minimal Mode

**Stages Included:** Code Research → Implementation Plan → Implementation → Documentation → Final PR → Status

**Stages Skipped:** Specification stage

Minimal mode is a streamlined workflow focusing on core implementation activities. It assumes requirements are already clear from the issue description or enhancement request.

### When to Use Minimal Mode

- Bug fixes with clear requirements from issue description
- Small features or enhancements where the goal is well-understood
- Refactoring work where objectives and approach are already clear
- Quick iterations when formal specs aren't needed
- Work where existing project documentation is sufficient

### Review Strategy for Minimal Mode

Minimal mode **enforces local strategy** (single branch workflow) to simplify the process. No intermediate planning, phase, or docs branches or PRs—all work happens on the target branch with only a final PR created.

!!! note "Quality Assurance"
    Even though specification and documentation stages are skipped, all quality gates (tests, linting, type checking, build verification) remain mandatory. The implementation plan still includes detailed success criteria and phase breakdown for reviewable work.

## Custom Mode

**Stages Included:** User-defined based on custom instructions provided during initialization

Custom mode offers flexibility to define which stages to include and how work should be reviewed. Agents interpret your custom instructions to determine the appropriate workflow structure.

### When to Use Custom Mode

- Unique workflows that don't fit full or minimal patterns
- Experimenting with different workflow configurations
- Project-specific requirements that need non-standard stage combinations
- Workflows where you want some but not all optional stages

### Review Strategies for Custom Mode

Custom mode supports both **prs** and **local** strategies. You specify the review approach as part of your custom instructions.

### Example Custom Instructions

```
Skip specification stage, include documentation, use prs review strategy
```

```
Include code research and implementation only, single branch workflow
```

```
Full stages but combine all implementation phases into one, use local strategy
```

## Review Strategies Explained

### PRs Strategy (Intermediate Pull Requests)

**Branch Structure:**

- Planning branch: `<target>_plan` → Planning PR to target branch
- Phase branches: `<target>_phase[N]` → Phase PRs to target branch
- Docs branch: `<target>_docs` → Docs PR to target branch
- Final PR: target branch → base branch (usually `main`)

**Best for:**

- Complex work requiring review at multiple stages
- Large features where incremental review reduces cognitive load
- Teams with multiple reviewers who can review different phases
- Work where early feedback on planning or individual phases is valuable
- Projects where intermediate review checkpoints improve quality

**Trade-offs:**

- More PR overhead (planning, phases, docs, final)
- Longer time from start to merge (multiple review cycles)
- Better quality assurance through staged review
- Easier to rewind and fix issues at specific stages

### Local Strategy (Single Branch)

**Branch Structure:**

- All work committed directly to target branch
- Final PR: target branch → base branch (usually `main`)

**Best for:**

- Simpler work where consolidated review is preferred
- Solo developers or small teams with streamlined review processes
- Work where you want to complete all stages but prefer single review point
- Bug fixes or small enhancements (especially with minimal mode)
- Projects where PR overhead should be minimized

**Trade-offs:**

- Less PR overhead (only final PR)
- Faster path to merge (single review cycle)
- Larger final PR to review (all stages combined)
- Harder to rewind to specific stages (requires git operations on target branch)

## Quality Gates

!!! warning "Important"
    Quality gates remain **mandatory regardless of workflow mode or review strategy**. Skipping stages or choosing local strategy streamlines the process but never compromises code quality.

All automated verification criteria in implementation plans must pass before work can proceed, regardless of which workflow mode is selected:

- Tests must pass
- Linting must pass
- Type checking must pass
- Build verification must pass

## Selecting Your Mode

When using the VS Code extension's `PAW: New PAW Workflow` command, you'll be prompted to:

1. **Select workflow mode** (Full, Minimal, or Custom)
2. **Select review strategy** (PRs or Local)—automatically set to Local for Minimal mode
3. **Provide custom instructions** (if Custom mode selected)

Your selections are stored in `WorkflowContext.md` and guide all agents throughout the workflow.
