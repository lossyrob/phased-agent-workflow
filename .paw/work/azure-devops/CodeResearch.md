---
date: 2025-10-25 08:44:12 CDT
git_commit: 3ac55fe12b75aae7ed8bedcb88398869b4503a96
branch: feature/azure-devops_plan
repository: phased-agent-workflow
topic: "Azure DevOps Support - Implementation Requirements"
tags: [research, codebase, azure-devops, workflow-context, platform-neutral, copilot-routing]
status: complete
last_updated: 2025-10-25
last_updated_note: "Confirmed via experiments: Copilot handles remote resolution automatically"
---

# Research: Azure DevOps Support - Implementation Requirements

**Date**: 2025-10-25 08:44:12 CDT
**Git Commit**: 3ac55fe12b75aae7ed8bedcb88398869b4503a96
**Branch**: feature/azure-devops_plan
**Repository**: phased-agent-workflow

## Research Question

How does PAW currently integrate with GitHub, and what implementation changes are needed to support Azure DevOps through Copilot's automatic workspace context resolution? Specifically:

1. How do agents read and write WorkflowContext.md?
2. How do agents reference issues and perform repository operations?
3. What changes enable platform-agnostic operations that work with both GitHub and Azure DevOps?

## Summary

PAW agents currently integrate with GitHub through WorkflowContext.md parameters and natural language operations that Copilot routes to GitHub MCP tools. **Empirical testing confirms** that Copilot automatically resolves workspace git context (remotes, branches, repository URLs) without requiring explicit resolution in agent instructions.

To support Azure DevOps, agents need only **two simple changes**:

1. **Field Name Update**: Use "Issue URL" (new) instead of "GitHub Issue" (legacy) in WorkflowContext.md, while maintaining backward compatibility by reading from both field names

2. **Platform-Neutral Language**: Use generic operation descriptions (e.g., "post a comment to the issue", "open a PR from branch X to branch Y") without explicit MCP tool references—Copilot automatically resolves workspace context and routes to the correct MCP server based on git remotes and Issue URLs

All agent logic exists in chatmode instruction files (`.github/chatmodes/*.chatmode.md`). No platform detection, URL parsing, or explicit remote resolution is needed—Copilot's workspace context awareness handles all of this automatically.

## Detailed Findings

### Component 1: WorkflowContext.md Structure and Usage

**Location**: `.paw/work/<feature-slug>/WorkflowContext.md` (one per feature)

**Current Format**:
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**Field Definitions**:
- **Work Title**: 2-4 word descriptive name prefixing all PR titles (e.g., "Auth System")
- **Feature Slug**: Normalized identifier for artifact directory (e.g., "auth-system")
- **Target Branch**: Git branch for completed work (e.g., "feature/add-authentication")
- **GitHub Issue** (legacy): Currently stores GitHub issue URL (format: `https://github.com/<owner>/<repo>/issues/<number>`)
- **Issue URL** (new): Platform-agnostic field for GitHub Issue URL or Azure DevOps Work Item URL
- **Remote**: Git remote name, defaults to "origin" if omitted
- **Artifact Paths**: Paths to spec/plan/docs, auto-derived or explicit
- **Additional Inputs**: Supplementary documents for research

**How Agents Read WorkflowContext.md**:

All PAW agents follow the same pattern documented in their chatmode instructions:

```markdown
Before asking for parameters, look for `WorkflowContext.md` in chat context or on disk at 
`.paw/work/<feature-slug>/WorkflowContext.md`. When present, extract Target Branch, Work Title, 
Feature Slug, Issue URL (or GitHub Issue for backward compatibility), Remote (default to `origin` 
when omitted), Artifact Paths, and Additional Inputs so you reuse recorded values.
```

Agents check for WorkflowContext.md in two locations:
1. **Chat context**: File included in conversation by user
2. **Disk**: At `.paw/work/<feature-slug>/WorkflowContext.md` path

**Examples of Reading Logic**:

Status Agent (`PAW-X Status Update.chatmode.md`):
- Reads WorkflowContext.md before asking for parameters
- Extracts: Target Branch, Work Title, Feature Slug, Issue URL (or GitHub Issue), Remote, Artifact Paths, Additional Inputs
- Defaults Remote to "origin" if omitted

PR Agent (`PAW-05 PR.chatmode.md`):
- Same reading pattern as Status Agent
- Uses Work Title for PR naming: `[<Work Title>] <description>`

Implementation Review Agent (`PAW-03B Impl Reviewer.chatmode.md`):
- Same reading pattern
- Uses Target Branch and Remote for git operations

**How Agents Create/Update WorkflowContext.md**:

Spec Agent (`PAW-01A Spec Agent.chatmode.md`) is primary creator:
- Creates WorkflowContext.md if missing
- Generates Work Title from issue title or brief
- Generates Feature Slug by normalizing Work Title
- Writes complete file to `.paw/work/<feature-slug>/WorkflowContext.md`
- Uses "Issue URL" field name for new files

All agents update WorkflowContext.md when learning new parameters:
```markdown
Update the file whenever you learn new parameter values (e.g., PR number, artifact overrides) 
so downstream stages inherit the latest information.
```

**Required Changes for Azure DevOps**:

1. **Field Name Change**: Use "Issue URL" instead of "GitHub Issue" when creating new WorkflowContext.md files
2. **Reading Logic**: Support both "Issue URL" (new) and "GitHub Issue" (legacy) field names for backward compatibility
3. **No Additional Fields**: Organization/project/repo identifiers are not stored—Copilot extracts these automatically from workspace git context
4. **Remote Field Usage**: Continue using Remote field as-is (remote name like "origin")—Copilot resolves it automatically when needed for repository operations

### Component 2: Platform-Neutral Operation Language

**Current Approach**: Agents describe operations in natural language, and Copilot's MCP integration routes to available tools.

**Key Principle**: Agent instructions should describe WHAT to do, not WHICH tools to use. **Empirical testing confirms** that when agents provide workspace context (branch names, remote names like "origin", Issue URLs), Copilot automatically:
1. Resolves remote names to URLs using git workspace context
2. Identifies the platform from resolved remote URLs and Issue URLs
3. Routes operations to the correct MCP server

**Copilot's Automatic Context Resolution Examples**:

**Issue/Work Item Operations**:
```markdown
Current (GitHub-specific):
"Post a comment to the GitHub Issue"

Platform-Neutral (works for both):
"Post a comment to the issue at <Issue URL>"
```
When Issue URL is `https://github.com/owner/repo/issues/123`, Copilot routes to GitHub MCP tools.
When Issue URL is `https://dev.azure.com/org/project/_workitems/edit/456`, Copilot routes to Azure DevOps MCP tools.

**PR/Repository Operations**:
```markdown
Current (GitHub-specific):
"Create a PR using the GitHub MCP tools"

Platform-Neutral (works for both):
"Open a PR from branch X to branch Y"
```
Copilot examines the workspace's git remotes (e.g., "origin"), resolves them to URLs automatically, and routes to the appropriate MCP server based on the domain.

**Remote Name Usage**:
```markdown
Agents can reference remotes by name:
"Push changes to the remote 'origin'"
"Open a PR in the repository (remote: origin)"
```
Copilot automatically resolves "origin" (or any remote name) to its URL using the workspace's git configuration, then routes MCP operations accordingly.

**Required Changes in Agent Instructions**:

1. **Remove Platform-Specific References**:
   - Replace "GitHub Issue" with "issue" or "issue/work item"
   - Replace "GitHub PR" with "PR" or "pull request"
   - Remove references to specific MCP tool prefixes (`mcp_github_`, `mcp_azuredevops_`)

2. **Use Generic Operation Language**:
   - "Post a comment to the issue at <Issue URL>" (not "add issue comment via GitHub MCP")
   - "Open a PR from branch X to branch Y" (not "create pull request using github_create_pull_request")
   - "Push to remote 'origin'" (not "push to https://github.com/...")

3. **Maintain Existing Remote Conventions**:
   - If current chatmodes reference remotes by name (e.g., "origin"), keep that pattern
   - If current chatmodes don't explicitly mention remotes, no change needed
   - Copilot handles resolution automatically

**Copilot's Workspace Context Awareness**: Copilot has access to the workspace's git configuration and automatically resolves remote names to URLs when executing MCP operations. Agents simply describe operations naturally, and Copilot handles all platform detection and routing based on the workspace context.

### Component 3: Status Agent Issue/Work Item Updates

**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md` (152 lines)

**Current Behavior**:

The Status Agent posts status update comments to issues. Key operations:

1. **Determine Phase Count** (Lines ~40-45):
   - Searches ImplementationPlan.md for `^## Phase \d+:` patterns
   - Counts unique phase numbers found
   - Critical: Uses actual phase count, not assumptions

2. **Gather PR Status** (Lines ~47-50):
   - Searches for all PRs related to feature
   - Identifies: Planning PR, Phase PRs, Docs PR, Final PR
   - Collects states: open, merged, closed

3. **Generate Status Dashboard** (Lines ~52+):
   - Posts new comment to issue (does NOT edit issue description)
   - Comment prefix: `**🐾 Status Update Agent 🤖:**`
   - Dashboard includes:
     - Artifacts: Links to Spec, SpecResearch, CodeResearch, ImplementationPlan, Docs
     - PRs: Links and states for Planning, Phase 1..N, Docs, Final
     - Checklist: Spec approved, Planning merged, Phase 1..N merged, Docs merged, Final PR

**Required Changes for Platform-Neutral Operations**:

1. **Field Name Support**: Read from "Issue URL" (preferred) or "GitHub Issue" (legacy)
2. **Platform-Neutral Language**: 
   - Change instruction from "Post comment to the GitHub Issue" to "Post a comment to the issue at <Issue URL>"
   - No need to explicitly resolve Remote—Copilot handles workspace context automatically
3. **Status Dashboard Format**: Remains unchanged (platform-agnostic markdown)

**Example Updated Instructions**:

```markdown
1. Read WorkflowContext.md and extract Issue URL (or GitHub Issue), Remote, Feature Slug
2. Generate status dashboard with artifact links and PR status
3. Post the status dashboard as a comment to the issue at <Issue URL>
```

Copilot will automatically route the "post comment" operation to GitHub or Azure DevOps MCP tools based on the Issue URL domain.

### Component 4: Implementation Review Agent PR Operations

**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` (310 lines)

**Current Behavior**:

The Implementation Review Agent opens and updates Phase PRs. Key operations:

1. **Initial Phase Review** (Lines ~80-150):
   - Reviews Implementation Agent's changes
   - Generates documentation (docstrings, comments)
   - Pushes branch and opens Phase PR
   - PR title format: `[<Work Title>] Phase <N>: <description>`
   - Adds artifact links to PR description
   - Posts timeline comment: `**🐾 Implementation Reviewer 🤖:**`

2. **Review Comment Follow-up** (Lines ~152-220):
   - Verifies Implementation Agent addressed comments
   - Adds improvements if needed
   - Pushes all commits
   - Posts comprehensive summary comment with:
     - Section 1: Detailed comment tracking (comment ID, what was done, commit hash)
     - Section 2: Overall summary (high-level changes, readiness)
   - Starts with: `**🐾 Implementation Reviewer 🤖:**`

**Required Changes for Platform-Neutral Operations**:

1. **Field Name Support**: Read from "Issue URL" (preferred) or "GitHub Issue" (legacy)
2. **Platform-Neutral Language**:
   - Change from "Open a PR using GitHub MCP tools" to "Open a PR from <phase_branch> to <target_branch>"
   - Change from "Link to the GitHub Issue" to "Link the PR to the issue at <Issue URL>"
   - No need to explicitly resolve Remote—Copilot handles workspace context automatically
3. **PR Description Format**: Remains unchanged (platform-agnostic markdown with artifact links)

**Example Updated Instructions**:

```markdown
1. Read WorkflowContext.md and extract Issue URL, Remote, Target Branch, Work Title
2. Review implementation changes and generate documentation
3. Push phase branch
4. Open a PR from <phase_branch> to <Target Branch>
   - Title: [<Work Title>] Phase <N>: <description>
   - Link the PR to the issue at <Issue URL>
5. Post timeline comment to the PR
```

Copilot will automatically resolve the workspace's git remotes and route PR operations to GitHub or Azure DevOps MCP tools based on the remote URLs.

### Component 5: PR Agent Final PR Creation

**File**: `.github/chatmodes/PAW-05 PR.chatmode.md` (251 lines)

**Current Behavior**:

The PR Agent opens the final PR to main. Key operations:

1. **Pre-flight Checks** (Lines ~50-100):
   - Verifies all phases complete
   - Checks documentation complete
   - Validates artifacts exist
   - Ensures branch up to date
   - Confirms build/tests passing

2. **PR Description Generation** (Lines ~102-180):
   - Crafts comprehensive PR description with:
     - Summary from Spec.md
     - Related issues
     - Artifact links
     - Implementation phase links
     - Documentation updates
     - Changes summary
     - Testing status
     - Acceptance criteria
     - Deployment considerations

3. **Final PR Creation** (Lines ~182-220):
   - Opens PR from `<target_branch>` → `main`
   - Title: `[<Work Title>] <description>`
   - Includes all artifact links
   - References issue
   - Adds PAW footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`

**Required Changes for Platform-Neutral Operations**:

1. **Field Name Support**: Read from "Issue URL" (preferred) or "GitHub Issue" (legacy)
2. **Platform-Neutral Language**:
   - Change from "Create final PR using GitHub MCP" to "Open a PR from <Target Branch> to main"
   - Change from "Reference the GitHub Issue" to "Link the PR to the issue at <Issue URL>"
   - No need to explicitly resolve Remote—Copilot handles workspace context automatically
3. **PR Description Format**: Remains unchanged (platform-agnostic markdown)

**Example Updated Instructions**:

```markdown
1. Read WorkflowContext.md and extract Issue URL, Remote, Target Branch, Work Title
2. Perform pre-flight checks (phases complete, tests passing)
3. Generate comprehensive PR description with artifact links
4. Open a PR from <Target Branch> to main
   - Title: [<Work Title>] <description>
   - Link the PR to the issue at <Issue URL>
```

Copilot will automatically resolve the workspace's git remotes and route PR creation to GitHub or Azure DevOps MCP tools based on the remote URLs.

### Component 6: Spec Agent WorkflowContext.md Creation

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` (347 lines)

**Current Behavior**:

The Spec Agent is the primary creator of WorkflowContext.md. Key logic (Lines ~80-150):

1. **Work Title Generation**:
   - Generated from issue title or feature brief
   - 2-4 words maximum
   - Examples: "Auth System", "API Refactor"

2. **Feature Slug Generation**:
   - Four scenarios for slug generation (Lines ~85-105):
     - Both missing: Generate Work Title from issue/brief, then normalize to slug
     - Work Title exists: Normalize to slug
     - User provides slug: Normalize and validate
     - Both provided: Use as-is (validate slug)
   - Alignment requirement: When auto-generating both, derive from same source

3. **Slug Processing** (Lines ~150-170):
   - Normalize: Lowercase, replace spaces with hyphens, remove invalid chars
   - Validate: Format requirements (a-z, 0-9, -, no leading/trailing hyphens)
   - Check uniqueness: Verify `.paw/work/<slug>/` doesn't exist
   - Conflict resolution: Auto-append -2, -3 for auto-generated; prompt for user-provided

4. **WorkflowContext.md Creation**:
   - Writes to `.paw/work/<feature-slug>/WorkflowContext.md`
   - Includes: Work Title, Feature Slug, Target Branch, GitHub Issue, Remote, Artifact Paths, Additional Inputs

**Required Changes**:

1. **Field Name**: Use "Issue URL" instead of "GitHub Issue" when creating new files
2. **Platform Support**: Accept both GitHub Issue URLs and Azure DevOps Work Item URLs
3. **Format Example Update**: Update WorkflowContext.md format example in instructions to show "Issue URL" field
4. **No Breaking Changes**: Maintain all existing slug generation and validation logic
5. **Backward Compatibility**: When reading existing WorkflowContext.md files, support "GitHub Issue" field name

**Example Updated Format**:

```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_or_work_item_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

### Component 7: Agent Instruction Pattern Analysis

**Common Pattern Across All Agents**:

All PAW agents follow this consistent structure in their chatmode instructions:

1. **WorkflowContext.md Reading** (start of each agent):
```markdown
Before asking for parameters, look for `WorkflowContext.md` in chat context or 
on disk at `.paw/work/<feature-slug>/WorkflowContext.md`. When present, extract 
Target Branch, Work Title, Feature Slug, Issue URL (or GitHub Issue for backward 
compatibility), Remote (default to `origin` when omitted), Artifact Paths, and 
Additional Inputs...
```

2. **WorkflowContext.md Format** (in each agent):
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_or_work_item_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

3. **Parameter Updates**:
```markdown
Update the file whenever you learn new parameter values (e.g., PR number, 
artifact overrides) so downstream stages inherit the latest information.
```

**Agent Files Requiring Updates**:

All 9 agent chatmode files need updates to support the two key changes:

1. **Field Name Updates** (all agents):
   - Read from "Issue URL" (preferred) or "GitHub Issue" (legacy)
   - Use "Issue URL" when creating new WorkflowContext.md files
   - Update format examples in instructions

2. **Platform-Neutral Language** (all agents, especially those with operations):
   - Remove "GitHub Issue" → use "issue" or "issue/work item"
   - Remove "GitHub PR" → use "PR" or "pull request"
   - Remove MCP tool references → use operation descriptions
   - Change "Post to GitHub Issue" → "Post comment to issue at <Issue URL>"
   - Change "Create PR via GitHub MCP" → "Open PR from branch X to branch Y"
   - Maintain existing conventions for remote references (if present)

**Agent List** (by workflow stage):

1. **PAW-01A Spec Agent.chatmode.md** - Creates WorkflowContext.md with "Issue URL" field
2. **PAW-01B Spec Research Agent.chatmode.md** - Reads WorkflowContext.md
3. **PAW-02A Code Researcher.chatmode.md** - Reads WorkflowContext.md
4. **PAW-02B Impl Planner.chatmode.md** - Reads WorkflowContext.md
5. **PAW-03A Implementer.chatmode.md** - Reads WorkflowContext.md
6. **PAW-03B Impl Reviewer.chatmode.md** - Opens PRs (Copilot resolves workspace context)
7. **PAW-04 Documenter.chatmode.md** - Reads WorkflowContext.md
8. **PAW-05 PR.chatmode.md** - Opens final PR (Copilot resolves workspace context)
9. **PAW-X Status Update.chatmode.md** - Posts to issues (Copilot resolves workspace context)

## Code References

- `.github/chatmodes/PAW-X Status Update.chatmode.md` - Status Agent that posts to issues/work items
- `.github/chatmodes/PAW-05 PR.chatmode.md` - PR Agent that creates final PR
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` - Review Agent that opens Phase PRs
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` - Spec Agent that creates WorkflowContext.md
- `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md` - Research Agent
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` - Code Research Agent
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` - Planning Agent
- `.github/chatmodes/PAW-03A Implementer.chatmode.md` - Implementation Agent
- `.github/chatmodes/PAW-04 Documenter.chatmode.md` - Documentation Agent
- `.paw/work/azure-devops/WorkflowContext.md` - Example WorkflowContext.md file
- `.paw/work/azure-devops/Spec.md` - Azure DevOps support specification
- `.paw/work/azure-devops/SpecResearch.md` - Behavioral research findings

## Architecture Documentation

**Current Architecture**:

PAW uses a document-driven workflow where agents interact through:
1. **Artifacts**: Markdown files in `.paw/work/<feature-slug>/` storing specs, plans, research, docs
2. **WorkflowContext.md**: Centralized parameter file eliminating repetition
3. **Agent Chatmodes**: Instructions in `.github/chatmodes/PAW-XX *.chatmode.md` files
4. **MCP Integration**: Agents describe operations in natural language, Copilot routes to available MCP tools based on workspace context

**Key Design Decisions**:

1. **No Implementation Code**: All PAW logic exists in agent instruction files (.chatmode.md)
2. **MCP Abstraction**: Agents don't handle authentication or make direct API calls
3. **Parameter Centralization**: WorkflowContext.md serves as single source of truth
4. **Platform-Agnostic Artifacts**: Spec.md, ImplementationPlan.md, etc. contain no platform-specific details
5. **Workspace Context Reliance**: Copilot automatically resolves git remotes and repository context from the workspace

**Azure DevOps Integration Approach**:

The approach relies entirely on Copilot's workspace context awareness and MCP routing:

1. **Field Name Update**: "Issue URL" replaces "GitHub Issue" (with backward compatibility)
2. **Platform-Neutral Operations**: Agent instructions describe operations generically (e.g., "open a PR from branch X to branch Y")
3. **Automatic Context Resolution**: Copilot has access to workspace git configuration and automatically:
   - Resolves remote names (e.g., "origin") to URLs using git workspace context
   - Identifies platforms from remote URLs and Issue URLs
   - Routes operations to appropriate MCP server:
     - `github.com` URLs → GitHub MCP tools (`mcp_github_*`)
     - `dev.azure.com` URLs → Azure DevOps MCP tools (`mcp_azuredevops_*`)

**Implementation Pattern**:

Each agent simply:
1. Reads "Issue URL" (preferred) or "GitHub Issue" (legacy) from WorkflowContext.md
2. Reads Remote field from WorkflowContext.md (typically "origin" or another remote name)
3. Describes operations naturally: "post comment to issue at <Issue URL>", "open PR from branch X to branch Y"
4. Relies on Copilot to:
   - Resolve remote names to URLs using workspace git context
   - Route to appropriate MCP tools based on resolved URLs
   - Execute operations through correct platform

**No Manual Resolution Required**: Agents don't need to run `git config` commands or parse URLs—Copilot handles all workspace context resolution transparently as confirmed through empirical testing.

## Open Questions

None - empirical testing confirms Copilot automatically handles remote resolution and platform routing based on workspace context.
