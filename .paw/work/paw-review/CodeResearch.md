---
date: 2025-10-22 22:15:27 EDT
git_commit: 1b4e3b8cd189a74e022f6be09a875b5d85c97870
branch: feature/paw-review
repository: phased-agent-workflow
topic: "PAW Review Workflow Implementation"
tags: [research, codebase, paw-review, github-mcp, chatmodes, artifacts]
status: complete
last_updated: 2025-10-22
---

# Research: PAW Review Workflow Implementation

**Date**: 2025-10-22 22:15:27 EDT
**Git Commit**: 1b4e3b8cd189a74e022f6be09a875b5d85c97870
**Branch**: feature/paw-review
**Repository**: phased-agent-workflow

## Research Question

How is the existing PAW workflow implemented to inform the design and implementation of a new review workflow that helps reviewers understand, evaluate, and provide thoughtful feedback on pull requests?

## Summary

The PAW (Phased Agent Workflow) system is implemented as a collection of specialized chat mode agents (`.chatmode.md` files) that guide developers through staged workflow milestones. Each agent is responsible for a specific stage (Specification, Planning, Implementation, Documentation, PR) and produces durable markdown artifacts stored in `.paw/work/<feature-slug>/` directories. The system uses a consistent `WorkflowContext.md` pattern to share parameters across agents, leverages GitHub MCP tools for repository interactions, and follows a disciplined artifact creation and update pattern. The review workflow can be built following these same architectural patterns.

## Detailed Findings

### Chat Mode Agent Structure

**Location**: `.github/chatmodes/`

Nine chat mode files implement the PAW workflow:

1. **PAW-01A Spec Agent.chatmode.md** - Converts issues/briefs into structured specifications
2. **PAW-01B Spec Research Agent.chatmode.md** - Answers behavioral research questions
3. **PAW-02A Code Researcher.chatmode.md** - Maps implementation details with file:line references
4. **PAW-02B Impl Planner.chatmode.md** - Creates phased implementation plans
5. **PAW-03A Implementer.chatmode.md** - Implements plan phases
6. **PAW-03B Impl Reviewer.chatmode.md** - Reviews implementation and opens PRs
7. **PAW-04 Documenter.chatmode.md** - Produces comprehensive documentation
8. **PAW-05 PR.chatmode.md** - Opens final PR to main with pre-flight checks
9. **PAW-X Status Update.chatmode.md** - Maintains GitHub Issue/PR synchronization

**Chat Mode File Format**:
- YAML frontmatter with `description` field
- Markdown content with agent instructions
- Structured sections defining responsibilities, workflows, guardrails

**Example Structure** (`PAW-02A Code Researcher.chatmode.md:1-20`):
```markdown
````chatmode
---
description: 'PAW Researcher agent'
---
# Codebase Researcher Agent

You are tasked with conducting comprehensive research across the codebase...

## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT...
```

### WorkflowContext.md Pattern

**Purpose**: Single source of truth for workflow parameters, eliminating repetition across agent invocations

**Location**: `.paw/work/<feature-slug>/WorkflowContext.md`

**Format** (all agents use this consistent structure):
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

**Usage Pattern Across All Agents**:

1. **Initial Setup** (found in all agent files around lines 10-90):
   - Check for `WorkflowContext.md` in chat context or on disk
   - Extract parameters if present (Target Branch, Work Title, Feature Slug, GitHub Issue, Remote, Artifact Paths, Additional Inputs)
   - Default `Remote` to `origin` if omitted
   - Only prompt for missing parameters

2. **Creation/Update** (when parameters missing):
   - Derive Target Branch from current git branch if needed
   - Generate Feature Slug from Work Title using normalization rules
   - Write to `.paw/work/<feature-slug>/WorkflowContext.md`
   - Update whenever new parameters are discovered

**Feature Slug Generation** (`PAW-01A Spec Agent.chatmode.md:29-55`):
- Primary logic in PAW-01A Spec Agent
- Normalization: lowercase, hyphens, remove invalid chars, max 100 chars
- Validation: format check, uniqueness check, similarity warning
- Auto-conflict resolution: append -2, -3, etc. for auto-generated slugs
- User confirmation required for user-provided conflicting slugs

**Work Title Usage** (`PAW-02B Impl Planner.chatmode.md:367`, `PAW-05 PR.chatmode.md:75-80`):
- Short descriptive name (2-4 words)
- Prefixes all PR titles: `[<Work Title>] <description>`
- Examples: "Auth System", "API Refactor", "PAW Directory"

### Artifact Creation and Management

**Artifact Directory Structure**:
```
.paw/work/<feature-slug>/
  WorkflowContext.md          # Parameter file
  Spec.md                     # Specification
  SpecResearch.md             # Behavioral research
  CodeResearch.md             # Implementation research
  ImplementationPlan.md       # Phased plan
  Docs.md                     # Documentation
  prompts/
    spec-research.prompt.md   # Research prompts
    code-research.prompt.md
```

**Artifact Creation Pattern** (`PAW-02A Code Researcher.chatmode.md:158-195`):

1. **Frontmatter with Metadata**:
   ```yaml
   ---
   date: [ISO format with timezone]
   git_commit: [Current commit hash]
   branch: [Current branch name]
   repository: [Repository name]
   topic: "[Topic]"
   tags: [research, codebase, components]
   status: complete
   last_updated: [YYYY-MM-DD]
   ---
   ```

2. **Structured Content**:
   - Research Question section
   - Summary section
   - Detailed Findings with file:line references
   - Code References list
   - Architecture Documentation
   - Open Questions (if any)

3. **File Path References**:
   - Always include exact file paths with line numbers
   - Format: `path/to/file.ext:line` or `file.ext:line-range`
   - Convert to GitHub permalinks when on pushed commits

**Metadata Gathering** (`PAW-02A Code Researcher.chatmode.md:159-165`):
```bash
date '+%Y-%m-%d %H:%M:%S %Z'  # Current date/time with timezone
git rev-parse HEAD             # Git commit hash
git branch --show-current      # Current branch name
basename $(git rev-parse --show-toplevel)  # Repository name
```

**Artifact Update Discipline** (`PAW-03A Implementer.chatmode.md:280-286`):
- Only update for work actually completed in current session
- Preserve prior notes and context
- Append new summaries instead of rewriting sections
- Limit edits to affected sections to minimize diffs

### GitHub MCP Integration

**Available GitHub MCP Tools** (referenced across multiple agents):

The system uses GitHub MCP tools (not direct API calls or `gh` CLI) for all GitHub interactions.

**PR Operations**:
- `mcp_github_create_pull_request` - Create PRs
- `mcp_github_update_pull_request` - Update PR metadata
- `mcp_github_merge_pull_request` - Merge PRs
- `mcp_github_pull_request_read` - Get PR details, diff, status, files, reviews, comments

**Review Operations**:
- `mcp_github_pull_request_review_write` - Create/submit/delete pending reviews
- `mcp_github_add_comment_to_pending_review` - Add comments to pending review
- `mcp_github_request_copilot_review` - Request automated Copilot review

**Issue/Comment Operations**:
- `mcp_github_get_issue` - Get issue details
- `mcp_github_add_issue_comment` - Add issue comments
- `mcp_github_get_issue_comments` - Get issue comments
- `mcp_github_create_issue` - Create new issues

**Search Operations**:
- `mcp_github_search_pull_requests` - Search PRs with filters
- `mcp_github_list_pull_requests` - List PRs in repository
- `mcp_github_search_issues` - Search issues

**Usage Pattern** (`PAW-01A Spec Agent.chatmode.md:344`):
```
- ALWAYS use the **github mcp** tools to interact with GitHub issues and PRs.
- Do not fetch pages directly or use the gh cli.
```

**Current PR Review Comment Handling** (`PAW-03B Impl Reviewer.chatmode.md:164-226`):

Implementation Review Agent handles review comments by:
1. Reading review comments and Implementation Agent's changes
2. Verifying each comment addressed
3. Pushing all commits
4. Posting single comprehensive summary comment documenting:
   - Which review comments were addressed
   - Which commits address each comment
   - Overall summary

Manual comment resolution done by humans in GitHub UI.

### Agent Workflow Patterns

**Two-Agent Implementation Pattern** (`PAW-03A Implementer.chatmode.md`, `PAW-03B Impl Reviewer.chatmode.md`):

Split responsibilities for forward momentum vs. quality gate:

**Implementation Agent (PAW-03A)** - Forward Momentum:
- Implements functional code and tests
- Runs automated verification
- Addresses PR review comments with code changes
- Commits changes locally (doesn't push)
- Updates ImplementationPlan.md with progress

**Implementation Review Agent (PAW-03B)** - Quality Gate:
- Reviews Implementation Agent's changes
- Adds documentation and polish
- Pushes commits and opens PRs
- Verifies review comment responses
- Posts comprehensive summary comments to PRs

**Hand-off Pattern** (`PAW-03A Implementer.chatmode.md:210-220`):
```
Phase [N] Implementation Complete - Ready for Review

Automated verification passed:
- [List automated checks that passed]

All changes committed locally. Please ask the Implementation Review Agent to review my changes, add documentation, and open the Phase PR.
```

**Phase Branch Naming** (`PAW-03A Implementer.chatmode.md:94-99`):
- Single phase: `<feature-branch>_phase[N]`
- Multiple phases: `<feature-branch>_phase[M-N]`
- Planning: `<feature-branch>_plan`
- Docs: `<feature-branch>_docs`
- Final PR: `<feature-branch>` → `main`

### Pre-flight Validation Pattern

**PR Agent Pre-flight Checks** (`PAW-05 PR.chatmode.md:28-50`):

Before creating final PR, validates:
1. All phases in ImplementationPlan.md marked complete
2. All phase PRs merged to target branch
3. Docs.md exists and docs PR merged
4. All artifacts exist (Spec, SpecResearch, CodeResearch, ImplementationPlan)
5. Target branch up to date with base branch
6. Build and tests passing

Reports status and blocks if checks fail, unless user explicitly confirms to proceed.

### Research Agent Patterns

**Three Research Modes** (`PAW-02A Code Researcher.chatmode.md:226-306`):

1. **Code Location**: Find WHERE files and components live
   - Search for files by topic/feature
   - Categorize findings (implementation, tests, config, docs)
   - Return structured results with full paths

2. **Code Analysis**: Understand HOW code works
   - Read files to understand logic
   - Trace data flow and transformations
   - Document architectural patterns
   - Always include file:line references

3. **Code Pattern Finder**: Find examples of existing patterns
   - Locate similar implementations
   - Extract reusable patterns
   - Provide concrete code examples

**Critical Constraints** (`PAW-02A Code Researcher.chatmode.md:1-10`):
- ONLY document what exists, no suggestions or improvements
- NO critique or recommendations
- NO root cause analysis unless explicitly asked
- Document WHERE and HOW, not "what should be"

**Research Steps** (`PAW-02A Code Researcher.chatmode.md:46-98`):
1. Read mentioned files FULLY first (no limit/offset)
2. Analyze and decompose research question
3. Perform comprehensive research
4. Synthesize findings before proceeding
5. Gather metadata using terminal commands
6. Generate research document with frontmatter
7. Add GitHub permalinks if applicable
8. Present findings

## Code References

### Chat Mode Files
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` - Specification creation
- `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md` - Behavioral research
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` - Implementation research
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` - Implementation planning
- `.github/chatmodes/PAW-03A Implementer.chatmode.md` - Phase implementation
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` - Implementation review
- `.github/chatmodes/PAW-04 Documenter.chatmode.md` - Documentation generation
- `.github/chatmodes/PAW-05 PR.chatmode.md` - Final PR creation
- `.github/chatmodes/PAW-X Status Update.chatmode.md` - Status synchronization

### Example Artifacts
- `.paw/work/paw-directory/WorkflowContext.md` - Parameter file example
- `.paw/work/paw-directory/Spec.md` - Specification example
- `.paw/work/paw-directory/SpecResearch.md` - Behavioral research example
- `.paw/work/paw-directory/CodeResearch.md` - Implementation research example
- `.paw/work/paw-directory/ImplementationPlan.md` - Phased plan example

### Specification Documents
- `paw-specification.md` - Main PAW workflow specification (root)
- `paw-review-specification.md` - PAW Review workflow specification (root)

## Architecture Documentation

### Overall Architecture

PAW uses a **staged agent workflow** pattern where:
1. Each stage has dedicated agent(s) with clear responsibilities
2. Agents produce durable markdown artifacts
3. Artifacts form a traceable chain of reasoning
4. WorkflowContext.md provides parameter continuity
5. GitHub MCP tools handle all repository interactions
6. Two-agent pattern separates forward momentum from quality gates

### Agent Responsibilities

**Stage 01 - Specification**:
- Spec Agent: Interactive spec creation with user
- Spec Research Agent: Answer behavioral questions

**Stage 02 - Implementation Planning**:
- Code Research Agent: Map implementation details
- Impl Planner: Create phased implementation plan

**Stage 03 - Phased Implementation**:
- Implementer: Make code changes, run tests
- Impl Reviewer: Review, document, push, open PRs

**Stage 04 - Documentation**:
- Documenter: Create comprehensive Docs.md

**Stage 05 - Final PR**:
- PR Agent: Pre-flight checks, create final PR

**Cross-stage**:
- Status Agent: Synchronize GitHub Issues/PRs

### Key Design Patterns

**Parameter Continuity Pattern**:
- WorkflowContext.md created once, referenced by all agents
- Agents extract parameters at startup
- Updates propagate to downstream agents
- Eliminates repetitive parameter gathering

**Artifact Chain Pattern**:
- Each artifact builds on previous artifacts
- Spec.md → SpecResearch.md → CodeResearch.md → ImplementationPlan.md → Docs.md
- Clear dependencies and traceability
- All artifacts include frontmatter metadata

**Split Responsibility Pattern**:
- Forward momentum agent makes changes
- Quality gate agent reviews and publishes
- Prevents mixing concerns
- Enables iterative refinement

**Pre-flight Validation Pattern**:
- Validate prerequisites before actions
- Block and report if checks fail
- Allow explicit user override
- Prevents incomplete work from proceeding

**Research Methodology Pattern**:
- Document what IS, not what SHOULD BE
- Include file:line references for all claims
- Organize findings by component/concern
- Support permalinks for pushed commits

### Artifact Lifecycle

1. **Creation**: Agent generates artifact with frontmatter
2. **Storage**: Saved to `.paw/work/<feature-slug>/`
3. **Reference**: Subsequent agents read and build upon
4. **Update**: Append follow-up sections as needed
5. **Preservation**: Committed to git for traceability

### GitHub Integration

- Use MCP tools exclusively (no direct API or CLI)
- Support for PRs, reviews, comments, issues
- Pending review workflow for comment drafting
- Manual human control over what gets posted

## Open Questions

None - research objectives fully addressed.

