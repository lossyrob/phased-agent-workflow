# Procedure: Git

Applies to every commit you make as host. Subagent briefs carry the same rules.

- Before each commit, confirm the current branch is the target branch from `WorkflowContext.md`. If not, stop and switch; never commit elsewhere.
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
