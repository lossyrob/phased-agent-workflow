# PAW Artifacts Reference

PAW workflows produce durable Markdown artifacts that trace reasoning and decisions through each stage. All artifacts are committed to Git and version-controlled.

## Directory Structure

```
.paw/
  work/                         # Implementation workflow
    <work-id>/
      WorkflowContext.md        # Required: workflow parameters
      ResearchQuestions.md      # Research questions for spec research
      Spec.md                   # Feature specification
      SpecResearch.md           # Spec research findings
      CodeResearch.md           # Code research findings
      ImplementationPlan.md     # Implementation plan
      Docs.md                   # Documentation
      WorkShaping.md            # Pre-spec ideation (optional)
      reviews/                  # Review artifacts (gitignored)
        planning/               # Planning Documents Review artifacts
  
  reviews/                      # Review workflow
    PR-<number>/                # Single-repo: PR-123
    PR-<number>-<repo-slug>/    # Multi-repo: PR-123-my-repo
      ReviewContext.md          # Review parameters
      ResearchQuestions.md      # Research questions for baseline analysis
      CodeResearch.md           # Pre-change baseline
      DerivedSpec.md            # Reverse-engineered spec
      ImpactAnalysis.md         # Impact analysis
      GapAnalysis.md            # Gap analysis
      ReviewComments.md         # Review comments
```

---

## Implementation Workflow Artifacts

### WorkflowContext.md

**Purpose:** Centralized parameter file that all agents read at startup.

**Contents:**

| Field | Description |
|-------|-------------|
| Work Title | Short name for PR titles |
| Work ID | Normalized slug for artifact paths |
| Target Branch | Branch where implementation merges |
| Workflow Mode | `full`, `minimal`, or `custom` |
| Review Strategy | `prs` or `local` |
| Review Policy | `every-stage`, `milestones`, `planning-only`, or `final-pr-only` |
| Session Policy | `per-stage` or `continuous` |
| Issue URL | GitHub Issue or Azure DevOps Work Item |
| Remote | Git remote name (default: "origin") |
| Artifact Paths | Usually "auto-derived" |
| Additional Inputs | Extra parameters |
| Final Agent Review | `enabled` or `disabled` |
| Final Review Mode | `single-model` or `multi-model` |
| Final Review Interactive | `true`, `false`, or `smart` |
| Final Review Models | Comma-separated model names |
| Planning Docs Review | `enabled` or `disabled` |
| Planning Review Mode | `single-model` or `multi-model` |
| Planning Review Interactive | `true`, `false`, or `smart` |
| Planning Review Models | Comma-separated model names |

### Spec.md

**Purpose:** Testable requirements document defining what the feature must do.

**Created by:** `paw-spec` skill

**Contents:**

- **Overview** — Brief summary of feature purpose
- **Functional Requirements** — What the feature must do
- **Non-Functional Requirements** — Performance, security, usability constraints
- **Data Requirements** — New entities, validation rules
- **Acceptance Criteria** — Measurable conditions that define "done"
- **Out of Scope** — What this feature will NOT do

**Quality Standard:** Every requirement must be testable—measurable, observable, unambiguous.

### ResearchQuestions.md

**Purpose:** Research questions to guide spec research.

**Created by:** `paw-spec` skill

**Contents:**

- Questions about current system behavior
- Areas needing clarification for specification
- Optional external/context questions for user input

### SpecResearch.md

**Purpose:** Factual documentation of how the current system works.

**Created by:** `paw-spec-research` skill

**Contents:**

- Answers to questions from `ResearchQuestions.md`
- Current system behavior (conceptual, not code-level)
- Component interactions and data flows
- User-facing workflows and business rules

**Key Distinction:** Behavioral view for specification writing, not implementation details.

### CodeResearch.md

**Purpose:** Technical mapping of where and how relevant code works.

**Created by:** `paw-code-research` skill

**Contents:**

- File paths and code locations
- Patterns and conventions
- Integration points and dependencies
- Architecture documentation references

**Key Distinction:** Implementation view for planning with specific file paths.

### ImplementationPlan.md

**Purpose:** Detailed plan with discrete phases that can be reviewed and merged independently.

**Created by:** `paw-planning` skill

**Contents:**

- **Overview** — What the plan accomplishes
- **Current State Analysis** — Relevant findings from research
- **Phase Status** — Checkbox list of all phases with objectives
- **Phase Candidates** — Lightweight capture of potential phases (see below)
- **Phase Details** — For each phase:
    - Changes required (files, components)
    - Success criteria (automated and manual)
    - Implementation notes (after completion)

**Checkboxes:** Implementer marks items complete as work progresses.

**Phase Candidates Section:**

During implementation, new work ideas may surface. Instead of interrupting to define a full phase, the agent captures a one-liner in this section:

```markdown
## Phase Candidates

- [ ] Refactor X to use new pattern
- [ ] Add caching for frequently accessed data
```

When all planned phases complete, `paw-transition` detects unresolved candidates and the orchestrator presents each for user decision:

| Decision | Result |
|----------|--------|
| **Promote** | Candidate elaborated into full phase via code research + planning |
| **Skip** | Marked `- [x] [skipped]`, excluded from future checks |
| **Defer** | Marked `- [x] [deferred]`, excluded from future checks |

This decouples intent capture from phase elaboration, preserving implementer momentum while ensuring ideas aren't lost.

### Docs.md

**Purpose:** Authoritative technical reference for the implemented work.

**Created by:** `paw-docs-guidance` skill (via `paw-impl-review`)

**Contents:**

- What was built and why
- Architecture and design decisions
- How to use and test the feature
- Integration points and dependencies

**Note:** Focuses on concepts and user-facing behavior, not code reproduction.

---

## Review Workflow Artifacts

### ReviewContext.md

**Purpose:** Authoritative parameter source for review workflow.

**Created by:** `paw-review-understanding` skill

**Contents:**

| Field | Description |
|-------|-------------|
| PR Number | GitHub PR number (or branch for non-GitHub) |
| Base/Head Branch | Before and after branches |
| Base/Head Commit | Specific commit SHAs |
| Changed Files | Count, additions, deletions |
| CI Status | Passing, failing, pending |
| Flags | CI failures, breaking changes suspected |

### ResearchQuestions.md

**Purpose:** Research questions to guide baseline codebase analysis.

**Created by:** `paw-review-understanding` skill

**Contents:**

- Questions about pre-change behavior
- Areas needing investigation for baseline understanding
- Specific patterns or behaviors to document

**Note:** This artifact replaces the previous `prompts/code-research.prompt.md` approach, simplifying the review artifact structure by storing research questions directly in the review directory.

### DerivedSpec.md

**Purpose:** Reverse-engineered specification inferred from implementation.

**Created by:** `paw-review-understanding` skill

**Contents:**

- **Intent Summary** — What problem this appears to solve
- **Scope** — What's in and out of scope
- **Assumptions** — Inferences from the code
- **Measurable Outcomes** — Before/after behavior
- **Changed Interfaces** — APIs, routes, schemas
- **Risks & Invariants** — Properties that must hold
- **Open Questions** — Ambiguities about intent

### ImpactAnalysis.md

**Purpose:** System-wide effects, integration analysis, and risk assessment.

**Created by:** `paw-review-impact` skill

**Contents:**

- **Integration Points** — Dependencies and downstream consumers
- **Breaking Changes** — API changes, incompatibilities
- **Performance Implications** — Hot paths, resource usage
- **Security Changes** — Auth, validation modifications
- **Design Assessment** — Architecture fit, timing appropriateness
- **User Impact** — End-user and developer-user effects
- **Risk Assessment** — Overall risk with rationale

### GapAnalysis.md

**Purpose:** Categorized findings with evidence and suggestions.

**Created by:** `paw-review-gap` skill

**Structure:**

```markdown
## Must
[Correctness, safety, security issues]

## Should
[Quality, testing, completeness gaps]

## Could
[Optional enhancements]

## Positive Observations
[Good practices to commend]
```

**Each finding includes:**

- File and line reference
- Description of issue
- Impact explanation
- Suggested fix

### ReviewComments.md

**Purpose:** Complete feedback with rationale and assessment.

**Created by:** `paw-review-feedback` skill, `paw-review-critic` skill

**For each comment:**

- **Comment text** — What gets posted
- **Rationale** — Evidence, baseline pattern, impact, best practice
- **Assessment** — Usefulness, accuracy, trade-offs (never posted)

---

## Best Practices

### Artifact Quality

- **Testable** — Requirements can be verified objectively
- **Complete** — All relevant information included
- **Clear** — Precise language without ambiguity
- **Scoped** — Explicit boundaries on what's included

### Version Control

- All artifacts committed to Git
- Changes tracked through PRs
- History preserved for traceability

### Rewindability

- Any artifact can be updated to fix errors
- Downstream artifacts regenerated as needed
- Clear chain of dependencies between artifacts
