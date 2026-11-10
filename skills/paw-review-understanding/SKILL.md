---
name: paw-review-understanding
description: Analyzes PR changes to create ReviewContext.md and DerivedSpec.md artifacts. Handles both initial analysis and resumption after baseline research.
---

# Understanding Activity Skill

Analyze pull request changes to create comprehensive understanding artifacts. This activity handles both initial context gathering and specification derivation after baseline research.

> Follow the activity contract named in your brief.

## Responsibilities

- Gather review metadata from available platform tools or git and document changed files
- Generate research prompt for baseline codebase analysis
- Derive specification from PR description, code analysis, and baseline understanding
- Create ReviewContext.md as authoritative parameter source
- Validate all artifacts meet quality standards

## Non-Responsibilities

- Quality evaluation or gap identification (Evaluation stage skills)
- Review comment generation (Output stage skills)
- Reading the codebase at the base commit (paw-review-baseline)
- Workflow orchestration (the review host)

## Execution Modes

Your brief names the mode; if it does not, detect it from the artifact directory.

- **Initial** (no ReviewContext.md): Steps 1-2.
- **Resume** (ReviewContext.md and CodeResearch.md exist): Step 3 only.

## Context Detection

Determine context type before proceeding:

**GitHub Context**: GitHub PR URL or number provided
- Use read-only GitHub tools (`gh` or GitHub MCP, per the host instructions) for metadata
- Extract commits, files, description

**Azure DevOps Context**: Azure DevOps PR URL or coordinates provided
- Use supplied metadata or available platform tools
- If executable review output is unavailable, retain artifact-only capability; do not probe APIs or permissions to manufacture capability

**Local Context**: No hosted PR reference
- Base branch from the brief; if it is missing, return `needs-decision`
- Use git commands for metadata

The brief carries the resolved preflight fields. If they are missing or the preflight is blocked, return `blocked` before creating review artifacts.

## Multi-Repository Mode

**Detection**: Any of these conditions triggers multi-repo mode:
- Multiple PR URLs/numbers in input (e.g., `PR-123 PR-456`)
- Multiple workspace folders open (detected via multiple `.git` directories)
- PR links reference different repositories

**Per-PR Processing**:
- Create separate artifact directories for each PR
- Run each mode independently for each repository
- Cross-reference related PRs in each ReviewContext.md

**Identifier Scheme**:
- Single PR: `PR-<number>` (e.g., `PR-123`)
- Multi-repo PR: `PR-<number>-<repo-slug>` (e.g., `PR-123-my-api`)
- Repo-slug: Last segment of repository name, lowercase, special chars removed

**ReviewContext.md Extension** (for multi-repo):
```yaml
repository: owner/repo-name
related_prs:
  - number: 456
    repository: owner/other-repo
    relationship: "depends-on"  # or "related-to", "blocks"
```

## Step 1: Context Gathering & ReviewContext.md Creation

1. **Determine Remote Name**:
   - Check ReviewContext.md for `Remote` field (if resuming)
   - Default to `origin` if not specified

2. **Fetch PR Metadata**:
   - **GitHub**: Use GitHub tools to retrieve PR details (number, title, author, state, description, labels, reviewers, CI status, changed files)
   - **Azure DevOps**: Use supplied metadata or available platform tools; use git for commit and diff data when hosted metadata capability is unavailable
   - **Local**: Use git to determine commits and changed files between base and head

3. **Resolve Base Commit**:
   - **GitHub**: Use `base.sha` from PR metadata (GitHub returns the merge-base)
   - **Azure DevOps/Local**: Run `git merge-base <head-branch> origin/<base-branch>` when platform metadata does not provide the merge-base
   - **CRITICAL**: The base commit must be the merge-base (common ancestor), NOT the current tip of the base branch. Using the tip causes files added to main after branching to appear as "deletions."
   - Record in ReviewContext.md: `Base Commit: <sha>` and `Base Commit Source: github-api | platform-metadata | merge-base`

4. **Create ReviewContext.md**:
   - Write to `.paw/reviews/<identifier>/ReviewContext.md`
   - Use template structure below
   - Include all metadata and flags

## Step 2: Research Questions Generation

1. **Identify Research Needs** for each changed file:
   - How did the module function before changes?
   - What were integration points and dependencies?
   - What patterns and conventions were used?
   - What test coverage was present?

2. **Create ResearchQuestions.md**:
   - Write to `.paw/reviews/<identifier>/ResearchQuestions.md`
   - YAML frontmatter with metadata
   - Research questions organized by changed file/module
   - Clear investigation targets with file:line references

## Step 3: Derive Specification

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
- Review Configuration block present with the values from the brief
- Authorization fields present with `Preflight Status: passed`
- Feedback scope is recorded as `all` or the explicit user filter
- Explicit submission has an allowed event and target/head authorization; unavailable explicit mutations are blocked before artifact creation

### ResearchQuestions.md
- Questions are specific and answerable
- All changed files covered
- Clear investigation targets with file:line references

### DerivedSpec.md
- Explicit vs inferred goals distinguished
- Baseline behavior documented from CodeResearch.md
- Observable before/after behavior characterized
- All file:line references accurate
- **Zero open questions**

## Completion

Return the block in the activity contract. Initial: `ReviewContext.md` and `ResearchQuestions.md`, with the files to investigate at the base commit in the summary. Resume: `DerivedSpec.md`, with the counts of explicit and inferred goals.

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

**PR Number**: <number> (hosted PR) OR **Branch**: <branch-slug> (local)
**Review Platform**: <github | azure-devops | local>
**Remote**: <remote-name> (default: origin, or "No remote configured")
**Base Branch**: <base-branch>
**Head Branch**: <head-branch>
**Base Commit**: <sha>
**Base Commit Source**: github-api|platform-metadata|merge-base
**Head Commit**: <sha>
**Repository**: <owner>/<repo> OR "Local repository"
**Author**: <username or git author>
**Title**: <pr-title or derived from commits>
**State**: <open | closed | draft | active>
**Created**: <date | N/A>
**CI Status**: <passing | failing | pending | Not available>
**Labels**: <label-list | N/A>
**Reviewers**: <reviewer-list | N/A>
**Linked Issues**: <issue-urls | inferred from commits | none>
**Changed Files**: <count> files, +<additions> -<deletions>
**Artifact Paths**: .paw/reviews/<identifier>/

## Authorization Preflight

**Output Capability**: <pending-and-submit | pending-only | artifact-only>
**Requested Output Action**: <pending | submit | artifact-only>
**Feedback Scope Filter**: <all | explicit user scope/output filter>
**Submission Authorization**: <explicit | absent | ambiguous>
**Submission Event**: <APPROVE | REQUEST_CHANGES | COMMENT | none>
**Authorized Target**: <platform-qualified repository and PR | local branch | none>
**Authorized Head Commit**: <sha | none>
**Authorized Pending Review**: <pending review ID | bind-created-review | none>
**Authorization Conflict**: <none | concise conflict>
**Preflight Status**: <passed | blocked: reason>

## Review Configuration

```yaml
mode: <single-model | society-of-thought>
models: <none | model pool | specialist:model pairs>
specialists: <all | names | adaptive:N>
interaction: <parallel | debate>
perspectives: <none | auto | names>
perspective_cap: <positive integer>
interactive: <false | true | smart>
```

*Use the values from the brief. Missing fields take the defaults `single-model`, `none`, `all`, `parallel`, `none`, `2`, `false`; never select a subset of specialists.*

## Description

<PR description text or commit message summary>

## Flags

- [x/] CI Failures present
- [x/] Breaking changes suspected

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
