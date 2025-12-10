# Spec Research: Improve PR Git Workflow Practices

## Summary

Research completed on PAW's current PR creation, git workflow, and commit message practices across all workflow agents. Key findings:

**PR Creation**: Agents create PRs through natural language instructions to GitHub Copilot (no centralized PR function). All four PR-creating agents (Planner, Reviewer, Documenter, Final PR) have distributed formatting logic. PR titles use consistent `[Work Title]` prefix format, but only Final PR attempts issue linking (without GitHub auto-close keywords). Planning, Phase, and Docs PRs have no issue linking mechanism.

**Commit Messages**: Three agents create commits (Implementer, Reviewer, Planner) with generic "detailed commit message" guidance. No standardized format exists; messages lack work title, phase number, or PAW context indicators.

**Git Workflow**: Agents use direct git CLI commands (no abstraction layer). Implementer performs basic branch verification but no automated sync operations between phases. After merging Phase PRs, users must manually checkout target branch and pull changes before starting next phase.

**GitHub MCP Tools**: Agents have access to `mcp_github_create_or_update_file`, `mcp_github_push_files`, and `mcp_github_delete_file` for direct remote operations. No guardrails exist preventing these tools from bypassing proper git workflow.

Three open unknowns require clarification on target branch push timing, commit message format preferences, and phase transition automation scope.

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

## Research Findings

### Question 1: How do agents currently create PRs (Planning, Phase, Docs, Final)? What tools/functions are used, and what parameters control title and description?

**Answer**: Agents create PRs through natural language instructions to GitHub Copilot, which then routes to GitHub MCP tools. There is no centralized PR creation function. Each agent (Implementation Planner, Implementation Review Agent, Documenter, Final PR Agent) describes the PR operation naturally with context including source branch, target branch, title, and body, and Copilot handles the actual tool invocation.

**Evidence**: 
- PAW-02B Impl Planner: "Create Planning PR (`<target_branch>_plan` → `<target_branch>`): Title: `[<Work Title>] Planning: <brief description>`"
- PAW-03B Impl Reviewer: "Create Phase PR... Title: `[<Work Title>] Implementation Phase <N>: <brief description>`"
- PAW-04 Documenter: "Create Docs PR... Title: `[<Work Title>] Documentation`"
- PAW-05 PR Agent: "Open a PR from `<target_branch>` to `main`... **Title**: `[<Work Title>] <description>`"

All agents include instructions like "Copilot will route to the appropriate platform tools based on workspace context."

**Implications**: PR creation logic is distributed across agent files. Changes to PR formatting (titles, descriptions, issue links) require updates to multiple agent files, not a single centralized function.

### Question 2: What is the current PR title format for Planning PRs, Phase PRs, Docs PRs, and Final PRs? Provide examples from agent files or recent PAW executions.

**Answer**: All PR titles use a consistent format with Work Title prefix from WorkflowContext.md:

- **Planning PR**: `[<Work Title>] Planning: <brief description>` (PAW-02B Impl Planner)
- **Phase PR**: `[<Work Title>] Implementation Phase <N>: <brief description>` (PAW-03B Impl Reviewer)
  - Example: `[Auth System] Phase 1: Database schema and migrations`
- **Docs PR**: `[<Work Title>] Documentation` (PAW-04 Documenter)
  - Example: `[Auth System] Documentation`
- **Final PR**: `[<Work Title>] <description>` (PAW-05 PR Agent)
  - Example: `[Auth System] Add user authentication system`

**Evidence**: Agent file instructions for PR title formatting extracted from PAW-02B, PAW-03B, PAW-04, and PAW-05 agent files.

**Implications**: PR titles already distinguish PR types through prefixes (Planning, Implementation Phase N, Documentation), but don't explicitly indicate "partial implementation" or "not for final review" status.

### Question 3: What is the current PR description structure for each PR type? Are there templates, and where are they defined?

**Answer**: Each agent defines its own PR body format inline, not as separate templates:

- **Planning PR** (PAW-02B): Simple format with "**🐾 Implementation Planner 🤖:**" header, summary of deliverables, artifact links, and PAW footer
- **Phase PR** (PAW-03B): Includes phase objectives, changes made, testing performed, artifact links, and PAW footer
- **Docs PR** (PAW-04): Summary of Docs.md (detailed feature reference), project documentation updates, artifact links, and PAW footer
- **Final PR** (PAW-05): Comprehensive template with sections: Summary, Related Issues, Artifacts, Implementation Phases, Documentation Updates, Changes Summary, Testing, Acceptance Criteria, Deployment Considerations, Breaking Changes

All PR bodies end with: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`

**Evidence**: PR body formatting instructions embedded directly in PAW-02B, PAW-03B, PAW-04, and PAW-05 agent files.

**Implications**: PR descriptions have no centralized template files. Issue linking must be added to each agent's inline formatting instructions.

### Question 4: Where is PR formatting logic located? Is it centralized in a module/function, or distributed across individual agent files?

**Answer**: PR formatting logic is fully distributed across individual agent files. There is no centralized PR formatting module, function, or template file.

**Evidence**: Each of the four PR-creating agents (PAW-02B Impl Planner, PAW-03B Impl Reviewer, PAW-04 Documenter, PAW-05 PR Agent) contains inline instructions for PR title and body formatting specific to their PR type.

**Implications**: Systematic changes to PR formatting (like adding issue links) require coordinated updates across all four agent files. No single point of control for consistent PR formatting.

### Question 5: Which agent(s) create commits during implementation? Where is commit message generation logic located?

**Answer**: Three agents create commits during implementation:

1. **PAW-03A Implementer**: Creates commits for functional code and tests. Commits locally without pushing.
2. **PAW-03B Impl Reviewer**: Creates commits for documentation, polish, and small refactors. Pushes all commits (Implementer's + its own) to remote.
3. **PAW-02B Impl Planner**: Creates commits for planning artifacts when addressing Planning PR review comments.

**Evidence**: 
- PAW-03A: "Commit all changes to the local branch with a detailed commit message"
- PAW-03B: "Commit improvements... Use clear commit messages: `docs: add docstrings for <context>` for documentation, `refactor: remove unused <parameter/code>` for small refactors"
- PAW-02B: "Commit with a message referencing the review comment"

**Implications**: Commit message format is not standardized. Each agent uses its own judgment for commit messages. No structured format including work title, phase number, or PAW context.

### Question 6: What is the current commit message format used by the Implementer agent? Provide examples.

**Answer**: The Implementer agent uses generic "detailed commit message" guidance without a specific format. Instructions say "Commit all changes to the local branch with a detailed commit message" and "Commit with a clear message that includes links to the review comment(s) addressed" for PR review responses.

No examples or templates provided. The agent decides message format based on context.

**Evidence**: PAW-03A Implementer agent file sections on "Committing and Pushing" and "For Addressing PR Review Comments."

**Implications**: Commit messages lack consistent structure. Without guidance, the Implementer may not include work title, phase information, or PAW context. Messages are likely inconsistent across different implementation sessions.

### Question 7: How does the Implementer agent currently handle git state when starting a new phase? Does it check current branch, sync status, or perform any automated git operations?

**Answer**: The Implementer agent performs basic branch verification but no automated sync operations when starting a new phase:

**Getting Started steps**:
1. Reads WorkflowContext.md for Target Branch, Work Title, Work ID, etc.
2. Opens ImplementationPlan.md to identify active/next phase
3. Determines phase branch name (e.g., `feature/finalize-initial-chatmodes_phase3`)
4. Checks current branch: `git branch --show-current`
5. If not on correct phase branch, creates and switches: `git checkout -b <feature-branch>_phase[N]`
6. Verifies on correct branch: `git branch --show-current`

**No automated operations for**:
- Syncing with remote (no `git pull` or `git fetch`)
- Detecting if phase PR was merged
- Transitioning from merged phase PR back to target branch

**Evidence**: PAW-03A "Getting Started" section with branching logic by review strategy.

**Implications**: After merging a phase PR, users must manually: (1) checkout target branch, (2) pull changes, (3) then run implement prompt for next phase. The Implementer doesn't automate this housekeeping.

### Question 8: How does the Implementation Planner handle branch creation and pushing? At what point in the workflow does it push branches to remote?

**Answer**: The Implementation Planner's branching behavior depends on Review Strategy:

**For prs strategy**:
- Ensures on planning branch: checks `git branch --show-current`, creates if needed: `git checkout -b <target_branch>_plan`
- Stages planning artifacts: `git add .paw/work/<feature-slug>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}` and prompt files
- Verifies with `git diff --cached`, commits, and pushes: `git push -u <remote> <target_branch>_plan`
- Creates Planning PR after push

**For local strategy**:
- Ensures on target branch: checks current branch, checkouts target if needed: `git checkout <target_branch>`
- Stages ALL planning artifacts: `git add .paw/work/<feature-slug>/`
- Commits with summary message, pushes: `git push <remote> <target_branch>`
- Skips Planning PR creation

**Evidence**: PAW-02B Impl Planner "Completion" section with "DETERMINE REVIEW STRATEGY AND COMMIT/PUSH (REQUIRED)" instructions.

**Implications**: Issue #59 item 7 states "agents don't push the target branch and that causes the first planning PR to fail." This suggests the target branch may not exist on remote when Planning PR is created in prs strategy, but the agent instructions show it should push the planning branch before PR creation.

### Question 9: What git commands or tools do agents currently use for branch management, commits, and pushes? Are there helper functions or utilities?

**Answer**: Agents use standard git CLI commands directly through terminal execution. No helper functions or wrapper utilities:

**Branch management**:
- `git branch --show-current` - Check current branch
- `git checkout -b <branch>` - Create and switch to new branch
- `git checkout <branch>` - Switch to existing branch
- `git branch --list <branch>` - Check if branch exists (Impl Reviewer)

**Staging and commits**:
- `git add <file1> <file2>` - Selective staging (NEVER `git add .`)
- `git diff --cached` - Verify staged changes before commit
- `git commit` - Commit staged changes
- `git status` - Check git state
- `git status --porcelain` - Programmatic status check (Status agent)

**Remote operations**:
- `git push <remote> <branch>` - Push branch
- `git push -u <remote> <branch>` - Push and set upstream
- `git pull` - Mentioned for sync but no systematic use
- `git fetch <remote>` - Used by Baseline Researcher for review workflow

**Evidence**: Git commands documented across PAW-02B, PAW-03A, PAW-03B, PAW-04, PAW-X, PAW-R1B agent files.

**Implications**: All git operations use direct CLI commands. No abstraction layer that could enforce conventions or provide centralized git workflow logic.

### Question 10: What GitHub MCP tools are available to agents that allow direct file pushes (bypassing local git commands)? List specific tool names and their purposes.

**Answer**: Based on agent mode instructions, the following GitHub MCP tools allow direct file operations bypassing git:

1. **`mcp_github_create_or_update_file`** - Create or update a single file in a GitHub repository remotely
2. **`mcp_github_push_files`** - Push multiple files to a GitHub repository in a single commit
3. **`mcp_github_delete_file`** - Delete a file from a GitHub repository

These tools operate directly on GitHub without local git operations, creating commits remotely.

**Evidence**: Tool names found in mode instructions that list GitHub MCP capabilities. Tool descriptions indicate they work on GitHub repositories directly.

**Implications**: These tools bypass version control workflow and can create commits without local git history. Agents have access to these capabilities but should never use them for PAW workflow changes.

### Question 11: Where are GitHub MCP tools referenced or documented in agent files? Are there any current guardrails against using direct push capabilities?

**Answer**: GitHub MCP tools are referenced in specific contexts but NO guardrails exist against using direct push tools:

**References found**:
- PAW-02B Impl Planner: "Use `github mcp` tools to push the commit" when addressing Planning PR review comments
- PAW-02B Impl Planner: "Use `github mcp` tools to reply to the review comment"
- PAW-01A Specification: "ALWAYS use the **github mcp** tools to interact with issues and PRs"
- PAW-02A Code Researcher: "Use the **github mcp** tools to interact with issues and PRs"
- PAW-04 Documenter: "No individual comment replies (GitHub MCP tool limitations)"

**No guardrails found against**:
- Using `mcp_github_create_or_update_file` instead of git commands
- Using `mcp_github_push_files` instead of git workflow
- Direct file operations bypassing version control

**Evidence**: Searched agent files for "mcp_github", "github mcp", "push_files", "create_or_update_file" - no prohibitions found.

**Implications**: Agents have unrestricted access to direct push tools. Without explicit guardrails, an agent could inadvertently use these tools instead of proper git workflow.

### Question 12: How does the PR Agent (PAW-05) currently create the final PR? What parameters does it use for description?

**Answer**: The PAW-05 PR Agent creates the final PR with the following process:

1. Runs comprehensive pre-flight validation checks (phases complete, docs merged, artifacts exist, branch up to date, build passing)
2. Reads all artifacts: ImplementationPlan.md, Spec.md, Docs.md, all Phase PRs
3. Crafts PR description using comprehensive template with sections:
   - Summary (from Spec.md)
   - Related Issues
   - Artifacts (links to all .paw/work files)
   - Implementation Phases (with Phase PR links)
   - Documentation Updates (with Docs PR link)
   - Changes Summary
   - Testing
   - Acceptance Criteria
   - Deployment Considerations
   - Breaking Changes
4. Opens PR from `<target_branch>` to `main` using natural language: "Open a PR from `<target_branch>` to `main`... Include comprehensive description... Use crafted description"
5. Title format: `[<Work Title>] <description>` where Work Title from WorkflowContext.md
6. Adds PAW footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`

**Evidence**: PAW-05 PR Agent file sections on "PR Description Template" and "Process Steps."

**Implications**: Final PR includes "Related Issues" section but doesn't specify using `Fixes #N` syntax to auto-close issues. Current format likely uses generic "Closes issue at <Issue URL>" without GitHub's auto-close keywords.

### Question 13: Are there any existing mechanisms for linking PRs to issues in the current workflow? If so, where are they implemented?

**Answer**: Only the Final PR Agent (PAW-05) has any mechanism for issue linking:

**Final PR Agent**:
- Includes "Related Issues" section in PR description template
- Template shows: `- Closes issue at <Issue URL>`
- Instructs: "Link the PR to the issue at <Issue URL> (include in PR description) if available"

**Other PR-creating agents**:
- **Planning PR** (PAW-02B): No issue linking mechanism
- **Phase PR** (PAW-03B): No issue linking mechanism  
- **Docs PR** (PAW-04): No issue linking mechanism

**Evidence**: Examined PR creation sections in PAW-02B, PAW-03B, PAW-04, and PAW-05 agent files.

**Implications**: Three out of four PR types (Planning, Phase, Docs) have no issue linking, making it impossible to track PAW workflow progress from the original issue. Only Final PR attempts linking, but doesn't use GitHub auto-close syntax.

## Open Unknowns

The Spec Agent will review these with you. You may provide answers here if possible.

1. **Target branch push timing in prs strategy**: Issue #59 item 7 states "agents don't push the target branch and that causes the first planning PR to fail on first tool call." However, PAW-02B instructions show it should push the planning branch (`<target>_plan`) before creating the Planning PR, not the target branch itself. Need clarification on:
   - Is the issue that the target branch (e.g., `feature/auth-system`) doesn't exist on remote when Planning PR is created?
   - Should Planning PR creation in prs strategy require pushing target branch FIRST, then creating planning branch?
   - Or is the issue description referring to a different scenario?

2. **Commit message format preferences**: What specific format should be used for PAW commit messages? Considerations:
   - Prefix format? (e.g., `[Work Title] Phase N:` or `PAW/<work-id>/phase-N:`)
   - Conventional commits style? (e.g., `feat:`, `fix:`, `refactor:`)
   - Footer metadata? (e.g., `PAW-Phase: 2/3`, `Work-ID: auth-system`)
   - How much context is too much for commit message headers vs bodies?

3. **Phase transition automation scope**: How much git housekeeping should be automated? Current manual steps after Phase PR merge:
   - Checkout target branch
   - Pull latest changes
   - Verify sync status
   - Should Implementer automate all of these? Some of them? What about failure cases (conflicts, network issues)?

## User-Provided External Knowledge (Manual Fill)

The following questions require external knowledge or context not available in the codebase. Please complete if you have information:

- [ ] **External Q1**: What are GitHub's documented best practices for PR descriptions linking to issues? (Specifically: `Fixes`, `Closes`, `Resolves` keywords vs `Part of`, `Related to`)

- [ ] **External Q2**: What Git commands are recommended for detecting whether local branch is behind remote (sync detection)?
 

