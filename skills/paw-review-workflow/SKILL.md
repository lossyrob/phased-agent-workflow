---
name: paw-review-workflow
description: Orchestrates the PAW Review workflow, coordinating activity skills to analyze PRs and generate comprehensive review feedback.
---

# PAW Review Workflow Skill

This workflow skill orchestrates the complete PAW Review process, coordinating activity skills through subagent execution to analyze pull requests and generate comprehensive review feedback.

## Core Review Principles

These principles apply to ALL review stages. Activity skills reference these principles rather than duplicating them.

### 1. Evidence-Based Documentation

Every observation, finding, or claim MUST be supported by:
- Specific file:line references
- Concrete code patterns or test results
- Direct evidence from the codebase

**NEVER** include speculation, assumptions, or subjective preferences without evidence.

### 2. File:Line Reference Requirement

All code-related claims require specific file:line citations:
- `[src/module.ts:45](src/module.ts#L45)` for single lines
- `[src/module.ts:45-52](src/module.ts#L45-L52)` for ranges
- Multiple locations should be listed explicitly

### 3. No Fabrication Guardrail

**CRITICAL**: Do not fabricate, invent, or assume information:
- If information is unavailable, state "Not found" or "Unable to determine"
- Do not hallucinate file contents, function behaviors, or patterns
- When uncertain, document the uncertainty explicitly

### 4. Document, Don't Critique (Early Stages)

Understanding and baseline research stages document what exists—they do NOT:
- Evaluate quality or suggest improvements
- Identify issues or bugs
- Make recommendations
- Critique implementation decisions

Evaluation and critique happen in designated later stages only.

### 5. Human Control Principle

The review workflow assists human reviewers—it does NOT replace their judgment:
- Pending reviews are NEVER auto-submitted
- Final decisions on all comments rest with the human reviewer
- Generated feedback is advisory, not prescriptive
- Humans can modify, skip, or override any recommendation

### 6. Artifact Completeness

Each stage produces complete, well-structured artifacts:
- No placeholders or "TBD" markers
- No unresolved questions blocking downstream stages
- Each artifact is self-contained and traceable to sources

## Subagent Contract

Activity skills are executed via delegated agent sessions. Each activity MUST:

### Response Format

Upon completion, respond with artifact path and status (Success, Partial, or Blocked).

### Artifact Path Confirmation

Always confirm the exact path where artifacts were written. Downstream stages depend on this.

## Artifact Directory Structure

All review artifacts are stored in a consistent directory structure:

```
.paw/reviews/<identifier>/
├── ReviewContext.md          # Stage: Understanding (initial)
├── CodeResearch.md           # Stage: Baseline Research
├── DerivedSpec.md            # Stage: Understanding (after research)
├── ImpactAnalysis.md         # Stage: Evaluation (impact)
├── GapAnalysis.md            # Stage: Evaluation (gaps)
├── ReviewComments.md         # Stage: Output (feedback + critique)
└── prompts/
    └── 01B-code-research.prompt.md  # Generated research prompt
```

### Identifier Derivation

- **GitHub PR**: `PR-<number>` (e.g., `PR-123`)
- **Local branch**: Slugified branch name (e.g., `feature-new-auth`)

## Workflow Orchestration

The workflow executes stages in sequence, with each stage producing artifacts consumed by downstream stages.

### Understanding Stage

**Skills**: `paw-review-understanding`, `paw-review-baseline`

**Sequence**:
1. Run `paw-review-understanding` activity
   - Input: PR number/URL or branch context
   - Output: `ReviewContext.md`, `prompts/01B-code-research.prompt.md`
   
2. Run `paw-review-baseline` activity
   - Input: ReviewContext.md, research prompt
   - Output: `CodeResearch.md`
   
3. Run `paw-review-understanding` activity (resume)
   - Input: ReviewContext.md, CodeResearch.md
   - Detects CodeResearch.md exists → skips to specification derivation
   - Output: `DerivedSpec.md`

**Stage Gate**: Verify ReviewContext.md, CodeResearch.md, DerivedSpec.md exist before proceeding.

### Evaluation Stage

**Skills**: `paw-review-impact`, `paw-review-gap`

**Sequence**:
1. Run `paw-review-impact` activity
   - Input: All understanding artifacts
   - Output: `ImpactAnalysis.md`
   
2. Run `paw-review-gap` activity
   - Input: All understanding + impact artifacts
   - Output: `GapAnalysis.md`

**Stage Gate**: Verify ImpactAnalysis.md, GapAnalysis.md exist before proceeding.

### Output Stage

**Skills**: `paw-review-feedback`, `paw-review-critic`

**Sequence**:
1. Run `paw-review-feedback` activity
   - Input: All prior artifacts
   - Output: `ReviewComments.md`, GitHub pending review (if applicable)
   
2. Run `paw-review-critic` activity
   - Input: ReviewComments.md + all prior artifacts
   - Output: Assessment sections added to `ReviewComments.md`

**Human Control Point**: Pending review is created but NOT submitted. Human reviewer:
- Reviews generated comments
- Modifies, adds, or removes comments as needed
- Submits review when satisfied

## Terminal Behavior

Upon workflow completion, report artifact locations, GitHub pending review status (if applicable), and next steps for the human reviewer.

## Cross-Repository Support

If multiple repositories or PRs are detected:
1. Identify which repositories have changes
2. Determine the primary repository (where changes originate)
3. For each repository, run the workflow stages independently
4. In the Output stage, correlate findings across repositories
5. Note cross-repo dependencies in the review comments
