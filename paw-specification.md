## Overview

**Phased Agent Workflow (PAW)** enables **Context-Driven Development**—a practice where AI agents build understanding through structured research and planning phases before writing code. Each phase produces durable artifacts that accumulate context and feed the next phase.

PAW separates the lifecycle into **workflow stages** (Specification → Planning → Implementation → Finalization) and, inside the Implementation stage, **implementation phases** (Phase 1…N) that ship incremental, reviewable PRs.

**Key properties**

* **Traceable** – Every stage produces durable Markdown artifacts committed to Git and reviewed via PRs.
* **Rewindable** – Any stage can restart. If you see the agents are implementing incorrectly, you can always go back to the spec or plan and fix it, and then re-run downstream stages.
* **Agentic** – Purpose‑built chat modes (“agents”) own the work of each stage.
* **Human‑in‑the‑loop** – Humans approve specs/plans, review PRs, and decide when to rewind.
* **Consistent surfaces** – Issues and PRs stay in sync via a lightweight Status agent.

> **Terminology note:** In PAW, **Stages** refer to workflow milestones (e.g., Specification Stage). Within the **Implementation Stage**, work is split into **Implementation Phases** (Phase 1, Phase 2, …) to keep PRs small and reviewable.
> *PAW is staged, and its implementation is phased.*

---

## Workflow Modes

PAW supports three workflow modes that determine which stages are included and how work is reviewed. Select the appropriate mode during workflow initialization to match your task scope and development style.

### Full Mode

**Stages Included**: Spec → Spec Research → Code Research → Implementation Plan → Planning Docs Review (if enabled) → Implementation (including Documentation phase) → Final Review (if enabled) → Final PR → Status

**Description**: The complete PAW workflow with all stages from initial specification through comprehensive documentation. The Documentation phase is the final implementation phase. Final Agent Review runs after all implementation phases (including docs) to catch issues before the Final PR.

**Best for**:
- Large features requiring comprehensive documentation
- Complex system changes needing formal specifications
- New features where requirements need to be refined through the spec process
- Work that benefits from detailed technical documentation for future maintainers
- Projects where complete traceability and documentation are organizational requirements

**Review Strategies**:
- **PRs strategy**: Creates intermediate PRs (planning, phase, docs branches) for review at multiple stages. Best for complex work requiring review checkpoints throughout development.
- **Local strategy**: Single branch workflow with all work on the target branch, only creating the final PR. Best when you prefer consolidated review but still want all stages executed.

### Minimal Mode

**Stages Included**: Code Research → Implementation Plan → Implementation (including Documentation phase) → Final Review (if enabled) → Final PR → Status

**Stages Skipped**: Specification stage

**Description**: A streamlined workflow focusing on core implementation activities. Assumes requirements are already clear (e.g., from a well-defined bug report or simple enhancement request).

**Best for**:
- Bug fixes with clear requirements from issue description
- Small features or enhancements where the goal is well-understood
- Refactoring work where objectives and approach are already clear
- Quick iterations when formal specs and comprehensive docs aren't needed
- Work where existing project documentation is sufficient

**Review Strategy**: Enforces **local strategy** (single branch workflow) to simplify the process. No intermediate planning, phase, or docs branches or PRs—all work happens on the target branch with only a final PR created.

**Quality Assurance**: Even though specification and documentation stages are skipped, all quality gates (tests, linting, type checking, build verification) remain mandatory. The implementation plan still includes detailed success criteria and phase breakdown for reviewable work.

### Custom Mode

**Stages Included**: User-defined based on custom instructions provided during initialization

**Description**: A flexible workflow mode where you define which stages to include and how work should be reviewed. The agents interpret your custom instructions to determine the appropriate workflow structure.

**Best for**:
- Unique workflows that don't fit full or minimal patterns
- Experimenting with different workflow configurations
- Project-specific requirements that need non-standard stage combinations
- Workflows where you want some but not all optional stages (e.g., spec without docs, or docs without spec)

**Review Strategies**: Supports both **prs** and **local** strategies based on your instructions. You can specify the review approach as part of your custom instructions.

**Usage**: When selecting custom mode during initialization, you'll be prompted to provide custom instructions describing:
- Which stages to include or exclude
- The review strategy (prs or local)
- Any specific phase structure or branching requirements
- Any other workflow-specific guidance

**Example Custom Instructions**:
- "Skip specification stage, include documentation, use prs review strategy"
- "Include code research and implementation only, single branch workflow"
- "Full stages but combine all implementation phases into one, use local strategy"

### Review Strategies

PAW supports two review strategies that determine how work is reviewed and integrated:

#### PRs Strategy (Intermediate Pull Requests)

**Branch Structure**:
- Planning branch: `<target>_plan` → Planning PR to target branch
- Phase branches: `<target>_phase[N]` → Phase PRs to target branch (one per implementation phase)
- Docs branch: `<target>_docs` → Docs PR to target branch
- Final PR: target branch → base branch (usually `main`)

**Workflow**:
1. Planning stage work committed to planning branch, Planning PR opened for review
2. Once Planning PR approved and merged, implementation begins
3. Each implementation phase developed on dedicated phase branch with Phase PR
4. Phase PRs reviewed, approved, and merged sequentially
5. Documentation work committed to docs branch, Docs PR opened for review
6. Once Docs PR approved and merged, Final PR created from target to base branch

**Best for**:
- Complex work requiring review at multiple stages
- Large features where incremental review reduces cognitive load
- Teams with multiple reviewers who can review different phases
- Work where early feedback on planning or individual phases is valuable
- Projects where intermediate review checkpoints improve quality

**Trade-offs**:
- More PR overhead (planning, phases, docs, final)
- Longer time from start to merge (multiple review cycles)
- Better quality assurance through staged review
- Easier to rewind and fix issues at specific stages

#### Local Strategy (Single Branch)

**Branch Structure**:
- All work committed directly to target branch
- Final PR: target branch → base branch (usually `main`)

**Workflow**:
1. All stages executed with commits made directly to target branch
2. No intermediate planning, phase, or docs branches or PRs
3. All work reviewed together in the final PR
4. Final PR reviewed, approved, and merged

**Best for**:
- Simpler work where consolidated review is preferred
- Solo developers or small teams with streamlined review processes
- Work where you want to complete all stages but prefer single review point
- Bug fixes or small enhancements (especially with minimal mode)
- Projects where PR overhead should be minimized

**Trade-offs**:
- Less PR overhead (only final PR)
- Faster path to merge (single review cycle)
- Larger final PR to review (all stages combined)
- Harder to rewind to specific stages (requires git operations on target branch)

### Workflow Mode Selection

When using the VS Code extension's `PAW: New PAW Workflow` command, you'll be prompted to:

1. **Select workflow mode** (Full, Minimal, or Custom)
2. **Select review strategy** (PRs or Local) - automatically set to Local for Minimal mode
3. **Provide custom instructions** (if Custom mode selected) - describe which stages to include and review approach

Your selections are stored in `WorkflowContext.md` and guide all agents throughout the workflow. All agents read the workflow mode and review strategy at startup and adapt their behavior accordingly.

### Quality Gates

**IMPORTANT**: Quality gates (tests, linting, type checking, build verification) remain mandatory regardless of workflow mode or review strategy. Skipping stages or choosing local strategy streamlines the process but never compromises code quality.

All automated verification criteria in implementation plans must pass before work can proceed, regardless of which workflow mode is selected.

### Defaults

When `Workflow Mode` and `Review Strategy` fields are missing from WorkflowContext.md, agents use the following defaults:
- **Workflow Mode**: `full` (all stages included)
- **Review Strategy**: `prs` (intermediate pull requests)

Agents will log an informational message when using default values to indicate that these fields were not explicitly specified.

---

## Repository Layout & Naming

```
agents/                         # orchestrator agent prompts (2 agents)
  PAW.agent.md                  # Implementation workflow orchestrator
  PAW Review.agent.md           # Review workflow orchestrator

skills/                         # activity and utility skills (29 skills)
  paw-spec/SKILL.md
  paw-spec-research/SKILL.md
  paw-planning/SKILL.md
  paw-implement/SKILL.md
  ... (see skills/ directory for full list)

.paw/work/                      # artifacts created by the PAW process
  <work-id>/                    # e.g., add-authentication or bugfix-rate-limit
    WorkflowContext.md          # Centralized parameter file (required)
    ResearchQuestions.md        # Research questions for spec research
    Spec.md    
    SpecResearch.md
    CodeResearch.md
    ImplementationPlan.md
    Docs.md

.paw/reviews/                   # artifacts created by review workflow
  PR-<number>/                  # or PR-<number>-<repo-slug> for multi-repo
    ReviewContext.md
    ResearchQuestions.md
    CodeResearch.md
    DerivedSpec.md
    ImpactAnalysis.md
    GapAnalysis.md
    ReviewComments.md
```

**Work ID**: Normalized, filesystem-safe identifier (also called a "slug" or "feature slug" internally) for workflow artifacts (e.g., "auth-system", "api-refactor-v2"). 
Auto-generated from Work Title or issue title when not explicitly provided. Remains consistent across branch renames.

**Branching Conventions**

* **Target Branch**: The branch that will hold all completed work. Use your project's naming conventions. E.g. `feature/<slug>` or `user/rde/<slug>`.
* **Planning branch**: `<target_branch>_plan` → used if you prefer a planning PR
* **Implementation phase branches**: `<target_branch>_phase<N>` (or `_phase<M-N>` for ranges)
  * Example for a single phase: `feature/auth_phase1`
  * Example for combining phases 2 and 3: `feature/auth_phase2-3`

**PR Conventions**

* **Planning PR**: `<target_branch>_plan` → `<target_branch>`
* **Phase PRs**: `<target_branch>_phase<N>` → `<target_branch>` (or `<target_branch>_phase<M-N>` → `<target_branch>` for ranges)
* **Docs PR**: `<target_branch>_docs` → `<target_branch>`
* **Final PR**: `<target_branch>` → `main`

## Architecture

PAW uses a **2-agent + skills** architecture:

- **PAW Agent** (`agents/PAW.agent.md`): Orchestrates implementation workflows
- **PAW Review Agent** (`agents/PAW Review.agent.md`): Orchestrates review workflows
- **29 Skills** (`skills/*/SKILL.md`): Specialized capabilities loaded dynamically

### Hybrid Execution Model

The orchestrator agents use a hybrid execution model:
- **Direct execution**: Interactive activities run in the main session (spec, planning, implement)
- **Subagent delegation**: Research and review activities run in isolated subagent sessions

This preserves user collaboration for interactive work while leveraging context isolation for focused research.

### Activity Skills

| Skill | Purpose | Primary Artifacts |
|-------|---------|-------------------|
| `paw-init` | Bootstrap workflow, create WorkflowContext.md | WorkflowContext.md |
| `paw-spec` | Create testable specifications | Spec.md, ResearchQuestions.md |
| `paw-spec-research` | Answer factual questions about existing system | SpecResearch.md |
| `paw-spec-review` | Validate spec quality and completeness | Structured feedback |
| `paw-code-research` | Map relevant code with file:line references | CodeResearch.md |
| `paw-planning` | Create phased implementation plans | ImplementationPlan.md |
| `paw-plan-review` | Validate plan feasibility | Structured feedback |
| `paw-planning-docs-review` | Holistic review of planning artifacts bundle | REVIEW*.md in reviews/planning/ |
| `paw-implement` | Execute plan phases, make code changes | Code changes |
| `paw-impl-review` | Review implementation, open PRs | Phase PRs, Docs.md |
| `paw-pr` | Pre-flight validation, create final PR | Final PR |
| `paw-status` | Diagnose workflow state | Status reports |
| `paw-work-shaping` | Pre-spec ideation and clarification | WorkShaping.md |
| `paw-rewind` | Roll back to earlier workflow state | Restored artifacts |
| `paw-transition` | Handle stage boundaries and policies | Transition decisions |

### Utility Skills

| Skill | Purpose |
|-------|---------|
| `paw-git-operations` | Branch naming, selective staging |
| `paw-review-response` | PR comment mechanics |
| `paw-docs-guidance` | Documentation templates |
| `paw-workflow` | Workflow reference documentation |

### Review Workflow Skills

| Skill | Purpose |
|-------|---------|
| `paw-review-workflow` | Orchestrate review stages |
| `paw-review-understanding` | Analyze PR, create ReviewContext.md |
| `paw-review-baseline` | Research pre-change codebase |
| `paw-review-impact` | Assess system-wide effects |
| `paw-review-gap` | Find correctness/safety/quality gaps |
| `paw-review-correlation` | Cross-repo analysis (multi-repo) |
| `paw-review-feedback` | Generate review comments |
| `paw-review-critic` | Assess comment quality |
| `paw-review-github` | Post pending review to GitHub |

## Stages

Below describes each **Stage** of the PAW process, including skills involved, inputs, outputs, and workflow.

### Prerequisites

**Inputs:**

* Issue or work item (if available), or a brief describing the goals of the work
* A clean branch to track work (e.g., `feature/paw-prompts` or `user/rde/bugfix-123`)

**Skills:** `paw-init`

The PAW agent bootstraps the workflow by creating `WorkflowContext.md` with all parameters (work ID, target branch, workflow mode, review strategy, review policy). For the PRs strategy, the planning branch (`<target_branch>_plan`) is also created.

---

### Stage 01 — Specification

**Skills:** `paw-spec`, `paw-spec-research`, `paw-spec-review`

**Inputs:**

* Issue URL or brief describing the work
* Target branch name
* Design documents or additional context (optional)

**Outputs:**

* `.paw/work/<work-id>/Spec.md` — Testable requirements document
* `.paw/work/<work-id>/ResearchQuestions.md` — Research questions for fact-finding
* `.paw/work/<work-id>/SpecResearch.md` — Factual documentation of current system behavior

**Workflow:**

1. `paw-spec` drafts requirements from the issue/brief, focusing on what the feature must do (not how)
2. `paw-spec` generates `ResearchQuestions.md` with factual questions about the current system
3. `paw-spec-research` answers the questions and produces `SpecResearch.md` (behavioral, not code-level)
4. Iterate with `paw-spec` to refine the spec based on research findings
5. `paw-spec-review` validates spec quality and completeness **(mandatory)**

The specification focuses on functional/non-functional requirements, acceptance criteria, and measurable success conditions. It avoids implementation details.

---

### Stage 02 — Planning

**Skills:** `paw-code-research`, `paw-planning`, `paw-plan-review`, `paw-planning-docs-review`

**Inputs:**

* `Spec.md` and `SpecResearch.md` from Stage 01
* Target branch name

**Outputs:**

* `.paw/work/<work-id>/CodeResearch.md` — Technical mapping of relevant code with file:line references
* `.paw/work/<work-id>/ImplementationPlan.md` — Detailed plan with discrete phases
* Planning PR (`<target_branch>_plan` → `<target_branch>`) — PRs strategy only

**Workflow:**

1. `paw-code-research` maps relevant code areas, dependencies, patterns, and documentation infrastructure
2. `paw-planning` creates a detailed plan broken into discrete implementation phases
3. Iterate collaboratively to refine the plan
4. `paw-plan-review` validates plan feasibility and spec alignment **(mandatory)**
5. `paw-planning-docs-review` reviews all planning artifacts as a holistic bundle **(if enabled)**
6. For PRs strategy: commit artifacts and open Planning PR for review

Each implementation phase in the plan is a discrete chunk of work that can be reviewed and merged independently.

---

### Stage 03 — Implementation

**Skills:** `paw-implement`, `paw-impl-review`, `paw-docs-guidance`

**Inputs:**

* `ImplementationPlan.md` from Stage 02
* `CodeResearch.md` for reference

**Outputs:**

* Code changes implementing each phase
* Phase PRs (`<target_branch>_phase<N>` → `<target_branch>`) — PRs strategy only
* `Docs.md` — Technical documentation (when plan includes documentation phase)

**Workflow:**

For each phase:

1. `paw-implement` creates phase branch (PRs strategy) and implements changes
2. `paw-implement` runs automated checks (tests, linting, type checking, build)
3. `paw-impl-review` reviews changes, adds documentation improvements, pushes and opens Phase PR
4. Developer reviews PR and provides feedback
5. `paw-implement` addresses review comments with focused commits
6. `paw-impl-review` verifies changes and pushes updates
7. Merge when approved, repeat for next phase

When the plan includes a documentation phase, `paw-implement` loads the `paw-docs-guidance` utility skill, creates `Docs.md`, and updates project documentation per project conventions.

---

### Stage 04 — Finalization

**Skills:** `paw-final-review` (optional), `paw-pr`

**Inputs:**

* All artifacts from previous stages
* All merged PRs (planning, phases) — PRs strategy

**Outputs:**

* Final PR (`<target_branch>` → `main`)

**Workflow:**

1. `paw-final-review` reviews the full implementation diff against spec (if review enabled)
2. `paw-pr` verifies all prerequisites are complete (merged PRs, artifacts, open questions)
3. `paw-pr` crafts comprehensive PR description with decision audit trail
4. `paw-pr` opens the final PR
5. Address any review comments using `paw-implement` → `paw-impl-review` cycle
6. Merge when approved

## Artifacts

### Spec.md

The **Specification** is a testable requirements document that defines **what** the feature must do without prescribing **how** to implement it. Created through an interactive process between the Spec Agent and the developer, it serves as the authoritative definition of success for the entire workflow.

**Purpose:** Establish clear, measurable requirements that any agent or human reviewer can use to verify whether an implementation is complete and correct, without guessing or interpreting intent.

**Location:** `/.paw/work/<feature-slug>/Spec.md`

**Dependencies:** Built from an issue/work item or project brief, refined through `SpecResearch.md` findings about the current system.

#### Core Principle: What, Not How

The Specification focuses exclusively on requirements and outcomes, avoiding implementation details:

**What it DOES include:**
- Functional requirements (what the feature must do)
- Non-functional requirements (performance, security, usability constraints)
- Data model changes and their business purpose
- User-facing behavior and interactions
- Acceptance criteria that are measurable or observable
- Edge cases and error handling requirements
- Integration points with existing systems (from a behavioral perspective)

**What it does NOT include:**
- Specific file paths or code locations
- Implementation strategies or technical approaches
- Architectural decisions or design patterns
- Database schema details or migration steps
- API endpoint definitions or routing logic

#### Structure & Content

The Specification follows a structured format designed for clarity and testability:

**Header**
- **Feature/Task Name**: Clear, descriptive title
- **Overview**: Brief summary of what the feature accomplishes and why it's needed
- **Context**: Background information, related work, or broader project goals

**Requirements**

**Functional Requirements**
- Numbered list of specific capabilities the feature must provide
- Written as observable behaviors: "The system shall/must..."
- Each requirement is atomic and independently verifiable

**Non-Functional Requirements**
- Performance constraints (response times, throughput, scalability)
- Security requirements (authentication, authorization, data protection)
- Usability requirements (accessibility, user experience)
- Compatibility requirements (browsers, platforms, versions)

**Data Requirements**
- New data entities or attributes needed
- Business rules governing data (validation, relationships, lifecycle)
- Data migration or transformation needs (conceptual, not technical)

**User Experience**
- User workflows and interaction patterns
- Expected behavior in different scenarios
- Error messages and user feedback

**Acceptance Criteria**
- Specific, testable conditions that define "done"
- Written in Given/When/Then format or as verification steps
- Each criterion is independently verifiable
- Covers both happy paths and edge cases

**Example:**
```markdown
### Acceptance Criteria

1. **User Authentication**
   - Given a user with valid credentials
   - When they submit the login form
   - Then they are redirected to the dashboard within 2 seconds
   - And their session persists for 24 hours

2. **Invalid Credentials**
   - Given a user with invalid credentials
   - When they submit the login form
   - Then they see an error message "Invalid username or password"
   - And the form is cleared for retry
   - And no sensitive information is revealed
```

**Out of Scope**
- Explicit list of what this feature will NOT do
- Helps prevent scope creep and clarifies boundaries
- May reference future work or related features

**Open Questions**
- Questions about the current system that require investigation
- Tracked in `prompts/spec-research.prompt.md` for the Spec Research Agent
- This section should be empty in the final spec (all questions resolved)

#### Interactive Creation Process

The Spec Agent creates this document through collaborative iteration:

1. **Initial Draft**: Reads the issue/work item/brief and creates first-pass requirements
2. **Clarification**: Questions the developer about ambiguities, gaps, or unclear intent
3. **Research Prompting**: Generates `spec-research.prompt.md` with factual questions about the current system
4. **Research Integration**: Incorporates findings from `SpecResearch.md` to refine requirements
5. **Iteration**: Continues refining based on developer feedback until spec is clear, complete, and testable

The Spec Agent is skeptical and thorough, asking "what about..." and "why" questions to ensure nothing is overlooked.

#### Testability Standard

A critical quality of the Specification is **testability**—every requirement must be verifiable:

- **Measurable**: Uses specific metrics, thresholds, or observable outcomes
- **Observable**: Can be confirmed through testing, inspection, or demonstration
- **Unambiguous**: Has only one reasonable interpretation
- **Complete**: No unstated assumptions or hidden requirements

**Good Example:**
> "The search results must appear within 500ms for queries under 100 characters on datasets up to 1M records."

**Poor Example:**
> "The search should be fast and handle large datasets." (vague, unmeasurable)

#### Relationship to Other Artifacts

- **Spec.md → SpecResearch.md**: Drives factual research questions about current system
- **Spec.md → ImplementationPlan.md**: Defines the "what" that the plan translates into "how"
- **Spec.md → Phase PRs**: Every PR is validated against these acceptance criteria
- **Spec.md → Docs.md**: Documentation explains what was implemented and how it addresses requirements

#### Quality Standards

A well-formed Specification:
- **Is Testable**: Every requirement can be verified objectively
- **Is Complete**: Covers all functional, non-functional, and data requirements
- **Is Clear**: Uses precise language without ambiguity
- **Is Scoped**: Explicitly defines what is and isn't included
- **Is Independent**: Doesn't prescribe implementation approaches
- **Is Collaborative**: Reflects iterative refinement with developer input

### SpecResearch.md

The **Spec Research** document provides factual documentation of how the current system works today, answering specific questions needed to complete the specification. Created by the Spec Research Agent in response to `prompts/spec-research.prompt.md`, it serves as a behavioral and architectural reference without implementation details.

**Purpose:** Answer internal questions about current behavior, components, flows, data concepts, and constraints that the Spec Agent needs to write clear, complete, and accurate requirements. External/context questions are listed for optional manual completion only.

**Location:** `/.paw/work/<feature-slug>/SpecResearch.md`

**Dependencies:** Driven by questions in `prompts/spec-research.prompt.md` (generated by the Spec Agent and optionally refined by the developer). Optional external/context questions are copied into a manual section untouched.

#### Core Principle: Behavioral & Contextual Documentation (Internal + External), Not Implementation Details

The Spec Research document focuses on **what the system does** and **how it behaves** from a user or component perspective, not on code-level implementation:

**What it DOES include:**
- Current system behavior and capabilities (conceptual)
- Component responsibilities and interactions (behavioral description)
- Conceptual data flows (no code paths or schema dumps)
- API or interface behaviors (what they do, not how implemented)
- User-facing workflows & business rules (outcome focused)
- Configuration options and their effects (conceptual)

**What it does NOT include:**
- Specific file paths or line numbers
- Implementation details or code structure
- Database schema or migration details
- Internal function calls or code execution paths
- Technical architecture decisions
- Recommendations for improvements
- Root cause analysis of issues
- Prescriptive selection between external standards (it only cites; selection belongs in specification if required)

**Key Distinction from CodeResearch.md:**
- **SpecResearch.md**: Behavioral view for specification writing ("The authentication system requires email and password and returns a session token")
- **CodeResearch.md**: Implementation view for planning ("Authentication is implemented in `auth/handlers.go:45` using bcrypt for password hashing")

#### Structure & Content

Sections align to prompt internal questions. For each answered question include:
- **Question**
- **Answer** (concise factual behavior)
- **Evidence** (internal references or observation description)
- **Implications** (optional, how it informs spec wording)

At the end, include:
- **User-Provided External Knowledge (Manual Fill)**: Bullet list of any optional external/context questions from the prompt, unchecked and unanswered.
- **Open Unknowns**: Internal questions the agent could not answer (with rationale).

#### Prompting Process
1. Spec Agent generates prompt with internal + optional external/context questions.
2. Developer may refine.
3. Spec Research Agent answers internal questions only.
4. External/context questions are listed for manual fill; user optionally adds content to the SpecResearch.md file before re-running Spec Agent.

#### Research Methodology

The Spec Research Agent searches through and reads the codebase to answer questions:

- **Documentation Review**: Reading existing docs, READMEs, API documentation
- **Code Inspection**: Examining code to understand behavior (not implementation details)
- **Configuration Analysis**: Reviewing config files to understand options and defaults
- **Evidence Citation**: Always backing claims with concrete evidence

The agent focuses on **observable behavior** and **system contracts**, not internal implementation.

#### Relationship to Other Artifacts
- `spec-research.prompt.md → SpecResearch.md`: answers + section for external context
- `SpecResearch.md → Spec.md`: informs requirement drafting
- `Spec.md + SpecResearch.md → CodeResearch.md`: supply behavioral baseline

#### Quality Standards
A well-formed Spec Research document:
- **Is Factual**: Internal truths only; no speculation
- **Is Behavioral**: Describes observable outcomes
- **Is Complete**: Answers all internal questions or lists them as open unknowns + external context asks
- **Is Neutral**: No recommendations or design

### CodeResearch.md

The **Code Research** document provides comprehensive technical mapping of the codebase relevant to the feature or task. Created by the Code Research Agent, it serves as a factual reference documenting **where** components live and **how** they work today, without evaluation or recommendations.

**Purpose:** Create a technical map of the existing system that Implementation Plan Agent can use to design concrete implementation approaches with accurate file paths, patterns, and integration points.

**Location:** `/.paw/work/<feature-slug>/CodeResearch.md`

**Dependencies:** Built upon `Spec.md` and `SpecResearch.md` to focus research on implementation-relevant areas.

#### Core Principle: Documentation, Not Evaluation

**CRITICAL**: The Code Research document is purely descriptive. It documents what exists, where it exists, and how it works—nothing more.

**What it DOES include:**
- Exact file paths and line numbers for relevant code
- Current implementation details and data flows
- Existing patterns and architectural decisions
- Integration points and component interactions
- Test file locations and testing patterns
- Configuration and dependencies

**What it does NOT include:**
- Suggestions for improvements or changes
- Root cause analysis (unless explicitly requested for specification purposes)
- Critique of implementation quality
- Recommendations for refactoring
- Identification of bugs or problems
- Performance evaluations
- Security assessments

#### Structure & Content

The document follows a structured template with YAML frontmatter and organized findings:

**Frontmatter (YAML)**
```yaml
---
date: [ISO format with timezone]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
topic: "[Research topic/question]"
tags: [research, codebase, relevant-component-names]
status: complete
last_updated: [YYYY-MM-DD]
---
```

**Document Body**
- **Research Question**: The original query or area of investigation
- **Summary**: High-level overview of what was found, answering the research question factually
- **Detailed Findings**: Organized by component/area with:
  - Description of what exists with file:line references
  - How components connect to each other
  - Current implementation details (without evaluation)
- **Code References**: Bulleted list of key file paths with descriptions
- **Architecture Documentation**: Current patterns, conventions, and design implementations found
- **Open Questions**: Areas that need further investigation (if any)

#### Research Methodology

The Code Research Agent follows a systematic approach:

1. **Code Location**: Find WHERE files and components live
   - Search for files by topic/feature using relevant keywords
   - Identify directory patterns and naming conventions
   - Categorize findings (implementation, tests, config, docs, types)
   - Group files by purpose with full paths

2. **Code Analysis**: Understand HOW specific code works
   - Read files to understand logic and identify key functions
   - Trace data flow from entry to exit points
   - Map transformations, validations, and state changes
   - Document architectural patterns and integration points
   - Always include precise file:line references

3. **Code Pattern Finder**: Find examples of existing patterns
   - Locate similar implementations for reference
   - Extract reusable patterns and conventions
   - Provide concrete code examples with file:line references
   - Show multiple variations where they exist

#### GitHub Permalinks

When the commit is pushed or on the main branch, the document includes GitHub permalinks for permanent reference:
- Format: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`
- Ensures links remain valid even as code evolves
- **Note**: For private repositories, these links require authentication and will only be accessible to users with appropriate repository access.

#### Follow-up Research

If additional questions arise during planning, the document can be updated:
- Frontmatter updated with `last_updated` and `last_updated_note` fields
- New section added: `## Follow-up Research [timestamp]`
- Additional findings appended to maintain complete research history

#### Quality Standards

A well-formed Code Research document:
- **Is Factual**: Describes only what exists in the codebase today
- **Is Precise**: Includes exact file paths and line numbers for all claims
- **Is Comprehensive**: Covers all relevant components and their interactions
- **Is Organized**: Groups findings logically by component or area
- **Is Traceable**: Provides GitHub permalinks when available
- **Is Neutral**: Documents without critiquing or recommending changes

### ImplementationPlan.md

The **Implementation Plan** is a comprehensive technical specification that translates the high-level requirements from `Spec.md` into actionable, phased development work. Created through an interactive process between the Implementation Plan Agent and the developer, it serves as the definitive blueprint for the Implementation Stage.

**Purpose:** Bridge the gap between "what to build" (Spec) and "how to build it" (Implementation Phases), providing concrete technical guidance that Implementation Agents can execute without ambiguity.

**Location:** `/.paw/work/<feature-slug>/ImplementationPlan.md`

**Dependencies:** Links to and builds upon `Spec.md`, `SpecResearch.md`, and `CodeResearch.md`.

#### Structure & Content

The Implementation Plan follows a standardized template that ensures completeness and actionability:

**Header & Overview**
- **Feature/Task Name**: Clear title matching the specification
- **Overview**: 1-2 sentence summary of what's being implemented and why
- **Current State Analysis**: What exists now, what's missing, key constraints discovered from research
- **Desired End State**: Testable specification of the final state with verification criteria

**Scope Management**
- **Key Discoveries**: Important findings from code research with specific `file:line` references
- **Implementation Approach**: High-level strategy and technical reasoning
- **What We're NOT Doing**: Explicit out-of-scope items to prevent scope creep

**Implementation Phases**
Each phase represents a discrete, reviewable chunk of work that:
- Can be developed on a dedicated branch (`<target_branch>_phase<N>`)
- Produces a standalone Phase PR
- Has clear success criteria (both automated and manual)
- Builds incrementally toward the desired end state

**Phase Structure:**
````markdown
## Phase N: [Descriptive Name]

### Overview
[What this phase accomplishes and why it's sequenced here]

### Changes Required:

#### 1. [Component/File Group]
**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

```[language]
// Specific code to add/modify
```

### Success Criteria:

#### Automated Verification:
- [ ] Migration applies cleanly: `make migrate`
- [ ] Unit tests pass: `make test-component`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Linting passes: `make lint`

#### Manual Verification:
- [ ] Feature works as expected when tested via UI
- [ ] Performance is acceptable under load
- [ ] No regressions in related features

### Status

Unimplemented
````

**Supporting Sections**
- **Testing Strategy**: Unit, integration, and manual testing approaches
- **Performance Considerations**: Any performance implications or optimizations
- **Migration Notes**: How to handle existing data/systems during transitions
- **References**: Links back to source artifacts and similar implementations

#### Success Criteria Philosophy

The plan distinguishes between two types of verification:

1. **Automated Verification**: Commands and checks that Implementation Agents can run independently
   - Build commands, test suites, linting, type checking
   - Specific file existence or content validation
   - API endpoint testing with curl/scripts

2. **Manual Verification**: Human-judgment tasks that require interactive testing
   - UI/UX functionality and user experience
   - Performance under realistic load conditions
   - Edge case handling and error scenarios
   - Cross-browser or cross-platform compatibility

This separation enables Implementation Agents to validate their work automatically while clearly identifying what requires human review.

#### Interactive Creation Process

The Implementation Plan Agent creates this document through a collaborative, iterative process:

1. **Context Gathering**: Reads all prerequisite artifacts completely and performs additional code research
2. **Design Exploration**: Presents multiple technical approaches with trade-offs for human decision
3. **Structure Development**: Proposes phase breakdown and sequencing for validation
4. **Detailed Writing**: Authors the complete plan with specific file paths, code examples, and measurable criteria
5. **Refinement**: Iterates based on feedback until all open questions are resolved

**Critical Requirement**: The final plan must be complete and actionable with zero open questions. If uncertainties arise during planning, the agent pauses to research or request clarification rather than proceeding with ambiguity.

#### Quality Standards

A well-formed Implementation Plan:
- **Is Specific**: Includes exact file paths, function names, and code snippets
- **Is Testable**: Every change has clear, measurable success criteria
- **Is Incremental**: Phases build logically and can be reviewed independently
- **Is Complete**: No technical decisions are deferred or left ambiguous
- **Is Traceable**: Links back to requirements and forward to expected outcomes

The Implementation Plan contains links to `Spec.md`, `SpecResearch.md`, and `CodeResearch.md`.

#### Phase Status Tracking

During implementation, before the Implementation Review Agent pushes changes, it updates the status section of the current phase to reflect progress. It appends any new status section as review iterations occur. It states that the phase is completed and adds any notes that can inform agents working on future phases. It also notes any review tasks for any specific code that reviewers should take a close look at and why.

The status section follows this format:

```markdown
### Status

**State:** Completed | In Progress | Blocked
**Completed:** YYYY-MM-DD
**PR:** #123
**Notes:** [Any relevant notes for future phases]
**Review Focus:** [Specific areas requiring careful review]
```

### Docs.md

The **Documentation** artifact is comprehensive technical documentation of the implemented work (feature, enhancement, bug fix, refactor, etc.). Created by the Documenter Agent, it serves as the authoritative reference for understanding what was built, how it works, and how to use it.

**Purpose:** Provide detailed, standalone documentation that serves as the primary technical reference for engineers and as the source material for any project-specific documentation updates. This is the go-to documentation for anyone needing to understand the work, regardless of whether the project maintains feature-level documentation elsewhere.

**Location:** `/.paw/work/<feature-slug>/Docs.md`

**Dependencies:** Built upon the completed implementation phases, `ImplementationPlan.md`, `Spec.md`, and all merged Phase PRs.

#### Core Principle: Comprehensive Technical Reference

The Docs.md artifact is detailed documentation of the work itself, not a list of documentation changes. It explains what was built, how it works, why design decisions were made, and how to use it—focusing on high-level concepts and user guidance rather than restating code:

**What it DOES include:**
- Comprehensive overview of what was implemented and why
- Architecture and design decisions with rationale
- User-facing functionality and usage patterns
- High-level explanation of key reusable components or APIs (not exhaustive code documentation)
- Configuration options and integration points
- How to test/exercise the work as a human user
- Edge cases, limitations, and error handling (user perspective)
- Practical code examples only when essential to demonstrate usage
- Migration paths and compatibility concerns

**What it does NOT include:**
- Implementation code itself (that's in the codebase)
- Detailed API documentation restating what's in code comments/docstrings
- Internal implementation details already documented in code
- Exhaustive test coverage checklists (tests document themselves)
- Acceptance criteria verification (tracked in implementation artifacts)
- Project documentation updates list (belongs in docs PR description)
- Line-by-line code commentary or unnecessary code reproduction

#### Structure & Content

The document follows a comprehensive format designed to be the authoritative technical reference:

**Overview**
- Summary of what was implemented (feature, enhancement, bug fix, refactor, etc.)
- Purpose and problem being solved
- High-level context and background

**Architecture and Design**
- Architectural overview of the implementation
- Key design decisions and their rationale
- Component interactions and integration points
- Data flow and state management

**User Guide** (when applicable)
- Prerequisites for using the implementation
- Basic usage patterns with examples
- Advanced usage scenarios
- Configuration options and their effects

**Technical Reference** (when applicable)
- High-level overview of reusable components, utilities, or APIs that other parts of the codebase may use
- Focus only on components with external usage—omit internal implementation details
- Conceptual explanation of key behaviors and algorithms (not code-level detail)
- User-facing error conditions, messages, and recovery strategies

**Usage Examples** (when applicable)
- Practical examples showing real-world usage patterns
- Code snippets only when essential to demonstrate user-facing behavior or usage
- Focus on what users need to know, not implementation details

**Testing Guide**
- Step-by-step guide for humans to exercise the feature/fix/enhancement
- For bugs: how to verify the issue is fixed
- For features: how to try out the new functionality
- For enhancements: what changed and how to see the improvements

**Edge Cases and Limitations**
- Known limitations and constraints users should be aware of
- Edge case handling from a user perspective
- Performance considerations

**Migration and Compatibility** (when applicable)
- Migration paths for existing users
- Breaking changes and compatibility notes
- How to handle transitions

#### Relationship to Project Documentation

`Docs.md` serves different purposes depending on project documentation practices:

- **Projects with feature-level documentation**: Docs.md provides detailed source material that can be adapted and integrated into project docs. Project docs may be less detailed or formatted differently.
- **Projects without feature-level documentation**: Docs.md becomes the primary reference documentation that engineers consult to understand the work.
- **All projects**: Docs.md ensures there's always comprehensive documentation of the work, even if project-specific docs are minimal.

#### Quality Standards

A well-formed Docs.md artifact:
- **Is Comprehensive about concepts**: Detailed coverage of design decisions, architecture, and user-facing behavior
- **Is Accurate**: Documentation matches actual implementation
- **Is User-focused**: Written for humans who need to understand and use the work
- **Is Practical**: Emphasizes usage and testing guidance over code details
- **Is Clear**: Understandable without needing to read the implementation
- **Is Concise where appropriate**: References code components rather than reproducing them
- **Is Example-appropriate**: Code examples only when essential to demonstrate usage
- **Is Standalone**: Can be read and understood as the primary technical reference

### WorkflowContext.md

The **Workflow Context** document centralizes workflow parameters (target branch, Issue URL, remote, artifact paths, Work Title) eliminating repetition across PAW stage invocations.

**Purpose:** Single source of truth for workflow parameters.

**Location:** `/.paw/work/<feature-slug>/WorkflowContext.md`

**Dependencies:** None (agents create/update automatically when invoked)

#### Parameters

**Work Title** (Required after Spec stage)
- 2-4 word descriptive name prefixing all PR titles (e.g., `Auth System`, `API Refactor`)
- Generated by Spec Agent, refined during iterations
- Example: `[Auth System] Phase 1: Database schema and migrations`

**Work ID** (Required)
- Normalized identifier (slug) for artifact directory (e.g., "auth-system", "api-refactor-v2")
- Auto-generated from Work Title when not provided. Must be unique and filesystem-safe
- Format: lowercase letters, numbers, hyphens only
- Length: 1-100 characters
- Used to construct artifact paths: `.paw/work/<work-id>/<Artifact>.md`

**Target Branch** (Required)
- Git branch containing completed work (e.g., "feature/add-authentication")
- Used for git operations and workflow branch naming (`<target_branch>_plan`, `<target_branch>_phase<N>`)

**Remote** (Optional, defaults to `origin`)
- Git remote for branch/PR operations (e.g., `fork`, `upstream`)

**Issue URL** (Optional)
- Issue or work item URL for tracking (e.g., `https://github.com/owner/repo/issues/N` or `https://dev.azure.com/org/project/_workitems/edit/ID`)

**Artifact Paths** (Optional, auto-derived)
- Explicit paths for non-standard layouts; defaults to `.paw/work/<feature-slug>/<Artifact>.md`

**Additional Inputs** (Optional)
- Supplementary documents for research (e.g., `paw-specification.md`)

#### Usage

Agents automatically create WorkflowContext.md when first invoked with parameters, or read it from chat context to extract values. Include in context for subsequent stages to avoid re-entering parameters.

---

## Work ID

A **Work ID** (also known as a "feature slug" or "slug" internally) is a normalized, filesystem-safe identifier that serves as the persistent directory name for PAW workflow artifacts. Work IDs are used for all types of work items—features, bug fixes, refactorings, etc.

### Purpose
- Provides human-readable, meaningful directory names (e.g., "user-authentication" instead of "feature/add-auth-backend")
- Remains consistent even if git branches are renamed
- Improves artifact organization and discoverability
- Enables multiple workflows per repository without branch name conflicts

### Generation
Work IDs are automatically generated when not explicitly provided:

1. **From Work Title**: If Work Title exists, normalize it to create slug
2. **From Issue**: If both missing, generate Work Title from issue title, then generate slug from Work Title
3. **Alignment**: When auto-generating both Work Title and Feature Slug, they derive from same source for consistency

### Normalization Rules
User-provided or auto-generated work IDs are normalized:
- Lowercase conversion: "MyFeature" → "myfeature"
- Space replacement: "my feature" → "my-feature"
- Special character removal: "feature (v2)" → "feature-v2"
- Consecutive hyphen collapse: "my--feature" → "my-feature"
- Trim hyphens: "-myfeature-" → "myfeature"
- Maximum length: 100 characters

### Validation
Work IDs must meet these requirements:
- Characters: lowercase letters (a-z), numbers (0-9), hyphens (-) only
- Length: 1-100 characters
- Format: no leading/trailing hyphens, no consecutive hyphens
- Uniqueness: no conflicting directory at `.paw/work/<work-id>/`
- Reserved names: cannot be ".", "..", "node_modules", ".git", ".paw"

### Conflict Resolution
- **User-provided Work ID conflict**: Agent prompts user to choose alternative
- **Auto-generated Work ID conflict**: Agent automatically appends numeric suffix (-2, -3, etc.)

### Examples
| Input | Normalized Work ID |
|-------|--------------------|

| "User Authentication System" | user-authentication-system |
| "API Refactor v2" | api-refactor-v2 |
| "Fix: Rate Limit Bug" | fix-rate-limit-bug |
| "my_FEATURE--test" | my-feature-test |
`````