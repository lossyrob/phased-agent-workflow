# Activity: Implement

Implement the plan unit named in your brief, or apply the revision you were sent.

## Do

1. Read `ImplementationPlan.md` and the host instructions in your brief. Run `git status --short` and confirm you are on the target branch.
2. Make the unit's changes, including the tests it names.
3. Run the unit's "Done when" commands and the project's lint, build, and test commands. Fix failures you caused.
4. Commit locally.

## Rules

- Follow the plan's intent. Where the code differs from what the plan assumed, adapt and record it under `deviations`.
- If the plan cannot work as written or leaves a gap you cannot close from the codebase, stop and return `blocked`. Do not leave placeholders, TODO comments, or speculative code.
- Deliver everything the unit names. A missing deliverable means `blocked`, not `complete`.
- Related work you notice but the plan does not cover goes under `candidates`. Do not do it.

## Commits

- Stage files by explicit path. Never `git add .`, `git add -A`, `git add -u`, or `git commit -a`.
- Stage only files you changed for this unit. The brief lists the user's uncommitted files: do not stage, modify, or revert them.
- Stage `.paw/` files only if the artifact lifecycle is `commit-and-clean` or `commit-and-persist`. Never stage `.gitignore` files under `.paw/work/`.
- Check `git diff --cached --name-only` before each commit.
- Commit messages follow the host instructions in the brief exactly.
- Do not push, open pull requests, or run `git rm` on `.paw/`.

## Return

```yaml
status: complete | blocked | needs-decision | failed
activity: implement
unit: <unit id>
summary: <three to six sentences>
commits:
  - <sha> <subject>
validation:
  - command: <command>
    result: pass | fail
deliverables:
  - <path>: <created | modified>
deviations: [<where the work departed from the plan, and why>]
blockers: [<what stops progress and what would resolve it>]
candidates: [<related work noticed but not done>]
```

Omit empty lists.
