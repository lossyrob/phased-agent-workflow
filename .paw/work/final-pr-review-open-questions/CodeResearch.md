---
date: 2025-12-13T16:51:15-05:00
git_commit: 9e54a35c3ace2f746b825ca39a0070dcf1b4a150
branch: feature/132-final-pr-review-open-questions
repository: phased-agent-workflow
topic: "Open Questions Resolution in Final PR Agent"
tags: [research, codebase, final-pr, open-questions, pre-flight-checks, artifact-extraction]
status: complete
last_updated: 2025-12-13
---

# Code Research: Open Questions Resolution in Final PR Agent

**Date**: 2025-12-13 16:51:15 EST  
**Git Commit**: 9e54a35c3ace2f746b825ca39a0070dcf1b4a150  
**Branch**: feature/132-final-pr-review-open-questions  
**Repository**: phased-agent-workflow

## Research Question

Identify existing codebase patterns for implementing open questions resolution in the Final PR agent, including: pre-flight check framework patterns, artifact section extraction, user override patterns, and PR description template integration.

## Summary

The PAW-05 Final PR agent has an established pre-flight check framework that blocks PR creation on failures while allowing explicit user override. Open questions are documented in specific section headers across four artifacts: `## Open Unknowns` (SpecResearch.md), `## Open Questions` (CodeResearch.md, ImplementationPlan.md), and `## Assumptions` (Spec.md). The PR description template follows an 11-section structure with a logical insertion point for "Open Questions Resolution" between sections 9 (Acceptance Criteria) and 10 (Deployment Considerations). The artifact discovery pattern uses a file existence check loop to adapt to workflow mode. Out-of-scope items (in `## Scope` → `Out of Scope:` subsection for Spec.md and `## What We're NOT Doing` for ImplementationPlan.md) represent resolved decisions, not uncertainties.

## Detailed Findings

### Pre-flight Check Framework

The Final PR agent implements a comprehensive pre-flight validation system at [PAW-05 PR.agent.md](agents/PAW-05%20PR.agent.md#L117-L145).

**Structure (lines 117-145):**
```markdown
## Pre-flight Validation Checks

Before creating the PR, verify the following and report status:

### 1. Phase Implementation Complete
- [ ] All phases in ImplementationPlan.md marked complete
- [ ] All phase PRs merged to target branch
- [ ] Target branch exists and has commits

### 2. Documentation Complete
...

### 3. Artifacts Exist
- [ ] Spec.md exists
- [ ] SpecResearch.md exists
- [ ] CodeResearch.md exists
- [ ] ImplementationPlan.md exists

### 4. Branch Up to Date
...

### 5. Build and Tests (if applicable)
...

If checks fail, report status and recommendations. If the user explicitly confirms to proceed, continue with PR creation.
```

**Key patterns:**
1. **Numbered check categories**: Each validation area is a numbered subsection (1-5)
2. **Checklist format**: Individual checks use `- [ ]` checkbox items
3. **Block-then-override**: Line 145 establishes the pattern: "If checks fail, report status and recommendations. If the user explicitly confirms to proceed, continue with PR creation."

**Core responsibility (lines 110-115):**
```markdown
## Core Responsibilities

- Perform comprehensive pre-flight readiness checks
- Validate all prerequisites are complete
- Block PR creation if checks fail
```

The new Open Questions Resolution check should follow this same pattern as a new numbered section (likely section 6) in the pre-flight validation.

### User Override Pattern

The block-then-override pattern is used consistently across PAW agents:

| Agent | Location | Pattern |
|-------|----------|---------|
| PAW-05 PR | Line 145 | "If checks fail, report status and recommendations. If the user explicitly confirms to proceed, continue with PR creation." |
| PAW-R1A Understanding | Line 123 | "Allow user override via parameter if explicitly provided" |
| PAW-R2A Impact Analyzer | Line 16 | "STOP and inform the user that Phase 1 (Understanding Stage) must be completed first." |
| PAW-R3A Feedback Generator | Line 18 | "STOP and inform the user that earlier stages must be completed first." |

**Handoff mode considerations (from handoff templates):**
- **Manual mode**: STOP and wait for user input
- **Semi-Auto/Auto mode**: For blocking conditions, still STOP—auto mode does not bypass blockers

**Implementation pattern for unresolved questions:**
1. Flag the unresolved question with context and recommendation
2. Block PR creation (STOP)
3. Prompt user for resolution or explicit deferral explanation
4. If user provides resolution/deferral, continue with PR creation including user-provided explanation

### Open Question Section Formats by Artifact

Each artifact type uses specific section headers for documenting uncertainties:

#### SpecResearch.md: `## Open Unknowns`

**Template source** ([PAW-01B Spec Researcher.agent.md](agents/PAW-01B%20Spec%20Researcher.agent.md#L56-L58)):
```markdown
4. **Open Unknowns**: Unanswered internal questions with rationale. 
   Note: "The Spec Agent will review these with you. You may provide answers here if possible."
```

**Example format** (from `.paw/work/mkdocs-github-pages/SpecResearch.md:103-112`):
```markdown
## Open Unknowns

None. All internal questions have been answered through repository inspection.
```

**Content when populated** (from `.paw/work/final-pr-review-open-questions/SpecResearch.md:134`):
```markdown
## Open Unknowns

None. All internal questions about existing system behavior have been answered through artifact inspection.
```

**Extraction heuristic:**
- Header: `## Open Unknowns`
- Content: Bullet points or "None" statement
- Located near end of document, after Research Findings

#### CodeResearch.md: `## Open Questions`

**Template source** ([PAW-02A Code Researcher.agent.md](agents/PAW-02A%20Code%20Researcher.agent.md#L189-L190)):
```markdown
## Open Questions
[Any areas that need further investigation]
```

**Example with content** (from `.paw/work/handoff-command-improvements/CodeResearch.md:307-320`):
```markdown
## Open Questions

1. **Template vs Component location for command recognition**: Should the command recognition decision gate be in `handoff-instructions.component.md` (compile-time inclusion) or in the handoff mode templates (runtime injection via contextTool)?

2. **Continue target format**: Should the guidance line be updated to always say `continue → [Agent Name]` or should it use a more user-friendly format like `continue to implementation`?

3. **Scope boundaries for Impl Reviewer**: The user feedback suggests adding explicit scope boundary documentation. Should this be in `handoff-instructions.component.md` or only in `PAW-03B Impl Reviewer.agent.md`?
```

**Example with none** (from `.paw/work/mkdocs-github-pages/CodeResearch.md:260-263`):
```markdown
## Open Questions

None. The research provides sufficient implementation patterns from both the existing codebase and established MkDocs deployment practices.
```

**Extraction heuristic:**
- Header: `## Open Questions`
- Content: Numbered list with bold question titles, or "None" statement
- Located at end of document, after Architecture Documentation

#### Spec.md: `## Assumptions`

**Template source** ([PAW-01A Specification.agent.md](agents/PAW-01A%20Specification.agent.md#L193-L194)):
```markdown
## Assumptions
- <Assumed default & rationale>
```

**Example format** (from `.paw/work/finalize-initial-chatmodes/Spec.md:190-210`):
```markdown
## Assumptions

- **Assumption 1**: The PAW-02A Code Researcher, PAW-02B Impl Planner, and PAW-03A Implementer chatmodes are production-tested from Human Layer... *Rationale*: Issue explicitly states...

- **Assumption 2**: Canonical agent names will follow the pattern... *Rationale*: Main specification document is the authoritative source...
```

**Extraction heuristic:**
- Header: `## Assumptions`
- Content: Numbered bullets with **bold assumption title** and *Rationale:* explanation
- Located in Requirements block, after Success Criteria

#### ImplementationPlan.md: `## Open Questions`

**Template source** ([PAW-02B Impl Planner.agent.md](agents/PAW-02B%20Impl%20Planner.agent.md#L172-L174)):
```markdown
## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]
```

**Guideline 6 constraint** (line 339-342):
```markdown
6. **No Open Questions in Final Plan**:
   - **STOP** when you encounter unresolved questions—resolve before continuing
   - Research first; only ask human when research cannot answer
   - NO placeholders (`TBD`, `???`)—all decisions must be explicit
```

**Example format** (from `.paw/work/paw-review/ImplementationPlan.md:1448-1452`):
```markdown
## Open Questions

**None** - All technical decisions made, implementation details specified, success criteria defined.
```

**Extraction heuristic:**
- Header: `## Open Questions`
- Content: Should be "None" or empty if plan is complete per Guideline 6
- If populated, indicates incomplete plan (flaggable condition)
- Located at end of document, after References

### Out-of-Scope Item Locations

Out-of-scope items are resolved decisions, NOT uncertainties. The Open Questions Resolution section should NOT include these.

**Spec.md `## Scope` section** ([PAW-01A Specification.agent.md](agents/PAW-01A%20Specification.agent.md#L195-L198)):
```markdown
## Scope
In Scope:
- <included boundary>
Out of Scope:
- <explicit exclusion>
```

**ImplementationPlan.md `## What We're NOT Doing`** ([PAW-02B Impl Planner.agent.md](agents/PAW-02B%20Impl%20Planner.agent.md#L172-L174)):
```markdown
## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]
```

**Quality checklist reference** (line 398):
```markdown
- [ ] "What We're NOT Doing" section prevents scope creep and out-of-scope work
```

### Artifact Discovery Pattern

The Final PR agent uses a file existence check loop to adapt to workflow modes ([PAW-05 PR.agent.md](agents/PAW-05%20PR.agent.md#L52-L60)):

```python
artifacts_to_check = ['Spec.md', 'SpecResearch.md', 'CodeResearch.md', 'ImplementationPlan.md', 'Docs.md']
existing_artifacts = []

for artifact in artifacts_to_check:
    path = f".paw/work/<feature-slug>/{artifact}"
    if file_exists(path):
        existing_artifacts.append(artifact)

# Include only existing artifacts in PR description
```

**Mode-based adaptation** (lines 78-84):
```markdown
**Pre-flight Checks Adaptation by Mode**

Adjust validation checks based on mode:
- **full + prs**: Check all intermediate PRs merged (Planning, Phase, Docs)
- **full + local**: Check all artifacts exist on target branch, skip PR checks
- **minimal + local**: Check only required artifacts (CodeResearch, ImplementationPlan), Spec and Docs optional
- **custom**: Adapt checks based on Custom Workflow Instructions
```

**For open questions extraction:**
- Apply same pattern: check each artifact for existence before attempting to extract sections
- Gracefully handle missing artifacts (note artifact was not present)
- Only extract from artifacts that exist

### PR Description Template Structure

The current template has 11 sections ([PAW-05 PR.agent.md](agents/PAW-05%20PR.agent.md#L148-L202)):

1. `# [Feature/Task Name]` - Title
2. `## Summary` - 1-2 paragraph overview from Spec.md
3. `## Related Issues` - Closes issue at <Issue URL>
4. `## Artifacts` - Links to all workflow artifacts
5. `## Implementation Phases` - List of phase PRs (prs strategy only)
6. `## Documentation Updates` - Docs PR reference
7. `## Changes Summary` - High-level summary with Key Changes subsection
8. `## Testing` - Unit, integration, manual testing status
9. `## Acceptance Criteria` - Spec.md criteria with completion status
10. `## Deployment Considerations` - Deployment notes, migrations
11. `## Breaking Changes` - Breaking changes or "None"

**Insertion point for Open Questions Resolution:**
Per Spec.md requirements, insert between sections 9 (Acceptance Criteria) and 10 (Deployment Considerations):

```markdown
## Acceptance Criteria
[Existing section content]

## Open Questions Resolution
[New section - questions from all artifacts with resolution status]

## Deployment Considerations
[Existing section content]
```

**Rationale:** Acceptance Criteria verifies requirements were met. Open Questions Resolution documents how uncertainties were handled in meeting those criteria—a natural follow-on before operational concerns (Deployment, Breaking Changes).

### Section Extraction Implementation Pattern

Based on similar artifact reading patterns in existing agents:

**Code Researcher pattern** ([PAW-02A Code Researcher.agent.md](agents/PAW-02A%20Code%20Researcher.agent.md#L248-L260)):
```markdown
##### Step 2: Follow the Code Path
- Trace function calls step by step
- Read each file involved in the flow
- Note where data is transformed
```

**Implementer pattern** ([PAW-03A Implementer.agent.md](agents/PAW-03A%20Implementer.agent.md#L17-L27)):
```markdown
2. Read the `CodeResearch.md` file referenced in the implementation plan (typically in the same directory as the plan). This provides critical context about:
   - File paths and line numbers for components to modify
   - Existing patterns and conventions to follow
```

**Suggested extraction algorithm for open questions:**

```markdown
1. Determine which artifacts exist:
   - Check for Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md
   - Note which are missing (for reporting)

2. For each existing artifact, extract relevant section:
   - SpecResearch.md: Find `## Open Unknowns`, extract content until next `##`
   - CodeResearch.md: Find `## Open Questions`, extract content until next `##` or EOF
   - Spec.md: Find `## Assumptions`, extract content until next `##`
   - ImplementationPlan.md: Find `## Open Questions`, extract content until next `##` or EOF

3. Parse extracted content:
   - If content is "None" or similar, mark as resolved
   - If content contains numbered/bulleted items, extract each as individual question

4. For each extracted question, determine resolution:
   - Check subsequent artifacts for answers
   - Check implementation for evidence of resolution
   - Flag as unresolved if no clear resolution found

5. Generate Open Questions Resolution section:
   - Group by source artifact
   - For each question: original text, resolution status, implementation reference (if resolved)
   - Flag unresolved questions prominently
```

### Resolution Mapping Patterns

The spec distinguishes between resolved and unresolved questions:

**Resolution indicators:**
- Question answered in subsequent artifact (e.g., research question answered in ImplementationPlan.md)
- Design decision documented in Spec.md Assumptions that addresses the question
- Implementation choice evident in code with file:line reference

**Unresolved indicators:**
- Question appears in later artifacts without answer
- No corresponding implementation decision visible
- Question marked with `TBD`, `???`, or similar placeholders

**Conservative matching approach (per Spec.md Risks & Mitigations):**
> "Flag uncertain mappings for user confirmation rather than assuming resolution."

## Code References

| Reference | Description |
|-----------|-------------|
| [PAW-05 PR.agent.md:117-145](agents/PAW-05%20PR.agent.md#L117-L145) | Pre-flight validation check structure with numbered categories and checklist format |
| [PAW-05 PR.agent.md:145](agents/PAW-05%20PR.agent.md#L145) | Block-then-override pattern: "If checks fail, report status and recommendations. If the user explicitly confirms to proceed, continue with PR creation." |
| [PAW-05 PR.agent.md:148-202](agents/PAW-05%20PR.agent.md#L148-L202) | PR description template with 11 sections; insertion point between Acceptance Criteria and Deployment Considerations |
| [PAW-05 PR.agent.md:52-60](agents/PAW-05%20PR.agent.md#L52-L60) | Artifact discovery pattern with file_exists loop |
| [PAW-01B Spec Researcher.agent.md:56-58](agents/PAW-01B%20Spec%20Researcher.agent.md#L56-L58) | `## Open Unknowns` section template |
| [PAW-02A Code Researcher.agent.md:189-190](agents/PAW-02A%20Code%20Researcher.agent.md#L189-L190) | `## Open Questions` section template for CodeResearch.md |
| [PAW-01A Specification.agent.md:193-194](agents/PAW-01A%20Specification.agent.md#L193-L194) | `## Assumptions` section template for Spec.md |
| [PAW-01A Specification.agent.md:195-198](agents/PAW-01A%20Specification.agent.md#L195-L198) | `## Scope` with Out of Scope subsection (resolved decisions, not open questions) |
| [PAW-02B Impl Planner.agent.md:172-174](agents/PAW-02B%20Impl%20Planner.agent.md#L172-L174) | `## What We're NOT Doing` section (resolved exclusions, not open questions) |
| [PAW-02B Impl Planner.agent.md:339-342](agents/PAW-02B%20Impl%20Planner.agent.md#L339-L342) | Guideline 6: "No Open Questions in Final Plan" - ImplementationPlan.md should have no unresolved questions |
| [PAW-02B Impl Planner.agent.md:398](agents/PAW-02B%20Impl%20Planner.agent.md#L398) | Quality checklist: "What We're NOT Doing" prevents scope creep |

## Architecture Documentation

### Section Header to Artifact Mapping

| Artifact | Section Header | Content Type | Resolution Status |
|----------|---------------|--------------|-------------------|
| SpecResearch.md | `## Open Unknowns` | Unanswered internal behavior questions | Should be resolved in Spec.md or via clarification |
| CodeResearch.md | `## Open Questions` | Technical implementation questions | Should be resolved in ImplementationPlan.md |
| Spec.md | `## Assumptions` | Explicit design assumptions | Documented decisions (represent resolved uncertainties) |
| ImplementationPlan.md | `## Open Questions` | Should be empty per Guideline 6 | Presence indicates incomplete plan |

### Resolution Flow

```
SpecResearch.md "Open Unknowns"
  ↓ resolved by
Spec.md "Assumptions" (design decisions) + User clarification
  
CodeResearch.md "Open Questions"  
  ↓ resolved by
ImplementationPlan.md decisions + Implementation choices (file:line)

ImplementationPlan.md "Open Questions"
  ↓ should be
Empty ("None") - all decisions explicit before implementation
```

### Pre-flight Check Integration

The open questions check integrates as a new numbered section in the pre-flight validation:

```markdown
### 6. Open Questions Resolved
- [ ] SpecResearch.md Open Unknowns section reviewed
- [ ] CodeResearch.md Open Questions resolved or addressed
- [ ] Spec.md Assumptions documented
- [ ] ImplementationPlan.md has no open questions (Guideline 6 compliance)
- [ ] All questions mapped to resolution or flagged for user input
```

If any question cannot be mapped to a clear resolution:
1. Report the unresolved question with source artifact and context
2. Provide recommendation (resolution approach or explicit deferral)
3. Block PR creation until user provides resolution or deferral explanation
4. Include user-provided explanation in PR description

## Open Questions

None. All implementation patterns have been identified with specific file:line references. The research provides sufficient guidance for implementing open questions resolution in the Final PR agent.
