---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Improve PR Git Workflow Practices

Perform research to answer the following questions.

Target Branch: feature/59-improve-pr-git-workflow
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/59
Additional Inputs: none

## Agent Notes

This feature enhances PR and git workflow automation across PAW agents. Key focus areas:
1. All PRs must link to original issue (Planning, Phase, Docs, Final)
2. PR titles/descriptions must differentiate partial vs final implementations
3. Prevent use of direct file push tools (GitHub MCP) - enforce git commands only
4. Improve commit messages with work title, phase number, PAW context
5. Final PR must close issue with `Fixes #N` syntax
6. Automate git housekeeping between phases (checkout target, pull)
7. Push target branch before Planning PR in PR review mode

Review strategy: `local` (direct commits to target branch, no intermediate PRs)
Workflow mode: `full` (standard spec and implementation process)

## Questions

### PR Creation and Formatting

1. How do agents currently create PRs (Planning, Phase, Docs, Final)? What tools/functions are used, and what parameters control title and description?

2. What is the current PR title format for Planning PRs, Phase PRs, Docs PRs, and Final PRs? Provide examples from agent files or recent PAW executions.

3. What is the current PR description structure for each PR type? Are there templates, and where are they defined?

4. Where is PR formatting logic located? Is it centralized in a module/function, or distributed across individual agent files?

### Commit Message Handling

5. Which agent(s) create commits during implementation? Where is commit message generation logic located?

6. What is the current commit message format used by the Implementer agent? Provide examples.

### Git Workflow and State Management

7. How does the Implementer agent currently handle git state when starting a new phase? Does it check current branch, sync status, or perform any automated git operations?

8. How does the Implementation Planner handle branch creation and pushing? At what point in the workflow does it push branches to remote?

9. What git commands or tools do agents currently use for branch management, commits, and pushes? Are there helper functions or utilities?

### GitHub MCP Capabilities

10. What GitHub MCP tools are available to agents that allow direct file pushes (bypassing local git commands)? List specific tool names and their purposes.

11. Where are GitHub MCP tools referenced or documented in agent files? Are there any current guardrails against using direct push capabilities?

### Issue Linking and Closure

12. How does the PR Agent (PAW-05) currently create the final PR? What parameters does it use for description?

13. Are there any existing mechanisms for linking PRs to issues in the current workflow? If so, where are they implemented?

### Optional External / Context

1. What are GitHub's documented best practices for PR descriptions linking to issues? (Specifically: `Fixes`, `Closes`, `Resolves` keywords vs `Part of`, `Related to`)

2. What Git commands are recommended for detecting whether local branch is behind remote (sync detection)?
