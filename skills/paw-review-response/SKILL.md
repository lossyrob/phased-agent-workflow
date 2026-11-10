---
name: paw-review-response
description: PR review comment response mechanics for a PAW pull request. Provides TODO workflow, commit patterns, and reply format for addressing reviewer feedback.
---

# Review Response

## Review Comment Workflow

### 1. Read All Unresolved Comments

- Use GitHub MCP tools to fetch PR comments and conversation threads
- Identify which comments still require work:
  - Check for follow-up commits addressing the comment
  - Check for reviewer replies indicating resolution
  - Skip comments clearly already addressed
- If uncertain whether a comment needs work, include it and ask for clarification

### 2. Create TODOs for Comments

Create one TODO per comment (group small related comments together):

```
TODO: Address review comment [link/ID]
- What change is needed
- Which file(s) to modify
- Commit message reference
```

**Grouping guidelines:**
- Group comments affecting the same file or section
- Group comments addressing the same concern
- Keep complex comments as separate TODOs
- Each TODO = one focused commit

### 3. Address Comments Sequentially

Work through TODOs one at a time. For each:

1. **Make the changes** to address the comment
2. Stage `.paw/work/<work-id>/` files only if `WorkflowContext.md` sets `artifact_lifecycle` to `commit-and-persist`; never stage `.gitignore` files under `.paw/work/`
3. **Stage selectively**: `git add <file1> <file2>` (never `git add .`)
4. **Verify staged changes**: `git diff --cached`
5. **Commit** with message referencing the comment; never rewrite an existing commit (`--amend`, `rebase`, `reset`, force push)

**CRITICAL**: Complete each TODO's changes and commit before starting the next. Push and reply once verification passes. A subagent that makes the changes commits only; the host pushes and replies.

### 4. Verify Completion

- Ensure all review comments have been addressed
- Verify no open questions remain
- Run any applicable verification (tests, linting)

## Reply Format

Use this format when replying to review comments:

```
**🐾 [Activity] 🤖:**

[What was changed and commit hash reference]
```

Activity: `Implementation Reviewer`.

**Example:**

```
**🐾 Implementation Reviewer 🤖:**

Added the missing null check and updated the docstring. Commit def5678.
```

## Commit Message Format

Reference the review comment in commit messages:

```
Address review comment: [brief description]

[More detail if needed]

Ref: [PR comment URL or ID]
```

## Checklist Before Completion

- [ ] All unresolved review comments addressed
- [ ] Each comment addressed with focused commit
- [ ] Commits pushed to remote
- [ ] Replies posted to each addressed comment
- [ ] Verification passed (tests, lint)
