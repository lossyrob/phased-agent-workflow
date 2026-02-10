# Implementation Workflow

The PAW Implementation Workflow transforms feature ideas into production-ready code through structured phases. Each phase produces durable artifacts that feed the next, with human oversight at critical decision points.

## Architecture

The implementation workflow uses a **skills-based architecture**:

- **PAW Agent**: Compact orchestrator that reasons about user intent
- **Workflow Skill**: `paw-workflow` provides guidance on activities, transitions, and policies
- **Activity Skills**: Specialized skills for each workflow stage
- **Utility Skills**: Shared mechanics for git operations, PR comments, and documentation

## Workflow Stages

```
Issue → Specification → Planning → Implementation → Finalization
```

### Pre-Specification: Work Shaping (Optional)

**Skill:** `paw-work-shaping`

When starting with a vague idea rather than a clear issue, the Work Shaping utility helps clarify requirements before specification begins.

**When to Use:**

- Exploratory requests ("I want to improve performance...")
- Vague or open-ended ideas
- Multiple possible approaches that need narrowing

**Process:**

1. Agent-led Q&A to progressively clarify the idea
2. Research codebase context as needed
3. Produce structured `WorkShaping.md` artifact
4. Feed clarified requirements into `paw-spec`

**Note:** Work Shaping is automatically triggered when the PAW agent detects exploratory language or explicit uncertainty.

### Stage 01 — Specification

**Skills:** `paw-spec`, `paw-spec-research`, `paw-spec-review`

Turn an issue or brief into a testable specification with factual research about the current system.

**Inputs:**

- Issue URL or brief describing the work
- Target branch name
- Design documents or context (optional)

**Outputs:**

- `Spec.md` — Testable requirements document
- `SpecResearch.md` — Factual documentation of current system
- `ResearchQuestions.md` — Research questions for fact-finding

**Process:**

1. `paw-spec` drafts requirements from the issue/brief
2. `paw-spec` generates research questions about the current system
3. `paw-spec-research` answers questions and produces factual documentation
4. Iterate until spec is clear, complete, and testable
5. `paw-spec-review` validates spec quality **(mandatory)**

### Stage 02 — Implementation Plan

**Skills:** `paw-code-research`, `paw-planning`, `paw-plan-review`, `paw-planning-docs-review`

Map relevant code areas and create a detailed implementation plan broken into phases.

**Inputs:**

- `Spec.md` and `SpecResearch.md` from Stage 01
- Target branch name

**Outputs:**

- `CodeResearch.md` — Technical mapping of relevant code (includes Documentation System section)
- `ImplementationPlan.md` — Detailed plan with phases (includes documentation phase when appropriate)
- Planning PR opened (`<target>_plan` → `<target>`) — PRs strategy only

**Process:**

1. `paw-code-research` maps relevant code areas, dependencies, and documentation infrastructure
2. `paw-planning` creates detailed plan based on spec and code research
3. Collaborate iteratively to refine the plan
4. `paw-plan-review` validates plan feasibility **(mandatory)**
5. `paw-planning-docs-review` reviews all planning artifacts as a holistic bundle **(if enabled)**
6. Open Planning PR for review (PRs strategy)

### Stage 03 — Phased Implementation

**Skills:** `paw-implement`, `paw-impl-review`

Execute plan phases with automated verification, peer review, and quality gates.

**Inputs:**

- `ImplementationPlan.md` from Stage 02
- `CodeResearch.md` for reference

**Outputs:**

- Phase PRs opened (`<target>_phase<N>` → `<target>`) — PRs strategy only
- Implemented code changes
- Updated plan with phase completion status
- `Docs.md` — Technical documentation (when plan includes documentation phase)

**Process:**

For each phase:

1. `paw-implement` creates phase branch and implements changes
2. `paw-implement` runs automated checks (tests, linting, type checking)
3. `paw-impl-review` reviews changes, adds documentation
4. `paw-impl-review` pushes and opens Phase PR (PRs strategy)
5. Human reviews PR and provides feedback
6. `paw-implement` addresses review comments
7. `paw-impl-review` verifies and pushes updates
8. Merge when approved, repeat for next phase

**Phase Candidates:**

During implementation, new work ideas may surface. Instead of interrupting to define a full phase, the agent captures a one-liner in the `## Phase Candidates` section of `ImplementationPlan.md`. When all planned phases complete, `paw-transition` detects unresolved candidates and reports them to the orchestrator, which presents decisions:

- **Promote**: Elaborate into a full phase (code research + planning)
- **Skip**: Mark as `[skipped]` and proceed
- **Defer**: Mark as `[deferred]` for future work

Promoted candidates become new phases and are implemented before the Final PR. This decouples intent capture from phase elaboration—ideas aren't lost, but implementation momentum is preserved.

**Documentation Phase:**

When the implementation plan includes a documentation phase:

1. `paw-implement` loads `paw-docs-guidance` utility skill
2. Creates `Docs.md` comprehensive technical documentation
3. Updates project documentation (README, CHANGELOG, guides) per project conventions
4. Verifies documentation builds correctly (if framework discovered in research)

### Stage 03.5 — Final Review (Optional)

**Skill:** `paw-final-review`

Automated review of the complete implementation against specification before Final PR creation. Runs after all implementation phases complete, if enabled via WorkflowContext.

**Inputs:**

- Full diff (target branch vs base branch)
- Spec.md requirements and success criteria
- CodeResearch.md patterns

**Outputs:**

- Review artifacts in `.paw/work/<work-id>/reviews/` (gitignored)
- Applied fixes (interactive or auto-apply based on configuration)

**Process:**

1. `paw-final-review` reads configuration from WorkflowContext (mode, interactive, models)
2. Executes review (single-model or multi-model based on config)
3. For multi-model: synthesizes findings across models
4. Presents findings for resolution (interactive) or auto-applies (non-interactive)
5. Proceeds to `paw-pr` when complete

**Configuration:**

- `Final Agent Review`: `enabled` | `disabled` (default: enabled)
- `Final Review Mode`: `single-model` | `multi-model` (default: multi-model)
- `Final Review Interactive`: `true` | `false` | `smart` (default: smart)
- `Final Review Models`: comma-separated model names (for multi-model)

**Note:** VS Code only supports single-model mode due to environment limitations.

### Stage 04 — Final PR

**Skill:** `paw-pr`

Open the final PR to main with comprehensive description and pre-flight checks.

**Inputs:**

- All artifacts from previous stages
- All merged PRs (planning, phases) — PRs strategy

**Outputs:**

- Final PR opened (`<target>` → `main`)

**Process:**

1. `paw-pr` verifies all prerequisites are complete (including open questions resolution)
2. `paw-pr` crafts comprehensive PR description with decision audit trail
3. `paw-pr` opens final PR
4. Address any review comments (using implementation skills)
5. Merge when approved

---

## Activity Skills

### paw-spec

Turns an issue/brief into a **testable specification** (`Spec.md`) and writes research questions about the current system.

**Focus:** What the feature must do (functional/non-functional requirements, acceptance criteria). Avoids implementation details.

### paw-spec-research

Answers internal system behavior questions and produces **factual documentation** in `SpecResearch.md`. Documents how the system behaves today at a conceptual/behavioral level (no file paths).

**Focus:** Behavioral and contextual documentation, not implementation details.

### paw-code-research

Maps **where** and **how** the relevant code works today. Produces `CodeResearch.md` with file paths, patterns, integration points, and documentation system details.

**Focus:** Technical mapping for implementation planning.

### paw-planning

Creates detailed implementation plans through an interactive, iterative process. Produces `ImplementationPlan.md` with discrete phases that can be reviewed and merged independently. Includes documentation phase when appropriate.

### paw-implement

Executes plan phases by making code changes and ensures quality by running automated checks. Creates implementation branches, commits changes, and addresses review comments. For documentation phases, loads `paw-docs-guidance` utility skill.

**Focus:** Forward momentum—making code work.

### paw-impl-review

Reviews code changes, generates docstrings and comments, commits improvements, pushes branches, and opens PRs. Verifies review comment responses and replies to reviewers.

**Focus:** Quality gate—making code reviewable.

### paw-final-review

Reviews implementation against specification after all phases complete. Supports multi-model parallel review (CLI) or single-model review (VS Code). Interactive mode presents findings for apply/skip/discuss; non-interactive mode auto-applies.

**Focus:** Catch issues before external PR review.

### paw-planning-docs-review

Reviews all planning artifacts (Spec.md, ImplementationPlan.md, CodeResearch.md) as a holistic bundle after plan-review passes. Supports multi-model parallel review (CLI) or single-model review (VS Code). Catches cross-artifact consistency issues before implementation begins.

**Focus:** Cross-artifact consistency gate before implementation.

**Configuration:**

- `Planning Docs Review`: `enabled` | `disabled` (default: enabled, disabled in minimal)
- `Planning Review Mode`: `single-model` | `multi-model` (default: multi-model)
- `Planning Review Interactive`: `true` | `false` | `smart` (default: smart)
- `Planning Review Models`: comma-separated model names (for multi-model)

### paw-status

Diagnoses current workflow state, recommends next steps, explains PAW process, and posts status updates to Issues/PRs.

### paw-pr

Opens the **final PR** from the target branch to main and performs comprehensive pre-flight readiness checks to assess completeness.

---

## Quality Gates

All automated verification criteria must pass regardless of workflow mode:

- ✅ Tests must pass
- ✅ Linting must pass
- ✅ Type checking must pass
- ✅ Build verification must pass

## Next Steps

- [Review Workflow](review.md) — The complementary review workflow
- [Agents Reference](../reference/agents.md) — Complete agent documentation
- [Artifacts Reference](../reference/artifacts.md) — Artifact descriptions

