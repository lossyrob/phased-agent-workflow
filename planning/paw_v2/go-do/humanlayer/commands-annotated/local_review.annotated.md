<!-- ANNOTATION METADATA
Labels used:
- <frontmatter> (NEW) - YAML frontmatter with metadata
- <mission-statement> - One-sentence description
- <workflow-sequence> - Container for workflow steps
- <workflow-step> - Individual step
- <error-handling> - How to handle errors
- <example> - Illustrative examples
- <input-format> (NEW) - Expected input format specification
-->

```markdown
<frontmatter>
---
description: Set up worktree for reviewing colleague's branch
---
</frontmatter>

# Local Review

<mission-statement>
You are tasked with setting up a local review environment for a colleague's branch. This involves creating a worktree, setting up dependencies, and launching a new Claude Code session.
</mission-statement>

## Process

<workflow-sequence>
When invoked with a parameter like `gh_username:branchName`:

<workflow-step step="1">
1. **Parse the input**:
   - Extract GitHub username and branch name from the format `username:branchname`
   - If no parameter provided, ask for it in the format: `gh_username:branchName`
</workflow-step>

<workflow-step step="2">
2. **Extract ticket information**:
   - Look for ticket numbers in the branch name (e.g., `eng-1696`, `ENG-1696`)
   - Use this to create a short worktree directory name
   - If no ticket found, use a sanitized version of the branch name
</workflow-step>

<workflow-step step="3">
3. **Set up the remote and worktree**:
   - Check if the remote already exists using `git remote -v`
   - If not, add it: `git remote add USERNAME git@github.com:USERNAME/humanlayer`
   - Fetch from the remote: `git fetch USERNAME`
   - Create worktree: `git worktree add -b BRANCHNAME ~/wt/humanlayer/SHORT_NAME USERNAME/BRANCHNAME`
</workflow-step>

<workflow-step step="4">
4. **Configure the worktree**:
   - Copy Claude settings: `cp .claude/settings.local.json WORKTREE/.claude/`
   - Run setup: `make -C WORKTREE setup`
   - Initialize thoughts: `cd WORKTREE && humanlayer thoughts init --directory humanlayer`
</workflow-step>
</workflow-sequence>

<error-handling>
## Error Handling

- If worktree already exists, inform the user they need to remove it first
- If remote fetch fails, check if the username/repo exists
- If setup fails, provide the error but continue with the launch
</error-handling>

<example>
## Example Usage

```
/local_review samdickson22:sam/eng-1696-hotkey-for-yolo-mode
```

This will:
- Add 'samdickson22' as a remote
- Create worktree at `~/wt/humanlayer/eng-1696`
- Set up the environment
</example>
```
