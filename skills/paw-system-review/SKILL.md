---
name: paw-system-review
description: "Experimental, artifact-only whole-system review of planning artifacts or implementation changes using four independent reasoning approaches and evidence-based adjudication. Use only when the caller explicitly selects paw-system-review; not a default review route or a replacement for PAW Review or paw-sot."
---

# Experimental System Review

Run in the calling session as review lead. Produce artifacts, not source changes or provider feedback. Do not invoke PAW Review, `paw-sot`, or a full PAW initialization workflow.

## Inputs and boundaries

Establish these inputs with the caller before writing or delegating:

| Input | Required information |
|-------|----------------------|
| Target | `planning` or `implementation`; repository/source location and exact document revisions or change coordinates |
| Intent and context | Available requirements, planning documents, supported operating assumptions, and useful caller-supplied workstream context; distinguish authority from inference |
| Output directory | Explicit caller-owned, target- and run-specific directory authorized for these artifacts |
| Verification permissions | Allowed reads, checks, and artifact/scratch writes; use read-only analysis when execution permission is absent |
| Model settings | Optional explicitly authorized settings; otherwise use caller/harness defaults |

- Accept minimal planning input, including a supplied proposal without named PAW files. Record actual inputs, missing context, and reduced coverage; do not fabricate required documents.
- Use the exact authorized output directory. A caller may select a fresh directory under `.paw/reviews/<target>/system-review/<mode>/<run>/`, an existing work item's reviews area, or an external artifact area. Do not initialize workflow state, alter ignore files, or silently write into the reviewed checkout. Preserve existing runs; request a fresh directory if outputs would collide.
- Review does not authorize source edits, checkout switching, fetches, dependency installation, or other side effects. Inspect prospective checks for writes or external effects; execute only within caller permissions, using authorized scratch surfaces when needed. Otherwise report the limitation or request permission.
- Both modes are artifact-only: never create pending or submitted provider reviews, post comments, or change issue/PR state. Return control to the caller without invoking posting, apply-fix, scheduling, comparative judging, or owner-routing workflows.
- Exclude prior or concurrent review findings, including comparison runs, through finalization. Only this run's own findings enter remedy assessment and adjudication.
- Treat supplied context as evidence with stated authority. Return unresolved authority questions to the caller; do not invent owners or contact others.

## 1. Compact shared evidence map

Write `EvidenceMap.md` before the independent passes:

- Identify the exact target: repository, base/head commits and diff scope for an implementation; document versions and current-source revision for planning. Include relevant planning documentation with an implementation when available.
- Bind mutable inputs to their actual content, using hashes or authorized snapshots. Include staged, unstaged, and relevant untracked content when in scope; a branch name or HEAD alone does not identify a working-tree review. Pin supporting document revisions too.
- Describe changed or proposed behavior, authoritative requirements, entry points and consumers, state ownership and lifecycle boundaries, and established project patterns. Cite source locations and evidenced relationships.
- Distinguish **owner-stated requirements**, **documented guarantees**, **observed behavior**, and **inference**. Code cannot establish its own intended specification merely by being copied into a derived spec; a document's existence alone does not prove owner approval.
- Record unavailable evidence and open questions. Share navigation and evidenced relationships, not an anticipated-bug list or an interpretation reviewers must adopt. Keep the map compact; no whole-repo census, exhaustive map, arbitrary finding/line/contract counts, or zero-open-question gate.

Whole-system scope follows the relevant causal chain, without a fixed one-hop dependency limit. It does not mean reading everything.

## 2. Fixed independent passes

Read [reviewer guidance](references/reviewer-guidance.md) from this skill's installed directory. References are filesystem resources, not separate loadable skills. If only SKILL.md text is available, resolve the installed reference or ask the caller to supply it; do not invent its contents.

Create exactly four separate general-purpose reviewer contexts, one per approach below. Run them in parallel when supported; isolated sequential execution is acceptable. If separate contexts are unavailable, report incomplete execution rather than silently substitute a single-context review.

| Approach | Reference section | First-pass artifact |
|----------|-------------------|---------------------|
| Forward behavioral reasoning | `forward` | `REVIEW-FORWARD.md` |
| Counterexample search | `counterexample` | `REVIEW-COUNTEREXAMPLE.md` |
| Relational reasoning | `relational` | `REVIEW-RELATIONAL.md` |
| Simplicity and proportionality | `simplicity` | `REVIEW-SIMPLICITY.md` |

Provide each reviewer:

- The pinned target and mode, available intent/context, evidence map, verification permissions, exact assigned output path, and authorized model settings.
- The reference's **Shared review rules** and only that reviewer's approach section, inlined or via an accessible absolute path. Explicitly assign the first-pass task, not this lead orchestration skill; no recursive delegation.
- Instructions to independently inspect relevant source and contracts and pursue consequential context absent from the map. The approach guides reasoning, not domain boundaries: everyone may cross correctness, security, lifecycle, performance, and release concerns.
- Instructions not to read other reviewers' findings, prior review findings, or concurrent comparison-run findings during the first pass. Do not forward early results or findings through updates to the shared map.
- Instructions to durably write their report and return only its path and completion status. Preserve the simplicity context for the bounded remedy assessment.

Use caller/harness defaults unless explicit authorized model settings are supplied. Record requested settings separately from any model identity/settings actually exposed by the harness; mark unavailable resolved identity as unknown. Do not infer it from a persona or model's self-description.

Wait until **all four initial reports are durably written and complete** before sharing findings or starting remedy assessment. A clean report is valid; completion means the assigned pass finished with limitations recorded, not exhaustive coverage. If a report is missing or incomplete, preserve the available reports, write `REVIEW-SYNTHESIS.md` using the final-report requirements below to identify incomplete participation and coverage, and return without claiming completion or crossing this barrier.

## 3. Adjudication and bounded remedy assessment

After the barrier, read all initial reports. Give the same simplicity reviewer the other reviewers' reports and proposed remedies, its original report, and the reference's **Remedy assessment** instructions. Reuse its context where supported; otherwise reconstitute that role from its original task and report in an isolated context and record the discontinuity. Do not rerun its first pass.

Produce `REMEDY-ASSESSMENT.md` separately; never overwrite the original first-pass artifacts. Assess the proposed remedies once, rather than launch another full review or forced debate. If there are no remedies, record that explicitly. If the assessment cannot complete, retain the reports and mark the final result incomplete.

Adjudicate using evidence:

- Check decisive premises against pinned source/contracts or bounded authorized checks. Separate a supported defect from an unverified remedy; do not dismiss a valid defect because its proposed fix is excessive.
- Examine obligations and factual premises before resolving tradeoffs. Neither majority vote nor an unverified security label overrides evidence; do not automatically let "security" defeat a supported simplification argument.
- Distinguish recommendations that challenge agent-inferred mechanisms or stricter risk posture from proposals to revise explicit owner-approved obligations. You may recommend reconsideration, not authorize rewriting an owner decision or waiving a mandatory constraint.
- Retain, revise, merge, reject, or leave findings unresolved with source-report references and reasons, including disagreements and remedy-assessment results. Use local finding identifiers such as `FORWARD-1` for traceability, not a new tracking system.
- Resolve narrow uncertainties through bounded checks, not recurring full reviews or new rounds to invent deeper objections. No finding quotas. State incomplete work and evidence gaps even when no actionable findings survive.

Before finalizing, check that mutable inputs still match the recorded versions. Never mix revisions silently or treat a stale/incomplete run as current complete coverage. If evidence drifted, identify affected claims and label coverage stale or incomplete; preserve the run without automatically rerunning. A review of an unchanged pinned historical target remains about that target, not a claim about the latest revision.

Write `REVIEW-SYNTHESIS.md` with the result first, followed by:

- Actual method (`paw-system-review`, experimental), mode, target/revisions, and available inputs.
- Reviewer participation, context reuse/discontinuity, available model settings and unknowns, completion status, coverage, and limitations.
- Adjudicated findings with severity, confidence, evidence, minimum complete corrections, and traceable dispositions for every initial finding, including merged/rejected/unresolved items and preserved dissent.
- Decisive verification performed and its results, checks not permitted or not performed, and decisions requiring caller authority.

Return the final report path and a concise completion/limitation status. Stop; artifacts confer no authority to apply fixes or publish feedback.
