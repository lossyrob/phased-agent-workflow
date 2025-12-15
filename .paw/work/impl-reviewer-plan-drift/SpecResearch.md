# Spec Research: Impl Reviewer Plan Drift

## Summary
PAW’s implementation workflow stores its core artifacts under `.paw/work/<work-id>/` and relies on those committed Markdown documents (Spec, Research, Plan, Docs) as the source of truth across stages. The PAW-03B Implementation Reviewer already references `ImplementationPlan.md` for review, and uses commit hashes in PR comment follow-ups, but there is no dedicated “plan/spec drift” artifact or formal “plan alignment” output section beyond comparing changes to the plan and writing PR summaries.

The existing “commit-aware” conventions are primarily expressed in review workflows (base/head commit SHAs in review artifacts) and in implementation review comment follow-up summaries (include commit hashes per addressed comment). In local review strategy, the reviewer’s commit-aware context is the git history on the target branch plus the `.paw/work/<work-id>/` artifacts.

## Agent Notes
- Scope is intentionally minimal: this is primarily a PAW-03B agent-behavior update.
- Key behavior requested: during review, compare implementation vs approved plan (and spec when present), detect drift, use commit history to infer intent, then either (a) update plan for minor/clear drift or (b) ask user before changing artifacts for significant/ambiguous drift.
- Open decision in the issue (“what update the plan means”) should be informed by existing PAW conventions; prefer the simplest approach consistent with existing artifacts and review strategy.

---

## Research Findings

### 1) Question
Where does PAW currently store the Implementation Plan artifact for a work item (filenames and location patterns), and how does the plan get created/updated today?

**Answer**
- The implementation plan artifact is `ImplementationPlan.md` stored at `.paw/work/<work-id>/ImplementationPlan.md`.
- It is created by the Implementation Planner (PAW-02B) during the Implementation Plan stage.
- The plan is updated over time by:
  - The Implementer (PAW-03A), who checks off plan items and appends phase completion notes (including summaries and “Addressed Review Comments” notes when applicable).
  - The Planner (PAW-02B) when addressing Planning PR review comments (updating planning artifacts as needed).
  - The Reviewer (PAW-03B), who may record review completion in `ImplementationPlan.md` notes (especially in local strategy), and in PRs strategy may add links to Phase PRs for tracking.

**Evidence**
- Artifacts reference documentation (Implementation workflow artifacts and directory structure).
- PAW-02B/PAW-03A/PAW-03B agent instructions describing creation and update behaviors.

**Implications**
- “Updating the plan” today generally means editing `ImplementationPlan.md` in-place (checkboxes and appended notes), not creating a new artifact.

---

### 2) Question
Where does PAW currently store the Spec artifact (if any), and how is it referenced across stages?

**Answer**
- The specification artifact is `Spec.md` stored at `.paw/work/<work-id>/Spec.md`.
- When present (full workflow mode), it is produced in Stage 01 and remains available as an input to later stages.
- It is referenced indirectly by later agents as an input artifact (e.g., planning uses `Spec.md` + research outputs; review guidance for final PR scenarios includes verifying changes against `Spec.md` acceptance criteria).

**Evidence**
- Artifacts reference documentation describing `Spec.md` as an implementation workflow artifact.
- Implementation workflow documentation describing Stage 01 outputs and later-stage inputs.
- PAW-03B instructions referencing spec acceptance criteria for final-PR review/comment-follow-up contexts.

**Implications**
- When spec exists, it is the canonical requirements reference; when absent (minimal mode), the workflow proceeds using other context (issue/plan/research) instead.

---

### 3) Question
What does the current PAW-03B Impl Reviewer agent do today regarding validating implementation against plan/spec (if anything)?

**Answer**
- PAW-03B explicitly instructs reviewing implementation changes and comparing them against `ImplementationPlan.md` requirements as part of its review process.
- It also instructs, in final-PR contexts (or final-PR review comment follow-up), verifying changes against `Spec.md` acceptance criteria and cross-phase consistency.
- There is no separate formal “drift detection” output or dedicated artifact for plan/spec alignment; validation is described as part of the reviewer’s review steps.

**Evidence**
- PAW-03B agent instructions describing reading changes, using git diff/log, and comparing against `ImplementationPlan.md`; and referencing `Spec.md` acceptance criteria for final PR scenarios.

**Implications**
- Current conventions treat plan/spec alignment as a review activity rather than a distinct deliverable.

---

### 4) Question
What is the existing expected structure/format of PAW-03B review output (e.g., sections, required checklists), and where would a “Plan alignment” section fit without breaking conventions?

**Answer**
Current PAW-03B outputs are described as:
- Commits that add docstrings/comments/polish and small refactors.
- A Phase PR opened/updated (when using PRs strategy).
- For PR review-comment follow-up: a single comprehensive PR summary comment starting with `**🐾 Implementation Reviewer 🤖:**` and containing:
  - Section 1: detailed comment tracking, including comment references and specific commit hash(es) addressing each.
  - Section 2: overall summary of changes and readiness notes.

**Evidence**
- PAW-03B agent instructions (outputs and required PR summary comment structure).

**Implications**
- A “Plan alignment” section would most naturally be a subsection of the existing PR summary/comment structure (or part of the PR body for initial Phase PR creation) rather than a new standalone review artifact, since PAW-03B explicitly forbids creating standalone review artifact files.

---

### 5) Question
Are there existing conventions for updating artifacts during review (e.g., editing Plan.md vs adding a deviations/clarifications section)? If so, what patterns are used elsewhere in PAW?

**Answer**
- PAW’s implementation workflow convention is to update artifacts in-place under `.paw/work/<work-id>/` (not create parallel “deviations” documents).
- For `ImplementationPlan.md` specifically, the Implementer updates progress by:
  - Checking off items as completed.
  - Appending phase summaries and notes at the end of the relevant phase section.
  - Appending an “Addressed Review Comments:” summary when responding to review comments.
- The Reviewer, depending on review strategy, may document phase review completion in `ImplementationPlan.md` notes and (in PRs strategy) link Phase PRs in plan notes for tracking.

**Evidence**
- PAW artifacts reference documentation (artifact set and purpose).
- PAW-03A and PAW-03B agent instructions describing plan update discipline and where notes are recorded.

**Implications**
- Existing conventions favor incremental append-only notes and checkbox updates inside `ImplementationPlan.md`, preserving prior context.

---

### 6) Question
Are there existing conventions for referencing commit intent in artifacts or reviews (e.g., including commit SHAs, commit message excerpts, timestamps)?

**Answer**
- In the review workflow (separate from implementation workflow), commit SHAs are first-class fields in artifacts (e.g., base/head commit SHAs recorded in review context and used as anchors for analysis).
- In the implementation workflow, commit-aware references appear primarily in PR-review-comment follow-up processes:
  - The Implementer’s “review comments addressed” handoff format includes listing addressed comments with commit hashes.
  - The Reviewer’s follow-up summary comment requires documenting specific commit hash(es) that addressed each review comment.
- Outside those contexts, the implementation artifacts reference “commits” conceptually, but do not define a required convention for embedding commit SHAs into `ImplementationPlan.md` or `Spec.md`.

**Evidence**
- Review workflow documentation and artifacts reference (base/head commit SHA fields).
- PAW-03A and PAW-03B agent instructions requiring commit hashes in review-comment follow-up summaries.

**Implications**
- “Commit-aware intent signals” already exist in PAW as: commit SHAs in review artifacts and commit-hash-based tracking for review comments.

---

### 7) Question
How do other agents in PAW decide whether to ask the user vs proceed automatically when there’s ambiguity? Identify any comparable “stop and ask” patterns.

**Answer**
Comparable “stop and ask” patterns include:
- Implementer (PAW-03A): when plan and codebase conflict, or critical uncertainties exist, it instructs to stop and ask the human using a structured “Blocking Issue” format before proceeding.
- Planner (PAW-02B): when addressing planning PR comments, it instructs asking the human before proceeding if a comment requires clarification.
- Workflow handoff modes: semi-auto mode explicitly pauses at defined decision points (e.g., before implementation phases and before docs/final PR), while auto mode continues unless tool approvals or blockers occur.

**Evidence**
- PAW-03A and PAW-02B agent instructions on blocking/clarification behavior.
- Stage transitions guide describing manual/semi-auto/auto handoff modes and pause points.

**Implications**
- PAW’s general convention is: proceed automatically for routine transitions, but stop and ask the user when ambiguity blocks correctness or would require a substantive decision.

---

### 8) Question
What facilities exist in the codebase/tools to inspect git history and associate changes with commits (high level capabilities only; focus on what data is available)?

**Answer**
PAW’s workflow and agent instructions assume access to standard git data via command-line git operations, including:
- Current branch name.
- Working tree status (staged/unstaged changes).
- Commit history (commit SHAs, messages, ordering; and typically timestamps/author info when using `git log`).
- Diffs for a range of commits or working tree changes.
- Upstream tracking and divergence (ahead/behind counts).

In addition, the extension code includes utilities to:
- Validate whether the current workspace is a git repository.
- Detect whether there are uncommitted changes.

**Evidence**
- Agent guidance across implementation/review/status agents referencing `git log`, `git diff`, `git status`, and upstream divergence checks.
- Git validation utilities in the extension codebase.

**Implications**
- “Commit-aware” checks can be based on commit SHAs, commit messages, and commit ordering/timestamps obtainable from git history.

---

### 9) Question
In local review strategy (no PRs), what artifacts or context are typically available to PAW-03B for “commit-aware” checks?

**Answer**
In local strategy:
- Work happens on the target branch (no intermediate Phase PRs).
- The standard implementation-workflow artifacts under `.paw/work/<work-id>/` are still present when produced by earlier stages (e.g., `WorkflowContext.md`, `ImplementationPlan.md`, and often `Spec.md`/`SpecResearch.md` depending on workflow mode).
- Commit-aware context is the local git history on the target branch (commits the Implementer created and the Reviewer may add for documentation/polish).
- There are no Phase PR comments/threads to cross-reference; review completion is typically documented in `ImplementationPlan.md` notes (per PAW-03B guidance).

**Evidence**
- Implementation workflow documentation describing local strategy.
- PAW-03A/PAW-03B instructions for local strategy (work and pushes on target branch; documenting completion in the plan).

**Implications**
- In local strategy, “commit-aware” behavior is driven by git history + artifacts, rather than PR metadata and review threads.

---

### 10) Question
Are there any existing tests or fixtures related to PAW-03B behavior that would be impacted by adding plan/spec drift detection?

**Answer**
- There are unit tests for the extension’s agent template loading and for the handoff tool’s agent-name enumeration (which includes PAW-03B), but there are no dedicated automated tests that validate the detailed behavior/content of the PAW-03B agent prompt.
- Changes to the PAW-03B agent prompt text would primarily affect:
  - Agent prompt linting/token discipline checks (run via the repository’s agent lint script when modifying agent files).
  - Documentation that describes or quotes expected PAW-03B outputs (if any).

**Evidence**
- Test suite coverage focused on template loading/handoff mechanics rather than agent prompt semantics.
- Repository scripts and contribution guidance calling for agent linting when changing agent files.

**Implications**
- Adding plan/spec drift detection instructions to PAW-03B is unlikely to break TypeScript unit tests, but it should be validated via the agent lint workflow and any documentation cross-references.

---

## Open Unknowns
- None identified from internal documentation and agent instructions for the scope of these questions.

## User-Provided External Knowledge (Manual Fill)
- [ ] None
