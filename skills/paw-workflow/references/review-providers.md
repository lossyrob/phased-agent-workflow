# Review Providers

Run the provider named in the review todo. Launch every reviewer yourself; never ask a subagent to launch reviewers.

| Todo | Output dir | Reviews |
|------|------------|---------|
| `plan-review` | `<work dir>/reviews/planning/` | `ImplementationPlan.md`, plus `Spec.md` and `CodeResearch.md` if they exist |
| `final-review` | `<work dir>/reviews/` | `git diff <base>...<target>` and the plan |
| `review:<unit>` | `<work dir>/reviews/<unit>/` | That unit's commits; always `single-model` |

Before the first review, create `<work dir>/reviews/.gitignore` containing `*`. Never stage it.

## single-model

Delegate one `review` activity with the target (`plan`, `unit <unit>`, or `final`), output path `<output dir>/REVIEW.md`, and the diff range.

Evidence: `REVIEW.md`.

## multi-model

1. For each model in `models`, start one `review` subagent with the `model` parameter set to that model and output path `<output dir>/REVIEW-<model>.md`. Start them in parallel.
2. When all have returned, delegate one `review` activity with target `synthesis`, the per-model files as inputs, and output path `<output dir>/REVIEW-SYNTHESIS.md`.
3. Resolve findings from the synthesis.

Evidence: one `REVIEW-<model>.md` per model and `REVIEW-SYNTHESIS.md`.

## society-of-thought

Review context: `type` `artifacts` for `plan-review`, `diff` for `final-review`; `coordinates` the reviewed items from the table above, as paths and diff range; `output_dir` the output dir; `interactive` `false`.

<!-- shared:sot-invocation -->
1. Load the `paw-sot` skill and follow it in this session, never in a subagent, with that review context and these fields from the block:

    | `paw-sot` field | Block field |
    |-----------------|-------------|
    | `specialists`, `perspectives`, `perspective_cap` | Same name |
    | `interaction_mode` | `interaction` |
    | `specialist_models` | `models` |

2. Skip `paw-sot` moderator mode.

If `paw-sot` cannot be loaded or does not produce `REVIEW-SYNTHESIS.md`, the todo stays open and the workflow is blocked: report it to the user. Never substitute other reviewers.

Evidence: the per-specialist `REVIEW-<specialist>*.md` files and `REVIEW-SYNTHESIS.md`.
<!-- /shared -->

Resolve findings from `REVIEW-SYNTHESIS.md`.

## Resolving findings

Resolve without asking the user:

- `must-fix`, `should-fix` → revision to the subagent that produced the work (`specify` for `Spec.md`, `plan` for the plan, an `implement` subagent for code), then verify the fix.
- `consider` → apply if cheap and clearly right; otherwise note it for the PR description.
- A finding that needs a product decision, or a trade-off → `needs-decision`; ask the user.

After fixing any `must-fix`, re-review: `single-model` runs again; for `multi-model` and `society-of-thought`, delegate one `review` activity with target `recheck`, the synthesis as input, and output path `<output dir>/REVIEW-RECHECK.md`.
