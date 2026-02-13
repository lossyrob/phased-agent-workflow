# PAW Agents Reference

PAW uses two AI chat modes ("agents") that orchestrate workflow activities through dynamically loaded skills. Each agent is a compact orchestrator that reasons about user intent and delegates to specialized skills.

## Agents Overview

| Agent | Purpose | Architecture |
|-------|---------|--------------|
| **PAW** | Implementation workflow orchestrator | Skills-based |
| **PAW Review** | PR review workflow orchestrator | Skills-based |

Both agents follow the same pattern: a compact orchestrator that loads a workflow skill for guidance, then delegates activities to specialized skills via subagents.

---

## Implementation Workflow

### PAW Agent

**Purpose:** Execute the complete PAW implementation workflow—from specification through final PR—using dynamically loaded skills.

**Invocation (VS Code):** `PAW: New PAW Workflow` command or `/paw` in Copilot Chat

**Invocation (Copilot CLI):** `copilot --agent PAW` or use `/agent` to select PAW inside a session

**Architecture:** The PAW agent uses a skills-based architecture with a **hybrid execution model**:

1. Loads the `paw-workflow` skill for orchestration guidance
2. Discovers available skills dynamically via `paw_get_skills`
3. Delegates activities to specialized skills
4. Applies Review Policy and Session Policy for workflow control

**Hybrid Execution Model:**

| Execution Type | Skills | Why |
|----------------|--------|-----|
| **Direct** (in-session) | `paw-init`, `paw-spec`, `paw-planning`, `paw-implement`, `paw-pr`, `paw-final-review`, `paw-planning-docs-review`, `paw-status`, `paw-work-shaping`, `paw-rewind` | Interactive activities that benefit from user collaboration |
| **Subagent** (isolated) | `paw-spec-research`, `paw-code-research`, `paw-spec-review`, `paw-plan-review`, `paw-impl-review`, `paw-transition` | Research and review activities that benefit from context isolation |

This preserves conversation flow for interactive work while leveraging fresh context for focused research and review.

**Activity Skills:**

| Skill | Capabilities | Primary Artifacts |
|-------|--------------|-------------------|
| `paw-init` | Bootstrap workflow, create WorkflowContext.md | WorkflowContext.md |
| `paw-spec` | Create/revise specifications | Spec.md |
| `paw-spec-research` | Answer factual questions about existing system | SpecResearch.md |
| `paw-spec-review` | Validate spec quality and completeness | Structured feedback |
| `paw-code-research` | Document implementation details with file:line refs | CodeResearch.md |
| `paw-planning` | Create implementation plans with phases | ImplementationPlan.md |
| `paw-plan-review` | Validate plan feasibility and spec alignment | Structured feedback |
| `paw-planning-docs-review` | Holistic review of planning artifacts bundle | REVIEW*.md in reviews/planning/ |
| `paw-implement` | Execute plan phases, make code changes | Code files, Docs.md |
| `paw-impl-review` | Review implementation, add docs, open PRs | Phase PRs |
| `paw-final-review` | Pre-PR review with multi-model or single-model | REVIEW*.md in reviews/ |
| `paw-pr` | Pre-flight validation, create final PR | Final PR |
| `paw-status` | Diagnose workflow state, recommend next steps | Status reports |

**Utility Skills:**

| Skill | Purpose |
|-------|---------|
| `paw-git-operations` | Branch naming, strategy-based branching, selective staging |
| `paw-review-response` | PR comment mechanics (read, TODO, commit, reply) |
| `paw-docs-guidance` | Documentation templates and project doc update patterns |

**Workflow Stages:**

1. **Specification Stage**
   - `paw-spec` → `paw-spec-research` (if needed) → `paw-spec` (resume)
   - Produces: Spec.md, SpecResearch.md

2. **Planning Stage**
   - `paw-code-research` → `paw-planning` → `paw-plan-review` → `paw-planning-docs-review` (if enabled)
   - Produces: CodeResearch.md, ImplementationPlan.md, Planning PR (prs strategy)

3. **Implementation Stage**
   - For each phase: `paw-implement` → `paw-impl-review`
   - Produces: Code changes, Phase PRs (prs strategy)

4. **Final Review Stage** (if enabled)
   - `paw-final-review`
   - Produces: Review artifacts in `.paw/work/<work-id>/reviews/`

5. **Finalization Stage**
   - `paw-pr`
   - Produces: Final PR to main

**Policy Configuration:**

| Policy | Values | Description |
|--------|--------|-------------|
| Review Policy | `every-stage` / `milestones` / `planning-only` / `final-pr-only` | When to pause for human review |
| Session Policy | `per-stage` / `continuous` | Chat context management (CLI always uses `continuous`) |
| Workflow Mode | `full` / `minimal` / `custom` | Workflow complexity |
| Review Strategy | `prs` / `local` | PR-based or direct commits |

**Review Policy Details:**

| Policy | Behavior |
|--------|----------|
| `every-stage` | Pause after every artifact is produced |
| `milestones` | Pause at key artifacts (Spec.md, ImplementationPlan.md, Phase PRs, Final PR) |
| `planning-only` | Pause at Spec.md, ImplementationPlan.md, and Final PR only; auto-proceed at phases (requires `local` strategy) |
| `final-pr-only` | Only pause at final PR — auto-proceed through all intermediate stages |

---

## Review Workflow

### PAW Review

**Purpose:** Execute the complete PAW Review workflow using dynamically loaded skills.

**Invocation (VS Code):** `/paw-review <PR-number-or-URL>`

**Invocation (Copilot CLI):** `copilot --agent PAW-Review` then provide the PR number or URL

**Architecture:** The PAW Review agent uses a skills-based architecture:

1. Loads the `paw-review-workflow` skill for orchestration
2. Executes activity skills via subagents for each stage
3. Produces all review artifacts automatically

**Skills Used:**

| Skill | Type | Stage | Artifacts |
|-------|------|-------|-----------|
| `paw-review-workflow` | Workflow | — | Orchestrates all stages |
| `paw-review-understanding` | Activity | Understanding | ReviewContext.md, DerivedSpec.md |
| `paw-review-baseline` | Activity | Understanding | CodeResearch.md |
| `paw-review-impact` | Activity | Evaluation | ImpactAnalysis.md |
| `paw-review-gap` | Activity | Evaluation | GapAnalysis.md |
| `paw-review-correlation` | Activity | Evaluation | CrossRepoAnalysis.md (multi-repo only) |
| `paw-review-feedback` | Activity | Output | ReviewComments.md (draft → finalized) |
| `paw-review-critic` | Activity | Output | Assessment sections in ReviewComments.md |
| `paw-review-github` | Activity | Output | GitHub pending review |

**Workflow Stages:**

1. **Understanding Stage**
   - Analyzes PR changes and creates ReviewContext.md
   - Researches pre-change baseline at base commit
   - Derives specification from implementation

2. **Evaluation Stage**
   - Identifies system-wide impacts and breaking changes
   - Finds gaps across correctness, safety, testing, and quality
   - Categorizes findings as Must/Should/Could
   - Correlates findings across repositories (multi-repo reviews)

3. **Output Stage** (4-step feedback-critique iteration)
   - **Initial feedback**: Generates draft comments with rationale
   - **Critique**: Adds assessment sections with Include/Modify/Skip recommendations
   - **Critique response**: Updates comments per recommendations, marks final status
   - **GitHub posting**: Creates pending review with only approved comments

**Comment Evolution:** ReviewComments.md shows full history for each comment: original → assessment → updated → posted status. Skipped comments remain visible for manual inclusion if reviewer disagrees with critique.

**Human Control:** Pending review is never auto-submitted. User reviews comments, edits/deletes as needed, consults ReviewComments.md for full context, then submits manually.

**Note:** The six PAW-R* agents (R1A, R1B, R2A, R2B, R3A, R3B) have been replaced by this unified skills-based workflow.

---

## Agent Invocation

### Starting Workflows

**GitHub Copilot CLI:**

```bash
copilot --agent PAW        # Start implementation workflow
copilot --agent PAW-Review # Start review workflow
```

Or use `/agent` inside an existing session to switch to a PAW agent.

**VS Code (Copilot Chat):**

| Workflow | Command | Prompt |
|----------|---------|--------|
| Implementation | `PAW: New PAW Workflow` | `/paw` |
| Review | — | `/paw-review <PR>` |

**Note:** Slash commands like `/paw` and `/paw-review` are VS Code-specific prompt templates.

### Navigation Within Workflows

The PAW agent understands natural language requests and routes them to appropriate skills. Common patterns:

- "Create a spec for..." → `paw-spec` skill
- "Research how X works" → `paw-spec-research` or `paw-code-research`
- "Create an implementation plan" → `paw-planning` skill
- "Implement phase N" → `paw-implement` skill
- "What's the status?" → `paw-status` skill

### Review Policy Modes

PAW supports four review policies that control when the workflow pauses for human review:

| Policy | Behavior |
|--------|----------|
| **every-stage** | Pause after every artifact is produced |
| **milestones** | Pause at key artifacts (Spec.md, ImplementationPlan.md, Phase PRs, Final PR) |
| **planning-only** | Pause at Spec.md, ImplementationPlan.md, and Final PR only; auto-proceed at phases (requires `local` strategy) |
| **final-pr-only** | Only pause at final PR — auto-proceed through all intermediate stages |

**Legacy Review Policy Mapping:** Older WorkflowContext.md files may use `never` or `always`. The mapping is: `never` → `final-pr-only`, `always` → `every-stage`.

**Legacy Handoff Mode Mapping:** Older WorkflowContext.md files may use `Handoff Mode` instead of `Review Policy`. The mapping is: `manual` → `every-stage`, `semi-auto` → `milestones`, `auto` → `final-pr-only`.

## Next Steps

- [Artifacts Reference](artifacts.md) — Artifact descriptions
- [Implementation Workflow](../specification/implementation.md) — How the workflow stages work
- [Review Workflow](../specification/review.md) — Skills-based review workflow
