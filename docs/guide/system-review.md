# Experimental system review

`paw-system-review` is an opt-in, artifact-only review skill for planning proposals and implementation changes. It combines a compact evidence map, four independent broad review approaches, and evidence-based adjudication. Its quality equivalence to existing review methods and any latency improvement have **not been established**.

The skill does not replace PAW Review or `paw-sot`, change their defaults, or add a workflow gate. Select it explicitly by name in an agent session. It uses the existing CLI skill package and VS Code skill catalog; it needs a host that supports separate general-purpose reviewer contexts and an authorized artifact directory. It does not depend on VS Code extension state. If the host cannot provide separate contexts, the run is reported incomplete rather than silently reduced to one reviewer.

## Choosing a target

**Planning review** examines proposed behavior against current source, authoritative intent, contracts, and any supplied workstream context. A brief proposal is enough to start; `Spec.md`, `ImplementationPlan.md`, and `CodeResearch.md` are not prerequisites. Missing context limits coverage, and the review cannot verify implementation that does not yet exist.

**Implementation review** examines a fixed change or diff and relevant system behavior, using planning documentation when available. Supply exact base/head revisions or identify the working-tree content to capture. Supporting documents also need fixed versions. A branch name alone is not a stable target.

The caller supplies:

| Input | Purpose |
|-------|---------|
| Target type and coordinates | Identify the proposal/documents or implementation change and source location |
| Requirements and context | Separate owner-approved obligations from documented guarantees, observed behavior, and inference |
| Output directory | Authorize a fresh, target- and run-specific location owned by the caller |
| Verification permissions | Identify permitted reads, executable checks, and scratch writes |
| Optional model settings | Override caller/harness defaults only when explicitly authorized |

For example, ask an agent to load `paw-system-review` in planning mode, review a named proposal version against a specified source commit, and write artifacts to a supplied external directory. State that source reads and artifact writes are allowed but tests and other side effects are not. For implementation mode, replace the proposal coordinates with the exact diff and any supporting document versions.

An output directory can sit under `.paw/reviews/<target>/system-review/<mode>/<run>/` or an existing work item's reviews area when explicitly authorized. Neither location is created implicitly, and no full PAW workflow initialization is needed.

## Review method

The evidence map records navigation, relevant relationships, requirements, and open questions without preselecting likely bugs. Each reviewer independently checks source and contracts and can follow a consequential causal chain beyond the map. Whole-system scope does not require a whole-repository census or stop at a fixed dependency depth.

| Approach | Main question |
|----------|---------------|
| Forward behavioral reasoning | How are promised behaviors established and preserved? |
| Counterexample search | Which reachable conditions or failure sequences violate those obligations? |
| Relational reasoning | Which behaviors or contracts must agree, and do they? |
| Simplicity and proportionality | What is the simplest complete design under actual requirements and accepted operating assumptions? |

These are broad analytical approaches, not separate domain assignments. Every reviewer may pursue correctness, security, lifecycle, performance, or release consequences.

Simplicity is a first-class review concern. Material unjustified complexity can receive a MUST-FIX recommendation even when behavior is functionally correct. The reviewer must show the burden, insufficient justification, and a credible simpler complete alternative. Existing patterns are evidence rather than automatic owner approval; explicit owner decisions and mandatory constraints retain their authority. Both specifications and plans can be challenged during planning and implementation review, but recommending reconsideration does not authorize changing an owner's decision.

First-pass reviewers do not see one another's findings. After all four reports are durably complete, the lead checks the forward, counterexample, and relational reports for proposed remedies. If none exist, the lead writes `REMEDY-ASSESSMENT.md` as `not-needed`, with the reason, source-report references, and explicit lead attribution, without waking or reconstituting the simplicity reviewer. Remedies in the simplicity report alone do not trigger another reviewer call.

When peer remedies exist, the simplicity reviewer performs one bounded assessment. It distinguishes a valid defect with an oversized remedy from a finding premised on an unadopted requirement, and from complexity needed to preserve a required guarantee. Original reports remain unchanged in either case. The lead adjudicates factual premises and obligations, preserving disagreement rather than deciding truth by vote or by an unverified security label.

## Artifacts and limits

Each run produces seven files in the authorized output directory:

| Artifact | Contents |
|----------|----------|
| `EvidenceMap.md` | Fixed target identity, evidence categories, relevant relationships, and gaps |
| `REVIEW-FORWARD.md` | Independent forward-behavior report |
| `REVIEW-COUNTEREXAMPLE.md` | Independent counterexample report |
| `REVIEW-RELATIONAL.md` | Independent relational report |
| `REVIEW-SIMPLICITY.md` | Independent simplicity report |
| `REMEDY-ASSESSMENT.md` | Bounded simplicity assessment or lead-authored `not-needed` record when no peer remedies exist |
| `REVIEW-SYNTHESIS.md` | Adjudicated findings, traceable dispositions, participation, method, and limitations |

A partial run preserves available artifacts and identifies what did not complete; missing reports are not fabricated. Reports identify actual revisions and available model settings, leaving unexposed model identity unknown. Mutable inputs are checked for drift before completion. Historical coverage is not presented as coverage of the latest revision.

Review permission does not imply permission to edit source, switch checkouts, fetch, install dependencies, or execute checks with unapproved effects. Findings and remedies remain recommendations. The skill never posts comments, creates pending/submitted provider reviews, changes issue/PR state, applies fixes, or schedules follow-up reviews.

The repository's non-live checks cover the prompt contracts and packaging, not live reviewer compliance, discovery quality, or speed. A later paired evaluation can run this skill and a trusted method on the same fixed target, with separate output directories and no cross-run findings until both finish. Comparison, posting decisions, workflow routing, and evaluation orchestration remain outside this skill.
