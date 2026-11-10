# Configuration

Resolve in this order; each step overrides the previous one for the fields it sets:

1. Defaults below.
2. Preset: the one the user named, else a user preset with `default: true`, else `standard`.
3. Settings the user stated in the task or this session.

## Presets

- Look up `~/.paw/presets/<name>.yaml` first, then `presets/<name>.yaml` next to this file.
- A preset's `config:` holds fields from the table below. `extends: <name>` applies that preset first.
- Old names: `quick`, `paw-lite` → `lite`; `auto` → `standard`; `auto-full` → `thorough`; `shaping-full` → `thorough` with `shaping: on`; `team` → `standard`. Tell the user which preset you used. For `team`, also tell them that PR-per-phase review no longer exists and the run produces one final PR.
- Unknown preset name or unknown field: tell the user, list the available presets, and ask before continuing.

## Fields

| Field | Values | Default |
|-------|--------|---------|
| `shaping` | `off`, `on`, `auto` (on when the task has no clear outcome or scope) | `auto` |
| `spec` | `off`, `on` | `off` |
| `research` | `inline` (inside planning), `dedicated` | `inline` |
| `planning.models` | list of models | session model |
| `plan_review` | review provider block | `mode: single-model` |
| `plan_checkpoint` | `off`, `on` | `off` |
| `implementation.phases` | `auto`, `single` | `auto` |
| `implementation.parallel` | `auto`, `off` | `auto` |
| `implementation.model` | model | session model |
| `phase_review` | `off`, `on` | `off` |
| `final_review` | review provider block | `mode: multi-model` |
| `artifact_lifecycle` | `commit-and-clean`, `commit-and-persist`, `never-commit` | `commit-and-clean` |
| `execution_mode` | `current-checkout`, `worktree` | `current-checkout` |
| `instructions` | free text | none |

Review provider block:

<!-- shared:review-provider-block -->
| Field | Values |
|-------|--------|
| `mode` | `off`, `single-model`, `multi-model`, `society-of-thought` |
| `models` | `multi-model`: two or more models. `society-of-thought`: `none`, a model pool, or `specialist:model` pairs |
| `specialists` | `all`, names, or `adaptive:<N>` (`society-of-thought` only) |
| `interaction` | `parallel`, `debate` (`society-of-thought` only) |
| `perspectives` | `none`, `auto`, or names (`society-of-thought` only) |
| `perspective_cap` | positive integer (`society-of-thought` only) |
<!-- /shared -->

Block defaults: `mode` per field above; `models` for `multi-model` the session model and one model from another vendor, for `society-of-thought` `none`; `specialists: all`; `interaction: parallel`; `perspectives: auto`; `perspective_cap: 2`.

## Models

Resolve every model intent ("latest GPT") to a concrete model name your runtime accepts. Record concrete names.

## Effects

- `implementation.phases: single` → tell the plan subagent to write exactly one unit.
- `implementation.parallel: off` → run `implement:*` units one at a time.
- `implementation.model` → pass it as the model of every `implement` subagent.
- `instructions` → add to the host instructions in every brief.

## WorkflowContext.md

~~~markdown
# WorkflowContext

- Work title: <title>
- Work id: <work-id>
- Task source: <issue link or "prompt">
- Base branch: <branch>
- Target branch: <branch>
- Preset: <name>

## Configuration

```yaml
<every field above with its resolved value; review blocks in full>
```
~~~
