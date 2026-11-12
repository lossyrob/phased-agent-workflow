---
name: paw-review-workflow
description: Orchestrates PAW Review for significant, thorough reviews; use the user's intent to distinguish it from generic code or PR reviews.
---

# PAW Review Workflow

Execute this heavyweight workflow when the user's request or context indicates they want a significant, thorough review. For a generic code or PR review without evidence of that broader intent, use the standard review path rather than delegating or creating artifacts.

You are the orchestrator. Your project and user instructions stay in force. Stages run in subagents; you track the review in your todo store, check every result, and own every action on the PR platform.

Files referenced below live in `references/` next to this file.

## Host rules

1. Build the complete todo graph before any other work.
2. Start any unblocked todo. Mark it in progress when you start it and done as soon as its evidence is in hand, before starting anything it blocks. Delegate each stage with the brief below; never write a stage's artifact yourself.
3. A subagent's return is a claim. Verify it against the files on disk before closing the todo.
4. Close a todo only with its evidence in hand. Cancel one only when the user tells you to.
5. The configured review mode runs as configured, through its provider, or the review blocks.
6. Only you create, change, or submit reviews and comments on the PR platform. Subagents read only: they never commit, push, or post.
7. Never hand the review to another PAW Review agent or session. Subagents run one stage each and never load this skill.
8. Stop only when the graph is complete, a todo needs a user decision, or the user asks. A pending review is terminal unless the user asks for a further change.
9. Report final status from live platform state.

## Preflight

Do this directly, as the `preflight` todo.

1. Identify each target: GitHub PR (URL or number), Azure DevOps PR (organization, project, repository, PR), or local branch (ask for the base branch if you cannot determine it). Multi-repo: two or more PRs, PR links to different repositories, or several repositories in the workspace.
2. Classify the review platform as `github`, `azure-devops`, or `local`.
3. Determine output capability from the available tools and context. Do not probe Azure DevOps APIs, identities, permissions, or submission endpoints solely for this preflight.
4. Resolve the requested output action: GitHub default `pending`; Azure DevOps and local default `artifact-only`; explicit submission is `submit` with `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`.
5. Resolve feedback scope: `all` by default, or the user's explicit scope or output filter.
6. Resolve authorization as `explicit`, `absent`, or `ambiguous`, with the platform-qualified target and current head.
7. If authorization is ambiguous or an explicitly requested mutation is unavailable, report the conflict before analysis. Continue artifact-only only after the requested action is resolved.
8. Resolve the review configuration below and collect the project and user instructions that apply; both go into briefs.

Precedence: integrity invariants (evidence, target and head identity, finalized-comment state, platform integrity) first; then explicit user direction; then defaults. GitHub reviews are pending by default. Submit only with explicit authorization for the exact target, head, pending review, and event, followed by live revalidation. Repeating the same authorization for the same target, head, and event confirms it. A head change invalidates authorization and requires fresh analysis and authorization.

Artifact directory: `.paw/reviews/<identifier>/`. Identifier: `PR-<number>`; multi-repo `PR-<number>-<repo-slug>` (last segment of the repository name, lowercase, special characters removed); local: the branch name, lowercase, `/` → `-`.

## Review configuration

The review provider block, shared with `paw-workflow`:

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

PAW Review runs `single-model` (default) and `society-of-thought`. For any other mode, tell the user it is unavailable here and ask; never substitute. Defaults: `models: none`, `specialists: all` (never choose a subset yourself), `interaction: parallel`, `perspectives: none`, `perspective_cap: 2`. Also resolve `interactive`: `false` (default), `true`, or `smart` — whether `paw-sot` pauses for the user on trade-offs.

## Todo graph

Create one todo per row whose condition holds, with the listed dependencies, in your dependency-aware todo store (Copilot CLI: `todos` and `todo_deps` SQL tables). If your store has no dependencies, keep this order and write `blocked by: <id>` in each item. Write the review configuration into the evaluation todo's description.

| Id | Condition | Blocked by | Evidence to close |
|----|-----------|------------|-------------------|
| `preflight` | always | — | Target, head, output action, authorization and configuration resolved; conflicts reported |
| `understanding` | always | `preflight` | `ReviewContext.md` with `Preflight Status: passed`; `ResearchQuestions.md` |
| `baseline` | always | `understanding` | `CodeResearch.md` |
| `derived-spec` | always | `baseline` | `DerivedSpec.md` with no open questions |
| `impact` | `single-model` | `derived-spec` | `ImpactAnalysis.md` |
| `gap` | `single-model` | `impact` | `GapAnalysis.md` |
| `sot` | `society-of-thought` | `derived-spec` | `REVIEW-<specialist>*.md` per specialist and `REVIEW-SYNTHESIS.md` |
| `correlation` | multi-repo | every PR's `gap` or `sot` | `CrossRepoAnalysis.md` in the primary PR's directory |
| `feedback` | always | last of the above | `ReviewComments.md` with status `draft` |
| `critique` | always | `feedback` | An assessment for every comment |
| `finalize` | always | `critique` | Status `finalized`; every comment has a `**Final**:` marker |
| `post` | always | `finalize` | GitHub: pending review ID read back from GitHub and recorded in `ReviewComments.md` (plus submitted ID and event when authorized). Otherwise: manual posting instructions in `ReviewComments.md` |

Multi-repo: create the todos from `understanding` to `post` once per PR, suffixed `:<identifier>`; every `feedback` is also blocked by `correlation`.

## Stages

| Todo | Skill | Mode | Inputs |
|------|-------|------|--------|
| `understanding` | `paw-review-understanding` | initial | Target, preflight fields, review configuration |
| `baseline` | `paw-review-baseline` | | `ReviewContext.md`, `ResearchQuestions.md` |
| `derived-spec` | `paw-review-understanding` | resume | `ReviewContext.md`, `CodeResearch.md` |
| `impact` | `paw-review-impact` | | Understanding artifacts |
| `gap` | `paw-review-gap` | | Understanding artifacts, `ImpactAnalysis.md` |
| `correlation` | `paw-review-correlation` | | Every PR's artifact directory |
| `feedback` | `paw-review-feedback` | initial | All prior artifacts |
| `critique` | `paw-review-critic` | | `ReviewComments.md`, all prior artifacts |
| `finalize` | `paw-review-feedback` | critique response | `ReviewComments.md` with assessments, all prior artifacts |

`sot` and `post` run in this session, never in a subagent: see the sections below.

## Delegation

Start each stage as a general-purpose subagent with this brief. Do not paste artifact contents; subagents read from disk.

```text
Activity: <skill name> (<mode>)
Load the `<skill name>` skill first and follow it, with the contract in <absolute path to references/activity-contract.md>.
Review target: <platform, repository and PR, or local branch>; base <branch> at <commit>; head <branch> at <commit>
Artifact dir: <absolute path to .paw/reviews/<identifier>/>
Host instructions: <project and user rules that apply, verbatim>
Inputs: <artifact paths>
Configuration: <preflight fields and review configuration; for understanding>
Done when: <the todo's evidence>
Limits: read the PR platform only — never create, edit, or submit reviews or comments; do not commit, push, edit todos, or load the paw-review-workflow skill; leave the checkout on the branch and commit you found it on, with uncommitted files untouched.
Return: the return block in activity-contract.md.
```

## Acceptance

Before closing a todo, check on disk:

- Listed artifacts exist, are non-empty, and meet the todo's evidence.
- The checkout is on the branch and commit it was on before the stage, and the user's uncommitted files are unchanged.
- `derived-spec`: no open questions. `finalize`: every comment has a `**Final**:` marker.

A failed check is a revision: delegate the stage again with the specific gap. A `blocked` or `needs-decision` return leaves the todo open; resolve it from the target and the artifacts if you can, and ask the user only for a real decision.

## Society-of-thought

Review context: `type` `diff`; `coordinates` `git diff <base commit>...<head commit>` and the paths of `ReviewContext.md`, `CodeResearch.md`, `DerivedSpec.md`; `output_dir` the artifact directory; `interactive` from the configuration.

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

## Posting

For `post`, load the `paw-review-github` skill and follow it in this session. It posts only comments marked ready, leaves the review pending without explicit authorization, revalidates repository, PR, live head, pending review ID, and event immediately before any authorized submission, and treats a submitted review as terminal. For Azure DevOps or local reviews without executable capability, it writes manual posting instructions instead. Multi-repo: one review per PR, each its own authorization boundary.

## Completion

Query the todo store for todos not marked done; close or resolve each before reporting. Report:

- Artifact locations
- GitHub: pending or submitted review ID (from live state), event when submitted, comment counts
- Azure DevOps or local: preflight result and where the manual posting instructions are
- Multi-repo: cross-repo findings (contracts analyzed, mismatches, deployment order)
- Comments generated, modified per critique, and skipped per critique
- Next steps only when the review remains pending or artifact-only
