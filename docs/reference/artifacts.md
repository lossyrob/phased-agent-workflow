# PAW Artifacts Reference

PAW workflows write durable Markdown artifacts that record what was decided and why. `WorkflowContext.md` holds configuration only; progress lives in the host's todo graph and in git. How artifacts are tracked in git depends on the [artifact lifecycle](../guide/workflow-presets.md#artifact-lifecycle).

## Directory Structure

```
.paw/
  work/                         # Implementation workflow
    <work-id>/
      WorkflowContext.md        # Always: configuration
      WorkShaping.md            # When shaping runs
      Spec.md                   # When spec: on
      CodeResearch.md           # When research: dedicated
      ImplementationPlan.md     # Always: the plan
      ImplementationPlan-<model>.md  # Per-model drafts, with two or more planning.models
      Docs.md                   # Only when the plan calls for it
      reviews/                  # Review output; never committed
        planning/               # Plan review
        <unit>/                 # Phase review, per unit
        REVIEW*.md              # Final review

  reviews/                      # PAW Review
    PR-<number>/                # Single-repo: PR-123
    PR-<number>-<repo-slug>/    # Multi-repo: PR-123-my-repo
    <branch-slug>/              # Local branch review
      ReviewContext.md          # Review parameters and preflight
      ResearchQuestions.md      # Questions for baseline research
      CodeResearch.md           # Pre-change baseline
      DerivedSpec.md            # Reverse-engineered spec
      ImpactAnalysis.md         # Impact analysis (single-model mode)
      GapAnalysis.md            # Gap analysis (single-model mode)
      REVIEW-{SPECIALIST}.md    # Per-specialist findings (SoT mode, no perspectives)
      REVIEW-{SPECIALIST}-{PERSPECTIVE}.md  # Per-specialist-perspective findings (SoT with perspectives)
      REVIEW-SYNTHESIS.md       # Synthesized findings (SoT mode)
      CrossRepoAnalysis.md      # Multi-repo only, in the primary PR's directory
      ReviewComments.md         # Review comments
```

---

## Implementation Workflow Artifacts

### WorkflowContext.md

**Purpose:** The work item's configuration, written once at setup. It never records progress.

**Format:**

~~~markdown
# WorkflowContext

- Work title: <title>
- Work id: <work-id>
- Task source: <issue link or "prompt">
- Base branch: <branch>
- Target branch: <branch>
- Preset: <name>

## Configuration

```yaml
<every configuration field with its resolved value; review blocks in full>
```
~~~

The fields are listed in [Configuration and Presets](../guide/workflow-presets.md#fields). The worktree path is not recorded; in worktree mode PAW finds it with `git worktree list`.

A file without a `## Configuration` block was written by PAW v1. PAW converts it once when you resume the work item; see [Migrating from v1](../guide/migration.md#in-flight-v1-work-items).

### WorkShaping.md

**Purpose:** The outcome of an interactive shaping session for a vague task: intent, scope and constraints you confirmed. Written by `paw-work-shaping` in the host session.

### Spec.md

**Purpose:** Testable requirements, written by the specify activity when `spec: on`.

**Contents:** Overview; requirements (`FR-001`…); acceptance criteria (`AC-001`…) traced to requirements; edge cases; assumptions; out of scope. It describes behaviour, not implementation.

### CodeResearch.md

**Purpose:** How the code the task touches works today, written by the research activity when `research: dedicated`.

**Contents:** Summary; findings by area, each with a `file:line` reference; tests; the project's build, lint, test and docs commands. It documents what exists and does not propose changes. With `research: inline`, this research happens inside planning and no file is written.

### ImplementationPlan.md

**Purpose:** The plan the implement subagents follow. It records decisions, not progress.

**Contents:**

- **Summary** and **Sources**
- **Findings** — facts the plan rests on, with `file:line` references
- **Decisions** — choices made and why
- **Units** — for each unit: dependencies, changes, tests, and "done when" criteria with the commands that prove them. With `Spec.md`, each unit names the requirements it delivers
- **Out of scope**

The host adds one `implement:<unit>` todo per unit. A unit is accepted when every deliverable it names exists in the repository and its validation passes. Related work noticed during implementation becomes a candidate todo; if it is deferred, the reason is recorded in the plan.

v1 work items may have `ImplementationPlan.md` with `## Phase N:` sections, or `Plan.md` from v1 PAW Lite. PAW uses them as they are.

### Docs.md

**Purpose:** A technical reference for the implemented work, written only when the plan calls for it (`paw-docs-guidance` gives its conventions).

### Review Output

Each configured review writes to its output directory:

| Review | Directory | Files |
|--------|-----------|-------|
| Plan review | `reviews/planning/` | Per [provider](../guide/workflow-presets.md#review-providers) |
| Phase review | `reviews/<unit>/` | `REVIEW.md` |
| Final review | `reviews/` | Per provider |

Provider files: `single-model` → `REVIEW.md`; `multi-model` → `REVIEW-<model>.md` per model and `REVIEW-SYNTHESIS.md`; `society-of-thought` → `REVIEW-<specialist>*.md` per specialist and `REVIEW-SYNTHESIS.md`; a recheck after fixes → `REVIEW-RECHECK.md`. Each finding has a severity (`must-fix`, `should-fix`, `consider`), a location and a proposed fix.

`reviews/.gitignore` contains `*`, so review output stays local in every lifecycle.

### REVIEW-SYNTHESIS.md (society-of-thought)

**Created by:** `paw-sot`, in both workflows.

**Contents:**

- **Review metadata** — Mode, participating specialists/models, selection rationale, perspectives applied
- **Perspective Diversity** — Which perspectives were applied to which specialists, and why (when perspectives are active)
- **Prioritized findings** — Must-fix, should-fix, consider classifications with specialist and perspective attribution
- **Confidence levels** — HIGH, MEDIUM, LOW per finding with supporting evidence
- **Disagreement resolution** — How conflicting specialist findings were reconciled
- **Grounding status** — Flags for findings referencing code not in the diff

When perspectives are active, each finding includes a `**Perspective**` field (`baseline` for findings without an overlay).

---

## Review Workflow Artifacts

### ReviewContext.md

**Purpose:** Authoritative parameter source for the review.

**Created by:** `paw-review-understanding` skill

**Contents:**

- Target: PR number or branch, platform (`github`, `azure-devops`, `local`), repository, base and head branches and commits
- PR metadata: author, title, state, CI status, labels, linked issues, changed-file counts
- Authorization preflight: output capability, requested action, feedback scope, authorization, event, authorized target and head, pending review binding, `Preflight Status`
- Review configuration: the provider block (`mode`, `models`, `specialists`, `interaction`, `perspectives`, `perspective_cap`) and `interactive`
- Flags: CI failures, breaking changes suspected

### ResearchQuestions.md

**Purpose:** Research questions to guide baseline codebase analysis.

**Created by:** `paw-review-understanding` skill

**Contents:**

- Questions about pre-change behavior
- Areas needing investigation for baseline understanding
- Specific patterns or behaviors to document

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

**Purpose:** System-wide effects, integration analysis, and risk assessment (single-model mode only; replaced by specialist evaluation in society-of-thought mode).

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

**Purpose:** Categorized findings with evidence and suggestions (single-model mode only; replaced by specialist evaluation in society-of-thought mode).

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

**Status:** `draft`, then `finalized`; after posting it records the pending (or submitted) review ID.

**For each comment:**

- **Comment text** — What gets posted
- **Rationale** — Evidence, baseline pattern, impact, best practice
- **Assessment** — Usefulness, accuracy, trade-offs (never posted)
- **Final** — Ready for posting, or skipped per critique

---

## Best Practices

### Artifact Quality

- **Testable** — Requirements can be verified objectively
- **Complete** — All relevant information included
- **Clear** — Precise language without ambiguity
- **Scoped** — Explicit boundaries on what's included

### Version Control

- Artifacts are committed on the target branch unless the lifecycle is `never-commit`
- `.gitignore` files under `.paw/work/<work-id>/` are local markers and are never committed
- With `commit-and-clean`, the final PR shows no `.paw/` changes and links to the artifacts at the last commit that had them

### Changing Accepted Artifacts

- A change to an accepted spec, plan or unit is a [rewind](../guide/two-workflows.md#rewind): PAW previews what it will reopen and adds new commits; history is never rewritten
