# Procedure: Final PR

Run as host, in order. Stop and report if a step fails.

## 1. Pre-flight

- Every todo except `final-pr` is done, including `candidate:*` and `revise:*`.
- Each configured review left its provider's evidence (`REVIEW.md`, or `REVIEW-SYNTHESIS.md` for `multi-model` and `society-of-thought`) in `reviews/planning/` and `reviews/`.
- On the target branch. `git status --short` shows only the user's own uncommitted files noted during setup.
- The project's test, lint, and build commands pass on the current HEAD.
- Every unit in `ImplementationPlan.md` is delivered in the repository.

## 2. Stop tracking artifacts (`commit-and-clean` only)

Skip if `git ls-files .paw/work/<work-id>/` is empty.

1. Record `git rev-parse HEAD` as the last artifact commit.
2. `git rm --cached -r .paw/work/<work-id>/` — exactly this path. Never `git rm` on `.paw/` or `.paw/work/`, and never without `--cached`.
3. Write `.paw/work/<work-id>/.gitignore` containing `*`. Do not stage it.
4. `git commit -m "Stop tracking PAW artifacts for <work-id>"`, with any trailer the project instructions require.
5. Verify: `git ls-files .paw/work/<work-id>/` is empty; the files still exist on disk; `git ls-files .paw/work/` still lists every other work item it listed before.

## 3. Push

`git push -u origin <target-branch>`.

## 4. Create the pull request

One `gh pr create` from the target branch to the base branch. Never create a second PR; if one exists for the branch, update it.

- Title: `[<Work Title>] <short description>`
- Body:
    - **Summary**: what changed and why.
    - **Task**: link to the issue or work item, or the prompt.
    - **Changes**: by area, scaled to the size of the diff.
    - **Validation**: commands run and results.
    - **Review**: providers that ran, verdicts, findings fixed, findings deferred with reasons.
    - **Artifacts**: `commit-and-clean` → link to `.paw/work/<work-id>/` at the last artifact commit; `commit-and-persist` → link on the branch; `never-commit` → omit.
    - **Breaking changes**: or "None".

## 5. Verify

Read the PR back (`gh pr view`) and confirm the URL, base, and head. Close `final-pr` with that URL.
