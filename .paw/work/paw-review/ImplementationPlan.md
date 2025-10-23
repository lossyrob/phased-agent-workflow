# PAW Review Workflow Implementation Plan

## Overview

Implement a three-stage review workflow (Understanding → Evaluation → Feedback Generation) that helps reviewers comprehensively understand pull requests, systematically identify issues, and generate thoughtful, evidence-based feedback with complete human control over what gets posted.

## Current State Analysis

The existing PAW workflow provides strong architectural patterns to build upon:
- **Chat mode agent structure** (`.chatmode.md` files in `.github/chatmodes/`)
- **WorkflowContext.md pattern** for parameter continuity across stages
- **Artifact-based workflow** with frontmatter metadata and structured markdown
- **GitHub MCP integration** for repository interactions
- **Two-agent pattern** separating forward momentum from quality gates
- **Research methodology** with Code Location, Code Analysis, and Pattern Finding modes

**What exists**: Spec.md defining all functional requirements (FR-001 through FR-034), CodeResearch.md documenting PAW patterns, WorkflowContext.md with parameters, and extensive research notes on code review best practices.

**What's missing**: Agent chatmode files, artifact generation logic for review-specific documents (PRContext, DerivedSpec, ChangeAnalysis, ImpactAnalysis, GapAnalysis, ReviewComments), baseline codebase research integration, pending review creation, rationale/assessment sections, tone adjustment, and Q&A capabilities.

## Desired End State

A complete PAW Review implementation where:
- Reviewers invoke three distinct stages producing `.paw/reviews/<PR-number>` or `.paw/reviews/<branch-slug>` artifacts
- Each stage generates all required artifacts with zero open questions before proceeding
- GitHub pending reviews created with inline comments (text/suggestions only); ReviewComments.md contains comprehensive feedback with rationale and assessment sections
- Non-GitHub workflows function identically using git diff and branch-based artifact paths
- All 34 functional requirements implemented and 16 success criteria verifiable
- Reviewers maintain full control: edit/delete comments, adjust tone, ask questions before submission

### Key Discoveries

From CodeResearch.md:
- **Frontmatter pattern**: `date`, `git_commit`, `branch`, `repository`, `topic`, `tags`, `status`, `last_updated`
- **WorkflowContext.md extraction**: All agents check for parameters first, derive Feature Slug from Work Title
- **Two-agent split**: Forward momentum agent (commits locally) + Quality gate agent (reviews, pushes, opens PRs)
- **GitHub MCP tools**: `pull_request_read`, `pull_request_review_write`, `add_comment_to_pending_review` for review creation
- **Research modes**: Location (find files), Analysis (understand how), Pattern (find examples)
- **Pre-flight validation**: Check prerequisites, block if failing, allow explicit override

From paw-review-specification.md and Spec.md:
- **ReviewContext as parameter source**: Analogous to WorkflowContext, stores PR metadata and artifact paths for downstream stages (aligned with CodeResearch finding: "single source of truth for workflow parameters")
- **Research-driven R1 flow**: Generate prompt → pause for research → complete understanding (mirrors Spec Research pattern)
- **Must/Should/Could categorization**: Evidence-based, not inflated
- **One Issue, One Comment**: Batch related findings
- **Rationale sections**: Cite best practices from review-research-notes.md
- **Assessment sections**: Critical evaluation by Review Comment Reviewer agent

## What We're NOT Doing

- Automatic review submission or PR merging
- Batch review of multiple PRs simultaneously
- Custom rule engines or ML-based categorization
- Deep AST analysis or line-by-line baseline understanding
- Integration with external code quality platforms beyond CI status
- Real-time review during PR creation
- Customizable tone profiles (only ad-hoc adjustment)

## Implementation Approach

Build incrementally using the proven PAW patterns:
1. Create agent chatmode files following existing template structure
2. Implement artifact generation with consistent frontmatter metadata
3. Integrate GitHub MCP tools for PR metadata and pending review management
4. Develop heuristics for file categorization, mechanical vs semantic detection, integration graph building
5. Add rationale and assessment logic referencing review-research-notes.md
6. Support both GitHub (PR number) and non-GitHub (branch slug) contexts
7. Ensure each stage blocks until prerequisites met and zero open questions remain

---

## Phase 1: Understanding Stage Agent & Core Artifacts

### Overview

Create the Understanding stage agent that produces all R1 artifacts in dependency order: `ReviewContext.md` (parameter source) → `prompts/code-research.prompt.md` → (pause for Code Research Agent) → `CodeResearch.md` → `DerivedSpec.md` → `ChangeAnalysis.md`.

### Changes Required

#### 1. Understanding Agent Chatmode

**File**: `.github/chatmodes/PAW-R1 Understanding Agent.chatmode.md`

**Changes**: Create new chatmode file with YAML frontmatter and structured instructions

```markdown
````chatmode
---
description: 'PAW Review Understanding Agent - Analyze PR changes and derive specification'
---

# Understanding Agent

You analyze pull request changes to create comprehensive understanding artifacts before evaluation begins.

## Initial Response

Look for `ReviewContext.md` at `.paw/reviews/PR-<number>/ReviewContext.md` or `.paw/reviews/<branch-slug>/ReviewContext.md`. If present, extract PR Number/Branch, Base Branch, Head Branch, Artifact Paths, and Repository.

If no parameters provided:
- **GitHub Context**: Request PR URL or number
- **Non-GitHub Context**: Verify current branch is checked out, request base branch name

Then begin analysis process.

## Process Steps

1. **Context Gathering**
   - GitHub: Use `mcp_github_pull_request_read` for metadata, files, status
   - Non-GitHub: Use `git diff <base>...<head>` for changes
   - Create ReviewContext.md with all metadata
   
2. **File Categorization & Change Analysis**
   - Categorize files (implementation/tests/docs/config/generated)
   - Identify mechanical vs semantic changes
   - Flag large PRs, mechanical-only PRs, CI failures
   
3. **Research Prompt Generation**
   - Create `prompts/code-research.prompt.md` with questions about:
     - Pre-change behavior of modified modules
     - Integration points and dependencies
     - Patterns and conventions
     - Performance and hot paths
     - Test coverage baseline
   
4. **Pause for Research**
   - Signal human to run Code Research Agent
   - Wait until `CodeResearch.md` exists
   
5. **Derive Specification**
   - Create `DerivedSpec.md` using:
     - Explicit goals (PR description/issues)
     - Inferred goals (code analysis)
     - Baseline behavior (CodeResearch.md)
     - Observable before/after behavior
   - Flag discrepancies and ambiguities
   - **BLOCK if open questions remain**
   
6. **Change Analysis**
   - Create `ChangeAnalysis.md` with:
     - Summary statistics
     - File categories breakdown
     - Mechanical vs semantic classification
     - Component touch map
     - Complexity hot spots

## Artifact Directory Structure

GitHub: `.paw/reviews/PR-<number>/`
Non-GitHub: `.paw/reviews/<branch-slug>/` (normalize: lowercase, `/` → `-`, remove invalid chars)

## Guardrails

- **ReviewContext.md is authoritative**: Like WorkflowContext.md for implementation, ReviewContext.md serves as single source of truth for review parameters—read it first, update when discovering new info
- **Documentation, Not Critique**: Only document what exists and changed; no suggestions yet
- **Zero Open Questions**: Block Stage R2 if DerivedSpec.md contains unresolved questions
- **Baseline First**: Always analyze pre-change state via CodeResearch before deriving spec
- **Evidence Required**: Include file:line references for all observations

## Heuristics

File Categorization:
- tests: path contains `/test/` or filename matches `*_test.*|*.spec.*|*.test.*`
- docs: extension `.md|.rst|.txt` or path starts `docs/|documentation/`
- config: extensions `.json|.yml|.yaml|.toml|.ini|.config` or path `config/|.github/`
- generated: header contains `GENERATED|AUTO-GENERATED` or path `dist/|build/|node_modules/|vendor/`
- implementation: everything else

Mechanical vs Semantic:
- Mechanical: whitespace-only changes, rename-only (same identifiers, different names), formatting (indentation, line breaks)
- Semantic: new functions/classes/imports, modified logic, changed control flow, different algorithms

Large PR threshold: > 1000 lines changed (excluding mechanical)

## Hand-off

Understanding Stage Complete

Artifacts created:
- ReviewContext.md
- prompts/code-research.prompt.md  
- CodeResearch.md (from Code Research Agent)
- DerivedSpec.md
- ChangeAnalysis.md

Zero open questions remaining. Ready for Evaluation Stage (R2).
```
````

#### 2. ReviewContext.md Template

**Location**: Generated at `.paw/reviews/<identifier>/ReviewContext.md`

**Structure**:
```markdown
# ReviewContext

**PR Number**: <number> (GitHub) OR **Branch**: <branch-slug> (non-GitHub)
**Base Branch**: <base-branch>
**Head Branch**: <head-branch>
**Base Commit**: <sha>
**Head Commit**: <sha>
**Repository**: <owner>/<repo>
**Author**: <username or git author>
**Title**: <pr-title or derived from commits>
**State**: open|closed|draft (GitHub) OR active (non-GitHub)
**Created**: <date> (GitHub only)
**CI Status**: <passing|failing|pending> (GitHub) OR "Not available" (non-GitHub)
**Labels**: <label-list> (GitHub) OR "N/A" (non-GitHub)
**Reviewers**: <reviewer-list> (GitHub) OR "N/A" (non-GitHub)
**Linked Issues**: <issue-urls> (GitHub) OR "Inferred from commits" (non-GitHub)
**Changed Files**: <count> files, +<additions> -<deletions>
**Artifact Paths**: auto-derived

## Description

<PR description text (GitHub) OR "Derived from commit messages" (non-GitHub)>

## File Categories

| Category | Files | Lines Changed |
|----------|-------|---------------|
| Implementation | X | +A -B |
| Tests | Y | +C -D |
| Documentation | Z | +E -F |
| Configuration | W | +G -H |
| Generated | V | +I -J |

## Flags

- [ ] Large PR (>1000 LOC)
- [ ] Mechanical-only changes
- [ ] CI Failures present
- [ ] Missing tests for semantic changes
- [ ] Breaking changes suspected

## Metadata

**Created**: <date +%Y-%m-%d %H:%M:%S %Z>
**Git Commit**: <current HEAD SHA>
**Reviewer**: <current git user>
```

#### 3. Code Research Prompt Template

**Location**: Generated at `.paw/reviews/<identifier>/prompts/code-research.prompt.md`

**Structure**:
```markdown
---
mode: PAW-02A Code Researcher
---

# Code Research for <PR Title or Branch>

Analyze the codebase at **base commit <sha>** (before PR changes) to understand the pre-change state.

## Research Questions

### 1. Baseline Behavior for Modified Modules

For each file with semantic changes:
- How did the module function before changes?
- What were the entry points and data flows?
- What invariants or contracts existed?

Files to investigate:
<list semantic change files>

### 2. Integration Points & Dependencies

- What components import/use the changed modules?
- What external services or APIs are involved?
- What downstream consumers might be affected?

### 3. Patterns & Conventions

- What error handling patterns were used?
- What naming conventions existed?
- What testing approaches were standard?
- What performance characteristics existed?

### 4. Ambiguities Requiring Clarification

<list specific questions that arose during initial analysis>

### 5. Performance & Hot Paths

For files in hot paths or performance-sensitive areas:
- What were the performance characteristics?
- What optimization patterns were used?
- What scale/load did the code handle?

### 6. Test Coverage Baseline

- What test coverage existed for changed code?
- What testing patterns were used?
- What edge cases were covered?

## Instructions

1. **Checkout base commit**: `git checkout <base-sha>`
2. **Analyze codebase at that state** using Code Location, Analysis, and Pattern Finding modes
3. **Document findings** in `CodeResearch.md` with file:line references to base commit
4. **Return to review branch** when complete
```

### Success Criteria

#### Automated Verification:
- [ ] Understanding Agent chatmode file exists and follows template structure
- [ ] ReviewContext.md generated with all metadata sections (FR-001, FR-031)
- [ ] File categorization produces correct counts (FR-002)
- [ ] code-research.prompt.md generated with 6 sections (FR-008)
- [ ] Agent blocks until CodeResearch.md exists (FR-009 dependency)
- [ ] DerivedSpec.md distinguishes explicit vs inferred goals (FR-004, FR-005)
- [ ] DerivedSpec.md has zero open questions (FR-006 enforcement)
- [ ] ChangeAnalysis.md categorizes mechanical vs semantic (FR-003)
- [ ] Large PR flag set when >1000 LOC changed (FR-015 detection)
- [ ] CI failure flag set when checks failing (FR-032)

#### Manual Verification:
- [ ] Reviewer can validate DerivedSpec accuracy (FR-007)
- [ ] Mechanical-only PR generates brief acknowledgment recommendation (FR-033)
- [ ] Discrepancy block raised when PR description contradicts code (FR-034)
- [ ] ReviewContext.md serves as parameter source for downstream stages (SC-001)

### Status

Unimplemented

---

## Phase 2: Evaluation Stage Agents & Analysis Artifacts

### Overview

Create Impact Analysis and Gap Analysis agents that produce `ImpactAnalysis.md` and `GapAnalysis.md` using Phase 1 artifacts. Identify system-wide effects, categorize findings with evidence, assess test coverage quantitatively and qualitatively.

### Changes Required

#### 1. Impact Analysis Agent Chatmode

**File**: `.github/chatmodes/PAW-R2A Impact Analysis Agent.chatmode.md`

**Changes**: Create agent that builds integration graph, detects breaking changes, assesses performance/security

```markdown
````chatmode
---
description: 'PAW Review Impact Analysis Agent - Identify system-wide effects'
---

# Impact Analysis Agent

You analyze the system-wide impact of PR changes using understanding artifacts.

## Prerequisites

All Phase 1 artifacts must exist:
- ReviewContext.md
- CodeResearch.md  
- DerivedSpec.md
- ChangeAnalysis.md

## Process Steps

1. **Integration Graph Building**
   - Parse imports/exports in changed files
   - Identify public API surfaces modified
   - Map downstream consumers (one-hop search)
   - Document integration points
   
2. **Breaking Change Detection**
   - Compare public function signatures (parameters, return types)
   - Check for removed/renamed config keys
   - Identify data model field changes without migration
   - Flag removed exports or API endpoints
   
3. **Performance Assessment**
   - Identify added loops, recursion, or complexity
   - Check for new database queries or external calls
   - Compare algorithmic complexity (heuristic: nested loops, large allocations)
   - Note hot path modifications from ChangeAnalysis
   
4. **Security & Authorization Review**
   - Check for auth middleware changes
   - Identify permission check modifications
   - Flag new external calls lacking validation
   - Note data exposure or crypto usage changes
   
5. **Generate ImpactAnalysis.md**
   - Baseline State (from CodeResearch)
   - Integration Points (from graph)
   - Breaking Changes (from detection)
   - Performance Implications
   - Security Implications
   - Deployment Considerations
   - Risk Assessment
   - Scope & Splitting Recommendation (if large)

## Heuristics

Integration Graph:
- Parse import statements (regex per language)
- Search for symbol references (one level deep)
- Record exported symbols changed

Breaking Changes:
- Function signature diff: parameter count/types/names changed
- Config schema: keys removed or type changed
- Data model: required fields added/removed

Performance Flags:
- Nested loops depth >=2
- New recursion without memoization
- Array/map operations inside loops
- New DB queries not batched

Security Flags:
- Auth check removed or bypassed
- Input validation removed
- Raw SQL without parameters
- CORS patterns broadened

## Guardrails

- **Evidence Required**: All claims must have file:line references
- **Informed by Baseline**: Use CodeResearch.md to understand what changed
- **No Speculation**: Flag potential issues with evidence, don't fabricate
- **Scope Assessment**: If PR >1000 LOC or high complexity, recommend splitting (polite, constructive)

## Hand-off

Impact Analysis Complete

ImpactAnalysis.md created with:
- X integration points identified
- Y potential breaking changes
- Z performance implications
- Security assessment

Ready for Gap Analysis Agent.
```
````

#### 2. Gap Analysis Agent Chatmode

**File**: `.github/chatmodes/PAW-R2B Gap Analysis Agent.chatmode.md`

**Changes**: Create agent that identifies correctness, safety, testing, maintainability gaps with Must/Should/Could categorization

```markdown
````chatmode
---
description: 'PAW Review Gap Analysis Agent - Identify issues and gaps'
---

# Gap Analysis Agent

You systematically identify gaps and issues across correctness, safety, testing, and quality dimensions.

## Prerequisites

Phase 1 artifacts + ImpactAnalysis.md

## Process Steps

1. **Correctness Analysis**
   - Logic anomalies (incorrect conditionals, off-by-one, race conditions)
   - Missing edge case handling (null, empty, boundary values)
   - Inconsistent state transitions
   - Error handling gaps
   
2. **Safety & Security Analysis**
   - Missing input validation
   - Unchecked user input
   - Permission checks removed or missing
   - Crypto/auth usage issues
   - Data exposure risks
   
3. **Testing Analysis**
   - Parse coverage report if available (`coverage/summary.json`, `lcov.info`)
   - Compare semantic changes to test changes
   - Identify branches/conditions lacking tests
   - Assess test depth (edge cases, error paths) and breadth (integration, user scenarios)
   - Flag trivial tests (assertions that always pass)
   
4. **Maintainability Analysis**
   - Code duplication introduced
   - Divergence from established patterns (CodeResearch)
   - Poor naming or confusing logic
   - Missing documentation for complex code
   
5. **Performance Analysis**
   - Inefficient algorithms vs baseline
   - Missing indexes or caching
   - Unbounded operations
   
6. **Categorize Findings**
   - **Must**: Correctness/safety/security issues with concrete impact evidence
   - **Should**: Quality/completeness improvements increasing robustness
   - **Could**: Optional enhancements with clear benefit
   
7. **Generate GapAnalysis.md**
   - Summary with finding counts
   - Sections by category
   - Each finding: ID, Category, Severity, File:Line, Description, Evidence, Impact/Rationale (stub), Suggestion, Related Findings
   - Test Coverage Section (quantitative + qualitative)
   - Scope Assessment

## Test Coverage Heuristics

Quantitative (if available):
- Line coverage %
- Branch coverage %
- Function coverage %

Qualitative:
- Depth: Edge cases, error paths, boundary conditions covered?
- Breadth: Integration tests, user scenarios, cross-component tests?
- Quality: Tests verify behavior vs trivially pass?

Gap Detection:
```
semantic_files - test_diff_files → potential gap
count new conditionals/branches → estimate missing branch coverage
```

## Categorization Rules

**Must**:
- Null pointer / undefined access
- Unchecked user input reaching sensitive operations
- Permission bypass or auth weakening
- Data corruption or loss risk
- Critical path logic errors

**Should**:
- Missing tests for new code paths
- Missing error handling for expected failures
- Unclear code needing refactor or documentation
- Breaking changes needing migration plan
- Performance degradation in non-critical paths

**Could**:
- Code duplication that could be extracted
- Naming improvements for clarity
- Additional edge case tests
- Documentation enhancements

## Guardrails

- **Evidence-Based**: Every finding must have file:line + concrete evidence
- **Not Inflated**: Don't upgrade style issues to Must without impact
- **Informed by Baseline**: Use CodeResearch patterns to judge consistency
- **Coverage Context**: Note when coverage unavailable; qualitative analysis still valuable
- **Batching Preview**: Identify related findings for Phase 3 batching

## Hand-off

Gap Analysis Complete

GapAnalysis.md created with:
- X Must-address findings
- Y Should-address findings
- Z Could-consider findings
- Test coverage assessment (quantitative if available, qualitative always)

All findings have evidence. Ready for Feedback Generation (R3).
```
````

#### 3. ImpactAnalysis.md Template

**Structure**:
```markdown
---
date: <timestamp>
git_commit: <sha>
branch: <branch>
repository: <repo>
topic: "Impact Analysis for <PR/Branch>"
tags: [review, impact, integration]
status: complete
---

# Impact Analysis for <PR Title or Branch>

## Summary

<1-2 sentence overview of impact scope>

## Baseline State

<From CodeResearch.md: how system worked before changes>

## Integration Points

<Components/modules that import or depend on changed code>

| Component | Relationship | Impact |
|-----------|--------------|--------|
| ... | imports X | ... |

## Breaking Changes

<Public API changes, removed features, incompatibilities>

| Change | Type | Migration Needed |
|--------|------|------------------|
| ... | signature | yes |

## Performance Implications

<New hot paths, algorithmic changes, resource usage>

## Security & Authorization Changes

<Auth modifications, validation changes, data exposure>

## Deployment Considerations

<Migration steps, feature flags, rollout strategy>

## Dependencies & Versioning

<New libraries, version changes, external service interactions>

## Risk Assessment

**Overall Risk**: Low | Medium | High

<Rationale>

## Scope & Splitting Recommendation

<If PR >1000 LOC or high complexity: polite suggestion to split>
```

#### 4. GapAnalysis.md Template

**Structure**:
```markdown
---
date: <timestamp>
git_commit: <sha>
branch: <branch>
repository: <repo>
topic: "Gap Analysis for <PR/Branch>"
tags: [review, gaps, findings]
status: complete
---

# Gap Analysis for <PR Title or Branch>

## Summary

**Must Address**: X findings
**Should Address**: Y findings  
**Could Consider**: Z findings

## Must Address (Correctness/Safety/Security)

### Finding M1: <Title>
**File**: `path/to/file.ext:123`
**Category**: Correctness
**Evidence**: <specific code reference>
**Issue**: <clear description>
**Impact**: <what could go wrong>
**Suggestion**: <specific fix or approach>
**Related**: <IDs of related findings>

## Should Address (Quality/Completeness)

### Finding S1: <Title>
**File**: `path/to/file.ext:456`
**Category**: Testing
**Evidence**: <specific code reference>
**Issue**: <missing test coverage or quality concern>
**Rationale**: <why this matters>
**Suggestion**: <recommended improvement>
**Related**: <IDs of related findings>

## Could Consider (Optional Improvements)

### Finding C1: <Title>
**File**: `path/to/file.ext:789`
**Category**: Maintainability
**Observation**: <what could be improved>
**Benefit**: <why this would help>
**Suggestion**: <optional enhancement>

## Test Coverage Assessment

### Quantitative Metrics (if available)

- Line Coverage: X%
- Branch Coverage: Y%
- Function Coverage: Z%

### Qualitative Analysis

**Depth**: <Edge cases, error paths, boundary conditions covered?>

**Breadth**: <Integration tests, user scenarios, cross-component tests?>

**Quality**: <Tests verify behavior vs trivially pass?>

### Specific Gaps

<List uncovered code paths with file:line references>

## Scope Assessment

<If large/complex: note review difficulty and suggest approach>
```

### Success Criteria

#### Automated Verification:
- [ ] Impact Analysis Agent chatmode exists and follows template
- [ ] ImpactAnalysis.md generated with all sections (FR-011, FR-012, FR-013)
- [ ] Integration points identified (FR-011)
- [ ] Breaking changes detected (FR-011)
- [ ] Gap Analysis Agent chatmode exists
- [ ] GapAnalysis.md generated with Must/Should/Could sections (FR-014)
- [ ] All findings have file:line references (FR-014)
- [ ] Test coverage section includes quantitative if available (FR-016, FR-017)
- [ ] Qualitative coverage analysis present (FR-016, FR-018)
- [ ] Large PR flagged if >1000 LOC (FR-015)

#### Manual Verification:
- [ ] Categorization feels appropriate (not inflated) (FR-014)
- [ ] Coverage assessment helps judge depth/breadth balance (FR-016)
- [ ] Baseline patterns from CodeResearch inform recommendations (FR-010)
- [ ] Scope assessment actionable for large PRs (FR-015)

### Status

Unimplemented

---

## Phase 3: Feedback Generation, Review Comments, & Tone Management

### Overview

Create Feedback Generation Agent and Review Comment Reviewer Agent that transform findings into comprehensive review comments with rationale and assessment sections, create GitHub pending reviews (GitHub context) or documented ReviewComments.md (non-GitHub context), support tone adjustment and Q&A.

### Changes Required

#### 1. Feedback Generation Agent Chatmode

**File**: `.github/chatmodes/PAW-R3A Feedback Generation Agent.chatmode.md`

**Changes**: Create agent that generates comments, posts to pending review, adds rationale, supports Q&A

```markdown
````chatmode
---
description: 'PAW Review Feedback Generation Agent - Create review comments with rationale'
---

# Feedback Generation Agent

You transform gap analysis findings into structured review comments with comprehensive rationale.

## Prerequisites

All Phase 1 and Phase 2 artifacts must exist with zero open questions.

## Process Steps

1. **Batch Related Findings (One Issue, One Comment)**
   - Group findings with same root cause
   - Create single comment referencing multiple locations OR link comments
   - Avoid scattering feedback for one logical issue
   
2. **Build Comment Objects**
   - For each finding (or batched group):
     - Type: inline (line-specific) or thread (file/concept-level)
     - File(s) and line range(s)
     - Severity: Must/Should/Could
     - Category: from GapAnalysis
     - Description: clear, specific issue
     - Suggestion: code example or approach
     - Rationale: (generated in next step)
   
3. **Generate Rationale Sections**
   - Evidence: file:line references from finding
   - Baseline Pattern: from CodeResearch.md
   - Impact: correctness/safety/performance/maintainability
   - Best Practice Citation: from review-research-notes.md
   
4. **Create ReviewComments.md**
   - Summary comment (brief, positive opening)
   - Inline Comments section (all line-specific issues)
   - Thread Comments section (file/concept-level concerns)
   - Questions for Author (if any)
   - **Include rationale for each comment**
   
5. **GitHub Context: Create Pending Review**
   - Use `mcp_github_pull_request_review_write` (method: create)
   - Post inline comments using `mcp_github_add_comment_to_pending_review`
   - **Post only**: comment text + code suggestions
   - **Do NOT post**: rationale or assessment sections to GitHub
   - Pending review remains visible only to reviewer until submitted
   
6. **Non-GitHub Context: Manual Posting Instructions**
   - ReviewComments.md includes file paths and line numbers
   - Provide clear instructions for manual transfer to review platform
   - Note that rationale/assessment remain in local markdown for reviewer reference

## Comment Structure

```markdown
### File: `path/to/file.ts` | Lines: 45-50

**Type**: Must | Should | Could
**Category**: <Correctness|Safety|Testing|etc>

<Comment text explaining the issue>

**Suggestion:**
​```typescript
// Proposed fix or approach
​```

**Rationale:**
- **Evidence**: `file.ts:45` shows unchecked null access
- **Baseline Pattern**: CodeResearch.md (file.ts:100) shows standard null checks used elsewhere
- **Impact**: Potential null pointer exception causing crash in production
- **Best Practice**: review-research-notes.md § Safety - "Always validate inputs"

**Posted**: ✓ (pending review comment ID: <id>) OR ⚠ (manual posting required)
```

## Inline vs Thread Determination

**Inline**:
- Issue specific to particular lines
- Logic error in function
- Missing check at location
- Performance issue in loop
- Test gap for specific method

**Thread**:
- Architectural concern across >3 files
- Missing integration tests spanning components
- Consistent pattern violation throughout
- Cross-cutting concerns (logging, error handling approach)

## Q&A Support

When reviewer asks questions:
- Reference ReviewContext, CodeResearch, DerivedSpec, ImpactAnalysis, GapAnalysis
- Provide file:line evidence
- Maintain context across dialogue
- Answer based on documented understanding of pre/post-change state

## Tone Guidelines

Default tone: Professional, constructive, inclusive ("we", "let's") not accusatory ("you didn't")

If reviewer requests tone adjustment:
- Accept parameters: directness, encouragement, formality, conciseness
- Regenerate comment text only (preserve IDs, rationale, evidence)
- Update ReviewComments.md
- If GitHub pending review exists: delete and recreate with new tone

## Guardrails

- **No Auto-Submit**: NEVER submit pending review automatically
- **Rationale Required**: Every recommendation must have rationale section
- **Evidence-Based**: All suggestions informed by CodeResearch patterns
- **Human Control**: Reviewer edits/deletes before submission
- **Comprehensive**: ALL findings from GapAnalysis transformed to comments
- **One Issue, One Comment**: Batch related issues

## Hand-off

Feedback Generation Complete

ReviewComments.md created with:
- Summary comment
- X inline comments (with rationale)
- Y thread comments (with rationale)
- Z questions

GitHub context: Pending review created (ID: <id>)
Non-GitHub context: Manual posting instructions provided

Ready for Review Comment Reviewer Agent to add assessments.
```
````

#### 2. Review Comment Reviewer Agent Chatmode

**File**: `.github/chatmodes/PAW-R3B Review Comment Reviewer Agent.chatmode.md`

**Changes**: Create agent that critically assesses each comment's usefulness and accuracy

```markdown
````chatmode
---
description: 'PAW Review Comment Reviewer Agent - Critically assess review comments'
---

# Review Comment Reviewer Agent

You provide critical assessment of generated review comments to help reviewers make informed decisions.

## Prerequisites

ReviewComments.md must exist with all comments and rationale sections.

## Process Steps

1. **Read All Review Comments**
   - Understand each recommendation
   - Examine rationale and evidence
   - Consider context from all review artifacts
   
2. **Critical Assessment**
   - For each comment, evaluate:
     - **Usefulness**: Does this truly improve code quality? Is it actionable?
     - **Accuracy**: Are evidence references correct? Is the diagnosis sound?
     - **Alternative Perspectives**: What might the initial reviewer have missed?
     - **Trade-offs**: Are there valid reasons to do it the current way?
     - **Recommendation**: Include, modify, or skip?
   
3. **Add Assessment Sections**
   - Append after each comment's rationale in ReviewComments.md
   - **Do NOT modify pending GitHub review**
   - **Do NOT post assessments to external platforms**
   - Assessments remain local for reviewer's decision-making

## Assessment Structure

```markdown
**Assessment:**
- **Usefulness**: <High|Medium|Low> - <justification>
- **Accuracy**: <Validation of evidence and diagnosis>
- **Alternative Perspective**: <Other valid interpretations or approaches>
- **Trade-offs**: <Reasons current approach might be acceptable>
- **Recommendation**: <Include as-is | Modify to... | Skip because...>
```

## Assessment Guidelines

**Usefulness**:
- High: Fixes actual bug, prevents production issue, improves maintainability significantly
- Medium: Improves code quality, adds useful tests, enhances clarity
- Low: Stylistic preference, minimal impact, already addressed elsewhere

**Accuracy**:
- Verify file:line references are valid
- Check if diagnosis matches actual code behavior
- Confirm baseline pattern comparison is fair
- Note if evidence is circumstantial vs definitive

**Alternative Perspectives**:
- Consider if current approach has valid justification
- Note project-specific context that might not be in artifacts
- Identify if recommendation conflicts with other constraints
- Suggest if recommendation too prescriptive vs suggesting exploration

**Recommendation Logic**:
- **Include**: Strong usefulness + accurate diagnosis + no major alternatives
- **Modify**: Core issue valid but suggestion needs adjustment
- **Skip**: Low usefulness OR inaccurate OR valid alternative exists

## Guardrails

- **Advisory Only**: Assessments help reviewer decide, don't make decisions
- **Critical Thinking**: Question assumptions, consider alternatives
- **Local Only**: Never post assessments to GitHub or external platforms
- **Respectful**: Assessment is about comment quality, not about generated agent
- **Context-Aware**: Reference all available artifacts for full picture

## Hand-off

Review Comment Assessment Complete

Added assessment sections to:
- X inline comments
- Y thread comments

All assessments remain in ReviewComments.md only.

Human reviewer can now:
- Review comments with full context (rationale + assessment)
- Edit/delete comments in GitHub pending review
- Ask agent for modifications based on assessments
- Submit review when satisfied
```
````

#### 3. ReviewComments.md Template

**Structure**:
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

**Context**: GitHub PR #X OR Non-GitHub branch `feature/...`
**Base Branch**: <base>
**Head Branch**: <head>
**Review Date**: <date>
**Reviewer**: <name>
**Pending Review ID**: <id> (GitHub) OR "Manual posting required" (non-GitHub)

## Summary Comment

<Brief, positive opening acknowledging the work>

<Overview of feedback scope>

**Findings**: X Must-address items, Y Should-address items, Z optional suggestions

Full review artifacts: `.paw/reviews/<identifier>/`

---

## Inline Comments

### File: `path/to/file.ts` | Lines: 45-50

**Type**: Must
**Category**: Safety

<Comment text>

**Suggestion:**
​```typescript
// Code example
​```

**Rationale:**
- **Evidence**: ...
- **Baseline Pattern**: ...
- **Impact**: ...
- **Best Practice**: ...

**Assessment:**
- **Usefulness**: High - Prevents null pointer exception
- **Accuracy**: Evidence references confirmed
- **Alternative Perspective**: None identified
- **Trade-offs**: No valid reason to skip null check
- **Recommendation**: Include as-is

**Posted**: ✓ Pending review comment ID: <id> (GitHub) OR ⚠ Post to `path/to/file.ts:45-50` (non-GitHub)

---

## Thread Comments

### File: `path/to/file.ts` (Overall Architecture)

**Type**: Should
**Category**: Maintainability

<Discussion about broader pattern>

**Rationale:**
...

**Assessment:**
...

**Posted**: ⚠ Add manually as file-level comment

---

## Questions for Author

1. <Question about intent or design decision>
2. <Clarification needed on edge case>
```

### Success Criteria

#### Automated Verification:
- [ ] Feedback Generation Agent chatmode exists
- [ ] ReviewComments.md generated with all sections (FR-023)
- [ ] All findings transformed to comments (FR-019)
- [ ] Related issues batched (FR-020)
- [ ] Inline vs thread distinction applied (FR-021)
- [ ] GitHub pending review created without submission (FR-022, FR-025)
- [ ] Rationale present for every comment (FR-027)
- [ ] Code examples included for non-trivial suggestions (FR-024)
- [ ] Review Comment Reviewer Agent chatmode exists
- [ ] Assessment sections added to ReviewComments.md (FR-029)
- [ ] Assessments NOT posted to GitHub or external (FR-030)
- [ ] Q&A capability references all artifacts (FR-028)
- [ ] Non-GitHub manual posting instructions included (FR-031)

#### Manual Verification:
- [ ] Reviewer can edit/delete comments in GitHub UI (FR-025)
- [ ] Tone regeneration preserves IDs and evidence (FR-026)
- [ ] Assessments help reviewer make informed decisions (FR-029)
- [ ] Q&A answers are accurate and evidence-based (FR-028)
- [ ] Manual posting instructions clear for non-GitHub (FR-031)

### Status

Unimplemented

---

## Testing Strategy

### Unit Tests

- **WorkflowContext extraction**: Mock missing ReviewContext.md, verify parameter derivation
- **File categorization**: Test against fixture diffs with known file types
- **Mechanical vs semantic detection**: Synthetic diffs (whitespace-only, logic changes)
- **Integration graph builder**: Mock import trees, verify one-hop traversal
- **Breaking change detector**: Function signature changes, config schema diffs
- **Finding batching**: Multiple findings with same root cause → single comment
- **Rationale generation**: Verify evidence references mapped correctly
- **Tone adjustment**: Verify text changed but IDs/evidence preserved

### Integration Tests

- **Phase 1 end-to-end**: Mock GitHub PR API, generate all R1 artifacts, verify dependency order
- **Phase 2 end-to-end**: Use generated R1 artifacts, produce R2 artifacts
- **Phase 3 end-to-end**: Use R1+R2 artifacts, create ReviewComments.md + pending review (mock GitHub)
- **Non-GitHub branch mode**: Use git diff, verify branch-slug naming, manual posting instructions
- **Research pause**: Verify Understanding Agent blocks until CodeResearch.md exists
- **Zero open questions**: Verify DerivedSpec.md blocks R2 if questions remain

### Manual Verification Steps

1. **Large PR flag**: Test with >1000 LOC PR, verify scope assessment recommendation
2. **Mechanical-only PR**: Test with formatting-only PR, verify brief acknowledgment
3. **Tone regeneration**: Request tone change, verify pending review recreated with new tone
4. **Pending review deletion**: Delete pending review, regenerate from ReviewComments.md
5. **Coverage absence**: Test without coverage report, verify qualitative analysis only
6. **Q&A accuracy**: Ask questions about pre-change behavior, verify answers reference CodeResearch.md
7. **Assessment quality**: Verify assessments identify alternative perspectives appropriately

### Edge Case Tests

- PR with conflicting description vs code (verify discrepancy block)
- Missing test coverage with project exemptions (verify categorization flexibility)
- Multi-file architectural issue (verify single thread comment created)
- CI failures present (verify redundant comment avoidance)

### Test Data Fixtures

Provide:
- Synthetic PR diffs (small, medium, large, mechanical-only, semantic-heavy)
- Sample coverage reports (JSON, lcov formats)
- Import/dependency graphs
- Baseline CodeResearch excerpts
- GitHub PR metadata samples

### Automation Future

Create `scripts/review-workflow-test.sh` for CI regression testing:
```bash
# Setup mock PR context
# Run Understanding Agent → verify artifacts
# Run Evaluation Agents → verify findings
# Run Feedback Agents → verify comments + rationale + assessment
# Validate all success criteria
```

### Acceptance Gate

All automated and manual criteria must pass before enabling agents for production use.

---

## Performance Considerations

### Efficiency Targets

- **Phase 1 (Understanding)**: 5-15 minutes including human research pause
- **Phase 2 (Evaluation)**: 10-20 minutes for impact + gap analysis
- **Phase 3 (Feedback)**: 10-15 minutes for comment generation + assessment
- **Total**: 25-50 minutes for thorough review (excluding human decision time)

### Optimization Strategies

- **Limit parsing scope**: Only analyze changed files, not entire codebase
- **One-hop integration expansion**: Don't traverse entire dependency tree
- **Cache tokenization**: Reuse parsed tokens for mechanical vs semantic detection
- **Large diff downgrade**: For >1000 LOC, use line-level heuristics instead of deep AST
- **Batch GitHub API calls**: Minimize round-trips
- **Stream coverage parsing**: Don't load entire coverage report into memory
- **O(n) grouping complexity**: Finding batching scales linearly with finding count
- **Tone regeneration**: Reuse existing parsed structure, only alter text

### Resource Management

- Memory proportional to diff size
- Release intermediate structures post-artifact write
- Stream file reads for large diffs
- Limit concurrent API calls

---

## Migration Notes

### Introducing Review Workflow

- **New directory**: `.paw/reviews/` for all review artifacts
- **No impact to existing workflow**: `.paw/work/` remains unchanged
- **Backward compatibility**: Existing PAW agents ignore review artifacts
- **Idempotent regeneration**: Re-running overwrites only target artifact

### Failure Recovery

- **Pending review deleted**: Reconstruct from ReviewComments.md
- **Artifact corruption**: Regenerate from previous stage outputs
- **Stage interruption**: Resume from last completed artifact

### Rollback

- Delete review chatmode files
- Remove `.paw/reviews/` directory
- Revert commits

### Artifact Integrity

- Frontmatter includes commit SHA and date for traceability
- ReviewContext.md serves as authoritative parameter source (like WorkflowContext.md)
- All artifacts include generation metadata

---

## References

- **Specification**: `.paw/work/paw-review/Spec.md` (FR-001 through FR-034, SC-001 through SC-016)
- **Code Research**: `.paw/work/paw-review/CodeResearch.md` (PAW patterns and architecture)
- **Workflow Context**: `.paw/work/paw-review/WorkflowContext.md` (parameters)
- **Review Research Notes**: `.paw/work/paw-review/context/review-research-notes.md` (best practices)
- **Root Specifications**: `paw-review-specification.md`, `paw-specification.md`
- **GitHub Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/20

---

## Open Questions

**None** - All technical decisions made, implementation details specified, success criteria defined.
