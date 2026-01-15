---
annotation-labels:
  - command-relationship
  - workflow-sequence
  - workflow-step
  - situational-context (NEW)
---

---
description: Create Linear ticket and PR for experimental features after implementation
---

<situational-context>
you're working on an experimental feature that didn't get the proper ticketing and pr stuff set up.

assuming you just made a commit, here are the next steps:
</situational-context>

<workflow-sequence>

<workflow-step step="1">
1. get the sha of the commit you just made (if you didn't make one, read `.claude/commands/commit.md` and make one)
</workflow-step>

<workflow-step step="2">
<command-relationship references=".claude/commands/linear.md">
2. read `.claude/commands/linear.md` - think deeply about what you just implemented, then create a linear ticket about what you just did, and put it in 'in dev' state - it should have ### headers for "problem to solve" and "proposed solution"
</command-relationship>
</workflow-step>

<workflow-step step="3">
3. fetch the ticket to get the recommended git branch name
</workflow-step>

<workflow-step step="4">
4. git checkout main
</workflow-step>

<workflow-step step="5">
5. git checkout -b 'BRANCHNAME'
</workflow-step>

<workflow-step step="6">
6. git cherry-pick 'COMMITHASH'
</workflow-step>

<workflow-step step="7">
7. git push -u origin 'BRANCHNAME'
</workflow-step>

<workflow-step step="8">
8. gh pr create --fill
</workflow-step>

<workflow-step step="9">
<command-relationship references=".claude/commands/describe_pr.md">
9. read '.claude/commands/describe_pr.md' and follow the instructions
</command-relationship>
</workflow-step>

</workflow-sequence>
