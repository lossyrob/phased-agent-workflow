---
name: paw-pr
description: Final PR activity skill for PAW workflow. Creates comprehensive final PR to base branch with pre-flight validation, scaled descriptions, and merge guidance.
---

# Final PR

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), allowing user interaction for PR description and final checks.

Create the final PR merging all implementation work to the base branch (from WorkflowContext.md) after pre-flight validation.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Run pre-flight validation checks
- Execute stop-tracking operation for `commit-and-clean` lifecycle mode
- Create comprehensive PR description (scaled to complexity)
- Open final PR from target branch to main
- Provide merge and deployment guidance

## Pre-flight Validation

Before creating the PR, verify and report status. Block on failures unless user explicitly confirms (except hard blockers — those cannot be overridden).

### Required Checks

**Phase Implementation**:
- All phases in ImplementationPlan.md marked complete
- All phase PRs merged (prs strategy) or commits pushed (local strategy)
- Target branch exists with implementation commits
- No unresolved phase candidates (`- [ ]` items in `## Phase Candidates`) — **hard blocker**: do NOT resolve or bypass; report to orchestrator to run Candidate Promotion Flow before retrying

**Artifacts Exist** (check existence per Workflow Mode):
- CodeResearch.md (required: all modes)
- ImplementationPlan.md (required: all modes)
- Spec.md (required: full mode; optional: minimal/custom)
- SpecResearch.md (optional: all modes)
- Docs.md (required: full mode; optional: minimal/custom)

**Branch Status**:
- Target branch up to date with base branch (from WorkflowContext.md, defaults to `main`)
- No merge conflicts

**Build/Tests**:
- Latest build passes on target branch (if applicable)
- All tests passing

**Scratch Ignore Markers**:
- No tracked scratch ignore markers under `.paw/work/<work-id>/` scratch areas
- Scratch ignore markers (`.gitignore` files used to keep workflow/planning/reviews output local-only) must be removed from the index before PR creation if they became tracked

**Open Questions Resolved**:
- SpecResearch `## Open Unknowns` → resolved in Spec or clarified
- CodeResearch `## Open Questions` → resolved in Plan or code
- ImplementationPlan `## Open Questions` → empty
- Unresolved items → block and report with recommendation

## Workflow Mode Handling

### Full Mode
- Reference all artifacts: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md
- PRs strategy: Include links to intermediate PRs (Planning, Phase, Docs)
- Local strategy: Describe work directly from commits

### Minimal Mode
- Reference only core artifacts: CodeResearch.md, ImplementationPlan.md
- Check Spec.md and Docs.md existence before including
- Local strategy only (enforced)

### Custom Mode
- Dynamically check which artifacts exist
- Adapt references based on Custom Workflow Instructions

## Artifact Lifecycle Handling

Detect lifecycle mode using the same hierarchy as `paw-transition`: WorkflowContext.md `Artifact Lifecycle:` field → legacy field mapping (`artifact_tracking: enabled`/`track_artifacts: true` → `commit-and-clean`; `disabled`/`false` → `never-commit`) → `.gitignore` with `*` fallback → default `commit-and-clean`.

Scratch ignore markers are local-only lifecycle markers even in `commit-and-clean` or `commit-and-persist` workflows. Never intentionally commit `.paw/work/<work-id>/.gitignore` or nested scratch-area markers such as `planning/.gitignore`, `reviews/.gitignore`, or review-output directory markers. If any are tracked, remove them from the git index before creating the final PR.

### Stop-Tracking Operation (`commit-and-clean` only)

Execute **before** PR creation. Skip gracefully if no tracked `.paw/` files exist (idempotent).

1. Record the current HEAD commit SHA — this is the "last artifact commit" for PR description links
2. `git rm --cached -r .paw/work/<work-id>/` — remove from index, preserve local files
3. Create `.paw/work/<work-id>/.gitignore` containing `*` — this file self-ignores (the `*` matches the `.gitignore` itself), so it stays untracked
4. `git commit -m "Stop tracking PAW artifacts for <work-id>"` — only the index deletions from step 2 are committed. Do NOT stage the `.gitignore` file.
5. Verify: `git status` shows no tracked `.paw/` files or scratch ignore markers; `.gitignore` exists locally and is not tracked

Log each step so the user sees what's happening.

### PR Description by Lifecycle Mode

- **`commit-and-clean`**: Include Artifacts section with link to the recorded last-artifact-commit SHA (e.g., `tree/<sha>/.paw/work/<work-id>/`)
- **`commit-and-persist`**: Include Artifacts section with direct links to artifacts on the target branch
- **`never-commit`**: Omit Artifacts section; summarize key information in PR body

## PR Description Formats

**Scale description to change complexity.** Simple fixes need brief summaries; major features need comprehensive sections.

### Simple Changes

For bug fixes, small features: title with `[Work Title]` prefix, close issue, brief summary, changes list, testing status, PAW footer.

### Complex Changes

For large features, architectural changes, multi-phase implementations:

Include these elements as appropriate:
- Summary: Overview of what PR delivers and key design decisions
- Changes: Detailed changes with context and rationale
- Testing: Coverage notes, verification performed
- Breaking Changes: Migration guidance if applicable
- Deployment: Feature flags, rollout strategy, dependencies
- Artifacts: Links to workflow artifacts (per lifecycle mode — see Artifact Lifecycle Handling)

Footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`

### PRs Strategy Sections

When intermediate PRs exist, include:
- Planning section referencing Planning PR
- Implementation Phases listing Phase PRs
- Documentation section referencing Docs PR

### Local Strategy Sections

When no intermediate PRs:
- Implementation Summary describing work from commit history
- Focus on what was implemented, not which PRs

## PR Creation

**Final PR context requirements**:
- Source: `<target_branch>` (from WorkflowContext.md)
- Target: `<base_branch>` (from WorkflowContext.md, defaults to `main`)
- Title format: `[<Work Title>] <description>`
- Body: Scaled description per formats above
- Issue linking: Include Issue URL from WorkflowContext.md

## Merge Guidance

After PR creation, provide:
- Summary of what reviewers should focus on
- Deployment considerations (if any)
- Next steps for completion

## Quality Checklist

- [ ] All pre-flight checks pass (or user confirmed proceed)
- [ ] PR description complete with all relevant sections
- [ ] All artifact links valid (per lifecycle mode)
- [ ] Scratch ignore markers are not tracked in the final PR diff
- [ ] Intermediate PR links included (if prs strategy)
- [ ] Breaking changes documented (or stated "None")
- [ ] Issue URL linked in PR body

## Guardrails

- Do NOT modify code or documentation
- Do NOT approve or merge PRs
- Do NOT address review comments (Implementer handles this)
- Do NOT guess artifact locations—verify existence

## Completion Response

Report back:
- Final PR URL
- Pre-flight validation summary
- Items for reviewer attention
- Merge readiness assessment

Next steps: Address PR feedback via `address comments`, then merge to complete workflow.
