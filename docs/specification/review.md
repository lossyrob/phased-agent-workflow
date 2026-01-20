# Review Workflow

The **PAW Review Workflow** is a structured, three-stage process for thoughtful code review of any pull request. It helps reviewers understand changes, evaluate their impact, identify gaps, and provide considerate, actionable feedback.

## Overview

PAW Review applies the same principles as the implementation workflow: **traceable reasoning**, **rewindable analysis**, and **human-in-the-loop decision making**. Instead of building code forward from a spec, it works backward from implementation to understanding.

| Property | Description |
|----------|-------------|
| **Understanding before critique** | Analyze what changed and why before evaluating quality |
| **Comprehensive feedback** | Generate all findings; human filters and adjusts based on context |
| **Artifact-based** | Durable markdown documents trace reasoning from changes to comments |
| **Rewindable** | Any stage can restart if new information changes understanding |
| **Human-controlled** | Nothing posted automatically; reviewer selects what to post |

## Skills-Based Architecture

The review workflow uses a **skills-based architecture** for dynamic, maintainable orchestration:

**Invocation:** `/paw-review <PR-number-or-URL>`

**How it works:**

1. The **PAW Review** agent loads the `paw-review-workflow` skill
2. The workflow skill orchestrates **activity skills** via subagent execution
3. Each activity skill produces specific artifacts
4. Complete review runs without manual pauses

**Bundled Skills:**

| Skill | Type | Stage | Output |
|-------|------|-------|--------|
| `paw-review-workflow` | Workflow | — | Orchestration logic |
| `paw-review-understanding` | Activity | Understanding | ReviewContext.md, ResearchQuestions.md, DerivedSpec.md |
| `paw-review-baseline` | Activity | Understanding | CodeResearch.md |
| `paw-review-impact` | Activity | Evaluation | ImpactAnalysis.md |
| `paw-review-gap` | Activity | Evaluation | GapAnalysis.md |
| `paw-review-feedback` | Activity | Output | ReviewComments.md, pending review |
| `paw-review-critic` | Activity | Output | Assessment sections |

**Tool Support:**

- `paw_get_skills` — Retrieves catalog of available skills
- `paw_get_skill` — Loads specific skill content by name

**Subagent Skill Loading:**

Every subagent MUST call `paw_get_skill` FIRST before executing any work. The workflow skill requires delegation prompts to include: "First load your skill using `paw_get_skill('paw-review-<skill-name>')`, then execute the activity."

## Cross-Repository Review

PAW Review supports coordinated review of multiple related PRs across repositories.

**Invocation:**

```
/paw-review https://github.com/org/api/pull/123 https://github.com/org/frontend/pull/456
```

**Detection triggers:**

- Multiple PR URLs/numbers in the command
- Multi-root VS Code workspace detected
- PRs reference different repositories

**What happens:**

1. Creates separate artifact directories per repository (`PR-123-api/`, `PR-456-frontend/`)
2. Analyzes each PR through full review stages
3. Identifies cross-repository impacts and dependencies
4. Creates pending reviews on each PR with cross-references

**Artifact additions for multi-repo:**

- `ReviewContext.md` includes `related_prs` field linking to other PRs
- `ImpactAnalysis.md` includes Cross-Repository Dependencies table
- `GapAnalysis.md` includes cross-repo consistency checks
- `ReviewComments.md` includes cross-references like `(See also: org/frontend#456)`

Single-PR workflows remain unchanged—multi-repo features activate only when detected.

## Workflow Stages

```
PR → Understanding (R1) → Evaluation (R2) → Feedback Generation (R3)
```

---

### Stage R1 — Understanding

**Goal:** Comprehensively understand what changed and why

**Skills:** `paw-review-understanding`, `paw-review-baseline`

**Inputs:**

- PR URL or number (GitHub context)
- Base branch name (non-GitHub context)
- Repository context

**Outputs:**

- `ReviewContext.md` — PR metadata, changed files, flags
- `ResearchQuestions.md` — Research questions for baseline analysis
- `CodeResearch.md` — Pre-change baseline understanding
- `DerivedSpec.md` — Reverse-engineered intent and acceptance criteria

**Process:**

1. **Fetch PR metadata and create ReviewContext.md**
    - Document all changed files with additions/deletions
    - Set flags: CI failures, breaking changes suspected

2. **Research pre-change baseline**
    - Analyze codebase at base commit (pre-change state)
    - Document how system worked before changes

3. **Derive specification**
    - Use CodeResearch.md to understand before/after behavior
    - Reverse-engineer author intent from code and PR description
    - Document assumptions and open questions

---

### Stage R2 — Evaluation

**Goal:** Assess impact and identify what might be missing or concerning

**Skills:** `paw-review-impact`, `paw-review-gap`

**Inputs:**

- All Stage R1 artifacts
- Repository codebase at base and head commits

**Outputs:**

- `ImpactAnalysis.md` — System-wide effects, integration points, breaking changes
- `GapAnalysis.md` — Findings organized by Must/Should/Could

**Process:**

1. **Analyze impact**
    - Build integration graph of dependencies
    - Detect breaking changes
    - Assess performance and security implications
    - Evaluate design and architecture fit
    - Document deployment considerations and risk

2. **Identify gaps**
    - **Correctness:** Logic errors, edge cases, error handling
    - **Safety & Security:** Validation, authorization, concurrency
    - **Testing:** Coverage and test effectiveness
    - **Maintainability:** Code clarity, documentation
    - **Performance:** N+1 queries, unbounded operations
    - **Complexity:** Over-engineering concerns
    - **Positive Observations:** Good practices to commend

3. **Categorize findings**
    - **Must** — Correctness, safety, security issues with concrete impact
    - **Should** — Quality, completeness, testing gaps
    - **Could** — Optional enhancements

---

### Stage R3 — Feedback Generation

**Goal:** Generate comprehensive, well-structured review comments

**Skills:** `paw-review-feedback`, `paw-review-critic`

**Inputs:**

- All prior artifacts

**Outputs:**

- `ReviewComments.md` — Complete feedback with rationale
- **GitHub pending review** (GitHub context) — Draft review with inline comments

**Process:**

1. **Generate comprehensive feedback**
    - Transform all findings into review comments
    - Provide specific, actionable suggestions
    - Add rationale sections with evidence

2. **Create ReviewComments.md and pending review**
    - Save comprehensive feedback locally
    - GitHub: Create pending review with inline comments

3. **Critical assessment**
    - Add assessment sections (usefulness, accuracy, trade-offs)
    - Assessments help reviewer make informed decisions
    - Never posted to GitHub—for reviewer reference only

4. **Support Q&A and tone adjustment**
    - Answer questions based on artifacts
    - Regenerate with adjusted tone if requested

---

## Review Artifacts

### ReviewContext.md

Authoritative parameter source for the review workflow.

**Contents:**

- PR Number/Branch
- Base and Head commits
- Changed files summary
- CI Status and flags
- Description and metadata

### DerivedSpec.md

Reverse-engineered specification from implementation.

**Contents:**

- Intent Summary — What problem this appears to solve
- Scope — What's in and out of scope
- Assumptions — Inferences from the code
- Measurable Outcomes — Before/after behavior
- Changed Interfaces — APIs, routes, schemas
- Risks & Invariants
- Open Questions

### ImpactAnalysis.md

System-wide effects and design assessment.

**Contents:**

- Integration Points and dependencies
- Breaking Changes
- Performance Implications
- Security & Authorization Changes
- Design & Architecture Assessment
- User Impact (end-user and developer-user)
- Risk Assessment

### GapAnalysis.md

Findings organized by severity.

**Structure:**

```markdown
## Must

### [Finding Title]
**File:** `path/to/file.ts:123`
**Finding:** [What the issue is]
**Impact:** [Why this matters]
**Suggestion:** [How to fix it]

## Should
...

## Could
...

## Positive Observations
...
```

### ReviewComments.md

Complete feedback with rationale and assessment.

**For each comment:**

- Comment text and suggestions
- Rationale (Evidence, Baseline Pattern, Impact, Best Practice)
- Assessment (Usefulness, Accuracy, Trade-offs, Recommendation)

---

## Human Workflow Summary

1. **Invoke:** Run `/paw-review <PR-number-or-URL>` in Copilot Chat
2. **Review:** All artifacts created in `.paw/reviews/<identifier>/`
3. **Edit:** Open GitHub pending review, edit/delete comments as needed
4. **Submit:** Submit review manually (Approve/Comment/Request Changes)

**Key principle:** Nothing is posted automatically. The pending review gives you full control over what feedback to share.

## Next Steps

- [Implementation Workflow](implementation.md) — The complementary implementation workflow
- [Agents Reference](../reference/agents.md) — Complete agent documentation
