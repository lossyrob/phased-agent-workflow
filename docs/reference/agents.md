# PAW Agents Reference

PAW uses specialized AI chat modes ("agents") to handle different stages of the workflow. Each agent has a specific purpose and produces defined outputs.

## Agent Naming Convention

Agents follow the `PAW-XX` naming scheme:

- **PAW-01x** — Specification stage agents
- **PAW-02x** — Planning stage agents
- **PAW-03x** — Implementation stage agents
- **PAW-04** — Documentation agent
- **PAW-05** — PR agent
- **PAW Review** — Review workflow agent (skills-based)
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

## Review Workflow

### PAW Review

**Purpose:** Execute the complete PAW Review workflow using dynamically loaded skills.

**Invocation:** `/paw-review <PR-number-or-URL>`

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
| `paw-review-feedback` | Activity | Output | ReviewComments.md, GitHub pending review |
| `paw-review-critic` | Activity | Output | Assessment sections in ReviewComments.md |

**Workflow Stages:**

1. **Understanding Stage**
   - Analyzes PR changes and creates ReviewContext.md
   - Researches pre-change baseline at base commit
   - Derives specification from implementation

2. **Evaluation Stage**
   - Identifies system-wide impacts and breaking changes
   - Finds gaps across correctness, safety, testing, and quality
   - Categorizes findings as Must/Should/Could

3. **Output Stage**
   - Generates structured review comments with rationale
   - Creates GitHub pending review (GitHub context)
   - Adds critical assessment sections for reviewer reference

**Human Control:** Pending review is never auto-submitted. User reviews comments, edits/deletes as needed, then submits manually.

**Note:** The six PAW-R* agents (R1A, R1B, R2A, R2B, R3A, R3B) have been replaced by this unified skills-based workflow.

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
- [Review Workflow](../specification/review.md) — Skills-based review workflow
