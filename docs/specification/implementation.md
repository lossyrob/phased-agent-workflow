# Implementation Workflow

The PAW Implementation Workflow transforms feature ideas into production-ready code through structured phases. Each phase produces durable artifacts that feed the next, with human oversight at critical decision points.

## Workflow Stages

```
Issue → Specification → Research → Planning → Implementation → Documentation → Final PR
```

### Stage 01 — Specification

**Agents:** Spec Agent, Spec Research Agent

Turn an issue or brief into a testable specification with factual research about the current system.

**Inputs:**

- Issue URL or brief describing the work
- Target branch name
- Design documents or context (optional)

**Outputs:**

- `Spec.md` — Testable requirements document
- `SpecResearch.md` — Factual documentation of current system
- `prompts/spec-research.prompt.md` — Research questions for fact-finding

**Process:**

1. Spec Agent drafts requirements from the issue/brief
2. Spec Agent generates research questions about the current system
3. Spec Research Agent answers questions and produces factual documentation
4. Iterate until spec is clear, complete, and testable

### Stage 02 — Implementation Plan

**Agents:** Code Research Agent, Implementation Plan Agent

Map relevant code areas and create a detailed implementation plan broken into phases.

**Inputs:**

- `Spec.md` and `SpecResearch.md` from Stage 01
- Target branch name

**Outputs:**

- `CodeResearch.md` — Technical mapping of relevant code
- `ImplementationPlan.md` — Detailed plan with phases
- Planning PR opened (`<target>_plan` → `<target>`)

**Process:**

1. Code Research Agent maps relevant code areas and dependencies
2. Implementation Plan Agent creates detailed plan based on spec and code research
3. Collaborate iteratively to refine the plan
4. Open Planning PR for review

### Stage 03 — Phased Implementation

**Agents:** Implementation Agent, Implementation Review Agent

Execute plan phases with automated verification, peer review, and quality gates.

**Inputs:**

- `ImplementationPlan.md` from Stage 02
- `CodeResearch.md` for reference

**Outputs:**

- Phase PRs opened (`<target>_phase<N>` → `<target>`)
- Implemented code changes
- Updated plan with phase completion status

**Process:**

For each phase:

1. Implementation Agent creates phase branch and implements changes
2. Implementation Agent runs automated checks (tests, linting, type checking)
3. Implementation Review Agent reviews changes, adds documentation
4. Implementation Review Agent pushes and opens Phase PR
5. Human reviews PR and provides feedback
6. Implementation Agent addresses review comments
7. Implementation Review Agent verifies and pushes updates
8. Merge when approved, repeat for next phase

### Stage 04 — Documentation

**Agent:** Documenter Agent

Produce comprehensive documentation that serves as the authoritative technical reference.

**Inputs:**

- `ImplementationPlan.md` with all phases complete
- All merged Phase PRs

**Outputs:**

- `Docs.md` — Comprehensive technical documentation
- Docs PR opened (`<target>_docs` → `<target>`)

**Process:**

1. Documenter Agent creates `Docs.md` from implementation artifacts
2. Opens Docs PR for review
3. Address review comments
4. Merge when approved

### Stage 05 — Final PR

**Agents:** PR Agent, Implementation Agent, Implementation Review Agent

Open the final PR to main with comprehensive description and pre-flight checks.

**Inputs:**

- All artifacts from previous stages
- All merged PRs (planning, phases, docs)

**Outputs:**

- Final PR opened (`<target>` → `main`)

**Process:**

1. PR Agent verifies all prerequisites are complete
2. PR Agent crafts comprehensive PR description
3. PR Agent opens final PR
4. Address any review comments (using Implementation Agents)
5. Merge when approved

---

## Implementation Agents

### Spec Agent

Turns an issue/brief into a **testable specification** (`Spec.md`) and writes research prompts with open factual questions about the current system.

**Focus:** What the feature must do (functional/non-functional requirements, acceptance criteria). Avoids implementation details.

### Spec Research Agent

Answers internal system behavior questions and produces **factual documentation** in `SpecResearch.md`. Documents how the system behaves today at a conceptual/behavioral level (no file paths).

**Focus:** Behavioral and contextual documentation, not implementation details.

### Code Research Agent

Maps **where** and **how** the relevant code works today. Produces `CodeResearch.md` with file paths, patterns, and integration points.

**Focus:** Technical mapping for implementation planning.

### Implementation Plan Agent

Creates detailed implementation plans through an interactive, iterative process. Produces `ImplementationPlan.md` with discrete phases that can be reviewed and merged independently.

### Implementation Agent

Executes plan phases by making code changes and ensures quality by running automated checks. Creates implementation branches, commits changes, and addresses review comments.

**Focus:** Forward momentum—making code work.

### Implementation Review Agent

Reviews code changes, generates docstrings and comments, commits improvements, pushes branches, and opens PRs. Verifies review comment responses and replies to reviewers.

**Focus:** Quality gate—making code reviewable.

### Documenter Agent

Produces comprehensive documentation in `Docs.md` that serves as the authoritative technical reference. Updates project docs according to project guidance.

### Status Agent

Maintains related Issues and PRs, ensuring links and checklists remain up to date. Run between stages and phases to keep everything in sync.

### PR Agent

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
