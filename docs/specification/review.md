# Review Workflow

The **PAW Review Workflow** is a structured, three-stage process for thoughtful code review of any pull request. It helps reviewers understand changes, evaluate their impact, identify gaps, and provide considerate, actionable feedback.

## Overview

PAW Review applies the same principles as the implementation workflow: **traceable reasoning**, **rewindable analysis**, and **human-in-the-loop decision making**. Instead of building code forward from a spec, it works backward from implementation to understanding.

| Property | Description |
|----------|-------------|
| **Understanding before critique** | Analyze what changed and why before evaluating quality |
| **Comprehensive feedback** | Generate all in-scope findings; explicit user scope can narrow output |
| **Artifact-based** | Durable markdown documents trace reasoning from changes to comments |
| **Rewindable** | Any stage can restart if new information changes understanding |
| **Human-controlled** | GitHub reviews remain pending by default; explicit authorized submission is verified before execution |

## Architecture

**Invocation:** `/paw-review <PR-number-or-URL>` in VS Code, or `copilot --agent PAW-Review` and give the PR.

PAW Review follows the same host model as the implementation workflow:

1. The **PAW-Review** agent loads the `paw-review-workflow` skill. The session that loads it is the **host**.
2. The host runs preflight itself, then builds a todo graph before any other work.
3. Each stage runs in a subagent with a brief: the stage skill and mode, the review target with base and head commits, the artifact directory, the host instructions that apply, inputs, and "done when". Subagents read `paw-review-workflow/references/activity-contract.md` for the review principles, limits and return block.
4. The host checks each stage's artifacts on disk before closing its todo. A failed check is delegated again with the specific gap.
5. Society-of-thought evaluation and posting run in the host, never in a subagent. Only the host creates, changes or submits reviews and comments.

Subagents never commit, push or post, never load `paw-review-workflow`, and leave the checkout on the branch and commit they found it on. Baseline research reads the base commit without checking it out.

**Todo graph:**

| Todo | Runs when | Evidence |
|------|-----------|----------|
| `preflight` | Always (host) | Target, head, output action, authorization and configuration resolved |
| `understanding` | Always | `ReviewContext.md` with `Preflight Status: passed`; `ResearchQuestions.md` |
| `baseline` | Always | `CodeResearch.md` |
| `derived-spec` | Always | `DerivedSpec.md` with no open questions |
| `impact`, `gap` | `single-model` | `ImpactAnalysis.md`, `GapAnalysis.md` |
| `sot` | `society-of-thought` (host) | `REVIEW-<specialist>*.md`, `REVIEW-SYNTHESIS.md` |
| `correlation` | Multi-repo | `CrossRepoAnalysis.md` |
| `feedback` | Always | `ReviewComments.md`, status `draft` |
| `critique` | Always | An assessment for every comment |
| `finalize` | Always | Status `finalized`; every comment has a `**Final**:` marker |
| `post` | Always (host) | GitHub: pending review ID read back and recorded. Otherwise: manual posting instructions |

For multi-repo reviews, the todos from `understanding` to `post` exist once per PR.

**Return contract:** every stage returns `status` (`complete`, `blocked`, `needs-decision`, `failed`), `activity`, `summary`, `artifacts`, and where relevant `findings` (severity, location, issue, proposed fix), `validation`, `blockers` and `decisions_needed`. Must, Should and Could findings map to `must-fix`, `should-fix` and `consider`. A `blocked` or `needs-decision` return leaves the todo open; the host resolves it or asks you.

**Review configuration:** `ReviewContext.md` records the review provider block (`mode`, `models`, `specialists`, `interaction`, `perspectives`, `perspective_cap`) and `interactive`. PAW Review supports `single-model` (default) and `society-of-thought`. For `multi-model` or `off`, the host tells you the mode is unavailable and asks; it does not substitute another mode. If `paw-sot` cannot run, the review is blocked.

**Skill delivery:** VS Code contributes the review skills through `chatSkills`; Copilot CLI reads the installed skill files.

## Authorization Policy

PAW Review classifies instructions before analysis:

| Classification | Behavior |
|----------------|----------|
| **Invariant** | Use evidence, post only finalized comments, keep internal rationale local, and verify the exact target, live head, pending review ID, and event before submission |
| **Default** | GitHub stays pending; Azure DevOps and local contexts stay artifact-only when executable capability is unavailable |
| **User-configurable** | Explicit direction can submit a GitHub review with Approve, Request Changes, or Comment, select review mode/specialists, narrow feedback scope, override critique recommendations, and adjust tone |

Explicit direction overrides a PAW default, not an integrity invariant or missing platform capability. PAW Review reports ambiguous instructions or unsupported requested mutations before the Understanding stage. A changed head invalidates authorization and requires fresh analysis. Successful submission is terminal and is not replayed.

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
4. Creates pending reviews on each PR by default, with per-PR authorization boundaries and cross-references

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

**Review Modes:**

- **Single-model** (default): `paw-review-impact`, `paw-review-gap`
- **Society-of-thought**: `paw-sot` engine, run by the host (replaces both impact and gap analysis). Supports perspective overlays for additional evaluative diversity.

**Inputs:**

- All Stage R1 artifacts
- Repository codebase at base and head commits

**Outputs (single-model):**

- `ImpactAnalysis.md` — System-wide effects, integration points, breaking changes
- `GapAnalysis.md` — Findings organized by Must/Should/Could

**Outputs (society-of-thought):**

- `REVIEW-{SPECIALIST}.md` — Per-specialist findings
- `REVIEW-SYNTHESIS.md` — Confidence-weighted synthesized findings

**Process (single-model):**

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

**Process (society-of-thought):**

1. Construct review context from ReviewContext.md and pass to `paw-sot`
2. Specialists review PR diff with distinct cognitive strategies
3. Synthesis merges findings with confidence weighting and conflict resolution

See [Society-of-Thought Review](../guide/society-of-thought-review.md) for configuration details.

---

### Stage R3 — Output

**Goal:** Generate comprehensive review comments, critically assess them, and apply the resolved output policy

**Skills:** `paw-review-feedback`, `paw-review-critic`, `paw-review-github`

**Inputs:**

- All prior artifacts
- CrossRepoAnalysis.md (multi-repo only)

**Outputs:**

- `ReviewComments.md` — Complete feedback with full comment history
- **GitHub review** — Pending by default; submitted only under explicit verified authorization
- **Azure DevOps/local output** — Finalized artifacts and manual instructions when executable output is unavailable

**Process:**

The Output stage uses an **iterative feedback-critique pattern**:

1. **Initial Feedback Pass** (`paw-review-feedback`)
    - Transform all in-scope findings into review comments with rationale
    - Incorporate cross-repo gaps for multi-repo reviews
    - Create ReviewComments.md with status: `draft`
    - Does NOT post to GitHub yet

2. **Critical Assessment** (`paw-review-critic`)
    - Evaluate each comment for usefulness, accuracy, trade-offs
    - Add assessment sections with Include/Modify/Skip recommendations
    - Assessments help reviewer decide what to include
    - Never posted to GitHub—for local reference only

3. **Critique Response Pass** (`paw-review-feedback`)
    - Process critic recommendations
    - Add `**Updated Comment:**` for modified comments
    - Mark each comment with `**Final**:` status
    - Update ReviewComments.md status to: `finalized`

4. **GitHub Posting** (`paw-review-github`, loaded by the host; GitHub only)
    - Filter to only comments marked "Ready for GitHub posting"
    - Create or reuse the pending review with filtered comments
    - For explicit submission, revalidate repository, PR, live head, pending review ID, and event immediately before submitting
    - Preserve the pending review and report any mismatch
    - Skipped comments remain in artifact but are NOT posted
    - Azure DevOps/local: provide manual posting instructions when executable capability is unavailable

**Comment Evolution in ReviewComments.md:**

Each comment shows its complete history:
- **Original** — Initial feedback from first pass
- **Assessment** — Critic evaluation
- **Updated** — Refined version if modification was recommended
- **Final** — Ready for posting or skipped per critique
- **Posted** — GitHub pending review ID
    - Regenerate with adjusted tone if requested

---

## Review Artifacts

### ReviewContext.md

Authoritative parameter source for the review workflow.

**Contents:**

- PR Number/Branch
- Review platform and output capability
- Base and Head commits
- Requested action, feedback scope, authorization, target, pending-review binding, event, and preflight result
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

> **Note**: ImpactAnalysis.md and GapAnalysis.md are produced in **single-model mode** only. In **society-of-thought mode**, the Evaluation Stage produces `REVIEW-{SPECIALIST}.md` per specialist and `REVIEW-SYNTHESIS.md` (see [Stage R2](#stage-r2-evaluation)).

### ReviewComments.md

Complete feedback with full comment history showing evolution from original to posted.

**Status field:** `draft` (awaiting critique) or `finalized` (ready for posting)

**For each comment:**

- Original comment text and suggestions
- Rationale (Evidence, Baseline Pattern, Impact, Best Practice)
- Assessment (Usefulness, Accuracy, Trade-offs, Recommendation)
- Updated comment/suggestion (if modified per critique)
- Final status (`Ready for GitHub posting` or `Skipped per critique`)
- Posted status (pending review ID after GitHub posting)

---

## Human Workflow Summary

1. **Invoke:** Run `/paw-review <PR-number-or-URL>` in Copilot Chat, or start `copilot --agent PAW-Review` and give the PR
2. **Review:** All artifacts created in `.paw/reviews/<identifier>/`
3. **Consult:** Check ReviewComments.md for full comment history (original → assessment → updated)
4. **Edit:** Open a GitHub pending review and edit/delete comments as needed
5. **Recover:** Manually add skipped comments if you disagree with critique
6. **Finish:** Leave pending, submit manually, or explicitly authorize PAW Review to submit after target/head/review/event verification

**Key principle:** Pending is the default. Explicit authorization is actionable only for the verified review tuple; failed verification leaves the pending review unchanged.

## Next Steps

- [Workflows](../guide/two-workflows.md) — The implementation workflow and PAW Review
- [Design: PAW Review alignment](v2/design.md#paw-review-alignment) — What changed in v2
- [Agents and Skills Reference](../reference/agents.md)
