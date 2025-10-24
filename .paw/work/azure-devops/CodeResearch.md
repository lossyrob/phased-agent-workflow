---
date: 2025-10-24 15:05:46 CDT
git_commit: f2a1747df27400dad28c39e85efbd9c0a08bf93a
branch: feature/azure-devops
repository: phased-agent-workflow
topic: "Azure DevOps Support - Implementation Requirements"
tags: [research, codebase, azure-devops, platform-detection, workflow-context, github-mcp, status-agent, pr-agent, implementation-review]
status: complete
last_updated: 2025-10-24
---

# Research: Azure DevOps Support - Implementation Requirements

**Date**: 2025-10-24 15:05:46 CDT
**Git Commit**: f2a1747df27400dad28c39e85efbd9c0a08bf93a
**Branch**: feature/azure-devops
**Repository**: phased-agent-workflow

## Research Question

How does PAW currently integrate with GitHub, and what implementation changes are needed to support Azure DevOps as an alternative platform? Specifically:

1. How do agents read and write WorkflowContext.md?
2. Where do agents invoke GitHub MCP tools?
3. How can agents detect the platform (GitHub vs Azure DevOps)?
4. What agent instructions need updating for platform-agnostic operations?

## Summary

PAW agents currently integrate with GitHub through three key mechanisms:

1. **WorkflowContext.md**: A centralized parameter file at `.paw/work/<feature-slug>/WorkflowContext.md` that stores workflow parameters including "GitHub Issue" (currently) and "Remote" fields
2. **GitHub MCP Tools**: Agents invoke `mcp_github_*` prefixed tools for issue/PR operations without handling authentication
3. **Agent Instructions**: Chat mode files in `.github/chatmodes/` contain instructions for reading WorkflowContext.md and performing platform-specific operations

To support Azure DevOps, agents will need to:
- Read "Issue URL" (new) or "GitHub Issue" (legacy) fields from WorkflowContext.md
- Resolve the Remote field to a URL and detect platform from URL patterns
- Route to Azure DevOps MCP tools (`mcp_azuredevops_*`) when platform is Azure DevOps
- Extract platform-specific identifiers (org/project/repo for Azure DevOps; owner/repo for GitHub) from remote URLs at runtime

No implementation code exists yet—all work is contained in agent instruction files (`.chatmode.md` files).

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
- **GitHub Issue**: Currently stores GitHub issue URL (format: `https://github.com/<owner>/<repo>/issues/<number>`)
- **Remote**: Git remote name, defaults to "origin" if omitted
- **Artifact Paths**: Paths to spec/plan/docs, auto-derived or explicit
- **Additional Inputs**: Supplementary documents for research

**How Agents Read WorkflowContext.md**:

All PAW agents follow the same pattern documented in their chatmode instructions:

```markdown
Before asking for parameters, look for `WorkflowContext.md` in chat context or on disk at 
`.paw/work/<feature-slug>/WorkflowContext.md`. When present, extract Target Branch, Work Title, 
Feature Slug, GitHub Issue, Remote (default to `origin` when omitted), Artifact Paths, and 
Additional Inputs so you reuse recorded values.
```

Agents check for WorkflowContext.md in two locations:
1. **Chat context**: File included in conversation by user
2. **Disk**: At `.paw/work/<feature-slug>/WorkflowContext.md` path

**Examples of Reading Logic**:

Status Agent (`PAW-X Status Update.chatmode.md`):
- Reads WorkflowContext.md before asking for parameters
- Extracts: Target Branch, Work Title, Feature Slug, GitHub Issue, Remote, Artifact Paths, Additional Inputs
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
- Generates Work Title from GitHub Issue title or brief
- Generates Feature Slug by normalizing Work Title
- Writes complete file to `.paw/work/<feature-slug>/WorkflowContext.md`

All agents update WorkflowContext.md when learning new parameters:
```markdown
Update the file whenever you learn new parameter values (e.g., PR number, artifact overrides) 
so downstream stages inherit the latest information.
```

**Required Changes for Azure DevOps**:

1. **Field Name Change**: Rename "GitHub Issue" → "Issue URL" (with backward compatibility)
2. **Reading Logic**: Support both "Issue URL" (new) and "GitHub Issue" (legacy) field names
3. **Writing Logic**: Use "Issue URL" when creating new WorkflowContext.md files
4. **No New Fields**: Organization/project identifiers extracted at runtime from Remote URL, not stored

### Component 2: Platform Detection Requirements

**Current State**: No platform detection logic exists. Agents assume GitHub.

**Detection Approach**: Parse the git remote URL from the Remote field in WorkflowContext.md

**Remote Field Resolution**:

The Remote field can contain either:
1. **Remote name** (e.g., "origin"): Resolve to URL via `git config --get remote.origin.url`
2. **Direct URL**: Use as-is for detection

**Platform Detection Patterns**:

**GitHub URLs**:
- HTTPS: `https://github.com/<owner>/<repo>.git` or `https://github.com/<owner>/<repo>`
- SSH: `git@github.com:<owner>/<repo>.git`

**Azure DevOps URLs**:
- Modern: `https://dev.azure.com/<org>/<project>/_git/<repo>`
- Legacy: `https://<org>.visualstudio.com/<project>/_git/<repo>`
- SSH: `git@ssh.dev.azure.com:v3/<org>/<project>/<repo>`

**Detection Algorithm**:

```
1. Read Remote field from WorkflowContext.md
2. If Remote is a name (not URL), resolve: `git config --get remote.<name>.url`
3. Parse URL to extract domain:
   - If domain contains "github.com" → GitHub
   - If domain contains "dev.azure.com" or "visualstudio.com" → Azure DevOps
   - Otherwise → Error: Unknown platform
4. Extract platform-specific identifiers from URL
```

**Repository Identifier Extraction**:

**GitHub**:
- Pattern: `github.com/<owner>/<repo>`
- Extract: owner, repo
- Example: `https://github.com/lossyrob/phased-agent-workflow` → owner="lossyrob", repo="phased-agent-workflow"

**Azure DevOps**:
- Pattern: `dev.azure.com/<org>/<project>/_git/<repo>`
- Extract: organization, project, repository
- Example: `https://dev.azure.com/contoso/MyProject/_git/MyRepo` → org="contoso", project="MyProject", repo="MyRepo"

**Implementation Location**: Platform detection logic belongs in agent instructions, not separate code files

### Component 3: GitHub MCP Tool Usage Patterns

**Current GitHub MCP Tool References**:

Status Agent (`PAW-X Status Update.chatmode.md`):
- Reads issues: `mcp_github_github_get_issue` (referenced in SpecResearch.md, not directly in agent instructions)
- Comments on issues: `mcp_github_github_add_issue_comment` (referenced in SpecResearch.md)
- Searches for PRs: Uses search tools to find related PRs
- Agent instructions describe operations conceptually, don't hardcode tool names

Implementation Review Agent (`PAW-03B Impl Reviewer.chatmode.md`):
- Opens PRs: Creates PR with GitHub-specific format
- Updates PRs: Edits PR description within `<!-- BEGIN:AGENT-SUMMARY -->` blocks
- Posts PR comments: Adds review summary comments
- Tool invocations happen through natural language, Copilot routes to available MCP tools

PR Agent (`PAW-05 PR.chatmode.md`):
- Creates final PR from target branch to main
- Formats PR description with artifact links
- Tool routing implicit through Copilot's MCP integration

**Key Pattern**: Agents describe operations in natural language (e.g., "post a comment to the Issue", "create a PR"), and Copilot's MCP integration routes to available tools based on prefixes:
- `mcp_github_*` tools for GitHub operations
- `mcp_azuredevops_*` tools for Azure DevOps operations (when available)

**Required Changes**:
- Agent instructions should remain platform-agnostic
- Platform detection logic determines which MCP tool namespace to use
- No hardcoded tool names in agent instructions

### Component 4: Status Agent Issue/Work Item Updates

**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md` (152 lines)

**Current Behavior**:

The Status Agent posts status update comments to GitHub Issues. Key operations:

1. **Determine Phase Count** (Lines ~40-45):
   - Searches ImplementationPlan.md for `^## Phase \d+:` patterns
   - Counts unique phase numbers found
   - Critical: Uses actual phase count, not assumptions

2. **Gather PR Status** (Lines ~47-50):
   - Searches for all PRs related to feature
   - Identifies: Planning PR, Phase PRs, Docs PR, Final PR
   - Collects states: open, merged, closed

3. **Generate Status Dashboard** (Lines ~52+):
   - Posts new comment to Issue (does NOT edit issue description)
   - Comment prefix: `**🐾 Status Update Agent 🤖:**`
   - Dashboard includes:
     - Artifacts: Links to Spec, SpecResearch, CodeResearch, ImplementationPlan, Docs
     - PRs: Links and states for Planning, Phase 1..N, Docs, Final
     - Checklist: Spec approved, Planning merged, Phase 1..N merged, Docs merged, Final PR

**Platform-Specific Operations**:

GitHub:
- Read issue: Get issue details for context
- Post comment: Add new comment to issue with status dashboard

Azure DevOps Equivalent:
- Read work item: `wit_get_work_item` (organization, project, work item ID)
- Post comment: `wit_add_work_item_comment` (organization, project, work item ID, comment text)

**Required Changes**:

1. **Platform Detection**: Detect platform from Remote field URL
2. **Issue/Work Item URL Parsing**:
   - GitHub: `https://github.com/<owner>/<repo>/issues/<number>` → owner, repo, number
   - Azure DevOps: `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>` → org, project, id
3. **Tool Routing**:
   - GitHub: Use `mcp_github_github_get_issue`, `mcp_github_github_add_issue_comment`
   - Azure DevOps: Use `mcp_azuredevops_wit_get_work_item`, `mcp_azuredevops_wit_add_work_item_comment`
4. **PR Link Formatting**:
   - GitHub: `https://github.com/<owner>/<repo>/pull/<number>`
   - Azure DevOps: `https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`

**Status Dashboard Format**: Same structure for both platforms (platform-agnostic markdown)

### Component 5: Implementation Review Agent PR Operations

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

**Platform-Specific Operations**:

Phase PR Operations:
- Create PR: Opens PR from `<target_branch>_phase<N>` → `<target_branch>`
- Update PR: Modifies PR description within `<!-- BEGIN:AGENT-SUMMARY -->` blocks
- Post PR comment: Adds review summary comments
- Link work item: Links PR to issue/work item

**GitHub PR Creation**:
- Tool: `github_create_pull_request`
- Parameters: owner, repo, head, base, title, body

**Azure DevOps PR Creation**:
- Tool: `repo_create_pull_request`
- Parameters: organization, project, repository, source_ref_name, target_ref_name, title, description
- Additional: `wit_link_work_item_to_pull_request` to link to work item

**Required Changes**:

1. **Platform Detection**: Detect from Remote field URL
2. **Repository Context**:
   - GitHub: owner, repo from remote URL
   - Azure DevOps: organization, project, repo from remote URL
3. **Work Item Linking**:
   - GitHub: Reference in PR description (e.g., "Closes #123")
   - Azure DevOps: Explicit `wit_link_work_item_to_pull_request` call
4. **PR Link Formatting**: Format links correctly for status updates

### Component 6: PR Agent Final PR Creation

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
   - References GitHub Issue
   - Adds PAW footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`

**Platform-Specific Operations**:

**GitHub Final PR**:
- Tool: `github_create_pull_request`
- Parameters: owner, repo, head=target_branch, base=main, title, body

**Azure DevOps Final PR**:
- Tool: `repo_create_pull_request`
- Parameters: organization, project, repository, source_ref_name=target_branch, target_ref_name=main, title, description
- Additional: `wit_link_work_item_to_pull_request` to link to work item

**Required Changes**:

1. **Platform Detection**: Detect from Remote field URL
2. **Repository Context Extraction**: owner/repo (GitHub) or org/project/repo (Azure DevOps)
3. **Work Item Linking**: Explicit linking for Azure DevOps
4. **Issue Reference Format**:
   - GitHub: "Closes #123" or "Resolves #123"
   - Azure DevOps: Link via MCP tool, optionally reference in description

### Component 7: Spec Agent WorkflowContext.md Creation

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` (347 lines)

**Current Behavior**:

The Spec Agent is the primary creator of WorkflowContext.md. Key logic (Lines ~80-150):

1. **Work Title Generation**:
   - Generated from GitHub Issue title or feature brief
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
3. **URL Format Validation**:
   - GitHub: `https://github.com/<owner>/<repo>/issues/<number>`
   - Azure DevOps: `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`
4. **No Breaking Changes**: Maintain all existing slug generation and validation logic

### Component 8: Agent Instruction Pattern Analysis

**Common Pattern Across All Agents**:

All PAW agents follow this consistent structure in their chatmode instructions:

1. **WorkflowContext.md Reading** (start of each agent):
```markdown
Before asking for parameters, look for `WorkflowContext.md` in chat context or 
on disk at `.paw/work/<feature-slug>/WorkflowContext.md`. When present, extract 
Target Branch, Work Title, Feature Slug, GitHub Issue, Remote (default to `origin` 
when omitted), Artifact Paths, and Additional Inputs...
```

2. **WorkflowContext.md Format** (in each agent):
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

3. **Parameter Updates**:
```markdown
Update the file whenever you learn new parameter values (e.g., PR number, 
artifact overrides) so downstream stages inherit the latest information.
```

**Agent Files Requiring Updates**:

1. **PAW-01A Spec Agent.chatmode.md** (347 lines):
   - Update WorkflowContext.md creation logic
   - Change "GitHub Issue" → "Issue URL" in format examples
   - Support both GitHub Issue and Azure DevOps Work Item URLs

2. **PAW-X Status Update.chatmode.md** (152 lines):
   - Add platform detection logic
   - Support reading "Issue URL" or "GitHub Issue" (legacy)
   - Route to GitHub or Azure DevOps MCP tools based on platform
   - Format PR links correctly for each platform

3. **PAW-03B Impl Reviewer.chatmode.md** (310 lines):
   - Add platform detection for PR operations
   - Extract repository context from Remote field URL
   - Support both GitHub and Azure DevOps PR creation
   - Link work items correctly for Azure DevOps

4. **PAW-05 PR.chatmode.md** (251 lines):
   - Add platform detection for final PR
   - Extract repository context from Remote field URL
   - Support both GitHub and Azure DevOps PR creation
   - Link work items correctly for Azure DevOps

5. **PAW-01B Spec Research Agent.chatmode.md** (estimated ~150 lines):
   - Update WorkflowContext.md reading to support "Issue URL" or "GitHub Issue"

6. **PAW-02A Code Researcher.chatmode.md** (estimated ~200 lines):
   - Update WorkflowContext.md reading to support "Issue URL" or "GitHub Issue"

7. **PAW-02B Impl Planner.chatmode.md** (estimated ~300 lines):
   - Update WorkflowContext.md reading to support "Issue URL" or "GitHub Issue"

8. **PAW-03A Implementer.chatmode.md** (estimated ~250 lines):
   - Update WorkflowContext.md reading to support "Issue URL" or "GitHub Issue"

9. **PAW-04 Documenter.chatmode.md** (estimated ~200 lines):
   - Update WorkflowContext.md reading to support "Issue URL" or "GitHub Issue"

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
4. **MCP Integration**: Agents invoke MCP tools through natural language, Copilot routes to available tools

**Key Design Decisions**:

1. **No Implementation Code**: All PAW logic exists in agent instruction files (.chatmode.md)
2. **MCP Abstraction**: Agents don't handle authentication or make direct API calls
3. **Parameter Centralization**: WorkflowContext.md serves as single source of truth
4. **Platform-Agnostic Artifacts**: Spec.md, ImplementationPlan.md, etc. contain no platform-specific details

**Azure DevOps Integration Approach**:

1. **Platform Detection**: Runtime detection from Remote field URL in WorkflowContext.md
2. **Tool Routing**: Conditional logic routes to `mcp_github_*` or `mcp_azuredevops_*` based on platform
3. **Field Compatibility**: "Issue URL" supports both platforms; "GitHub Issue" backward compatible
4. **No Schema Changes**: Organization/project extracted at runtime, not stored in WorkflowContext.md

**Implementation Pattern**:

Each agent that needs platform awareness will:
1. Read Remote field from WorkflowContext.md
2. Resolve remote name to URL if needed: `git config --get remote.<name>.url`
3. Parse URL to determine platform (github.com vs dev.azure.com)
4. Extract platform-specific identifiers from URL
5. Route to appropriate MCP tool namespace
6. Format platform-specific links correctly

## Open Questions

None - all implementation details are clear from the specification and existing agent patterns.
