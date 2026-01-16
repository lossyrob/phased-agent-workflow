---
name: paw-review-workflow
description: Orchestrates the PAW Review workflow, coordinating activity skills to analyze PRs and generate comprehensive review feedback.
metadata:
  type: workflow
  version: "1.0"
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

Activity skills are executed as subagents. Each subagent MUST:

### Response Format

Upon completion, respond with:
```
Activity complete.
Artifact saved: <artifact-path>
Status: Success|Partial|Blocked
[Optional: Brief summary of key findings]
```

### Error Reporting

If blocked or unable to complete:
```
Activity blocked.
Reason: <specific reason>
Missing: <what is needed>
Recommendation: <next steps>
```

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
1. Run `paw-review-understanding` subagent
   - Input: PR number/URL or branch context
   - Output: `ReviewContext.md`, `prompts/01B-code-research.prompt.md`
   
2. Run `paw-review-baseline` subagent
   - Input: ReviewContext.md, research prompt
   - Output: `CodeResearch.md`
   
3. Run `paw-review-understanding` subagent (resume)
   - Input: ReviewContext.md, CodeResearch.md
   - Detects CodeResearch.md exists → skips to specification derivation
   - Output: `DerivedSpec.md`

**Stage Gate**: Verify ReviewContext.md, CodeResearch.md, DerivedSpec.md exist before proceeding.

### Evaluation Stage

**Skills**: `paw-review-impact`, `paw-review-gap`

**Sequence**:
1. Run `paw-review-impact` subagent
   - Input: All understanding artifacts
   - Output: `ImpactAnalysis.md`
   
2. Run `paw-review-gap` subagent
   - Input: All understanding + impact artifacts
   - Output: `GapAnalysis.md`

**Stage Gate**: Verify ImpactAnalysis.md, GapAnalysis.md exist before proceeding.

### Output Stage

**Skills**: `paw-review-feedback`, `paw-review-critic`

**Sequence**:
1. Run `paw-review-feedback` subagent
   - Input: All prior artifacts
   - Output: `ReviewComments.md`, GitHub pending review (if applicable)
   
2. Run `paw-review-critic` subagent
   - Input: ReviewComments.md + all prior artifacts
   - Output: Assessment sections added to `ReviewComments.md`

**Human Control Point**: Pending review is created but NOT submitted. Human reviewer:
- Reviews generated comments
- Modifies, adds, or removes comments as needed
- Submits review when satisfied

## Terminal Behavior

Upon workflow completion, report:
```
Review workflow complete.

Artifacts created:
- .paw/reviews/<identifier>/ReviewContext.md
- .paw/reviews/<identifier>/CodeResearch.md
- .paw/reviews/<identifier>/DerivedSpec.md
- .paw/reviews/<identifier>/ImpactAnalysis.md
- .paw/reviews/<identifier>/GapAnalysis.md
- .paw/reviews/<identifier>/ReviewComments.md

GitHub Status: [Pending review created with N comments | Non-GitHub context]

Next steps for reviewer:
1. Review generated comments in ReviewComments.md
2. Check GitHub pending review (if applicable)
3. Modify or remove comments as needed
4. Submit review when satisfied
```

## Cross-Repository Detection

If multiple working directories or repositories are detected:
- Note cross-repo scenario in initial response
- Document which repositories are involved
- Detailed cross-repo handling is deferred to future implementation

## Error Recovery

If a stage fails or produces incomplete artifacts:
1. Report the specific failure with details
2. Do NOT proceed to downstream stages
3. Provide clear instructions for resolution
4. Support re-running the failed stage after fixes
