# PAW Specification

This file described PAW v1: workflow modes, review strategies with planning, phase and docs PRs, review policies, and a stage-per-skill architecture. PAW v2 replaced that design. The v1 text is in the git history of this file.

PAW v2 is specified in:

- [PAW v2 Design](docs/specification/v2/design.md) — activities, host rules, todo graph, contracts, configuration, presets, artifacts, git and lifecycle, compatibility
- [Invariant Catalogue](docs/specification/v2/invariants.md) — guarantees and their regression tests
- [Runtime Capabilities](docs/specification/v2/runtime-capabilities.md) — runtime support and what has been verified
- `skills/paw-workflow/` — the workflow skill and its `references/` (configuration, review providers, presets, activity briefs, procedures, v1 context reader)

User guides: [Workflows](docs/guide/two-workflows.md), [Configuration and Presets](docs/guide/workflow-presets.md), [Migrating from v1](docs/guide/migration.md).

## Artifact Lifecycle

`artifact_lifecycle` controls how `.paw/work/<work-id>/` is tracked in git: `commit-and-clean` (default; committed during the run, untracked by the final PR procedure with `git rm --cached -r .paw/work/<work-id>/`), `commit-and-persist` (stays tracked), or `never-commit` (never staged).

**Scratch ignore markers are local-only lifecycle markers**:

- `.gitignore` files that keep workflow areas local-only (for example `.paw/work/<work-id>/.gitignore` or `.paw/work/<work-id>/reviews/.gitignore`) are never committed.
- If any scratch ignore marker becomes tracked, remove it from the git index before commit or final PR creation.
