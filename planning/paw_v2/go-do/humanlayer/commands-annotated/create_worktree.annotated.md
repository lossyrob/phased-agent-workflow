---
labels_used:
  - workflow-sequence
  - workflow-step
  - tool-guidance
  - input-collection-prompt
  - path-conventions (NEW)
  - confirmation-template (NEW)
---

---
description: Create worktree and launch implementation session for a plan
---

<workflow-sequence>

<workflow-step id="2">
2. set up worktree for implementation:
2a. read `hack/create_worktree.sh` and create a new worktree with the Linear branch name: `./hack/create_worktree.sh ENG-XXXX BRANCH_NAME`
</workflow-step>

<workflow-step id="3">
3. determine required data:

branch name
path to plan file (use relative path only)
launch prompt
command to run
</workflow-step>

<path-conventions>
**IMPORTANT PATH USAGE:**
- The thoughts/ directory is synced between the main repo and worktrees
- Always use ONLY the relative path starting with `thoughts/shared/...` without any directory prefix
- Example: `thoughts/shared/plans/fix-mcp-keepalive-proper.md` (not the full absolute path)
- This works because thoughts are synced and accessible from the worktree
</path-conventions>

<workflow-step id="3a">
<input-collection-prompt>
3a. confirm with the user by sending a message to the Human

<confirmation-template>
```
based on the input, I plan to create a worktree with the following details:

worktree path: ~/wt/humanlayer/ENG-XXXX
branch name: BRANCH_NAME
path to plan file: $FILEPATH
launch prompt:

    /implement_plan at $FILEPATH and when you are done implementing and all tests pass, read ./claude/commands/commit.md and create a commit, then read ./claude/commands/describe_pr.md and create a PR, then add a comment to the Linear ticket with the PR link

command to run:

    humanlayer launch --model opus -w ~/wt/humanlayer/ENG-XXXX "/implement_plan at $FILEPATH and when you are done implementing and all tests pass, read ./claude/commands/commit.md and create a commit, then read ./claude/commands/describe_pr.md and create a PR, then add a comment to the Linear ticket with the PR link"
```
</confirmation-template>

incorporate any user feedback then:
</input-collection-prompt>
</workflow-step>

<workflow-step id="4">
<tool-guidance>
4. launch implementation session: `humanlayer launch --model opus -w ~/wt/humanlayer/ENG-XXXX "/implement_plan at $FILEPATH and when you are done implementing and all tests pass, read ./claude/commands/commit.md and create a commit, then read ./claude/commands/describe_pr.md and create a PR, then add a comment to the Linear ticket with the PR link"`
</tool-guidance>
</workflow-step>

</workflow-sequence>
