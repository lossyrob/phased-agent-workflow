---
name: paw-review-understanding
description: Analyzes PR changes to create ReviewContext.md and DerivedSpec.md artifacts. Handles both initial analysis and resumption after baseline research.
metadata:
  type: activity
  artifacts: ReviewContext.md, DerivedSpec.md
  stage: understanding
---

# Understanding Activity Skill

Analyze pull request changes to create comprehensive understanding artifacts. This activity handles both initial context gathering and specification derivation after baseline research.

> **Reference**: Follow Core Review Principles from `paw-review-workflow` skill.

## Responsibilities

- Gather PR metadata (GitHub API or git diff) and document changed files
- Generate research prompt for baseline codebase analysis
- Derive specification from PR description, code analysis, and baseline understanding
- Create ReviewContext.md as authoritative parameter source
- Validate all artifacts meet quality standards

## Non-Responsibilities

- Quality evaluation or gap identification (Evaluation stage skills)
- Review comment generation (Output stage skills)
- Git operations for checkout/restore (handled by paw-review-baseline)
- Workflow orchestration and stage transitions (handled by workflow skill)

## Execution Modes

This skill operates in two modes based on artifact state:

### Initial Mode (No ReviewContext.md)

Execute Steps 1-3: Context gathering, research prompt generation, signal for baseline research.

**Detection**: ReviewContext.md not found at `.paw/reviews/<identifier>/`

### Resumption Mode (ReviewContext.md + CodeResearch.md exist)

Execute Step 4 only: Derive specification from baseline research.

**Detection**: Both ReviewContext.md AND CodeResearch.md exist at artifact path.

## Context Detection

Determine context type before proceeding:

**GitHub Context**: PR URL or number provided
- Use GitHub MCP tools for metadata retrieval
- Extract commits, files, description from API

**Non-GitHub Context**: No PR reference
- Verify current branch is checked out
- Request base branch name from user
- Use git commands for metadata

## Step 1: Context Gathering & ReviewContext.md Creation

1. **Determine Remote Name**:
   - Check ReviewContext.md for `Remote` field (if resuming)
   - Default to `origin` if not specified
   - Verify remote exists: `git remote -v`

2. **Fetch PR Metadata**:
   - **GitHub**: Use `mcp_github_pull_request_read` (method: get)
     - Extract: number, title, author, state, created date, description, labels, reviewers
     - Get CI status from `mcp_github_pull_request_read` (method: get_status)
     - Get changed files from `mcp_github_pull_request_read` (method: get_files)
   - **Non-GitHub**: Use git commands
     - Current branch as head, provided branch as base
     - `git log <base>..<head>` for commits
     - `git diff <base>...<head> --stat` for changed files

3. **Resolve Base Commit** (Non-GitHub only):
   - Prefer remote: `git rev-parse <remote>/<base-branch>`
   - Fallback to local: `git rev-parse <base-branch>`
   - Record source (remote|local|github-api) in ReviewContext.md

4. **Create ReviewContext.md**:
   - Write to `.paw/reviews/<identifier>/ReviewContext.md`
   - Use template structure below
   - Include all metadata and flags

## Step 2: Research Prompt Generation

1. **Identify Research Needs** for each changed file:
   - How did the module function before changes?
   - What were integration points and dependencies?
   - What patterns and conventions were used?
   - What test coverage was present?

2. **Create prompts/01B-code-research.prompt.md**:
   - YAML frontmatter with `mode: PAW Review`
   - Relative path to ReviewContext.md
   - Research questions only (no agent instructions)

## Step 3: Signal for Research

Report completion of initial phase:
```
Research Prompt Ready

Created prompts/01B-code-research.prompt.md with questions about pre-change behavior.

Files to investigate at base commit <sha>:
- [list files]

Waiting for CodeResearch.md from baseline research.
```

**Activity Status**: Partial (awaiting baseline research)

## Step 4: Derive Specification

Execute only when CodeResearch.md exists.

1. **Read All Source Material**:
   - ReviewContext.md (PR description, changed files)
   - CodeResearch.md (pre-change system behavior)
   - Git diffs for all changes

2. **Identify Explicit Goals**:
   - Goals stated in PR description
   - Requirements from linked issues
   - Commit messages describing intent
   - Mark as "Explicit" in DerivedSpec.md

3. **Identify Inferred Goals**:
   - Observable behavior changes from code analysis
   - New functionality added
   - Modified logic or control flow
   - Mark as "Inferred" in DerivedSpec.md

4. **Document Baseline Context** (from CodeResearch.md):
   - How system worked before changes
   - Existing patterns and conventions
   - Integration points affected

5. **Characterize Before/After Behavior**:
   - Specific observable differences
   - Changed APIs, endpoints, interfaces
   - Modified data flows

6. **Flag Discrepancies**:
   - PR description contradicts code changes → BLOCK
   - Intent unclear → document as inferred with evidence
   - **CRITICAL**: If open questions remain, report blocked status

7. **Create DerivedSpec.md**:
   - Write to `.paw/reviews/<identifier>/DerivedSpec.md`
   - Use template structure below
   - **Zero open questions allowed**

## Artifact Directory Structure

**GitHub Context**: `.paw/reviews/PR-<number>/`
**Non-GitHub Context**: `.paw/reviews/<branch-slug>/`

Branch slug: lowercase, `/` → `-`, remove invalid chars.

## Validation Criteria

### ReviewContext.md
- All metadata fields populated
- Flags section identifies applicable conditions
- Base and head commit SHAs recorded

### Research Prompt
- Questions are specific and answerable
- All changed files covered
- Clear investigation targets with file:line references

### DerivedSpec.md
- Explicit vs inferred goals distinguished
- Baseline behavior documented from CodeResearch.md
- Observable before/after behavior characterized
- All file:line references accurate
- **Zero open questions**

## Error Handling

### Conflicting Information

If PR description contradicts code:
```
CRITICAL: Discrepancy Block

PR Description States:
[quote]

Code Analysis Shows:
[file:line evidence]

Activity Status: Blocked
Reason: Cannot derive specification without resolving conflict
```

### Missing PR Description

- Note in DerivedSpec.md: "No explicit goals stated"
- Rely entirely on inferred goals from code analysis
- Flag uncertainty explicitly

## Completion Response

### After Initial Mode (Steps 1-3):
```
Activity complete.
Artifact saved: .paw/reviews/<identifier>/ReviewContext.md
Artifact saved: .paw/reviews/<identifier>/prompts/01B-code-research.prompt.md
Status: Partial
Summary: Context gathered, awaiting baseline research.
```

### After Resumption Mode (Step 4):
```
Activity complete.
Artifact saved: .paw/reviews/<identifier>/DerivedSpec.md
Status: Success
Summary: Specification derived with [N] explicit and [M] inferred goals.
```

---

## ReviewContext.md Template

```markdown
---
date: <YYYY-MM-DD HH:MM:SS TZ>
git_commit: <head commit SHA>
branch: <head branch>
repository: <owner/repo OR local>
topic: "Review Context for <PR Title or Branch>"
tags: [review, context, metadata]
status: complete
---

# ReviewContext

**PR Number**: <number> (GitHub) OR **Branch**: <branch-slug> (non-GitHub)
**Remote**: <remote-name> (default: origin, or "No remote configured")
**Base Branch**: <base-branch>
**Head Branch**: <head-branch>
**Base Commit**: <sha>
**Base Commit Source**: remote|local|github-api
**Head Commit**: <sha>
**Repository**: <owner>/<repo> OR "Local repository"
**Author**: <username or git author>
**Title**: <pr-title or derived from commits>
**State**: open|closed|draft (GitHub) OR active (non-GitHub)
**Created**: <date> (GitHub only)
**CI Status**: <passing|failing|pending> (GitHub) OR "Not available" (non-GitHub)
**Labels**: <label-list> (GitHub) OR "N/A" (non-GitHub)
**Reviewers**: <reviewer-list> (GitHub) OR "N/A" (non-GitHub)
**Linked Issues**: <issue-urls> (GitHub) OR "Inferred from commits" (non-GitHub)
**Changed Files**: <count> files, +<additions> -<deletions>
**Artifact Paths**: .paw/reviews/<identifier>/

## Description

<PR description text or commit message summary>

## Flags

- [x/] CI Failures present
- [x/] Breaking changes suspected

## Artifacts

- [x/] ReviewContext.md - This file
- [x/] prompts/01B-code-research.prompt.md - Research guidance
- [x/] CodeResearch.md - Baseline understanding (paw-review-baseline)
- [x/] DerivedSpec.md - Derived specification

## Metadata

**Created**: <timestamp>
**Git Commit**: <current HEAD SHA>
**Reviewer**: <current git user>
**Analysis Tool**: PAW Review Understanding
```

---

## DerivedSpec.md Template

```markdown
---
date: <YYYY-MM-DD HH:MM:SS TZ>
git_commit: <head commit SHA>
branch: <head branch>
repository: <owner/repo OR local>
topic: "Derived Specification for <PR Title or Branch>"
tags: [review, specification, analysis]
status: complete
---

# Derived Specification: <PR Title or Branch>

## Intent Summary

<1-2 sentence summary of what this PR accomplishes>

## Explicit Goals (Stated in PR/Issues)

Goals explicitly mentioned in PR description, linked issues, or commit messages:

1. <Goal from PR description>
2. <Goal from linked issue #X>

*Source: PR description, Issue #X, commits <sha>...<sha>*

## Inferred Goals (Observed from Code)

Goals derived from code analysis that weren't explicitly stated:

1. <Observable behavior change with file:line reference>
2. <New functionality added with file:line reference>

*Source: Code analysis of changed files*

## Baseline Behavior (Pre-Change)

How the system worked before changes (from CodeResearch.md):

**Module**: `path/to/module.ext`
- **Before**: <behavior description>
- **Integration**: <connections to other components>
- **Patterns**: <conventions used>

*Source: CodeResearch.md at base commit <sha>*

## Observable Changes (Before → After)

### Changed Interfaces

| Component | Before | After | Breaking? |
|-----------|--------|-------|-----------|
| `module.func()` | params: (a, b) | params: (a, b, c) | Yes |

### Changed Behavior

**Feature**: <feature name>
- **Before**: <from CodeResearch.md>
- **After**: <from code analysis>
- **Impact**: <observable difference>

[file:line references for each claim]

## Scope Boundaries

**In Scope**: <What this PR changes>
**Out of Scope**: <What this PR does NOT change>

## Assumptions

<Document only when necessary to resolve ambiguity>

## Open Questions

**CRITICAL**: This section must be empty before completion.

## Discrepancies Flagged

[Only if conflicts exist]

**PR Description States**: <quote>
**Code Analysis Shows**: <evidence with file:line>
**Resolution**: [Pending | Resolved: <how>]

## References

- **ReviewContext.md**: Metadata and changed file summary
- **CodeResearch.md**: Pre-change baseline understanding
- **Commits**: <base-sha>..<head-sha>
```
