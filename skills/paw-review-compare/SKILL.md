---
name: paw-review-compare
description: "Experimental artifact-only comparison of four fixed PAW SoT and system-review configurations on the same pinned planning or implementation target. Use only when explicitly asked to run paw-review-compare; not a default review, publication route, or workflow gate."
---

# Experimental Review Comparison

Coordinate one comparison case, not a new review engine. Leave existing PAW Review, `paw-sot`, and `paw-system-review` definitions and defaults unchanged. Do not install plugins, change live configuration, schedule cases, or publish feedback.

Read [profiles](references/profiles.json) and [dispatch guidance](references/dispatch.md) from this skill's installed directory before dispatch. These are filesystem references, not loadable skills or PAW configuration files. Resolve missing references through the installed skill location or caller; do not invent their contents.

## Case contract

Establish the caller's inputs before creating output or launching work:

- **Target:** `planning` artifacts against relevant existing source, or an `implementation` commit/diff. Record repository/source identity, exact source revisions and diff semantics, requirements/supporting-document versions, declared scope, and supported operating assumptions. Hash or snapshot mutable inputs on authorized surfaces. A branch name or HEAD alone does not pin a working tree.
- **Selection:** The caller chooses which planning reviews are enabled and which implementation changes enter comparison. Do not enable reviews, infer node policy, or manufacture planning files or a PR/diff for a proposal.
- **Case ordinal:** A caller-supplied positive integer within the caller's comparison series. Reject missing, fractional, or nonpositive ordinals before assignment. No global counter, polling, or persistent counter service.
- **Permissions:** Identical raw-source reads, permitted checks, workspace preparation, and artifact/scratch writes for all four arms. Review implies no permission for fetches, checkout switching, dependencies, source edits, or external effects. Obtain missing permission or report a limitation.
- **Output:** A fresh caller-authorized case directory. Never overwrite old cases or write into an unauthorized reviewed checkout.

Write `Case.md` with the input pins, scope, permissions, ordinal, profile/reference versions, concrete assignments, neutral arm labels, and eventual report paths and terminal status. Keep this shared record free of derived context or findings until every arm is terminal.

Use four separate output areas, `arms/A/` through `arms/D/`, assigning the four profiles in their reference order. Give each arm only the common raw inputs, its own assignment and output area, and the dispatch contract. Do not provide sibling paths or `Case.md` as arm input. Each arm builds its **own** evidence map, derived specification, research questions, and review artifacts as its method requires. Never pass those derived artifacts or another run's findings between arms.

## Deterministic profiles

The four configuration IDs identify outer comparison arms; they are **not valid inner `Review Mode` values**. Use the routes and existing PAW fields in dispatch guidance.

Read the assignment table for each profile's `method`. For ordinal `n`, choose `slots[(n - 1) % slots.length]`. Zip that row with `roles`; each cell indexes the profile's two-element `models` array. Persist the resulting role -> model/effort map before dispatch; do not merely record the pool. Do not reorder roles or change the map within a case.

- SoT has the nine named built-in specialists, not `all` discovery or an adaptive subset. Its two slots alternate the 5/4 specialist split. Model stays fixed for every round and both perspectives of a specialist. Profile 2's first sweep is 18 instances split 10/8, alternating 8/10 on the next case; never claim 9/9 or double the roster for balance.
- System review has four fixed approaches with a 2/2 split. Its four slots rotate the paired roles so no role is permanently assigned one model. Preserve the simplicity reviewer's model/effort for any remedy assessment or context reconstitution.
- Use `non_specialist` settings for review leads, understanding, baseline, feedback, critic, debate summaries, synthesis, adjudication, and the assisting assessor. Specialist context tier is not specified by these profiles; retain the caller/host default and record what is exposed.

## Independent execution

Use four isolated lead contexts. Parallel execution is preferred when authorized and supported; sequential isolated arms remain valid with timing limitations recorded. Choose available task/session mechanisms, not an assumed factory or runtime. If a required mechanism is unavailable, record the non-start rather than substitute a shared context.

Provide independent review workspaces when checkout or artifact collisions require them, using only authorized preparation. Read-only pinned source can be shared when no arm can mutate it. Baseline checkout operations must never affect another arm or the caller's checkout. Output directories alone do not isolate checkout state.

Before starting each arm, confirm its artifact-only boundary and native dispatch controls using the dispatch reference. Apply requested settings at **every native launch**, including nested stages and debate/continuation calls. A heading or a model pool does not wire reasoning effort or context tier.

Each arm writes `Run.md` beside its own review artifacts, recording:

- Profile, actual route/stages, pinned target, concrete role map, and resolved skill/persona/perspective sources and revisions.
- Requested settings, observed dispatch arguments, and runtime identity/context capacity as separate evidence categories. Unknown runtime metadata stays unknown; `long_context` is not proof of an exact one-million-token capacity.
- Available invocation identifiers, completion/failure state, deviations, final-report path, and coverage limitations. An invocation that failed to start provides no review coverage.
- Observed start/end and elapsed time, phase/call/usage data when exposed, and their source. Do not infer missing tokens, costs, or timings.

The coordinator receives only status, artifact paths, and dispatch/measurement evidence until all arms are terminal. For non-starts it may write an explicitly coordinator-attributed `Run.md`, never a fabricated method report. Preserve partial artifacts and failures. Do not silently rerun a costly arm, add retries, replacement reviewers, perspectives, or debate limits. Any later retry is a separately authorized case, not an overwrite.

Before accepting completion, verify target pins, requested stages, roster/assignment conformance, and final-artifact existence using available evidence. Preserve output but flag drift, unsupported settings, source overrides, or fallbacks as deviations; do not claim the requested configuration was executed. Stop an arm if the artifact-only or isolation boundary cannot be honored. Keep unavailable evidence distinct from proven nonconformance.

## Independent assessment

Only after **all four arms have finalized reports or recorded terminal incompleteness**, delegate to a separate assisting assessor using `non_specialist` settings. No results or judgments may flow back into an arm; do not trigger fixes or another review.

Give the assessor the pinned raw target/contracts, verification permissions, neutral labels, and original reports (or explicit absence and partial-output pointers). When practical, withhold `Case.md`, profile labels, model names, and timing metadata until the assessor has written its content/evidence assessment in `COMPARISON.md`; then supply them for conformance and measurement analysis. Preserve raw artifacts and note recognizable method/path/style cues. Do not claim a blind experiment. Record presentation order and any inability to separate these views.

Provide these assessment instructions:

- Compare checkable valid findings and consequential system-level catches, unsupported claims/false positives, missed or duplicated findings, remedy proportionality and burden, actionability, preserved uncertainty, and documented coverage. More comments or greater confidence is not automatically better.
- Group the same underlying issue across reports without equating different consequences or remedies. For each material claim, link the originating report/finding, evidence and authority, reachability/assumptions, disposition and confidence, and minimum complete correction where relevant. Preserve disagreement and unresolved factual or authority questions.
- Check decisive disputed claims against pinned source and authoritative contracts through bounded permitted verification. Do not conduct an additional whole-codebase review. Missing verification remains a limitation. Attribute assessor-only discoveries separately; never retroactively credit them to an arm.
- An absent finding is not proof that an arm analyzed and cleared that behavior. Distinguish not reported, documented coverage, incomplete work, and an evidence-supported miss; avoid fabricated recall or accuracy scores without a defensible ground truth.
- Assess whether fixes preserve required guarantees with proportionate lifecycle/operational/maintenance burden. Keep a valid defect even when its proposed remedy is excessive. Distinguish explicit owner obligations from inferred requirements or stricter posture.
- Separate observed elapsed time from actual review work. Identify queue, concurrency, interruptions, and incomplete trace effects. Do not invent tokens, dollar savings, accuracy, or universal performance from one case or incomplete measurements.

Write a concise `COMPARISON.md` with links to all four original final reports (or explicit missing-report status linked to `Run.md`), evidence-backed per-finding comparisons/dispositions, conformance/completeness/measurement limitations, and a reasoned recommendation that may be inconclusive. Include unresolved consequential findings across **all** arms, not just the preferred method, plus assessor-only discoveries. Separate content judgments from configuration/timing interpretation.

Recommend or request human selection; record a choice only if actually supplied. Selecting a report does not dispose of consequential findings from another arm. Method preference is not current-head acceptance; do not relabel system-review output as a PAW Review report. This is one case in repeated evaluation, not a universal winner declaration.

Return the comparison path and any incomplete/blocked status. Stop at artifacts and operator decision. Publication, provider-specific markers, node state, readiness, design/CI gates, and owner routing belong to the caller/integration layer; this comparison does not satisfy those gates or authorize posting.
