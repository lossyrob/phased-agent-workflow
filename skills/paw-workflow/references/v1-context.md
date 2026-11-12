# PAW v1 WorkflowContext.md

A `WorkflowContext.md` without a `## Configuration` block was written by PAW v1 (`Field: value` lines). Convert it once, before rebuilding the graph.

## Field mapping

Start from the defaults in `configuration.md`, set `shaping: off`, then apply:

| v1 field | v2 |
|----------|----|
| `Work Title`, `Work ID`, `Base Branch`, `Target Branch` | Same header lines |
| `Issue URL`, else `Initial Prompt` | `Task source` |
| `Execution Mode` (absent → `current-checkout`) | `execution_mode` |
| `Workflow Mode: full` | `spec: on`, `research: dedicated` |
| `Workflow Mode: minimal` | `spec: off`, `research: inline` |
| `Workflow Mode: custom` | `spec: on` only if `Spec.md` exists; `research: dedicated` only if `CodeResearch.md` exists; `Custom Workflow Instructions` → `instructions` |
| `Review Strategy: prs` or `local` | One final PR from the target branch |
| `Review Policy` (or `Handoff Mode`): `final-pr-only`, `never`, `auto` | `plan_checkpoint: off` |
| `Review Policy` (or `Handoff Mode`): `every-stage`, `milestones`, `planning-only`, `always`, `manual`, `semi-auto` | `plan_checkpoint: on` |
| `Final Agent Review: disabled` | `final_review.mode: off` |
| `Final Agent Review: enabled` | `final_review.mode` = `Final Review Mode` (absent → `multi-model`) |
| `Final Review Models` | `final_review.models` (`multi-model`) |
| `Final Review Specialist Models`, `Specialists`, `Interaction Mode`, `Perspectives`, `Perspective Cap` | `final_review.models`, `specialists`, `interaction`, `perspectives`, `perspective_cap` (`society-of-thought`) |
| `Planning Docs Review: disabled` (absent → `disabled`) | `plan_review.mode: off` |
| `Planning Docs Review: enabled` | `plan_review` from the `Planning Review *` fields, as for final review |
| `Plan Generation Mode: multi-model` | `planning.models` = `Plan Generation Models` |
| `Implementation Model` (`none` → session model) | `implementation.model` |
| `Artifact Lifecycle` (absent → `commit-and-clean`) | `artifact_lifecycle` |
| `Repository Identity`, `Execution Binding`, `Session Policy`, `*Interactive`, `Remote`, `Artifact Paths`, `Additional Inputs` | Dropped |

`Preset` is `none (v1)`.

## Artifacts

- The plan is `ImplementationPlan.md`, or `Plan.md` from v1 PAW Lite. Its units are its `## Phase N:` sections (or work items). Do not rename or rewrite it.
- `## Phase Candidates` items still `- [ ]` become `candidate:<slug>` todos.

## Stop and ask

Tell the user, before continuing, when:

- a field value is not in the table;
- `Review Strategy: prs` left work on `<target>_plan`, `<target>_phase*`, or `<target>_docs` branches that is not on the target branch, or open PRs from them. List them; do not merge, close, or reuse them without the user's decision.

## Write

Replace `WorkflowContext.md` with the v2 format from `configuration.md` and commit it per the lifecycle (`references/procedures/git.md`). Tell the user the mapped configuration, that the run ends in one final PR, and which v1 settings were dropped.
