---
name: paw-review-feedback
description: Transforms gap analysis findings into structured review comments with comprehensive rationale, creating GitHub pending review.
metadata:
  type: activity
  artifacts: ReviewComments.md
  stage: output
---

# PAW Review Feedback Skill

Transform gap analysis findings into structured review comments with comprehensive rationale sections that cite evidence, baseline patterns, impact, and best practices.

> **Reference**: Follow Core Review Principles from `paw-review-workflow` skill.

## Prerequisites

Verify these artifacts exist in `.paw/reviews/<identifier>/`:
- `ReviewContext.md` (PR metadata and parameters)
- `CodeResearch.md` (baseline codebase understanding)
- `DerivedSpec.md` (what the PR is trying to achieve)
- `ImpactAnalysis.md` (system-wide impact assessment)
- `GapAnalysis.md` (categorized findings with evidence)

If any artifact is missing, report blocked status—earlier stages must complete first.

## Core Responsibilities

- Batch related findings into coherent comments (One Issue, One Comment principle)
- Transform findings into clear, actionable review comments
- Generate comprehensive rationale sections citing evidence, baseline patterns, impact, and best practices
- Create `ReviewComments.md` with all comments, rationale, and metadata
- For GitHub PRs: Create pending review with inline/thread comments (WITHOUT rationale sections)
- For non-GitHub workflows: Provide manual posting instructions
- Enable tone adjustment while preserving evidence and IDs

## Process Steps

### Step 1: Batch Related Findings (One Issue, One Comment)

Group findings that share the same root cause:

**Batching Criteria:**
- Same underlying issue manifesting in multiple locations
- Related error handling gaps across a module
- Consistent pattern violations throughout changed files
- Missing tests for related functionality

**Batching Approach:**
- Create single comment referencing multiple file:line locations, OR
- Create linked comments (note relationship in comment text)
- Avoid scattering feedback for one logical issue across multiple disconnected comments

**Examples:**
- Multiple null checks missing in same class → One comment listing all locations
- Architectural concern spanning 3 files → One thread comment discussing the pattern
- Missing tests for several related methods → One comment about test coverage gap

### Step 2: Build Comment Objects

For each finding or batched group of findings, create structured comment:

**Required Fields:**
- **Type**: `inline` (line-specific) or `thread` (file/concept-level)
- **File(s) and line range(s)**: Specific locations from GapAnalysis.md
- **Severity**: Must/Should/Could (from GapAnalysis categorization)
- **Category**: Correctness, Safety, Testing, Maintainability, Performance, etc.
- **Description**: Clear, specific explanation of the issue
- **Suggestion**: Code example or recommended approach
- **Rationale**: (generated in next step)

**Inline vs Thread Determination:**

Use **Inline** for:
- Issue specific to particular lines of code
- Logic error in a function
- Missing check at a specific location
- Performance issue in a specific loop
- Test gap for a specific method

Use **Thread** for:
- Architectural concern across >3 files
- Missing integration tests spanning components
- Consistent pattern violation throughout the PR
- Cross-cutting concerns (logging, error handling approach)
- General discussion about design decisions

### Step 3: Generate Rationale Sections

For EVERY comment, create comprehensive rationale with four components:

**Evidence:**
- File:line references from GapAnalysis.md findings
- Specific code snippets showing the issue
- Concrete examples of the problem

**Baseline Pattern:**
- Reference existing code in the codebase to show how similar situations are handled
- Cite established conventions and patterns from the codebase
- Show consistency/inconsistency with existing code
- **Important**: Do NOT reference CodeResearch.md or other PAW artifacts in comments—cite actual file:line locations instead

**Impact:**
- Explain what could go wrong (for Must items: specific failure modes)
- Describe user/system impact of not addressing
- Note performance, security, or maintainability implications
- Reference impact findings from analysis where applicable
- **Important**: Do NOT reference ImpactAnalysis.md or other PAW artifacts in comments—describe impacts directly

**Best Practice Citation:**
- Reference industry best practices from review-research-notes.md (if available)
- Cite language/framework conventions
- Link to relevant documentation or style guides
- Note security/safety standards

**Example Rationale:**
```markdown
**Rationale:**
- **Evidence**: `auth.ts:45` shows user input passed directly to SQL query without validation
- **Baseline Pattern**: Similar code in `database.ts:120-130` uses parameterized queries
- **Impact**: SQL injection vulnerability allowing unauthorized data access or modification
- **Best Practice**: OWASP Top 10 - Always use parameterized queries for user input
```

### Step 4: Create ReviewComments.md

Generate comprehensive markdown document:

```markdown
---
date: <timestamp>
git_commit: <sha>
branch: <branch>
repository: <repo>
topic: "Review Comments for <PR/Branch>"
tags: [review, comments, feedback]
status: complete
---

# Review Comments for <PR Number or Branch Slug>

**Context**: GitHub PR #X OR Non-GitHub branch feature/...
**Base Branch**: <base>
**Head Branch**: <head>
**Review Date**: <date>
**Reviewer**: <git user>
**Pending Review ID**: <id> (GitHub) OR "Manual posting required" (non-GitHub)

## Summary Comment

<Brief, positive opening acknowledging the work and effort>

<Overview of feedback scope and organization>

**Findings**: X Must-address items, Y Should-address items, Z optional suggestions

---

## Inline Comments

### File: `path/to/file.ts` | Lines: 45-50

**Type**: Must
**Category**: Safety

<Clear explanation of the issue>

**Suggestion:**
```typescript
// Proposed fix or approach with code example
```

**Rationale:**
- **Evidence**: `file.ts:45` shows unchecked null access
- **Baseline Pattern**: Similar code in `file.ts:100` uses null checks before accessing properties
- **Impact**: Potential null pointer exception causing crash in production
- **Best Practice**: Defensive programming - validate inputs before use

**Posted**: ✓ Pending review comment ID: <id>

---

### File: `path/to/another.ts` | Lines: 88

**Type**: Could
**Category**: Performance

<Suggestion for potential optimization>

**Suggestion:**
```typescript
// Optional improvement example
```

**Rationale:**
- **Evidence**: `another.ts:88` shows inefficient pattern
- **Baseline Pattern**: More efficient approach used in `optimized.ts:42`
- **Impact**: Minor performance improvement in non-critical path
- **Best Practice**: Optimization best practice reference

**Posted**: ✓ Pending review comment ID: <id> OR ⚠ Manual posting (non-GitHub)

---

## Thread Comments

### File: `path/to/module/` (Overall Architecture)

**Type**: Should
**Category**: Maintainability

<Discussion about broader architectural or design pattern concern>

**Rationale:**
...

**Posted**: ✓ Thread comment in pending review (general comment, no specific line) OR ⚠ Manual posting (non-GitHub)

---

## Questions for Author

1. <Question about intent or design decision - reference specific file:line>
2. <Clarification needed on edge case handling>
```

**Key Requirements:**
- Summary must be positive and constructive
- Every comment has rationale with all four components
- File:line references for all evidence
- Code examples for non-trivial suggestions
- Clear Posted status (GitHub ID or manual instructions)

### Step 5: GitHub Context - Create Pending Review

For GitHub PRs, create pending review using MCP tools:

**Steps:**
1. Use `mcp_github_pull_request_review_write` with method `create` and event omitted (creates pending review)
2. For **EVERY** comment (Must, Should, AND Could), use `mcp_github_add_comment_to_pending_review` with:
   - File path
   - Line number (or start_line/end_line for multi-line)
   - Comment text (description + suggestion ONLY)
   - Side: RIGHT (for new code)

**CRITICAL - What to Post vs What to Keep Local:**

| Post to GitHub Pending Review | Keep ONLY in ReviewComments.md |
|------------------------------|-------------------------------|
| ALL comments (Must, Should, Could) | Rationale sections |
| Comment description | Assessment sections (added by Critic) |
| Code suggestion examples | Internal notes and artifact references |
| Clear, actionable guidance | |

**Why Post Everything:**
- Reviewer can easily delete unwanted comments from pending review
- Much easier to delete than to manually add later
- Pending review is a draft—nothing is final until reviewer submits

**Why Keep Rationale Local:**
- Rationale and assessment are for the reviewer's understanding and decision-making
- They help the reviewer evaluate comment quality but would clutter the PR interface
- They expose internal decision-making process

**Result:**
- Pending review visible only to reviewer in GitHub UI
- ALL findings posted as comments in pending review
- Reviewer can edit/delete any comments before submission
- Comment IDs recorded in ReviewComments.md for tracking

### Step 6: Non-GitHub Context

For non-GitHub workflows (using git diff and branch names):

- All comments documented in ReviewComments.md with file paths and line ranges
- Reviewer manually posts comments to their review platform as needed
- Rationale and assessment sections remain in ReviewComments.md for reviewer reference

## Tone Adjustment

Support tone adjustments while preserving evidence and IDs:

**Default Tone:**
- Professional and constructive
- Inclusive language: "we", "let's", "this code" (not "you didn't")
- Balanced: acknowledge good work, suggest improvements
- Specific: cite exact locations and evidence

**Tone Adjustment Parameters:**
| Parameter | Low | High |
|-----------|-----|------|
| Directness | More diplomatic | More direct |
| Encouragement | Matter-of-fact | More encouraging |
| Formality | More casual | More formal |
| Conciseness | More explanatory | More concise |

**Adjustment Process:**
1. Accept tone parameters from reviewer
2. Regenerate comment TEXT ONLY (description + suggestion)
3. Preserve: Comment IDs, file:line locations, rationale, evidence, categorization
4. Update ReviewComments.md with new text
5. If GitHub pending review exists: Delete old review, create new one with adjusted tone
6. Maintain all comment tracking information

## Guardrails

**No PAW Artifact References in Posted Comments:**
- NEVER reference PAW artifacts (ReviewContext.md, CodeResearch.md, DerivedSpec.md, ImpactAnalysis.md, GapAnalysis.md, etc.) in comments posted to GitHub
- These files are NOT committed to the branch and are NOT accessible to the PR submitter
- Instead: Cite actual codebase files with file:line references
- PAW artifacts are for YOUR internal use and for the reviewer's understanding only

**No Automatic Submission:**
- NEVER submit pending review automatically
- Reviewer must explicitly submit after reviewing comments
- Pending review is a draft that reviewer controls

**Rationale Required:**
- EVERY comment must have complete rationale section
- All four components (Evidence, Baseline Pattern, Impact, Best Practice) required
- No suggestions without justification

**Evidence-Based:**
- All recommendations informed by existing codebase patterns
- File:line references for all claims
- Code examples from actual codebase when citing patterns

**Human Control:**
- Reviewer edits comments in GitHub UI
- Reviewer deletes unwanted comments
- Reviewer decides what to submit
- Reviewer controls submission timing

**Comprehensive Coverage:**
- ALL findings from GapAnalysis.md must be transformed into comments
- No cherry-picking or filtering
- Positive observations included in summary
- Questions documented in dedicated section

**One Issue, One Comment:**
- Related findings batched into single coherent comment
- Clear linking when related comments must be separate
- Avoid fragmenting feedback for same root cause

## Validation Checklist

Before completing, verify:

- [ ] All GapAnalysis.md findings transformed into comments
- [ ] Related issues batched appropriately (not scattered)
- [ ] Every comment has complete rationale (Evidence, Baseline Pattern, Impact, Best Practice)
- [ ] Code examples included for non-trivial suggestions
- [ ] Inline vs thread distinction applied correctly
- [ ] Summary comment is positive and constructive
- [ ] ReviewComments.md complete with all sections and metadata
- [ ] **GitHub context**: ALL comments (Must, Should, Could) posted to pending review
- [ ] **Non-GitHub context**: Manual instructions provided for all comments
- [ ] Rationale sections NOT posted to GitHub (kept local only)
- [ ] No PAW artifact references in posted comment text

## Completion Response

```
Activity complete.
Artifact saved: .paw/reviews/<identifier>/ReviewComments.md
Status: Success
GitHub: Pending review created with N comments (ID: <id>) | Non-GitHub: Manual posting instructions provided
```
