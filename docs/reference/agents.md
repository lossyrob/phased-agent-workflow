# PAW Agents Reference

PAW uses specialized AI chat modes ("agents") to handle different stages of the workflow. Each agent has a specific purpose and produces defined outputs.

## Agent Naming Convention

Agents follow the `PAW-XX` naming scheme:

- **PAW-01x** — Specification stage agents
- **PAW-02x** — Planning stage agents
- **PAW-03x** — Implementation stage agents
- **PAW-04** — Documentation agent
- **PAW-05** — PR agent
- **PAW-Rx** — Review workflow agents
- **PAW-Mx** — Cross-repository workflow agents
- **PAW-X** — Utility agents

---

## Implementation Workflow Agents

### PAW-01A Specification

**Purpose:** Turn an issue or brief into a testable specification.

**Produces:**

- `Spec.md` — Testable requirements document
- `prompts/spec-research.prompt.md` — Research questions

**Focus:** What the feature must do (requirements, acceptance criteria). Avoids implementation details.

### PAW-01B Spec Researcher

**Purpose:** Answer factual questions about the current system.

**Produces:**

- `SpecResearch.md` — Factual documentation of current system behavior

**Focus:** Behavioral documentation at a conceptual level (no file paths).

### PAW-02A Code Researcher

**Purpose:** Map where and how relevant code works today.

**Produces:**

- `CodeResearch.md` — Technical mapping with file paths and patterns

**Focus:** Implementation details for planning.

### PAW-02B Impl Planner

**Purpose:** Create detailed implementation plans through interactive iteration.

**Produces:**

- `ImplementationPlan.md` — Detailed plan with discrete phases

**Opens:** Planning PR (`<target>_plan` → `<target>`)

### PAW-03A Implementer

**Purpose:** Execute plan phases and address review comments.

**Actions:**

- Creates phase branches
- Makes code changes
- Runs automated checks
- Commits locally (does not push)

**Focus:** Forward momentum—making code work.

### PAW-03B Impl Reviewer

**Purpose:** Review changes, add documentation, open PRs.

**Actions:**

- Reviews Implementation Agent's changes
- Generates docstrings and code comments
- Pushes branches and opens PRs
- Replies to PR review comments

**Opens:** Phase PRs (`<target>_phase<N>` → `<target>`)

**Focus:** Quality gate—making code reviewable.

### PAW-04 Documenter

**Purpose:** Produce comprehensive technical documentation.

**Produces:**

- `Docs.md` — Authoritative technical reference

**Opens:** Docs PR (`<target>_docs` → `<target>`)

### PAW-05 PR

**Purpose:** Open the final PR with comprehensive description.

**Actions:**

- Verifies all prerequisites
- Crafts PR description with links to artifacts
- Opens final PR

**Opens:** Final PR (`<target>` → `main`)

### PAW-X Status

**Purpose:** Maintain issues and PRs, keeping links and checklists up to date.

**Actions:**

- Updates issue status and links
- Maintains checklists across workflow stages
- Provides workflow status and next-step guidance

---

## Review Workflow Agents

### PAW-R1A Understanding

**Purpose:** Analyze PR changes and derive specification from implementation.

**Produces:**

- `ReviewContext.md` — PR metadata and parameters
- `prompts/code-research.prompt.md` — Baseline research questions
- `DerivedSpec.md` — Reverse-engineered specification

### PAW-R1B Baseline Researcher

**Purpose:** Document how the system worked before changes.

**Produces:**

- `CodeResearch.md` — Pre-change baseline understanding

**Focus:** Analyzes codebase at base commit (pre-change state).

### PAW-R2A Impact Analyzer

**Purpose:** Identify integration points, breaking changes, and system-wide effects.

**Produces:**

- `ImpactAnalysis.md` — System-wide effects and risk assessment

### PAW-R2B Gap Analyzer

**Purpose:** Systematically identify issues across quality dimensions.

**Produces:**

- `GapAnalysis.md` — Findings with Must/Should/Could categorization

**Categories:**

- Correctness, Safety & Security, Testing
- Maintainability, Performance, Complexity
- Positive Observations

### PAW-R3A Feedback Generator

**Purpose:** Transform findings into structured review comments.

**Produces:**

- `ReviewComments.md` — Complete feedback with rationale
- GitHub pending review (GitHub context)

### PAW-R3B Feedback Critic

**Purpose:** Critically assess generated comments for quality.

**Adds:**

- Assessment sections to ReviewComments.md
- Usefulness, accuracy, and trade-off analysis

**Note:** Assessments are never posted—for reviewer reference only.

---

## Cross-Repository Workflow Agents

Cross-repository agents coordinate multi-repo work and produce coordinator artifacts under `.paw/multi-work/<work-id>/`.

### PAW-M01A Cross-Repo Spec

**Purpose:** Draft a cross-repository feature spec spanning multiple repositories.

**Produces:**

- `CrossRepoSpec.md` — Cross-repo requirements and success criteria
- `prompts/M01B-cross-repo-spec-research.prompt.md` — Research questions (when needed)

### PAW-M01B Cross-Repo Spec Researcher

**Purpose:** Answer factual questions about current behavior across repositories.

**Produces:**

- `CrossRepoSpecResearch.md` — Cross-repo research findings

### PAW-M02A Cross-Repo Code Researcher

**Purpose:** Map relevant code, file locations, and integration points across repositories.

**Produces:**

- `CrossRepoCodeResearch.md` — Cross-repo technical mapping

### PAW-M02B Cross-Repo Impl Planner

**Purpose:** Sequence work across repositories and provide child workflow initialization guidance.

**Produces:**

- `CrossRepoPlan.md` — Cross-repo execution plan, per-repo context excerpts, merge order, testing strategy

### PAW-M03 Cross-Repo Validator

**Purpose:** Validate cross-repository consistency and provide integration test guidance.

**Produces:**

- `ValidationReport.md` — Cross-repo validation report

---

## Agent Invocation

### Using Commands

In chat, use short commands to invoke agents:

| Command | Agent |
|---------|-------|
| `spec` | PAW-01A Specification |
| `research` | PAW-01B or PAW-02A (context-dependent) |
| `plan` | PAW-02B Impl Planner |
| `implement` | PAW-03A Implementer |
| `review` | PAW-03B Impl Reviewer |
| `docs` | PAW-04 Documenter |
| `pr` | PAW-05 PR |
| `status` | PAW-X Status |

### Handoff Modes

PAW supports three handoff modes that control stage transitions:

| Mode | Behavior |
|------|----------|
| **Manual** | Always wait for user command |
| **Semi-Auto** | Auto-proceed at routine transitions |
| **Auto** | Always auto-proceed to next stage |

## Next Steps

- [Artifacts Reference](artifacts.md) — Artifact descriptions
- [Implementation Workflow](../specification/implementation.md) — How agents work together
- [Review Workflow](../specification/review.md) — Review workflow agents in action
