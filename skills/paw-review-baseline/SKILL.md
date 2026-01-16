---
name: paw-review-baseline
description: Analyzes the codebase at the PR's base commit to establish baseline understanding for review comparison.
metadata:
  type: activity
  artifacts: CodeResearch.md
  stage: understanding
---

# Baseline Research Activity Skill

Analyze the codebase **at the base commit** (before PR changes) to document how the system worked, what patterns existed, and what context informs understanding of the changes.

> **Reference**: Follow Core Review Principles from `paw-review-workflow` skill.

## CRITICAL: Baseline Only

**Your only job is to document the pre-change codebase as it existed.**

- DO NOT analyze the PR changes or compare before/after
- DO NOT suggest improvements or identify issues
- DO NOT critique the implementation
- ONLY describe what existed before: behavior, patterns, conventions, integration points

## Responsibilities

- Checkout base commit safely (with state restoration)
- Research how affected modules functioned before changes
- Document integration points and dependencies
- Identify patterns and conventions in affected areas
- Create CodeResearch.md with baseline understanding

## Non-Responsibilities

- PR change analysis or before/after comparison (understanding skill)
- Quality evaluation or recommendations (evaluation skills)
- Workflow orchestration (handled by workflow skill)

## Prerequisites

- ReviewContext.md must exist with base commit SHA
- prompts/01B-code-research.prompt.md should exist with research questions

## Execution Steps

### Step 1: Sync Remote State

1. Extract from ReviewContext.md:
   - Remote name (default: `origin`)
   - Base branch name
   - Base commit SHA

2. Fetch latest remote state:
   ```bash
   git fetch <remote> <base-branch>
   ```
   
3. If fetch fails (offline, no remote):
   - Log warning: "⚠️ Could not fetch remote - proceeding with local state"
   - Continue if base commit exists locally

4. Verify base commit reachable:
   ```bash
   git cat-file -e <base-commit-sha>
   ```
   
5. If commit unreachable:
   ```
   Activity blocked.
   Reason: Base commit <sha> not found
   Missing: Repository sync with upstream
   Recommendation: Run `git fetch <remote>` or verify ReviewContext.md
   ```

### Step 2: Checkout Base Commit

1. Save current state for restoration:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```

2. Checkout base commit:
   ```bash
   git checkout <base-commit-sha>
   ```

3. Confirm checkout:
   ```bash
   git log -1 --oneline
   ```

**CRITICAL**: All subsequent research must analyze code at this commit.

### Step 3: Read Research Prompt

1. Read `prompts/01B-code-research.prompt.md`
2. Note list of changed files from ReviewContext.md
3. Identify modules/areas needing baseline documentation

### Step 4: Analyze Pre-Change Codebase

Focus on areas identified in research prompt:

**Behavioral Documentation**:
- How modules functioned before changes
- Entry points, data flows, contracts
- Error handling approaches

**Integration Mapping**:
- Components depending on changed modules
- External dependencies
- API contracts and interfaces

**Pattern Recognition**:
- Coding conventions in affected areas
- Testing patterns for similar components
- Documentation patterns

**Test Coverage Baseline**:
- Existing tests for affected areas
- Test patterns and utilities used

### Step 5: Create CodeResearch.md

Write to `.paw/reviews/<identifier>/CodeResearch.md`:
- YAML frontmatter with metadata
- Answer questions from research prompt
- Document behavioral understanding
- Include file:line references (at base commit)
- Use template structure below

### Step 6: Update ReviewContext.md

Add CodeResearch.md to Artifacts section to signal completion.

### Step 7: Restore Original State

```bash
git checkout <original-branch>
git status  # Verify restoration
```

## Validation Criteria

Before completing:
- [ ] Remote fetched (or graceful offline handling)
- [ ] Base commit verified reachable
- [ ] Checkout successful at base commit
- [ ] All research conducted at base commit
- [ ] Research questions answered
- [ ] Behavioral understanding documented (not implementation details)
- [ ] Patterns and conventions identified
- [ ] File:line references included
- [ ] CodeResearch.md saved with valid frontmatter
- [ ] ReviewContext.md updated
- [ ] Original state restored

## Error Handling

### Base Commit Unreachable

```
Activity blocked.
Reason: Base commit <sha> not found after fetch attempt
Missing: Sync with upstream repository
Recommendation: Run `git fetch <remote>` or check ReviewContext.md base commit SHA
```

### Checkout Failure

```
Activity blocked.
Reason: Cannot checkout base commit - working tree has uncommitted changes
Missing: Clean working tree
Recommendation: Stash or commit local changes before running baseline research
```

## Completion Response

```
Activity complete.
Artifact saved: .paw/reviews/<identifier>/CodeResearch.md
Status: Success
Summary: Baseline documented at commit <sha> - [N] modules analyzed, [M] patterns identified.

Original branch restored: <original-branch>
```

---

## CodeResearch.md Template

```markdown
---
date: <YYYY-MM-DD HH:MM:SS TZ>
git_commit: <base commit SHA>
branch: <base branch>
repository: <repository name>
topic: "Baseline Analysis for <PR Title or Branch>"
tags: [review, baseline, pre-change]
status: complete
last_updated: <YYYY-MM-DD>
---

# Baseline Research: <PR Title or Branch>

**Date**: <timestamp>
**Base Commit**: <sha>
**Base Branch**: <base-branch>
**Repository**: <repository>

**Context**: Documents how the system worked **before** PR changes to inform specification derivation and impact evaluation.

## Research Questions

<Questions from 01B-code-research.prompt.md>

## Summary

<High-level overview of pre-change system state>

## Baseline Behavior

### <Module/Area 1>

**How it worked before changes:**
- Description of behavior (`file.ext:line`)
- Key functions and responsibilities
- Data flow and transformations
- Error handling approach

**Integration points:**
- Components that depended on this (`file.ext:line`)
- External dependencies
- API contracts and interfaces

### <Module/Area 2>

...

## Patterns & Conventions

**Established patterns observed:**
- Naming conventions
- Code organization patterns
- Error handling patterns
- Testing patterns

**File references:**
- `path/to/file.py:123` - Example of pattern X
- `another/file.ts:45-67` - Example of pattern Y

## Test Coverage Baseline

**Existing tests for affected areas:**
- `test/path/file.test.ts` - What was tested
- Coverage level (if measurable)
- Test patterns and conventions

## Performance Context

<If relevant to changes>
- Hot paths identified
- Performance characteristics
- Resource usage patterns

## Documentation Context

**Relevant documentation:**
- README sections
- API documentation
- Inline comments and explanations

## Open Questions

<Areas that need clarification or couldn't be fully documented>
```
