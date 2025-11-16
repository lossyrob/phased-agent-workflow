---
date: 2025-10-13T13:36:03-04:00
git_commit: fd0927fcd350d819a7cade466cb0bb6a27080f52
branch: feature/finalize-initial-chatmodes_plan
repository: phased-agent-workflow
topic: "Code Research for Finalizing Initial Agent Chatmodes"
tags: [research, codebase, chatmodes, paw, agent-workflow]
status: complete
last_updated: 2025-10-13
---

# Code Research: Finalize Initial Agent Chatmodes

**Date**: 2025-10-13T13:36:03-04:00  
**Git Commit**: fd0927fcd350d819a7cade466cb0bb6a27080f52  
**Branch**: feature/finalize-initial-chatmodes_plan  
**Repository**: phased-agent-workflow

## Research Question

What is the current implementation state of all PAW chatmode files, and where are the specific patterns (guardrails, quality checklists, hand-offs, naming, artifact paths) that need to be standardized or propagated according to the Spec for feature/finalize-initial-chatmodes?

## Summary

This research documents the implementation details of all 9 chatmode files in the PAW workflow, providing exact file paths and line numbers for key patterns that inform the implementation plan. Key findings:

1. **Empty Chatmodes**: PAW-03B Impl Reviewer, PAW-04 Documenter, PAW-05 PR are completely empty files (0 bytes)
2. **Mature Chatmodes**: PAW-01A, PAW-01B, PAW-02A, PAW-02B, PAW-03A, PAW-X contain complete structures
3. **Guardrail Density**: PAW-02A Code Researcher has the highest concentration of "DO NOT" directives (20+), followed by PAW-02B Impl Planner (10+)
4. **Path Inconsistencies**: PAW-02A and PAW-02B use `docs/agent/` (singular) while PAW-01A/01B use `docs/agents/` (plural)
5. **Quality Checklists**: Only PAW-01A Spec Agent has an explicit embedded quality checklist section
6. **Hand-off Clarity**: Only PAW-01A has an explicit "Next: Invoke [Agent]" statement at line 254

## Detailed Findings

### Chatmode File Locations

All chatmode files are located in `.github/chatmodes/`:

| File | Path | Size | Status |
|------|------|------|--------|
| PAW-01A | `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` | ~13KB | Mature |
| PAW-01B | `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md` | ~2.5KB | Mature |
| PAW-02A | `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` | ~11KB | Mature |
| PAW-02B | `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` | ~20KB | Mature |
| PAW-03A | `.github/chatmodes/PAW-03A Implementer.chatmode.md` | ~5KB | Mature |
| PAW-03B | `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` | 0 bytes | **Empty** |
| PAW-04 | `.github/chatmodes/PAW-04 Documenter.chatmode.md` | 0 bytes | **Empty** |
| PAW-05 | `.github/chatmodes/PAW-05 PR.chatmode.md` | 0 bytes | **Empty** |
| PAW-X | `.github/chatmodes/PAW-X Status Update.chatmode.md` | ~2KB | Mature |

### Chatmode Structure Patterns

#### YAML Frontmatter

All mature chatmodes follow the same frontmatter structure:

**Pattern (from PAW-01A:1-3)**:
```yaml
---
description: 'Phased Agent Workflow: Spec Agent'
---
```

**Variations**:
- PAW-01A:2: `'Phased Agent Workflow: Spec Agent'`
- PAW-01B:2: `'Phased Agent Workflow: Spec Research Agent'`
- PAW-02A:2: `'PAW Researcher agent'`
- PAW-02B:2: `'PAW Implementation Planner Agent'`
- PAW-03A:2: `'PAW Implementation Agent'`
- PAW-X:2: `'Phased Agent Workflow: Status Updater (keeps Issues/PRs up to date and well-formed)'`

**Note**: Naming inconsistency - some use "Phased Agent Workflow:" prefix, some use "PAW"

#### Common Section Structure

All mature chatmodes contain these sections (exact order varies):

1. **Title** (H1): Agent name
2. **Description/Role**: Brief statement of purpose
3. **Start/Initial Response**: How agent begins interaction
4. **Core Principles/Philosophy** (optional): Guiding principles
5. **Process Steps/Workflow**: Numbered or detailed steps
6. **Inputs/Parameters**: What agent needs
7. **Outputs**: What agent produces
8. **Guardrails** (optional): Constraints and prohibitions
9. **Error Handling** (optional): Edge cases
10. **Hand-off/Next Steps** (optional): What happens after completion

### Guardrail Patterns by Chatmode

#### PAW-01A Spec Agent - Guardrails Section (Lines 233-240)

Located under "## Guardrails (Enforced)" heading:

```markdown
- NEVER: fabricate answers not supported by Issue, SpecResearch, or user-provided inputs.
- NEVER: silently assume critical external standards; if needed list as optional external/context question + assumption.
- NEVER: produce a spec-research prompt that reintroduces removed sections (Purpose, Output) unless user explicitly requests legacy format.
- NEVER: proceed to final spec if unanswered **critical** internal clarification questions remain (optional external/context questions do not block).
- ALWAYS: differentiate *requirements* (what) from *acceptance criteria* (verification of what).
- ALWAYS: pause after writing the research prompt until research results (or explicit skips) are provided.
- ALWAYS: surface if external research was skipped and note potential risk areas.
- ALWAYS: ensure minimal format header lines are present and correctly ordered.
```

**Pattern**: Uses "NEVER:" and "ALWAYS:" prefix with colon, followed by detailed directive.

**Additional guardrails scattered throughout**:
- Line 22: "You DO NOT commit, push, open PRs, update Issues..."
- Line 43: "do NOT commit / push / open PRs"
- Line 95: "Do not include implementation suggestions"
- Line 261: "ALWAYS use the **github mcp** tools..."

#### PAW-01B Spec Research Agent - Guardrails Section (Lines 66-71)

Located under "## Guardrails" heading:

```markdown
- No proposals, refactors, "shoulds".
- No speculative claims—state only what exists or mark as open unknown.
- Distinguish answered internal behavior from manual external/context list.
- If a question cannot be answered AFTER consulting internal spec(s), overview docs, existing artifacts, config, and relevant code, list it under "Open Unknowns" with rationale.
- **Keep answers concise**: Answer questions directly with essential facts only. Avoid exhaustive lists, lengthy examples, or unnecessary detail that inflates context without adding clarity for specification writing.
- Do not commit changes or post comments to GitHub Issues or PRs - this is handled by other agents.
```

**Pattern**: Bullet list with "No" and "Do not" statements, less emphatic than PAW-01A.

#### PAW-02A Code Researcher - Anti-Evaluation Guardrails (Lines 8-14)

Located immediately after title, under "## CRITICAL:" heading:

```markdown
## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY
- DO NOT suggest improvements or changes unless the user explicitly asks for them
- DO NOT perform root cause analysis unless the user explicitly asks for them
- DO NOT propose future enhancements unless the user explicitly asks for them
- DO NOT critique the implementation or identify problems
- DO NOT recommend refactoring, optimization, or architectural changes
- ONLY describe what exists, where it exists, how it works, and how components interact
```

**Pattern**: All-caps "CRITICAL:" section header, bullet list with "DO NOT" and one "ONLY" directive.

**Additional DO NOT directives throughout**:
- Line 224: "DO NOT evaluate if the logic is correct or optimal"
- Line 225: "DO NOT identify potential bugs or issues"
- Lines 256-261: Six "DO NOT" statements in Code Pattern Finder section

**Important notes**:
- Line 48: "IMPORTANT: Ensure there are no other researech steps to complete..."
- Line 33: "IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters..."
- Line 39: "**CRITICAL**: Read these files yourself in the main context..."

**Count**: 20+ "DO NOT" directives, 2 "CRITICAL", 2 "IMPORTANT"

#### PAW-02B Impl Planner - Verification Guardrails (Lines 77-78, 300-302)

Line 41: "**CRITICAL**: DO NOT proceed to research tasks before reading these files yourself in the main context"

Line 77-78:
```markdown
   - DO NOT just accept the correction
   - Perform COMPREHENSIVE RESEARCH steps, as described below, to verify the correct information
```

Lines 300-302 under "## Important Guidelines":
```markdown
6. **No Open Questions in Final Plan**:
   - If you encounter open questions during planning, STOP
   - Research or ask for clarification immediately
   - Do NOT write the plan with unresolved questions
```

Additional:
- Line 42: "**NEVER** read files partially"
- Line 448-449: "DO NOT evaluate if the logic is correct or optimal", "DO NOT identify potential bugs or issues"

**Pattern**: Mix of "CRITICAL", "DO NOT", "NEVER", scattered throughout process steps. Emphasis on verification and completeness.

**Count**: 1 "CRITICAL", 1 "NEVER", 10+ "DO NOT" (counting similar pattern sections)

#### PAW-03A Implementer - Surgical Change Discipline (Lines 109-110)

```markdown
ONLY commit changes you made to implement the plan. Do not include unrelated changes. If you aren't sure if a change is related, pause and ask.
Do not revert or overwrite unrelated changes. Just avoid adding them to your commit.
```

Additional:
- Line 105: "do not check off items in the manual testing steps until confirmed by the user"
- Line 15: "**Read files fully** - never use limit/offset parameters"

**Pattern**: Uses "ONLY" and "do not" (lowercase), minimal emphasis markers compared to other chatmodes. Focus on specific actions rather than broad prohibitions.

#### PAW-X Status Update - Idempotency Guardrails (Lines 67-70)

Located under "## Guardrails" heading:

```markdown
- Never change content outside AUTOGEN blocks.
- Never assign reviewers, change labels (except `status/*` if configured), or modify code.
- Be idempotent: re-running should not produce diffs without state changes.
```

**Pattern**: Uses "Never" (capitalized), concise statements, focused on safe updates.

### Quality Checklist Patterns

#### PAW-01A Spec Agent - Embedded Quality Checklist (Lines 178-202)

Located under "## Spec Quality Checklist" heading:

```markdown
### Content Quality
- [ ] Focuses on WHAT & WHY (no implementation details)
- [ ] Story priorities clear (P1 highest, descending)
- [ ] Each user story independently testable
- [ ] Each story has ≥1 acceptance scenario
- [ ] Edge cases enumerated

### Requirement Completeness
- [ ] All FRs testable & observable
- [ ] FRs mapped to user stories
- [ ] Success Criteria measurable & tech‑agnostic
- [ ] Success Criteria linked to FRs / stories (where applicable)
- [ ] Assumptions documented (not silently implied)
- [ ] Dependencies & constraints listed

### Ambiguity Control
- [ ] No unresolved clarification questions before drafting
- [ ] No vague adjectives without metrics

### Scope & Risk
- [ ] Clear In/Out of Scope boundaries
- [ ] Risks & mitigations captured

### Research Integration
- [ ] All system research questions answered or converted to assumptions
- [ ] Optional external/context questions listed (manual) without blocking
```

**Pattern**: Nested sections (H3), checkbox format, grouped by quality dimension (5 categories)

Also includes "Quality Bar for 'Final' Spec (Pass Criteria)" section (Lines 204-218) with narrative pass/fail criteria.

#### Other Chatmodes - Implicit Quality Standards

**PAW-02A Code Researcher** mentions quality standards in narrative (no checkbox format):
- "Is Factual", "Is Precise", "Is Comprehensive", "Is Organized", "Is Traceable", "Is Neutral" (implied from Important notes section)

**PAW-02B Impl Planner**:
- "Success Criteria Guidelines" section (Line 305+) describes format
- "Important Guidelines" section (Lines 268-302) lists process quality

**PAW-03A Implementer**:
- "Verification Approach" section (Lines 65-83) describes automated vs manual criteria
- No explicit quality checklist for agent's own outputs

**PAW-01B, PAW-X**: No explicit quality checklists

### Naming Inconsistencies

#### Chatmode Filenames vs Titles vs Descriptions

| PAW Code | Filename | Title (H1) | Description (YAML) |
|----------|----------|------------|---------------------|
| PAW-01A | `Spec Agent` | `Spec Agent` | `Phased Agent Workflow: Spec Agent` |
| PAW-01B | `Spec Research Agent` | `Spec Research Agent` | `Phased Agent Workflow: Spec Research Agent` |
| PAW-02A | `Code Researcher` | `Codebase Researcher Agent` | `PAW Researcher agent` |
| PAW-02B | `Impl Planner` | `Implementation Planning Agent` | `PAW Implementation Planner Agent` |
| PAW-03A | `Implementer` | `Implementation Agent` | `PAW Implementation Agent` |
| PAW-X | `Status Update` | `Status Updater Agent` | `Phased Agent Workflow: Status Updater` |

**Inconsistencies Identified**:
1. **PAW-02A**: Three different names
   - Filename: "Code Researcher"
   - H1: "Codebase Researcher Agent"
   - Description: "PAW Researcher agent"

2. **PAW-02B**: Three different names
   - Filename: "Impl Planner"
   - H1: "Implementation Planning Agent"
   - Description: "PAW Implementation Planner Agent"

3. **PAW-03A**: Two different names
   - Filename: "Implementer"
   - H1 & Description: "Implementation Agent"

4. **PAW-X**: Two different names
   - Filename: "Status Update"
   - H1: "Status Updater Agent"

#### Agent References in paw-specification.md

From paw-specification.md (cross-reference):
- Stage 01: "Spec Agent", "Spec Research Agent"
- Stage 02: "Code Research Agent", "Implementation Plan Agent"
- Stage 03: "Implementation Agent", "Implementation Review Agent"
- Stage 04: "Documenter Agent"
- Stage 05: "PR Agent"
- Cross-stage: "Status Agent"

**Mismatches with Chatmode Filenames**:
- paw-specification.md says "Code Research Agent" but filename is "Code Researcher"
- paw-specification.md says "Implementation Plan Agent" but filename is "Impl Planner"
- paw-specification.md says "Status Agent" but filename is "Status Update"

### Artifact Path References

#### Canonical Paths (from paw-specification.md)

```
/docs/agents/<target_branch>/
  prompts/
    spec-research.prompt.md
    code-research.prompt.md
  Spec.md
  SpecResearch.md
  CodeResearch.md
  ImplementationPlan.md
  Docs.md
```

#### Path References in Chatmodes

**PAW-01A Spec Agent**:
- Line 161: `docs/agents/<branch>/SpecResearch.md` ✓ Uses plural "agents"
- Line 62: `docs/agents/<target_branch>/SpecResearch.md` ✓ Uses plural "agents"

**PAW-01B Spec Research Agent**:
- Line 62: `docs/agents/<target_branch>/SpecResearch.md` ✓ Uses plural "agents"

**PAW-02A Code Researcher**:
- Line 57: `docs/agent/description/YYYY-MM-DD-ENG-XXXX-research.md` ✗ Uses singular "agent"
- Uses date-ticket-description format, not canonical `CodeResearch.md`

**PAW-02B Impl Planner**:
- Line 137: `docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-plan.md` ✗ Uses singular "agent"
- Line 237: References `thoughts/allison/tickets/eng_XXXX.md` ✗ Non-PAW path structure
- Uses date-ticket-description format, not canonical `ImplementationPlan.md`

**PAW-X Status Update**:
- Line 10: Lists artifacts as `Spec.md, SpecResearch.md, CodeResearch.md, ImplPlan.md, Documentation.md`
  - ✗ Uses "ImplPlan.md" (abbreviated) instead of "ImplementationPlan.md"
  - ✗ Uses "Documentation.md" instead of "Docs.md"

**Summary**:
- **Consistent**: PAW-01A, PAW-01B use `docs/agents/` (plural)
- **Inconsistent**: PAW-02A, PAW-02B use `docs/agent/` (singular) with date-based naming
- **Abbreviated**: PAW-X uses "ImplPlan.md" and "Documentation.md"

### Stage Hand-off Patterns

#### Explicit Hand-offs with "Next: Invoke"

**PAW-01A Spec Agent - Line 254**:
```markdown
Next: Invoke Implementation Plan Agent (Stage 02). Optionally run Status Agent to update Issue.
```

**Pattern**: Explicit "Next: Invoke [Agent Name] (Stage ##)" statement at end of hand-off checklist.

#### Implicit Hand-offs or Missing

**PAW-01B Spec Research Agent**:
- Line 75: "Comment on the Issue with `**Spec Research Agent:** research ready → [link]`."
- No explicit "return to Spec Agent" statement

**PAW-02A Code Researcher**:
- Line 117-122: "Present findings" and "Ask if they have follow-up questions"
- No explicit "Next: Invoke [Agent]" statement

**PAW-02B Impl Planner**:
- Lines 249-263: "Review" section with "Please review it..." but no explicit "Next: Invoke Implementation Agent"

**PAW-03A Implementer**:
- Line 82: "Let me know when manual testing is complete so I can proceed to Phase [N+1]"
- No explicit hand-off to Documenter Agent after all phases complete

**PAW-X Status Update**:
- No hand-off statements (utility agent, invoked ad-hoc)

**Summary**: Only PAW-01A has explicit "Next: Invoke [Agent]" statement. Others have implicit coordination instructions or pause statements.

### Ambiguous Language Instances

#### "update" Usage Without Context

**PAW-01A Spec Agent**:
- Line 22: "update Issues" (context: what NOT to do)

**PAW-03A Implementer**:
- Line 47: "Update checkboxes in the plan" ✓ Clarified (checkboxes)
- Line 68: "Update your progress in both the plan and your todos" ✓ Clarified (progress, where)
- Line 88: "Update your progress..." (same pattern)

**PAW-X Status Update**:
- Line 12: "What to keep updated" (section heading)
- Line 75: "Updated Issue top comment" ✓ Clarified (dashboard)
- Line 76: "Updated PR body blocks" ✓ Clarified (what blocks)

**Analysis**: Most "update" usages in implementation files include clarifying context (what to update, where)

#### "comprehensive" Usage

**PAW-02A Code Researcher**:
- Line 44: "Perform comprehensive research" (section reference)
- Line 45: "COMPREHENSIVE RESEARCH section"
- Line 135: "## COMPREHENSIVE RESEARCH" (section heading)

**PAW-02B Impl Planner**:
- Line 26: "create a comprehensive plan"
- Line 78: "Perform COMPREHENSIVE RESEARCH steps"
- Line 84: "Perform comprehensive research"
- Line 359: "## COMPREHENSIVE RESEARCH" (section heading)

**Analysis**: "Comprehensive" is used as section reference with stopping conditions defined within those sections (research steps 1-3, success criteria)

#### "complete" Usage

**PAW-01A Spec Agent**:
- Line 13: "do not block spec completion" (context: optional questions)

**PAW-03A Implementer**:
- Line 13: "check for any existing checkmarks" (context: completed phases)
- Line 69: "Check off completed items" ✓ Clarified (checkboxes)
- Line 82: "when manual testing is complete" (requires human confirmation)

**PAW-02B Impl Planner**:
- Line 47: "complete understanding"
- Line 281: "Read all context files COMPLETELY"
- Line 295: "Mark planning tasks complete"
- Line 301: "The implementation plan must be complete and actionable" (defined: "zero open questions")

**Analysis**: "Complete" varies - sometimes means "finished" (checkboxes), sometimes "comprehensive" (file reading), sometimes "actionable without gaps" (plan quality)

#### "refine" Usage

**PAW-01A Spec Agent**:
- Line 56: "Refined spec" (mode description)
- Line 42: "iterative refinement" (quality checklist)

**PAW-02B Impl Planner**:
- Line 258: "Continue refining until the user is satisfied"

**Analysis**: "Refine" lacks stopping criteria beyond "user satisfaction" or implicit quality pass

#### "relevant" Usage

**PAW-02A Code Researcher**:
- Line 42: "architectural patterns are relevant"
- Line 76: "tags: [research, codebase, relevant-component-names]"
- Line 146: "Search for files containing relevant keywords"

**PAW-01B Spec Research Agent**:
- Line 57: "Any other relevant external/context knowledge"
- Line 69: "relevant code"

**Analysis**: "Relevant" is subjective, relies on agent judgment without explicit criteria

## Architecture Documentation

### Chatmode File Format

All chatmode files follow this structure:
1. YAML frontmatter (3 lines) with `description` field
2. H1 title (agent name)
3. Markdown sections using H2/H3 headers
4. Code fences for templates and examples
5. Checkbox lists for checklists
6. Bullet lists for guidelines
7. No explicit version numbers or dates in content (except templates)

### Common Patterns

**Pause Points**: Multiple chatmodes include explicit pause instructions
- PAW-01A:67: "Pause & Instruct: Instruct user to run Spec Research Agent"
- PAW-01A:238: "pause after writing the research prompt"
- PAW-03A:72: "**Pause for human verification**"
- PAW-03A:109: "If you aren't sure... pause and ask"

**File Reading Emphasis**: Strong emphasis on complete file reading
- PAW-02A:33: "IMPORTANT: Use the Read tool WITHOUT limit/offset parameters"
- PAW-02B:41: "CRITICAL: DO NOT proceed to research tasks before reading these files"
- PAW-02B:42: "NEVER read files partially"
- PAW-03A:15: "**Read files fully** - never use limit/offset parameters"

**GitHub MCP Tools**: Explicit tool instructions
- PAW-01A:261: "ALWAYS use the **github mcp** tools to interact with GitHub issues and PRs"
- PAW-02A:305: "Use the **github mcp** tools to interact with GitHub issues and PRs"
- PAW-03A:14: "include specs and GitHub Issues using `github mcp` tools"

## Code References

- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`: Complete structure with guardrails (lines 233-240), quality checklist (178-202), hand-off (254)
- `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`: Minimal guardrails (lines 66-71), behavioral focus
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`: Anti-evaluation guardrails (lines 8-14), 20+ DO NOT directives, path `docs/agent/` (line 57)
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`: Verification guardrails (line 77-78, 300-302), path `docs/agent/` (line 137)
- `.github/chatmodes/PAW-03A Implementer.chatmode.md`: Surgical change discipline (lines 109-110), pause points (72, 90)
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`: Empty (0 bytes)
- `.github/chatmodes/PAW-04 Documenter.chatmode.md`: Empty (0 bytes)
- `.github/chatmodes/PAW-05 PR.chatmode.md`: Empty (0 bytes)
- `.github/chatmodes/PAW-X Status Update.chatmode.md`: Idempotency guardrails (lines 67-70), abbreviated artifact names (line 10)
- `paw-specification.md`: Canonical agent names and artifact paths

## Open Questions

None - all research objectives completed with precise file:line references documented.
