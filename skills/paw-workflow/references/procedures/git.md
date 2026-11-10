# Procedure: Git

Applies to every commit you make as host. Subagent briefs carry the same rules.

- Before each commit, confirm the current branch is the target branch from `WorkflowContext.md`. If not, switch first (`git switch <target-branch>`; it carries the user's uncommitted files unchanged); never commit elsewhere.
- Stage by explicit path. Never `git add .`, `git add -A`, `git add -u`, or `git commit -a`.
- The user's uncommitted changes noted during setup are not yours. Never stage, modify, stash, or revert them.
- Check `git diff --cached --name-only` before committing. It must list only files this workflow changed.
- Artifact lifecycle decides `.paw/` staging:
    - `commit-and-clean`, `commit-and-persist`: stage files under `.paw/work/<work-id>/`.
    - `never-commit`: stage no `.paw/` files.
- `.gitignore` files under `.paw/work/<work-id>/` are local markers. Never stage them. If one is tracked, `git rm --cached <path>`.
- Never touch another work item's directory under `.paw/work/`.
- Commit messages follow the project and user instructions you hold.
- Never rewrite existing commits: no `--amend`, `rebase`, `reset --hard`, `commit-tree`, `update-ref`, or force push. Fix a wrong commit with a new commit.
- Push only in the final PR procedure.

## Execution checkout

- `current-checkout`: the checkout the session started in.
- `worktree`: at setup, `git worktree add -b <target-branch> <path> <base-branch>` with `<path>` = `<parent of repo root>/<repo dir name>-<work-id>`. That path is the execution checkout. Write the work directory and every file there, run every git command there (`git -C <path>`), and pass it in every brief. Never write, stage, commit, or switch branches in the caller checkout.
- Before each mutation in worktree mode, `git -C <path> rev-parse --show-toplevel` and `git -C <path> branch --show-current` must give the execution checkout and the target branch. If not, stop and report.
