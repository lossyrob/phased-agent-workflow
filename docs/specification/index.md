# PAW Specification Overview

The **Phased Agent Workflow (PAW)** streamlines development of GitHub Copilot chat modes and features by moving work through **staged, reviewable milestones** with **clear artifacts**.

## Key Properties

PAW separates the lifecycle into **workflow stages** (Specification → Planning → Implementation → Documentation → Integration) and, inside the Implementation stage, **implementation phases** (Phase 1…N) that ship incremental, reviewable PRs.

| Property | Description |
|----------|-------------|
| **Traceable** | Every stage produces durable Markdown artifacts committed to Git and reviewed via PRs |
| **Rewindable** | Any stage can restart. If agents are implementing incorrectly, go back to the spec or plan, fix it, and re-run downstream stages |
| **Agentic** | Purpose-built chat modes ("agents") own the work of each stage |
| **Human-in-the-loop** | Humans approve specs/plans, review PRs, and decide when to rewind |
| **Consistent surfaces** | Issues and PRs stay in sync via a lightweight Status agent |

!!! note "Terminology"
    In PAW, **Stages** refer to workflow milestones (e.g., Specification Stage). Within the **Implementation Stage**, work is split into **Implementation Phases** (Phase 1, Phase 2, …) to keep PRs small and reviewable.
    
    *PAW is staged, and its implementation is phased.*

## Two Workflows

PAW provides two complementary workflows:

### Implementation Workflow

The core workflow for building features: turns GitHub Issues into production-ready code through structured phases. Each phase produces durable artifacts that feed the next, with human oversight at critical decision points.

**Stages:** Specification → Research → Planning → Implementation → Final Review → Documentation → Final PR

[Learn more about the Implementation Workflow →](implementation.md)

### Review Workflow

A structured three-stage process for thorough code review: systematically understands PR changes, evaluates impacts and gaps, and generates comprehensive evidence-based feedback with full human control over what gets posted.

**Stages:** Understanding → Evaluation → Feedback Generation

[Learn more about the Review Workflow →](review.md)

## Repository Layout

PAW artifacts are organized in a consistent directory structure:

```
.paw/
  work/                         # Implementation workflow artifacts
    <work-id>/                  # e.g., add-authentication
      WorkflowContext.md        # Centralized parameter file
      prompts/
        spec-research.prompt.md # Generated research prompts
        code-research.prompt.md # Code research guidance
      Spec.md                   # Feature specification
      SpecResearch.md           # Spec research findings
      CodeResearch.md           # Code research findings
      ImplementationPlan.md     # Implementation plan
      Docs.md                   # Documentation
  
  reviews/                      # Review workflow artifacts
    PR-<number>/                # e.g., PR-123
      ReviewContext.md          # Review parameters
      prompts/
        code-research.prompt.md # Baseline research questions
      CodeResearch.md           # Pre-change baseline
      DerivedSpec.md           # Reverse-engineered spec
      ImpactAnalysis.md        # System-wide effects
      GapAnalysis.md           # Categorized findings
      ReviewComments.md        # Complete feedback
```

## Branching Conventions

| Branch Type | Naming Pattern | Example |
|-------------|----------------|---------|
| Target Branch | Your project conventions | `feature/auth-system` |
| Planning Branch | `<target>_plan` | `feature/auth-system_plan` |
| Phase Branch | `<target>_phase<N>` | `feature/auth-system_phase1` |
| Docs Branch | `<target>_docs` | `feature/auth-system_docs` |

## PR Conventions

| PR Type | Source → Target |
|---------|-----------------|
| Planning PR | `<target>_plan` → `<target>` |
| Phase PR | `<target>_phase<N>` → `<target>` |
| Docs PR | `<target>_docs` → `<target>` |
| Final PR | `<target>` → `main` |

## Next Steps

- [Implementation Workflow](implementation.md) — Detailed implementation stages
- [Review Workflow](review.md) — Detailed review stages
- [Agents Reference](../reference/agents.md) — All PAW agents
- [Artifacts Reference](../reference/artifacts.md) — Artifact descriptions
