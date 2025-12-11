---
date: 2025-12-10 13:16:15 EST
git_commit: 48e82126e9df79556396b2911ae40a7fe78ac171
branch: feature/59-improve-pr-git-workflow
repository: phased-agent-workflow
topic: "PR Creation, Git Workflow, and Commit Message Implementation"
tags: [research, codebase, pr-creation, git-workflow, commit-messages, agent-files]
status: complete
last_updated: 2025-12-10
---

# Research: PR Creation, Git Workflow, and Commit Message Implementation

**Date**: 2025-12-10 13:16:15 EST
**Git Commit**: 48e82126e9df79556396b2911ae40a7fe78ac171
**Branch**: feature/59-improve-pr-git-workflow
**Repository**: phased-agent-workflow

## Research Question

How do PAW agents currently create PRs (Planning, Phase, Docs, Final), manage git workflow operations (branching, committing, pushing), and format commit messages? Where is this logic located, and what tools/patterns are used? This research supports implementing improvements to PR descriptions (issue linking, partial vs final differentiation), commit message structure (work title, phase context), and git workflow automation.

## Summary

PAW agents create PRs through natural language instructions to GitHub Copilot, with formatting logic distributed across four agent files. No centralized PR creation function exists. Three agents create commits (Implementer, Reviewer, Planner) using direct git CLI commands with generic "detailed commit message" guidance and no standardized format. Git workflow operations (branching, staging, pushing) are handled through explicit git commands in agent instructions. No guardrails exist preventing use of GitHub MCP direct-push tools (`mcp_github_push_files`, `mcp_github_create_or_update_file`) that bypass proper git workflow. WorkflowContext.md stores workflow parameters including Work Title, Issue URL, Target Branch, and Remote that agents read for PR titles and git operations.

## Detailed Findings

### PR Creation: Distributed Natural Language Instructions

**Location**: Four agent files contain inline PR creation instructions:
- `agents/PAW-02B Impl Planner.agent.md` - Planning PR creation
- `agents/PAW-03B Impl Reviewer.agent.md` - Phase PR creation
- `agents/PAW-04 Documenter.agent.md` - Docs PR creation
- `agents/PAW-05 PR.agent.md` - Final PR creation

**Implementation Pattern**: Agents describe PR operation naturally with context (source branch, target branch, title, body), and GitHub Copilot routes to appropriate GitHub MCP tools. No centralized PR creation function exists.

**Planning PR Creation** (`agents/PAW-02B Impl Planner.agent.md:323-332`):
```markdown
- Create Planning PR (`<target_branch>_plan` → `<target_branch>`):
  - Title: `[<Work Title>] Planning: <brief description>`
  - Body format:
    ```
    **🐾 Implementation Planner 🤖:**
    
    [Summary of deliverables, links to artifacts]
    
    ---
    🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)
    ```
```

**Phase PR Creation** (`agents/PAW-03B Impl Reviewer.agent.md:132-141`):
```markdown
- **REQUIRED**: Create Phase PR:
  - **PR Operations Context**: Provide branch names (source: phase branch, target: Target Branch), Work Title, Issue URL
  - Source: `<target>_phase[N]` → Target: `<target_branch>`
  - Title: `[<Work Title>] Implementation Phase <N>: <brief description>`
  - Include phase objectives, changes made, testing performed
  - Link to Issue URL from WorkflowContext.md
  - Artifact links: Implementation Plan at `.paw/work/<feature-slug>/ImplementationPlan.md`
  - At bottom: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`
```

**Docs PR Creation** (`agents/PAW-04 Documenter.agent.md:138-144`):
```markdown
- **REQUIRED**: Create Docs PR:
  - Source: `<target>_docs` → Target: `<target_branch>`
  - Title: `[<Work Title>] Documentation` where Work Title from WorkflowContext.md
  - Include summary of Docs.md (detailed feature reference) and project documentation updates
  - Artifact links: `.paw/work/<feature-slug>/Docs.md` and `.paw/work/<feature-slug>/ImplementationPlan.md`
  - At bottom: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`
```

**Final PR Creation** (`agents/PAW-05 PR.agent.md:196-204`):
```markdown
**Final PR Context**: When creating the final PR, provide Target Branch (source), "main" (target), Work Title, and Issue URL from WorkflowContext.md. Describe the operation naturally and Copilot will route to the appropriate platform tools based on workspace context.

4. **Create final PR**:
   - Open a PR from `<target_branch>` to `main` (or specified base branch)
   - **Title**: `[<Work Title>] <description>` where Work Title comes from WorkflowContext.md
   - Include comprehensive description with links to all artifacts
   - Link the PR to the issue at <Issue URL> (include in PR description) if available
```

**Current Issue Linking** (`agents/PAW-05 PR.agent.md:96-98`):
```markdown
## Related Issues
- Closes issue at <Issue URL>
```

The Final PR agent includes a "Related Issues" section but uses generic "Closes issue at <Issue URL>" format without GitHub auto-close keywords (`Fixes`, `Closes`, `Resolves`). Planning, Phase, and Docs PRs have no issue linking mechanism at all.

### PR Title Patterns

All PR titles use `[<Work Title>]` prefix from WorkflowContext.md:

**Current Formats**:
- Planning PR: `[<Work Title>] Planning: <brief description>` (`agents/PAW-02B Impl Planner.agent.md:324`)
- Phase PR: `[<Work Title>] Implementation Phase <N>: <brief description>` (`agents/PAW-03B Impl Reviewer.agent.md:136`)
- Docs PR: `[<Work Title>] Documentation` (`agents/PAW-04 Documenter.agent.md:140`)
- Final PR: `[<Work Title>] <description>` (`agents/PAW-05 PR.agent.md:201`)

PR titles distinguish PR types through prefixes ("Planning", "Implementation Phase N", "Documentation") but don't explicitly communicate "partial implementation" or "not for final review" status.

### Commit Message Patterns: No Standardized Format

Three agents create commits with generic guidance and no structured format:

**PAW-03A Implementer** (`agents/PAW-03A Implementer.agent.md:217-221`):
```markdown
- Update your progress in both the plan and your todos. After completing a phase and before the next step, write a new summary and status update to the plan file at the end of the Phase [N] section.
- Check off completed items in the plan file itself using Edit
- Commit all changes to the local branch with a detailed commit message
- **DO NOT push or open PRs** - the Implementation Review Agent handles that
```

**PAW-03B Impl Reviewer** (`agents/PAW-03B Impl Reviewer.agent.md:79-85`):
```markdown
6. **Commit improvements**:
   - Commit documentation, polish changes, AND small refactors (removing unnecessary parameters, simplifying code)
   - DO NOT modify core functional logic or business rules (that's the Implementation Agent's role)
   - **Small refactors are encouraged**: Removing unused parameters, dead code, or unnecessary complexity
   - Use clear commit messages:
     - `docs: add docstrings for <context>` for documentation
     - `refactor: remove unused <parameter/code>` for small refactors
```

The Reviewer uses conventional commit style (`docs:`, `refactor:`) for documentation and polish commits.

**PAW-02B Impl Planner** (`agents/PAW-02B Impl Planner.agent.md:51-52`):
```markdown
   - Commit with a message referencing the review comment
   - Use `github mcp` tools to push the commit
```

The Planner creates commits when addressing Planning PR review comments, referencing the review comment in the message.

**Current State**: No commit messages include work title, phase number, or PAW context indicators. Format is left to agent judgment with "detailed commit message" or "clear commit message" guidance.

### Git Workflow Operations: Direct CLI Commands

Agents use standard git CLI commands directly through terminal execution. No helper functions or wrapper utilities exist.

**Branch Management Commands**:
- `git branch --show-current` - Check current branch (`agents/PAW-03A Implementer.agent.md:23,56,65,266`)
- `git checkout -b <branch>` - Create and switch to new branch (`agents/PAW-03A Implementer.agent.md:24,58`)
- `git checkout <branch>` - Switch to existing branch (`agents/PAW-03A Implementer.agent.md:67`)
- `git branch --list <branch>` - Check if branch exists (Impl Reviewer)

**Staging and Commit Commands**:
- `git add <file1> <file2>` - Selective staging (`agents/PAW-03A Implementer.agent.md:134,272`)
- `git diff --cached` - Verify staged changes before commit (`agents/PAW-03A Implementer.agent.md:135,274`)
- `git commit` - Commit staged changes
- `git status` - Check git state (`agents/PAW-R1B Baseline Researcher.agent.md:90`)
- `git status --porcelain` - Programmatic status check (Status agent)

**Remote Operations**:
- `git push <remote> <branch>` - Push branch
- `git push -u <remote> <branch>` - Push and set upstream
- `git pull` - Mentioned for sync but no systematic use
- `git fetch <remote>` - Used by Baseline Researcher (`agents/PAW-R1B Baseline Researcher.agent.md:92`)

**Selective Staging Enforcement** (`agents/PAW-03A Implementer.agent.md:272-275`):
```markdown
- Use `git add <file1> <file2>` to stage ONLY files you modified for this work
- NEVER use `git add .` or `git add -A` (stages everything, including unrelated changes)
- Before committing, verify staged changes: `git diff --cached`
- If unrelated changes appear, unstage them: `git reset <file>`
```

This pattern appears in Implementer and Planner instructions to prevent accidental staging of unrelated files.

### Git State Management: Basic Branch Verification

**PAW-03A Implementer Getting Started** (`agents/PAW-03A Implementer.agent.md:20-25`):
```markdown
3. Determine the exact phase branch name that matches the phase you'll implement (for example, `feature/finalize-initial-chatmodes_phase3`).
4. Check current branch: `git branch --show-current`
5. If you're not already on the correct phase branch name determined in step 2, create and switch to that phase branch: `git checkout -b <feature-branch>_phase[N]`
6. Verify you're on the correct phase branch: `git branch --show-current`
```

The Implementer performs basic branch verification when starting a phase but no automated sync operations:
- No `git pull` or `git fetch` to sync with remote
- No detection of merged phase PRs
- No automated transition from merged phase branch back to target branch

After merging a phase PR, users must manually: (1) checkout target branch, (2) pull changes, (3) run implement prompt for next phase.

### Branching Strategy by Review Strategy

**prs strategy** (`agents/PAW-03A Implementer.agent.md:56-62`):
```markdown
**For prs strategy (full and custom modes):**
1. Determine phase branch name: `<target>_phase[N]`
2. Check current branch: `git branch --show-current`
3. If not on correct phase branch:
   - Create and checkout: `git checkout -b <target>_phase[N]`
4. Verify: `git branch --show-current`
5. Implement phase on phase branch
6. Commit changes to phase branch
7. DO NOT push (Implementation Review Agent handles that)
```

**local strategy** (`agents/PAW-03A Implementer.agent.md:65-72`):
```markdown
**For local strategy (all modes):**
1. Check current branch: `git branch --show-current`
2. If not on target branch:
   - Checkout target branch: `git checkout <target_branch>`
3. Verify: `git branch --show-current`
4. Implement the current phase on target branch (one phase at a time for full mode)
5. Commit changes to target branch
6. DO NOT push (Implementation Review Agent handles that)
7. Hand off to implementation Review Agent (for auto/semi-auto modes, proceed automatically)
```

In prs strategy, phases use dedicated branches (`<target>_phase[N]`). In local strategy, all work happens directly on target branch.

### Implementation Planner Branch Operations

**prs strategy** (`agents/PAW-02B Impl Planner.agent.md:319-332`):
```markdown
**IF Review Strategy = 'prs'**:
- Ensure on planning branch: `git branch --show-current`, create if needed: `git checkout -b <target_branch>_plan`
- Stage artifacts: `git add .paw/work/<feature-slug>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}` and prompt files
- Verify: `git diff --cached`, commit, push: `git push -u <remote> <target_branch>_plan`
- Create Planning PR (`<target_branch>_plan` → `<target_branch>`):
  - Title: `[<Work Title>] Planning: <brief description>`
  ...
- Pause for review
```

The Planner pushes the planning branch before creating Planning PR, but the spec doesn't indicate the target branch itself needs to exist on remote. Issue #59 item 7 mentions "agents don't push the target branch and that causes the first planning PR to fail" but the Planner instructions don't show target branch push logic.

**local strategy** (`agents/PAW-02B Impl Planner.agent.md:334-340`):
```markdown
**IF Review Strategy = 'local'**:
- Ensure on target branch: `git branch --show-current`, checkout if needed: `git checkout <target_branch>`
- Stage ALL planning artifacts (including those from prior agents): `git add .paw/work/<feature-slug>/`
- Verify staged files include Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md: `git diff --cached --name-only`
- Commit with message summarizing planning work, push: `git push <remote> <target_branch>`
- Skip Planning PR (no intermediate PRs in local strategy)
```

In local strategy, Planner pushes target branch directly.

### GitHub MCP Direct-Push Tools: No Guardrails

**Available Tools**: Based on agent mode instructions and grep search results, agents have access to:
1. `mcp_github_create_or_update_file` - Create or update single file remotely
2. `mcp_github_push_files` - Push multiple files in single commit remotely
3. `mcp_github_delete_file` - Delete file remotely

**Current Usage** (`agents/PAW-02B Impl Planner.agent.md:54-55`):
```markdown
- Use `github mcp` tools to push the commit
- Use `github mcp` tools to reply to the review comment with format:
```

The Planner is instructed to use "github mcp" tools when addressing Planning PR review comments. No specific tool names mentioned.

**No Guardrails Found**: Grep search for `mcp_github_(create_or_update_file|push_files|delete_file)` returned no matches in agent files, indicating:
- No explicit prohibitions against using direct-push tools
- No guardrails preventing these tools from bypassing git workflow
- Tools available for use but not systematically enforced or restricted

**Other GitHub MCP References** (search for "github mcp"):
- `agents/PAW-01A Specification.agent.md:365` - "For GitHub: ALWAYS use the **github mcp** tools to interact with issues and PRs."
- `agents/PAW-02A Code Researcher.agent.md:385` - "For GitHub: Use the **github mcp** tools to interact with issues and PRs"
- `agents/PAW-04 Documenter.agent.md:238` - "No individual comment replies (GitHub MCP tool limitations)"
- `agents/PAW-X Status.agent.md:307` - Use GitHub MCP tools to find PRs by head branch

These references show GitHub MCP tools are intended for issue/PR reading and operations, not necessarily file pushes, but no explicit guardrails exist.

### WorkflowContext.md Structure

WorkflowContext.md stores workflow parameters that agents read for PR titles, git operations, and issue linking.

**Example** (`.paw/work/improve-pr-git-workflow/WorkflowContext.md`):
```markdown
# WorkflowContext

Work Title: Improve PR Git Workflow Practices
Feature Slug: improve-pr-git-workflow
Target Branch: feature/59-improve-pr-git-workflow
Workflow Mode: full
Review Strategy: local
Handoff Mode: semi-auto
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/59
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**Key Fields for This Work**:
- **Work Title**: Used in all PR titles as `[<Work Title>]` prefix
- **Issue URL**: Should be used for PR issue linking (currently only Final PR attempts linking)
- **Target Branch**: Used for branching and PR targets
- **Remote**: Used in git push commands (defaults to "origin" if omitted)
- **Feature Slug**: Used in artifact paths (`.paw/work/<feature-slug>/`)

**Agent Reading Pattern** (`agents/PAW-03A Implementer.agent.md:18`):
```markdown
0. Look for `WorkflowContext.md` in chat context or on disk at `.paw/work/<feature-slug>/WorkflowContext.md`. If present, extract Target Branch, Work Title, Work ID, Issue URL, Remote (default to `origin` when omitted), Artifact Paths, and Additional Inputs before asking the user for them.
```

All major agents (Implementer, Reviewer, Planner, Documenter, Final PR) read WorkflowContext.md at startup to extract these fields.

## Code References

### PR Creation Instructions
- Planning PR: `agents/PAW-02B Impl Planner.agent.md:323-332`
- Phase PR: `agents/PAW-03B Impl Reviewer.agent.md:132-141`
- Docs PR: `agents/PAW-04 Documenter.agent.md:138-144`
- Final PR: `agents/PAW-05 PR.agent.md:196-204`
- Final PR issue linking: `agents/PAW-05 PR.agent.md:96-98`

### Commit Message Guidance
- Implementer: `agents/PAW-03A Implementer.agent.md:217-221`
- Reviewer: `agents/PAW-03B Impl Reviewer.agent.md:79-85`
- Planner: `agents/PAW-02B Impl Planner.agent.md:51-52`

### Git Workflow Operations
- Implementer branching (prs): `agents/PAW-03A Implementer.agent.md:56-62`
- Implementer branching (local): `agents/PAW-03A Implementer.agent.md:65-72`
- Implementer getting started: `agents/PAW-03A Implementer.agent.md:20-25`
- Selective staging enforcement: `agents/PAW-03A Implementer.agent.md:272-275`
- Planner prs workflow: `agents/PAW-02B Impl Planner.agent.md:319-332`
- Planner local workflow: `agents/PAW-02B Impl Planner.agent.md:334-340`

### GitHub MCP Tool References
- Planner MCP usage: `agents/PAW-02B Impl Planner.agent.md:54-55`
- Spec agent MCP guidance: `agents/PAW-01A Specification.agent.md:365`
- Code Researcher MCP guidance: `agents/PAW-02A Code Researcher.agent.md:385`

### WorkflowContext.md
- Example file: `.paw/work/improve-pr-git-workflow/WorkflowContext.md`
- Another example: `.paw/work/workflow-handoffs/WorkflowContext.md`
- Implementer reading pattern: `agents/PAW-03A Implementer.agent.md:18`

## Architecture Documentation

### PR Creation Architecture

PAW uses a **distributed natural language instruction** pattern for PR creation rather than centralized functions:

**Design**: Each agent contains inline instructions describing PR creation (branch names, title format, body structure). Agents provide context naturally to GitHub Copilot, which routes to appropriate GitHub MCP tools.

**Trade-offs**:
- **Flexibility**: Agents can customize PR format for their specific PR type
- **Maintainability**: Changes to PR formatting require updates to multiple agent files
- **Consistency**: Requires careful coordination to maintain consistent patterns across agents

**PR Type Differentiation**: Achieved through title prefixes ("Planning:", "Implementation Phase N:", "Documentation") and body structure differences, not through centralized PR templates.

### Git Workflow Architecture

PAW uses **direct git CLI commands** embedded in agent instructions:

**Pattern**: Agents execute git commands directly through terminal (no abstraction layer). Instructions specify exact commands and verification steps.

**Branch Strategy**:
- **prs strategy**: Phase branches (`<target>_phase[N]`) isolate work, Reviewer pushes and creates PRs
- **local strategy**: All work on target branch, no phase branches, Reviewer pushes target branch

**Commit Separation**:
- **Implementer**: Commits functional code and tests, doesn't push
- **Reviewer**: Commits documentation and polish, pushes everything
- **Planner**: Commits planning artifacts

**Push Responsibility**: Implementation Review Agent handles all pushing (phase branches or target branch) after reviewing changes. Implementer and Planner never push except when Planner addresses Planning PR review comments.

### Commit Message Architecture

PAW currently uses **agent judgment** for commit messages with minimal structured guidance:

**Current State**: No standardized format, no inclusion of work title, phase number, or PAW indicators. Agents use "detailed commit message" or "clear commit message" guidance.

**Reviewer Pattern**: Uses conventional commit style (`docs:`, `refactor:`) for documentation and polish commits, but this is specific to Reviewer and not enforced elsewhere.

**Gap**: No structured format exists that would enable:
- Easy filtering of PAW commits in git history
- Understanding which phase/work a commit belongs to without reading full diff
- Tracing commits back to originating work item

## Open Questions

1. **Target Branch Push Timing**: Does Planning PR creation require the target branch to exist on remote before creating the PR, or just the planning branch? Issue #59 item 7 mentions this causes failures, but current Planner instructions show pushing planning branch, not target branch.

2. **Phase Transition Detection**: How should Implementer detect that a phase PR has been merged? Options:
   - Check if current branch name contains merged PR number
   - Query GitHub API for PR status
   - Check if phase branch exists locally but target branch has newer commits
   - Rely on user signal (current approach)

3. **Commit Message Format Preference**: What specific structured format should be used for PAW commit messages? Considerations:
   - Subject line length with work title and phase context
   - Conventional commit compatibility (`feat:`, `fix:`, etc.)
   - Footer metadata vs inline context
   - Parsing requirements for tools/scripts

## References

- Specification: `.paw/work/improve-pr-git-workflow/Spec.md`
- Spec Research: `.paw/work/improve-pr-git-workflow/SpecResearch.md`
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/59
