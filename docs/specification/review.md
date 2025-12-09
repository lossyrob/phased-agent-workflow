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

## Workflow Stages

```
PR → Understanding (R1) → Evaluation (R2) → Feedback Generation (R3)
```

---

### Stage R1 — Understanding

**Goal:** Comprehensively understand what changed and why

**Agents:** PAW-R1A Understanding, PAW-R1B Baseline Researcher

**Inputs:**

- PR URL or number (GitHub context)
- Base branch name (non-GitHub context)
- Repository context

**Outputs:**

- `ReviewContext.md` — PR metadata, changed files, flags
- `prompts/code-research.prompt.md` — Research questions about pre-change system
- `CodeResearch.md` — Pre-change baseline understanding
- `DerivedSpec.md` — Reverse-engineered intent and acceptance criteria

**Process:**

1. **Fetch PR metadata and create ReviewContext.md**
    - Document all changed files with additions/deletions
    - Set flags: CI failures, breaking changes suspected

2. **Generate code research prompt**
    - Identify areas needing baseline understanding
    - Create questions about pre-change behavior, patterns, dependencies

3. **Pause for baseline research**
    - Human runs PAW-R1B Baseline Researcher
    - Researcher analyzes codebase at base commit (pre-change state)

4. **Derive specification**
    - Use CodeResearch.md to understand before/after behavior
    - Reverse-engineer author intent from code and PR description
    - Document assumptions and open questions

---

### Stage R2 — Evaluation

**Goal:** Assess impact and identify what might be missing or concerning

**Agents:** PAW-R2A Impact Analyzer, PAW-R2B Gap Analyzer

**Inputs:**

- All Stage R1 artifacts
- Repository codebase at base and head commits

**Outputs:**

- `ImpactAnalysis.md` — System-wide effects, integration points, breaking changes
- `GapAnalysis.md` — Findings organized by Must/Should/Could

**Process:**

1. **Analyze impact** (PAW-R2A)
    - Build integration graph of dependencies
    - Detect breaking changes
    - Assess performance and security implications
    - Evaluate design and architecture fit
    - Document deployment considerations and risk

2. **Identify gaps** (PAW-R2B)
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

**Agents:** PAW-R3A Feedback Generator, PAW-R3B Feedback Critic

**Inputs:**

- All prior artifacts

**Outputs:**

- `ReviewComments.md` — Complete feedback with rationale
- **GitHub pending review** (GitHub context) — Draft review with inline comments

**Process:**

1. **Generate comprehensive feedback** (PAW-R3A)
    - Transform all findings into review comments
    - Provide specific, actionable suggestions
    - Add rationale sections with evidence

2. **Create ReviewComments.md and pending review**
    - Save comprehensive feedback locally
    - GitHub: Create pending review with inline comments

3. **Critical assessment** (PAW-R3B)
    - Add assessment sections (usefulness, accuracy, trade-offs)
    - Assessments help reviewer make informed decisions
    - Never posted to GitHub—for reviewer reference only

4. **Support Q&A and tone adjustment**
    - Answer questions based on artifacts
    - Regenerate with adjusted tone if requested

---

## Review Agents

### PAW-R1A Understanding Agent

Analyzes PR changes, generates baseline research prompts, and derives specification from implementation.

### PAW-R1B Baseline Researcher

Documents how the system worked before changes by analyzing codebase at base commit.

### PAW-R2A Impact Analyzer

Identifies integration points, breaking changes, and system-wide effects.

### PAW-R2B Gap Analyzer

Systematically identifies issues across correctness, safety, testing, and quality with Must/Should/Could categorization.

### PAW-R3A Feedback Generator

Transforms findings into structured review comments with rationale, creates GitHub pending reviews.

### PAW-R3B Feedback Critic

Critically assesses generated comments for usefulness and accuracy.

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

1. **R1:** Invoke Understanding Agent → Run Baseline Researcher → Review DerivedSpec.md
2. **R2:** Invoke Impact Analyzer → Invoke Gap Analyzer → Review findings
3. **R3:** Invoke Feedback Generator → Invoke Feedback Critic → Review pending comments → Edit/delete as needed → Submit review

## Next Steps

- [Implementation Workflow](implementation.md) — The complementary implementation workflow
- [Agents Reference](../reference/agents.md) — Complete agent documentation
