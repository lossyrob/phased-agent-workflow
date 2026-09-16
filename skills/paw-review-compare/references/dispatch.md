# Dispatch guidance

## Native settings and provenance

Treat `profiles.json` as comparison data, not a PAW API or host configuration file. Resolve the concrete assignment before launch. Inspect the available native task/session schema and pass `model`, `reasoning_effort`, and, for non-specialist stages, `context_tier` in its actual launch arguments. Hosts may expose these directly on a task or within a session's kickoff settings; use only the advertised shape.

Pass the resolved map and this dispatch contract to every lead. Each lead must apply it to its nested launches: specialist models/efforts come from the role map; understanding, baseline, feedback, critic, synthesis, debate summaries, adjudication, and assessment use the non-specialist settings. Do not assume nested inheritance, or let a specialist inherit the lead's effort accidentally. A reused context retains its assignment; if a host's follow-up mechanism cannot preserve it, expose the limitation.

Record requested settings, actual dispatched arguments, and exposed runtime metadata separately in `Run.md`. Logging a request is not proof of dispatch; dispatch is not proof of resolved runtime identity or capacity. Preserve unknowns. Never invent fields such as `Review Specialist Reasoning Effort` or assume `specialist_models` sets effort/context. If a required control is unavailable, record the blocked/nonconforming stage before dispatch rather than silently drop it. Preserve already-produced output if a fallback or override is observed; do not rerun automatically or count it as a conforming profile.

## Reference routing

### Implementation

Launch the fully qualified `paw-workflow:PAW-Review` custom agent in its own lead context using the non-specialist native settings. If that agent is unavailable, record a non-start; do not substitute a generic agent or run only SoT and label it full PAW Review.

Supply the pinned commit/diff and raw supporting documents, scope, allowed workspace/output paths, verification permissions, profile map, and explicit caller output direction. Require:

- Full understanding -> baseline research -> resumed understanding/derived specification -> SoT evaluation -> initial feedback -> critic -> critique response/finalization analysis.
- `Review Mode: society-of-thought`, never an outer profile ID.
- `Requested Output Action: artifact-only` even for GitHub targets, with no pending/submitted reviews, comments, or provider state changes. Keep actual platform identity; do not pretend GitHub is local or that provider capability is absent.
- Stop after finalizing local `ReviewComments.md`; **do not invoke `paw-review-github`** or another posting path. "Ready for GitHub posting" in an artifact is not authorization to post.
- All artifacts stay in this arm's authorized output area, overriding default artifact paths by explicit caller direction. Do not manually manufacture understanding/feedback artifacts in the comparison coordinator.

Explicit caller direction overrides PAW-owned output defaults; it does not waive integrity or authorization constraints. If the host/agent cannot honor artifact-only output, stop that arm before analysis. Verify this boundary in every nested delegation, not only the outer lead prompt.

The full reference includes baseline research. Use pinned-base read access when the activity can honor it, or an explicitly authorized independent workspace for checkout-based baseline analysis. Never switch a shared checkout, fetch missing commits without permission, or silently recompute a different merge-base/diff scope. If the route cannot consume the supplied exact diff, record the mismatch instead of comparing different changes.

The final report is `ReviewComments.md`, with its original critique history and final dispositions. Keep `REVIEW-SYNTHESIS.md` and earlier artifacts as supporting evidence; do not substitute the inner synthesis for the full workflow's final report.

### Planning

Use a separate general-purpose lead with non-specialist native settings. Load the existing `paw-sot` engine with `type: artifacts`, actual supplied proposal/document coordinates and relevant pinned existing source, and this arm's `output_dir`. Supplement framing with requirement traceability, assumption consistency, scope, feasibility, and completeness as relevant to the actual inputs.

This is the existing artifact-review route, not a PR review of nonexistent implementation. Do not launch PAW-Review, create a PR/diff, invent `Spec.md` or `ImplementationPlan.md`, or initialize workflow files. Do not invoke planning apply-fix/resolution workflows. Retain reduced-coverage limitations when documents are minimal. The final report is `REVIEW-SYNTHESIS.md`.

### SoT controls for both targets

| Existing PAW Review field (implementation) | Existing SoT context field | Value |
|------------------------------------------|----------------------------|-------|
| `Review Mode` | Route selection, not an engine field | `society-of-thought` |
| `Review Specialists` | `specialists` | Explicit comma-separated nine-role list from profiles |
| `Review Interaction Mode` | `interaction_mode` | `debate` |
| `Review Interactive` | `interactive` | `false` (existing PAW Review default) |
| `Review Specialist Models` | `specialist_models` | Concrete `specialist:model` pins from this case |
| `Review Perspectives` | `perspectives` | `none` for profile 1; `premortem,retrospective` for profile 2 |
| `Review Perspective Cap` | `perspective_cap` | `2` for profile 2 |

For planning, pass the SoT context fields directly, with `type: artifacts`, coordinates, and output directory. For implementation, require the lead to propagate the existing fields through understanding into the inner SoT context. Native reasoning/context controls remain separate from this table.

Resolve the exact nine built-in identities and their source files from the installed `paw-sot` references. Explicit names alone do not bypass project/user persona precedence; specialist frontmatter `model` can override model pins. Check resolved source/content and frontmatter, including shared rules and profile 2's two perspective sources. Report unintended customization/source overrides or roster drift before starting; do not edit installed files or silently count a different roster as requested. If the intended sources cannot be selected without modifying the installation, record a blocked reference arm.

Keep a specialist's concrete model/effort fixed across every debate round, continuation, and both perspective instances. The initial sweep uses nine unoverlaid instances for profile 1 and nine per perspective for profile 2, with **no extra overlays**: `none` must not become `auto` or `baseline`. Profile 2's cap permits both requested perspectives for each specialist, not an adaptive choice of one.

Preserve the existing SoT debate, synthesis, adaptive termination, continuation budgets, and tradeoff mechanics. Do not add arbitrary round limits, retry budgets, moderator invocations, or replacement reviewers. Record actual participation and call counts, not predicted full-round totals. Artifact-only direction also confines any SoT scratch ignore marker to the authorized arm output; no repository ignore edits.

## System routing

For either target, launch a separate general-purpose lead using non-specialist settings and explicitly load `paw-system-review` in the corresponding `planning` or `implementation` mode. Supply the same raw target/context and verification permissions, its own output directory, and concrete four-role model/effort map as authorized settings.

Preserve the fixed four independent first passes, original reports, evidence-based adjudication, and completion barrier. The final report is `REVIEW-SYNTHESIS.md`. Peer remedies trigger the existing one bounded simplicity assessment with its original model/effort; no peer remedies trigger the lead-authored `REMEDY-ASSESSMENT.md` `not-needed` record without waking/reconstituting a reviewer. Do not replace that rule with a mandatory extra call.
