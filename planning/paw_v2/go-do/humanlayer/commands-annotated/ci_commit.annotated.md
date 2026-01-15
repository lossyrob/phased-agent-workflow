---
labels_used:
  - agent-identity
  - workflow-sequence
  - workflow-step
  - commit-protocol
  - guardrail
---

---
description: Create git commits for session changes with clear, atomic messages
---

# Commit Changes

<agent-identity>
You are tasked with creating git commits for the changes made during this session.
</agent-identity>

## Process:

<workflow-sequence>
<workflow-step id="1">
1. **Think about what changed:**
   - Review the conversation history and understand what was accomplished
   - Run `git status` to see current changes
   - Run `git diff` to understand the modifications
   - Consider whether changes should be one commit or multiple logical commits
</workflow-step>

<workflow-step id="2">
2. **Plan your commit(s):**
   - Identify which files belong together
   - Draft clear, descriptive commit messages
   - Use imperative mood in commit messages
   - Focus on why the changes were made, not just what
</workflow-step>

<workflow-step id="3">
3. **Execute upon confirmation:**
<commit-protocol>
   - Use `git add` with specific files (never use `-A` or `.`)
</commit-protocol>
<guardrail>
   - Never commit the `thoughts/` directory or anything inside it!
   - Never commit dummy files, test scripts, or other files which you created or which appear to have been created but which were not part of your changes or directly caused by them (e.g. generated code)
</guardrail>
<commit-protocol>
   - Create commits with your planned messages until all of your changes are committed with `git commit -m`
</commit-protocol>
</workflow-step>
</workflow-sequence>

## Remember:
<commit-protocol>
- You have the full context of what was done in this session
- Group related changes together
- Keep commits focused and atomic when possible
- The user trusts your judgment - they asked you to commit
</commit-protocol>
<guardrail>
- **IMPORTANT**: - never stop and ask for feedback from the user.
</guardrail>
