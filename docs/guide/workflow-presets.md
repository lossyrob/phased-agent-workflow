# Configuration and Presets

PAW resolves a work item's configuration once, at setup, and records it in `WorkflowContext.md`. The configuration decides which todos exist; it never holds progress.

## How Configuration Is Resolved

Each step overrides the previous one for the fields it sets:

1. **Defaults** — the table below.
2. **Preset** — the one you named; otherwise a user preset marked `default: true`; otherwise `standard`.
3. **Your settings** — anything you state in the task or the session ("plan checkpoint on", "use worktree mode", "final review off").

PAW tells you which preset it used. An unknown preset name or field is reported, with the available presets, and PAW asks before continuing.

Model names can be given as intents ("latest GPT"); PAW resolves them to concrete model names your runtime accepts and records those.

## Fields

| Field | Values | Default |
|-------|--------|---------|
| `shaping` | `off`, `on`, `auto` (on when the task has no clear outcome or scope) | `auto` |
| `spec` | `off`, `on` | `off` |
| `research` | `inline` (inside planning), `dedicated` | `inline` |
| `planning.models` | list of models | session model |
| `plan_review` | review provider block | `mode: single-model` |
| `plan_checkpoint` | `off`, `on` | `off` |
| `implementation.phases` | `auto`, `single` (the plan has exactly one unit) | `auto` |
| `implementation.parallel` | `auto` (independent units may run in parallel), `off` | `auto` |
| `implementation.model` | model | session model |
| `phase_review` | `off`, `on` (a single-model review after each unit) | `off` |
| `final_review` | review provider block | `mode: multi-model` |
| `artifact_lifecycle` | `commit-and-clean`, `commit-and-persist`, `never-commit` | `commit-and-clean` |
| `execution_mode` | `current-checkout`, `worktree` | `current-checkout` |
| `instructions` | free text added to every subagent brief | none |

`WorkflowContext.md` also records the work title, work id, task source, base branch, target branch and preset.

## Presets

| Preset | Settings |
|--------|----------|
| `lite` | `shaping: off`, inline research, one implementation unit, single-model plan review, no phase review, single-model final review |
| `standard` (default) | The defaults above: single-model plan review, multi-model final review |
| `thorough` | `spec: on`, `research: dedicated`, planning with two models (latest GPT and latest Claude Opus), society-of-thought plan review (parallel), `phase_review: on`, society-of-thought final review (debate) |

`shaping: on` and `plan_checkpoint: on` can be added to any preset. The preset files live in `skills/paw-workflow/references/presets/`.

Start a work item with a preset by naming it: "paw this with lite", "implement #42 with thorough and plan checkpoint on". The `paw-lite` skill is the same as naming `lite`.

Old preset names still work and map as follows; PAW tells you which preset it used:

| Old name | Preset used |
|----------|-------------|
| `quick`, `paw-lite` | `lite` |
| `auto` | `standard` |
| `auto-full` | `thorough` |
| `shaping-full` | `thorough` with `shaping: on` |
| `team` | `standard`, with a notice that PR-per-phase review no longer exists |

### User Presets

Create `~/.paw/presets/<name>.yaml`. PAW looks there before the built-in presets, so a user preset with a built-in name replaces it.

```yaml
name: careful
description: Standard, but pause on the plan and review each unit
extends: standard
config:
  plan_checkpoint: on
  phase_review: on
  final_review:
    mode: society-of-thought
    interaction: debate
```

- `config:` holds fields from the table above, nested as shown.
- `extends: <name>` applies that preset first.
- `default: true` makes the preset apply when you name none.

User presets written for PAW v1 use field names that no longer exist; PAW reports them as unknown fields. See [Migrating from v1](migration.md#removed-options).

To see available presets, ask the PAW agent "what presets are available?".

## Review Providers

`plan_review` and `final_review` each take a provider block:

| Field | Values |
|-------|--------|
| `mode` | `off`, `single-model`, `multi-model`, `society-of-thought` |
| `models` | `multi-model`: two or more models. `society-of-thought`: `none`, a model pool, or `specialist:model` pairs |
| `specialists` | `all`, names, or `adaptive:<N>` (`society-of-thought` only) |
| `interaction` | `parallel`, `debate` (`society-of-thought` only) |
| `perspectives` | `none`, `auto`, or names (`society-of-thought` only) |
| `perspective_cap` | positive integer (`society-of-thought` only) |

Block defaults: for `multi-model`, `models` is the session model plus one model from another vendor; for `society-of-thought`, `models: none`, `specialists: all`, `interaction: parallel`, `perspectives: auto`, `perspective_cap: 2`.

| Mode | What runs | Output |
|------|-----------|--------|
| `off` | No review; the todo is not created | — |
| `single-model` | One review subagent | `REVIEW.md` |
| `multi-model` | One review subagent per model, in parallel, then a synthesis subagent | `REVIEW-<model>.md`, `REVIEW-SYNTHESIS.md` |
| `society-of-thought` | The `paw-sot` engine, run by the host, non-interactive | `REVIEW-<specialist>*.md`, `REVIEW-SYNTHESIS.md` |

Plan review output goes to `.paw/work/<work-id>/reviews/planning/`, final review output to `reviews/`, and phase review output to `reviews/<unit>/`. Phase review is always `single-model`. The `reviews/` directory is never committed.

A configured review runs through its provider or the workflow blocks: if `paw-sot` cannot run, PAW reports it rather than substituting other reviewers. After a `must-fix` is fixed, `single-model` reviews run again; `multi-model` and `society-of-thought` get one recheck against the synthesis (`REVIEW-RECHECK.md`).

See [Society-of-Thought Review](society-of-thought-review.md) for specialists, perspectives and interaction modes.

## Artifact Lifecycle

`artifact_lifecycle` controls git tracking of `.paw/work/<work-id>/`:

| Mode | During the run | At the final PR |
|------|----------------|-----------------|
| `commit-and-clean` (default) | Artifacts are committed on the target branch | PAW runs `git rm --cached -r .paw/work/<work-id>/`, writes a local `.gitignore` there, and commits the removal. The PR diff has no `.paw/` changes; the description links to the artifacts at the last commit that had them |
| `commit-and-persist` | Artifacts are committed | They stay in the repository |
| `never-commit` | No `.paw/` file is staged | Nothing to do |

`.gitignore` files under the work directory are local markers and are never committed. Only the work item's own directory is touched; other `.paw/work/` directories are left alone. In VS Code, **PAW: Stop Tracking Artifacts** switches a running work item to `never-commit`.

## Execution Mode

| Mode | Where PAW works |
|------|-----------------|
| `current-checkout` (default) | The checkout the session started in. PAW creates the target branch from the base branch and switches to it before committing; your uncommitted files come along unchanged and are never staged. |
| `worktree` | A new worktree: `git worktree add -b <target-branch> <parent of repo>/<repo dir>-<work-id> <base-branch>`. Every file, git command and brief uses that path; the checkout you started in is never written. Before each change PAW checks the worktree's top level and branch and stops if either is wrong. |

In VS Code, the extension creates (or reuses) the worktree itself, opens it in a new window, and starts the PAW chat there.
