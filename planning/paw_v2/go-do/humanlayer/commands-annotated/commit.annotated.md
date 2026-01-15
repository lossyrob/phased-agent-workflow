---
description: Create git commits with user approval and no Claude attribution
labels_used:
  - agent-identity
  - workflow-sequence
  - workflow-step
  - behavioral-directive
  - guardrail
  - commit-protocol
  - verification-step
  - communication-pattern
new_labels: []
---

# Commit Changes

<agent-identity>
You are tasked with creating git commits for the changes made during this session.
</agent-identity>

## Process:

<workflow-sequence>

<workflow-step id="1">
1. **Think about what changed:**
<verification-step>
   - Review the conversation history and understand what was accomplished
   - Run `git status` to see current changes
   - Run `git diff` to understand the modifications
</verification-step>
<behavioral-directive>
   - Consider whether changes should be one commit or multiple logical commits
</behavioral-directive>
</workflow-step>

<workflow-step id="2">
2. **Plan your commit(s):**
<commit-protocol>
   - Identify which files belong together
   - Draft clear, descriptive commit messages
   - Use imperative mood in commit messages
   - Focus on why the changes were made, not just what
</commit-protocol>
</workflow-step>

<workflow-step id="3">
3. **Present your plan to the user:**
<communication-pattern>
   - List the files you plan to add for each commit
   - Show the commit message(s) you'll use
   - Ask: "I plan to create [N] commit(s) with these changes. Shall I proceed?"
</communication-pattern>
</workflow-step>

<workflow-step id="4">
4. **Execute upon confirmation:**
<commit-protocol>
   - Use `git add` with specific files (never use `-A` or `.`)
   - Create commits with your planned messages
</commit-protocol>
<verification-step>
   - Show the result with `git log --oneline -n [number]`
</verification-step>
</workflow-step>

</workflow-sequence>

## Important:

<guardrail>
- **NEVER add co-author information or Claude attribution**
- Commits should be authored solely by the user
- Do not include any "Generated with Claude" messages
- Do not add "Co-Authored-By" lines
</guardrail>
<behavioral-directive>
- Write commit messages as if the user wrote them
</behavioral-directive>

## Remember:

<behavioral-directive>
- You have the full context of what was done in this session
- Group related changes together
- Keep commits focused and atomic when possible
- The user trusts your judgment - they asked you to commit
</behavioral-directive>
