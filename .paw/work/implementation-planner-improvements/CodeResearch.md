---
date: 2025-11-18 17:16:03 EST
git_commit: 46a5821fc4f351b6ef929e11d6091dfbde68ed16
branch: feature/impl-planner-improvements
repository: phased-agent-workflow
topic: "Implementation Planner Agent - Code Structure and Behavior"
tags: [research, codebase, implementation-planner, paw-agents, agent-instructions]
status: complete
last_updated: 2025-11-18
---

# Research: Implementation Planner Agent - Code Structure and Behavior

**Date**: 2025-11-18 17:16:03 EST
**Git Commit**: 46a5821fc4f351b6ef929e11d6091dfbde68ed16
**Branch**: feature/impl-planner-improvements
**Repository**: phased-agent-workflow

## Research Question

Investigate the Implementation Planner agent's current structure, guidance, and behavior to understand:
1. Where agent instructions are located and how they're organized
2. Current plan template structure and code detail expectations
3. Existing guidance about when to include implementation code vs. descriptions
4. Workflow transition instructions (commit, push, PR creation)
5. PR comment formatting and agent identification patterns
6. Phase summary patterns in other PAW agents
7. Current approach to documentation phases and relationship with Documenter agent

This research supports implementing improvements outlined in Issue #58: reducing code detail in plans, adding phase summaries, improving agent identification, clarifying workflow transitions, and removing documentation phases.

## Summary

The Implementation Planner agent (`agents/PAW-02B Impl Planner.agent.md`) is a comprehensive 600-line agent definition that guides the creation of detailed implementation plans. The agent currently emphasizes thorough, code-level detail with explicit instructions to include specific code snippets in plan templates. It owns the complete planning-to-PR workflow including git operations and Planning PR creation. The agent has two operating modes (initial planning and PR review response) with extensive instructions for research, collaboration, and plan writing.

Key findings relevant to Issue #58 improvements:
- **Code detail**: Current guidance strongly favors code-level specificity with no instructions for when to use high-level descriptions instead
- **Plan template**: Explicitly includes code blocks within "Changes Required" sections showing implementation code
- **Workflow transitions**: Complete instructions exist for commit/push/PR creation based on review strategy (prs vs local)
- **Agent identification**: Uses generic PAW footer signature, lacks agent-specific identification like other agents (Implementation Reviewer, Documenter)
- **Phase summaries**: Other agents (Implementation Agent, Documenter) show patterns for high-level phase summaries focused on accomplishments
- **Documentation**: No explicit guidance preventing documentation phases; agents operate sequentially with clear separation (Planner → Implementation → Documentation)

## Detailed Findings

### Agent File Location and Structure

**File**: `agents/PAW-02B Impl Planner.agent.md`

The Implementation Planner agent definition is located at `agents/PAW-02B Impl Planner.agent.md:1-600`. The file follows the standard PAW agent structure:
- YAML frontmatter with description (`agents/PAW-02B Impl Planner.agent.md:1-3`)
- Markdown-formatted instructions divided into clear sections
- Code blocks showing examples and templates
- Structured hierarchy with headers and subsections

The agent is approximately 600 lines and highly detailed, containing:
1. Role definition and initial response (`agents/PAW-02B Impl Planner.agent.md:4-40`)
2. WorkflowContext.md parameter handling (`agents/PAW-02B Impl Planner.agent.md:41-66`)
3. PAW Workflow Mode and Review Strategy handling (`agents/PAW-02B Impl Planner.agent.md:67-97`)
4. Agent Operating Modes (initial planning vs PR review response) (`agents/PAW-02B Impl Planner.agent.md:98-187`)
5. Process Steps for initial planning (`agents/PAW-02B Impl Planner.agent.md:188-382`)
6. Important Guidelines (`agents/PAW-02B Impl Planner.agent.md:383-441`)
7. Quality Checklist (`agents/PAW-02B Impl Planner.agent.md:442-467`)
8. Hand-off messages (`agents/PAW-02B Impl Planner.agent.md:468-498`)
9. Success Criteria Guidelines (`agents/PAW-02B Impl Planner.agent.md:499-533`)
10. Common Patterns (`agents/PAW-02B Impl Planner.agent.md:534-556`)
11. Comprehensive Research instructions (`agents/PAW-02B Impl Planner.agent.md:557-600`)

### Plan Template Structure

The implementation plan template is defined at `agents/PAW-02B Impl Planner.agent.md:253-353` within Step 4: Detailed Plan Writing.

**Plan-level sections** (`agents/PAW-02B Impl Planner.agent.md:253-280`):
- Overview
- Current State Analysis
- Desired End State with Key Discoveries
- What We're NOT Doing
- Implementation Approach

**Per-phase sections** (`agents/PAW-02B Impl Planner.agent.md:281-313`):
- Phase N: [Descriptive Name]
  - Overview (what the phase accomplishes)
  - **Changes Required** (organized by component/file group)
  - Success Criteria (split into Automated and Manual verification)

The template explicitly shows code blocks within Changes Required sections at `agents/PAW-02B Impl Planner.agent.md:290-292`:
```
```[language]
// Specific code to add/modify
```
```

**Post-phases sections** (`agents/PAW-02B Impl Planner.agent.md:314-330`):
- Testing Strategy
- Performance Considerations
- Migration Notes
- References

**Key observation**: The template structure includes ````[language]` code blocks with comment "Specific code to add/modify", explicitly showing that plans should contain implementation code snippets. There is no "Phase Summary" section at the top of the plan.

### Existing Guidance About Code Detail Level

The Implementation Planner has **extensive guidance emphasizing code-level detail** with no counterbalancing instructions for high-level thinking:

**Detail-oriented instructions** at `agents/PAW-02B Impl Planner.agent.md`:
- Line 231: Step 4 instruction to "Use this template structure" (which includes code blocks)
- Line 290-292: Template shows code blocks for "Specific code to add/modify"
- Line 383-441: "Important Guidelines" section includes:
  - Line 399: "Be Thorough: Read all context files COMPLETELY before planning, Research actual code patterns using parallel sub-tasks, Include specific file paths and line numbers"
  - Line 450: Quality checklist item "All phases contain specific file paths, functions, or components to change"
- Line 204-217: Step 1 instructs presenting "Current implementation detail with file:line reference"

**No existing guidance for**:
- When to use architectural descriptions instead of code snippets
- How to maintain appropriate abstraction level
- Balancing strategic overview with tactical detail
- Limiting code block length or frequency
- Thinking at component/interface level vs implementation level

The agent is explicitly instructed to be "thorough" and "specific", with code examples shown as the default approach throughout the template and guidelines.

### Workflow Transition Instructions

The Implementation Planner has **complete, explicit instructions** for committing, pushing, and creating Planning PRs at `agents/PAW-02B Impl Planner.agent.md:355-382` (Step 4, item 5: "DETERMINE REVIEW STRATEGY AND COMMIT/PUSH").

**For 'prs' review strategy** (`agents/PAW-02B Impl Planner.agent.md:362-372`):
1. Ensure on planning branch: `git branch --show-current`
2. Create if needed: `git checkout -b <target_branch>_plan`
3. Stage artifacts: `git add .paw/work/<feature-slug>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}` and prompt files
4. Verify: `git diff --cached`
5. Commit with detailed message
6. Push: `git push -u <remote> <target_branch>_plan`
7. **Create Planning PR** with:
   - Title: `[<Work Title>] Planning: <brief description>`
   - Summary of deliverables with artifact links
   - Footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`
8. Pause for review

**For 'local' review strategy** (`agents/PAW-02B Impl Planner.agent.md:374-379`):
1. Ensure on target branch
2. Stage artifacts, verify, commit
3. Push to target branch: `git push <remote> <target_branch>`
4. Skip Planning PR creation

This is marked as **(Initial Planning Only - REQUIRED)** at line 355, indicating this workflow is mandatory for initial planning mode. The agent owns the entire git workflow from plan completion through PR creation.

### PR Comment Formatting and Agent Identification

The Implementation Planner includes **generic PAW project signature** but **no agent-specific identification** in PR descriptions.

**Current behavior** at `agents/PAW-02B Impl Planner.agent.md:370`:
- Planning PR descriptions end with: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`
- This signature identifies the PAW system but not which specific agent created the PR
- No instructions for including agent identity in PR comments or descriptions

**Comparison with other agents**:

**Implementation Review Agent** (`agents/PAW-03B Impl Reviewer.agent.md`):
- Line 234: Uses `**🐾 Implementation Reviewer 🤖:**` prefix for summary comments
- Line 212: "Start the comment with '**🐾 Implementation Reviewer 🤖:**'"
- Provides clear agent identification separate from generic PAW signature

**Documenter Agent** (`agents/PAW-04 Documenter.agent.md`):
- Line 105: Uses `**🐾 Documenter 🤖:**` prefix for summary comments
- Line 153: "Format: Start with `**🐾 Documenter 🤖:**`"
- Follows same identification pattern as Implementation Reviewer

**Pattern**: Implementation Review Agent and Documenter both use `**🐾 [Agent Name] 🤖:**` format for comments, providing clear identification. Implementation Planner follows the simpler pattern of only including the generic PAW footer without agent-specific identification.

### Phase Summary Patterns in Other Agents

Several PAW agents demonstrate **phase-level summary patterns** focused on high-level accomplishments rather than implementation detail:

**Implementation Agent** (`agents/PAW-03A Implementer.agent.md`):
- Lines 171-174: After completing a phase, "write a new summary and status update to the plan file at the end of the Phase [N] section"
- Purpose: "Note that the phase is completed and any notes that can inform agents working on future phases"
- Focus: **What was accomplished** and **guidance for future work**, not code-level detail
- Line 175: When addressing review comments: "Append a new summary that starts with 'Addressed Review Comments:'"

**Documenter Agent** (`agents/PAW-04 Documenter.agent.md`):
- Lines 237-254: Docs.md template includes "## Overview" section requiring "Comprehensive description of what was implemented, its purpose, and the problem it solves"
- Lines 155-164: Lists what NOT to include: "Code reproduction", "Internal implementation details", "Exhaustive API documentation"
- Lines 166-171: Focus on: "Design decisions and rationale", "Architecture and integration points", "User-facing behavior"
- Emphasis: High-level documentation of behavior and architecture, explicitly avoiding code reproduction

**Implementation Review Agent** (`agents/PAW-03B Impl Reviewer.agent.md`):
- Lines 212-234: Posts "comprehensive summary comment" on PRs with:
  - Section 1: Detailed comment tracking
  - Section 2: "Overall summary" of changes and accomplishments
- Focus: Summary of what was done at a high level for human review

**Pattern**: PAW agents consistently use summary sections to communicate high-level accomplishments, decisions, and context. These summaries:
- Focus on "what" and "why" rather than "how"
- Provide guidance for future work or review
- Avoid exhaustive code-level detail
- Use clear, concise language

The Implementation Planner currently lacks any similar phase-level summary guidance or template section.

### Documentation Phase Handling and Relationship with Documenter Agent

The relationship between Implementation Planner and Documenter is **sequential and complementary** with clear separation of concerns, but **no explicit guidance in the Planner** about avoiding documentation phases.

**Implementation Planner responsibilities**:
- Creates `ImplementationPlan.md` with phases, changes, and success criteria
- Includes technical implementation details, code snippets, and file paths (`agents/PAW-02B Impl Planner.agent.md:253-353`)
- Focuses on **how to implement** the work
- **No guidance** about whether to include or exclude documentation phases

**Documenter responsibilities** (`agents/PAW-04 Documenter.agent.md`):
- Lines 42-47: Prerequisites check - "All implementation phases must be complete and merged", "`ImplementationPlan.md` shows all phases with 'Completed' status"
- Line 48: "If prerequisites are not met, **STOP** and inform the user what's missing"
- Lines 63-85: Creates `Docs.md` after all phases complete
- Lines 155-164: Explicitly avoids reproducing implementation detail: "DO NOT restate what's already in the code via comments/docstrings"
- Lines 166-171: Documents "Design decisions and rationale", "Architecture and integration points", "User-facing behavior"

**Explicit timing separation** at `agents/PAW-04 Documenter.agent.md:42-48`:
- Documenter invoked after "All phase PRs are merged"
- Prerequisite validation ensures implementation is complete before documentation begins

**Separation of abstraction levels**:
- Implementation Planner: Tactical, code-level, implementation-focused (based on template at `agents/PAW-02B Impl Planner.agent.md:253-353`)
- Documenter: Strategic, behavioral, user-focused (based on scope at `agents/PAW-04 Documenter.agent.md:155-171`)

**Hand-off** at `agents/PAW-02B Impl Planner.agent.md:483`:
- Implementation Planner hand-off mentions "Invoke Implementation Agent (Stage 03)" but doesn't reference documentation stage
- No explicit mention of Documenter or documentation in Planning hand-off

**Key observation**: While the agents are designed to operate sequentially with distinct responsibilities (planning tactical implementation vs documenting strategic behavior), there is **no explicit guidance in the Implementation Planner** instructing it to avoid including documentation phases in implementation plans. The planner template doesn't forbid documentation phases, and the guidelines don't mention this separation.

## Code References

All references are to the current implementation at commit `46a5821fc4f351b6ef929e11d6091dfbde68ed16`:

- `agents/PAW-02B Impl Planner.agent.md:1-600` - Full Implementation Planner agent definition
- `agents/PAW-02B Impl Planner.agent.md:253-353` - Plan template with code block examples
- `agents/PAW-02B Impl Planner.agent.md:290-292` - Code block placeholder in template
- `agents/PAW-02B Impl Planner.agent.md:355-382` - Workflow transition instructions (commit/push/PR)
- `agents/PAW-02B Impl Planner.agent.md:370` - Generic PAW footer signature
- `agents/PAW-02B Impl Planner.agent.md:399` - "Be Thorough" guideline emphasizing specificity
- `agents/PAW-02B Impl Planner.agent.md:450` - Quality checklist requiring specific file paths
- `agents/PAW-03A Implementer.agent.md:171-175` - Phase summary instructions in Implementation Agent
- `agents/PAW-03B Impl Reviewer.agent.md:212-234` - Agent identification pattern with 🐾 prefix
- `agents/PAW-04 Documenter.agent.md:42-48` - Prerequisites check ensuring implementation complete
- `agents/PAW-04 Documenter.agent.md:155-171` - Documentation scope guidance avoiding code reproduction
- `agents/PAW-04 Documenter.agent.md:237-254` - Docs.md template focusing on high-level concepts

## Architecture Documentation

### Agent File Structure Pattern

All PAW agents follow a consistent structure as demonstrated by the Implementation Planner:

1. **YAML Frontmatter** - Metadata including description
2. **Role Definition** - Clear statement of agent purpose and responsibilities
3. **Initial Response** - Startup behavior and parameter gathering
4. **Context Management** - WorkflowContext.md handling and parameter persistence
5. **Mode Handling** - Workflow Mode and Review Strategy branching logic
6. **Operating Modes** - Different workflows within the same agent (e.g., initial planning vs PR review)
7. **Process Steps** - Detailed step-by-step instructions for the agent's main workflow
8. **Guidelines** - Principles and best practices for agent behavior
9. **Quality Checklist** - Pre-completion validation items
10. **Hand-off** - Messages for transitioning to next agent

This structure is consistent across `PAW-02B Impl Planner.agent.md`, `PAW-03A Implementer.agent.md`, `PAW-03B Impl Reviewer.agent.md`, and `PAW-04 Documenter.agent.md`.

### Agent Identification Pattern

A clear pattern exists for agent identification in PR comments:
- **Format**: `**🐾 [Agent Name] 🤖:**`
- **Usage**: Prefix for all agent-generated comments
- **Adopted by**: Implementation Reviewer, Documenter
- **Not adopted by**: Implementation Planner (uses only generic PAW footer)

### Workflow Separation Pattern

PAW workflow stages operate sequentially with distinct responsibilities:
1. **Specification** (PAW-01A, PAW-01B) - Define requirements and research them
2. **Planning** (PAW-02A, PAW-02B) - Research code and create implementation plan
3. **Implementation** (PAW-03A) - Write functional code
4. **Review** (PAW-03B) - Add documentation and create PRs
5. **Documentation** (PAW-04) - Create comprehensive user/developer docs
6. **Final PR** (PAW-05) - Merge to main branch

Each stage produces specific artifacts and hands off to the next. The Implementation Planner sits at stage 2, translating specifications into actionable plans for stage 3 (Implementation).

## Open Questions

None - all research questions were successfully answered through codebase exploration.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/58
- Spec: `.paw/work/implementation-planner-improvements/Spec.md`
- SpecResearch: `.paw/work/implementation-planner-improvements/SpecResearch.md`
- PR Example (too much code): https://github.com/lossyrob/phased-agent-workflow/pull/85 - Implementation plan reduced from 1,387 to 557 lines by removing code details
