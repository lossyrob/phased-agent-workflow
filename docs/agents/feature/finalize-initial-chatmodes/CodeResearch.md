---
date: 2025-10-11T22:41:14-04:00
git_commit: 7631cc44033b89641d63b878d39beeb8c7dd7d62
branch: feature/finalize-initial-chatmodes_plan
repository: lossyrob/strata-workflow
topic: "PAW Chatmode Structure and Alignment Analysis for Finalization Spec"
tags: [research, codebase, chatmodes, paw-workflow, humanlayer-patterns]
status: complete
last_updated: 2025-10-11
---

# Research: PAW Chatmode Structure and Alignment Analysis

**Date**: 2025-10-11T22:41:14-04:00  
**Git Commit**: 7631cc44033b89641d63b878d39beeb8c7dd7d62  
**Branch**: feature/finalize-initial-chatmodes_plan  
**Repository**: lossyrob/strata-workflow

## Research Question

How are the current PAW chatmode files structured, what proven guidance patterns exist in HumanLayer-derived chatmodes, and where do gaps exist that need to be filled to align all chatmodes with the finalization specification?

## Summary

The PAW system contains 9 chatmode files in varying states of completeness. Two chatmodes (PAW-02A Code Researcher and PAW-03A Implementer) are HumanLayer-derived with proven guidance patterns including CRITICAL sections, comprehensive DO NOT lists (8-12 items), IMPORTANT inline notes, numbered workflows, pause points, and conditional logic. Four chatmodes (PAW-01A, PAW-01B, PAW-02B, PAW-X) are first-pass implementations with some proven patterns but missing others. Three chatmodes (PAW-03B, PAW-04, PAW-05) are empty placeholders requiring creation from scratch.

Key findings:
- **Proven patterns** from HumanLayer chatmodes need systematic replication across all agents
- **Artifact path inconsistencies** exist: some chatmodes use `docs/agent/` while spec requires `docs/agents/` (plural)
- **YAML frontmatter** is only specified in PAW-02A; other chatmodes need templates added
- **Handoff clarity** is missing in most chatmodes - only PAW-01A has explicit next-stage statements
- **Code Researcher** emphasizes file:line references in 6+ locations, needs refactoring for behavioral focus while preserving proven patterns
- **Implementer** currently handles PR creation/pushing which should move to Impl Reviewer per the two-agent split

## Detailed Findings

### 1. HumanLayer-Derived Chatmodes (Proven Patterns)

#### PAW-02A Code Researcher (`.github/chatmodes/PAW-02A Code Researcher.chatmode.md`)

**Line Count**: 329 lines

**Proven Guidance Patterns Identified**:

1. **CRITICAL Section** (lines 8-15):
   - All-caps header: "CRITICAL: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY"
   - 10 DO NOT items in bullet format
   - Examples:
     - "DO NOT suggest improvements or changes unless the user explicitly asks for them"
     - "DO NOT perform root cause analysis unless the user explicitly asks for them"
     - "DO NOT propose future enhancements unless the user explicitly asks for them"
     - "DO NOT critique the implementation or identify problems"
     - "DO NOT recommend refactoring, optimization, or architectural changes"
     - "ONLY describe what exists, where it exists, how it works, and how components interact"

2. **Numbered Step-by-Step Workflow** (lines 28-132):
   - 9 main steps with clear sequential ordering
   - Sub-steps (bullets a, b, c) for detailed procedures
   - Examples:
     - Step 1: "Read any directly mentioned files first"
     - Step 4: "Ensure all research is complete and synthesize findings"
     - Step 6: "Generate research document"

3. **IMPORTANT/CRITICAL Inline Notes** (lines 31-33, 51, 311-322):
   - **IMPORTANT**: "Use the Read tool WITHOUT limit/offset parameters to read entire files"
   - **CRITICAL**: "Read these files yourself in the main context before spawning any sub-tasks"
   - **CRITICAL**: "You are a documentarian, not evaluators"
   - **REMEMBER**: "Document what IS, not what SHOULD BE"
   - **NO RECOMMENDATIONS**: "Only describe the current state of the codebase"

4. **Explicit "What not to do" Sections** (lines 237-250):
   - Comprehensive prohibitive guidance after Code Analysis section
   - 12 specific don'ts including:
     - "Don't guess about implementation"
     - "Don't make architectural recommendations"
     - "Don't analyze code quality or suggest improvements"
     - "Don't identify bugs, issues, or potential problems"
     - "Don't perform root cause analysis of any issues"

5. **Metadata Generation Instructions** (lines 54-65):
   - Explicit script to run: `scripts/copilot/spec-metadata.sh`
   - Detailed filename format with examples
   - YAML frontmatter structure with 8 required fields

6. **GitHub Permalinks Conditional Logic** (lines 105-110):
   - Check conditions before generating links
   - Specific git commands to verify state
   - URL template format

7. **Follow-up Research Handling** (lines 126-132):
   - Conditional workflow for appending to existing research
   - Frontmatter update instructions
   - Section naming convention

**Critical Ordering Emphasis** (lines 311-317):
- "ALWAYS read mentioned files first before performing research steps (step 1)"
- "ALWAYS exhaustively research steps before synthesizing (step 4)"
- "ALWAYS gather metadata before writing the document (step 5 before step 6)"
- "NEVER write the research document with placeholder values"

**File:Line Reference Emphasis** (6 occurrences):
- Line 51: "Include specific file paths and line numbers for reference"
- Line 97: "Description of what exists ([file.ext:line](link))"
- Line 185: "Analyze implementation details, trace data flow, and explain technical workings with precise file:line references"
- Line 229: "Always include file:line references for claims"
- Line 280: "Include file:line references"
- Line 311: "Focus on finding concrete file paths and line numbers for developer reference"

#### PAW-03A Implementer (`.github/chatmodes/PAW-03A Implementer.chatmode.md`)

**Line Count**: 129 lines

**Proven Guidance Patterns Identified**:

1. **Conditional Response Logic** (lines 12-34):
   - Two distinct invocation scenarios with different workflows:
     - "When given just a plan path:" (lines 12-18)
     - "When also given a PR with review comments:" (lines 20-34)
   - Clear branching based on inputs

2. **File Reading Discipline** (lines 14-16):
   - "**Read files fully** - never use limit/offset parameters, you need complete context"
   - "Think deeply about how the pieces fit together"

3. **Branch Setup Validation** (lines 36-39):
   - Pre-work verification steps
   - Branch naming conventions enforced
   - Multi-phase range handling

4. **Implementation Philosophy Section** (lines 41-59):
   - Guides judgment and adaptation
   - Clear mismatch handling with formatted template
   - Emphasis on communication when plan diverges from reality

5. **Pause Points for Human Verification** (lines 72-82, 85-93):
   - Two formatted output templates:
     - "Phase [N] Complete - Ready for Manual Verification"
     - "Addressed Review Comments - Ready for Re-Review"
   - Explicit lists of automated checks passed
   - Clear instructions for manual verification
   - Wait directive before proceeding

6. **Commit Hygiene Guidance** (lines 95-97):
   - "ONLY commit changes you made to implement the plan"
   - "Do not include unrelated changes"
   - "If you aren't sure if a change is related, pause and ask"

7. **PR Commenting Convention** (lines 99-100):
   - Prefix requirement: `**Implementation Agent:**`
   - Context for clear attribution

8. **Resuming Work Protocol** (lines 107-112):
   - Trust completed work
   - Pick up from first unchecked item
   - Verify only if something seems off

**Current PR Creation Responsibility** (line 71):
- "Use github mcp tools to push the changes to the PR or create a new PR if none exists, providing a detailed PR description"
- **Note**: This should move to Implementation Review Agent per spec

**No CRITICAL Section**: Unlike PAW-02A, this chatmode lacks an all-caps CRITICAL header with DO NOT items at the top.

**No Numbered Workflow**: Steps are embedded in conditional logic and verification sections but not explicitly numbered 1-9.

### 2. First-Pass Chatmodes (Partial Proven Patterns)

#### PAW-01A Spec Agent (`.github/chatmodes/PAW-01A Spec Agent.chatmode.md`)

**Line Count**: 214 lines

**Existing Proven Patterns**:

1. **Explicit Non-Responsibilities Section** (lines 32-39):
   - Clear statements of what agent does NOT do
   - Examples:
     - "Git add/commit/push operations"
     - "No Planning PR creation"
     - "No posting comments / status to GitHub Issues or PRs"

2. **Working Modes Table** (lines 40-45):
   - Structured conditional logic
   - Clear triggers and outputs for each mode

3. **Numbered Workflow** (lines 47-90):
   - 8 detailed steps with sub-bullets
   - Quality bar guidance embedded

4. **Guardrails Section** (lines 178-193):
   - Uses "NEVER" and "ALWAYS" prefixes
   - 8 guardrail items covering common mistakes
   - Examples:
     - "NEVER: fabricate answers not supported by Issue, SpecResearch, or user-provided external sources"
     - "NEVER: proceed to final spec if unanswered **critical** internal or external factual questions remain"
     - "ALWAYS: pause after writing the research prompt until research results (or explicit skips) are provided"

5. **Hand-off Checklist** (lines 195-209):
   - Explicit "Next: Invoke Implementation Plan Agent (Stage 02)" (line 205)
   - Formatted checklist with artifact references

**Missing Proven Patterns**:
- No all-caps CRITICAL section at top
- No comprehensive DO NOT list (8-12 items) in one place (scattered across sections)
- Few IMPORTANT/CRITICAL inline notes (only in guardrails)
- No explicit "What not to do" section after major procedures
- No YAML frontmatter template for output artifacts

**Artifact Path Reference** (lines 86-87):
- References `docs/agents/<target_branch>/Spec.md` ✓ (correct per spec)
- References `prompts/spec-research.prompt.md` (missing `docs/agents/<target_branch>/` prefix)

#### PAW-01B Spec Research Agent (`.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`)

**Line Count**: 97 lines

**Existing Proven Patterns**:

1. **Method Section with Numbered Steps** (lines 18-31):
   - 6 steps with clear sequential ordering
   - Conditional logic for external search availability

2. **Guardrails Section** (lines 91-97):
   - 6 prohibitive statements
   - Examples:
     - "No proposals, refactors, 'shoulds'"
     - "No speculative external claims; every external statement must cite a source"
     - "Distinguish clearly between internal evidence and external sources"

**Missing Proven Patterns**:
- No all-caps CRITICAL section
- No comprehensive DO NOT list (only 6 guardrail items)
- No IMPORTANT/CRITICAL inline notes
- No explicit "What not to do" section
- No pause points with formatted output templates
- No YAML frontmatter template for output artifact

**Artifact Path Reference** (line 85):
- References `docs/agents/<target_branch>/SpecResearch.md` ✓ (correct per spec)

**Handoff Statement** (line 99):
- References "Coordinator hooks" with Issue comment, but no explicit "Return to Spec Agent" handoff

#### PAW-02B Impl Planner (`.github/chatmodes/PAW-02B Impl Planner.chatmode.md`)

**Line Count**: 521 lines (longest chatmode)

**Existing Proven Patterns**:

1. **Numbered Process Steps** (lines 18-271):
   - 4 major steps with extensive sub-steps
   - Step-by-step workflow through planning process

2. **Important Guidelines Section** (lines 273-310):
   - 6 guideline categories with bullet points
   - Emphasis on being "Skeptical", "Interactive", "Thorough", "Practical"
   - "No Open Questions in Final Plan" (lines 302-310) - strong prohibition

3. **Success Criteria Guidelines** (lines 312-346):
   - Detailed separation of Automated vs Manual verification
   - Format example provided

4. **Common Patterns Section** (lines 348-372):
   - Reusable templates for different change types

5. **COMPREHENSIVE RESEARCH Section** (lines 374-521):
   - Identical to PAW-02A's research methodology
   - "What not to do" lists embedded (lines 484-497)

**Missing Proven Patterns**:
- No all-caps CRITICAL section at top
- No explicit DO NOT list (8-12 items) as a section
- Few IMPORTANT/CRITICAL inline notes (scattered throughout)
- No pause points with formatted output templates
- No handoff statement to next agent
- No YAML frontmatter template for output artifact

**Artifact Path Issues** (lines 137, 247, 249):
- Uses `docs/agent/` (singular) instead of `docs/agents/` (plural) ✗
- Example: `docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-plan.md`
- **Inconsistent with PAW specification requirement**: `docs/agents/<target_branch>/ImplementationPlan.md`

#### PAW-X Status Update (`.github/chatmodes/PAW-X Status Update.chatmode.md`)

**Line Count**: 76 lines (shortest non-empty chatmode)

**Existing Proven Patterns**:

1. **What to keep updated Section** (lines 10-46):
   - Clear enumeration of responsibilities
   - Structured block format with markers

2. **Guardrails Section** (lines 54-57):
   - 3 prohibitive statements
   - Idempotency requirement

**Missing Proven Patterns**:
- No all-caps CRITICAL section
- No comprehensive DO NOT list
- No IMPORTANT/CRITICAL inline notes
- No numbered workflow
- No explicit "What not to do" section
- No pause points
- Very minimal structure compared to proven chatmodes

**No Artifact Path References**: Status agent reads but doesn't write workflow artifacts.

### 3. Empty Chatmodes (Require Creation)

#### PAW-03B Impl Reviewer (`.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`)

**Line Count**: 0 lines (empty file)

**Required Content Per Spec**:
- CRITICAL section with 8+ DO NOT items
- Numbered workflow (5+ steps)
- 3+ IMPORTANT notes
- "What not to do" section
- Pause point before opening Phase PR
- Conditional logic: "When invoked post-implementation" vs "When responding to PR review comments"
- Artifact path reference: `docs/agents/<target_branch>/ImplementationPlan.md`
- Phase PR creation workflow (branch naming, title format, description template)
- DO NOT items:
  - "DO NOT make functional code changes unless addressing review comments"
  - Others related to staying in review/documentation role

#### PAW-04 Documenter (`.github/chatmodes/PAW-04 Documenter.chatmode.md`)

**Line Count**: 0 lines (empty file)

**Required Content Per Spec**:
- CRITICAL section with 8+ DO NOT items (e.g., "DO NOT suggest code changes", "DO NOT reimplement features")
- Numbered workflow (5+ steps)
- 3+ IMPORTANT notes
- "What not to do" section emphasizing documentation-only role
- Output path: `docs/agents/<target_branch>/Docs.md`
- Documentation components: API reference, user guide, architectural overview, change summary
- Pause point before opening Docs PR
- Handoff statement: "Next: Invoke PR Agent (PAW-05)"
- YAML frontmatter template for `Docs.md`

#### PAW-05 PR (`.github/chatmodes/PAW-05 PR.chatmode.md`)

**Line Count**: 0 lines (empty file)

**Required Content Per Spec**:
- CRITICAL section with 8+ DO NOT items (e.g., "DO NOT merge PRs", "DO NOT skip validation checks")
- Numbered workflow (5+ steps): validate phase PRs merged, consolidate docs, create final PR, add description
- 3+ IMPORTANT notes
- PR title format based on target branch
- PR description template sections: Overview, Changes Summary, Testing Notes, Documentation, References
- Validation checklist: all phase PRs merged, tests passing, docs updated, no merge conflicts
- Pause point after PR creation
- DO NOT item: "DO NOT merge the PR — human approval required"

### 4. Artifact Path Analysis

#### Current Path Usage by Chatmode:

| Chatmode | Artifact Written | Current Path | Spec Requirement | Status |
|----------|-----------------|--------------|------------------|--------|
| PAW-01A | spec-research.prompt.md | `prompts/spec-research.prompt.md` | `docs/agents/<target_branch>/prompts/spec-research.prompt.md` | ✗ Missing prefix |
| PAW-01A | Spec.md | `docs/agents/<target_branch>/Spec.md` | `docs/agents/<target_branch>/Spec.md` | ✓ Correct |
| PAW-01B | SpecResearch.md | `docs/agents/<target_branch>/SpecResearch.md` | `docs/agents/<target_branch>/SpecResearch.md` | ✓ Correct |
| PAW-02A | code-research.prompt.md | `docs/agent/{description}/prompts/...` (implied) | `docs/agents/<target_branch>/prompts/code-research.prompt.md` | ✗ Wrong format |
| PAW-02A | CodeResearch.md | `docs/agent/description/YYYY-MM-DD-ENG-XXXX-research.md` | `docs/agents/<target_branch>/CodeResearch.md` | ✗ Wrong format |
| PAW-02B | ImplementationPlan.md | `docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-plan.md` | `docs/agents/<target_branch>/ImplementationPlan.md` | ✗ Wrong format |
| PAW-03A | N/A (reads plan) | N/A | N/A | N/A |
| PAW-03B | N/A (creates PRs) | N/A | N/A | N/A |
| PAW-04 | Docs.md | Not specified (empty) | `docs/agents/<target_branch>/Docs.md` | ✗ Missing |
| PAW-05 | N/A (creates final PR) | N/A | N/A | N/A |

**Key Issues**:
1. PAW-02A and PAW-02B use `docs/agent/` (singular) with custom subdirectory naming
2. PAW-01A uses relative `prompts/` path without full prefix
3. PAW-02A uses date-based filenames instead of fixed artifact names
4. PAW-04 is empty so path not yet specified

### 5. YAML Frontmatter Analysis

#### Current Frontmatter Specification:

**PAW-02A Code Researcher** (lines 68-79) - **ONLY chatmode with frontmatter template**:
```yaml
---
date: [Current date and time with timezone in ISO format]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
topic: "[User's Question/Topic]"
tags: [research, codebase, relevant-component-names]
status: complete
last_updated: [Current date in YYYY-MM-DD format]
---
```

**Spec Requirements for Non-Code-Research Artifacts**:
- Required fields: `date`, `target_branch`, `status`, `last_updated`, `summary`
- Optional fields: `tags`, `issue`
- Status values: `draft`, `in-review`, `approved`, `complete`
- Use `summary` field (one-sentence description) instead of `topic`
- Exclude `git_commit` and `repository` fields (unique to Code Research)

**Chatmodes Missing Frontmatter Templates**:
- PAW-01A: Should specify template for `Spec.md`
- PAW-01B: Should specify template for `SpecResearch.md`
- PAW-02B: Should specify template for `ImplementationPlan.md`
- PAW-04: Should specify template for `Docs.md` (when created)

### 6. Cross-Stage Handoff Analysis

#### Current Handoff Statements:

| Chatmode | Current Handoff | Spec Requirement | Status |
|----------|----------------|------------------|--------|
| PAW-01A | "Next: Invoke Implementation Plan Agent (Stage 02). Optionally run Status Agent to update Issue." (line 205) | ✓ Matches | ✓ Complete |
| PAW-01B | "Comment on the Issue with `**Spec Research Agent:** research ready → [link]`." (line 99) | "Return to Spec Agent with this research." | ✗ Wrong direction |
| PAW-02A | None explicit | "Next: Invoke Implementation Plan Agent (PAW-02B)." | ✗ Missing |
| PAW-02B | None explicit | "Next: Invoke Implementation Agent (PAW-03A) for Phase [N]." | ✗ Missing |
| PAW-03A | "Phase [N] Complete - Ready for Manual Verification" (line 73) | "Phase [N] Complete - Handoff to Implementation Review Agent (PAW-03B)." | ✗ Incomplete |
| PAW-03B | Not created | "Phase [N] PR created. Next: Continue with Implementation Agent (PAW-03A) for Phase [N+1] or proceed to Documenter Agent (PAW-04) if all phases complete." | ✗ Missing |
| PAW-04 | Not created | "Docs PR created. Next: Invoke PR Agent (PAW-05) to create final PR." | ✗ Missing |
| PAW-05 | Not created | "Final PR created. Ready for human review and merge." | ✗ Missing |
| PAW-X | None explicit | "Describes when it should be invoked (stage transitions)" | ✗ Missing |

**Summary**: Only PAW-01A has proper handoff statement. All other chatmodes need explicit next-stage instructions added.

### 7. Code Researcher Line-Number Focus Analysis

**Current Emphasis on file:line References** (PAW-02A):

1. **Step 4 - Synthesize findings** (line 51): "Include specific file paths and line numbers for reference"

2. **Document template** (line 97): "Description of what exists ([file.ext:line](link))"

3. **Code Analysis subtitle** (line 185): "Analyze implementation details, trace data flow, and explain technical workings with precise file:line references"

4. **Important Guidelines** (line 229): "**Always include file:line references** for claims"

5. **Code Pattern Finder** (line 280): "Include file:line references"

6. **Important notes** (line 311): "Focus on finding concrete file paths and line numbers for developer reference"

**Issue Identified**:
The emphasis on "line numbers" appears 6 times and is reinforced as a requirement. Per Issue #1, this focus may burden the Code Researcher when gathering behavioral understanding for specification purposes, as opposed to implementation planning purposes.

**Sections That Need Adjustment**:
- Guidance should shift from "include file:line for every claim" to "cite file paths for key components but focus on WHAT the system does behaviorally"
- Maintain file:line citations for entry points and major integration points
- De-emphasize exhaustive line-by-line mapping
- Preserve all DO NOT items and CRITICAL/IMPORTANT notes (don't remove proven guidance)

### 8. Implementer/Reviewer Split Analysis

**Current PAW-03A Responsibilities That Should Move to PAW-03B**:

1. **PR Creation** (line 71):
   - "Use github mcp tools to push the changes to the PR or create a new PR if none exists"
   - Should be: Implementation Review Agent creates/updates Phase PRs

2. **PR Description Writing** (line 71):
   - "providing a detailed PR description that references the plan and any relevant issues"
   - Should be: Implementation Review Agent writes PR descriptions

**Current PAW-03A Responsibilities to Keep**:

1. **Code Implementation** (lines 12-18, 20-34):
   - Making functional changes per plan
   - Addressing review comments with code changes

2. **Automated Verification** (lines 65-69):
   - Running success criteria checks
   - Fixing issues before handoff

3. **Commit Creation** (lines 33, 70, 95-97):
   - Making commits for changes
   - Commit hygiene discipline

**Responsibilities for New PAW-03B** (per spec):

1. **Review Implementation Agent's Work**:
   - Suggest improvements to code quality
   - Check alignment with plan

2. **Add Documentation**:
   - Generate docstrings
   - Add code comments for clarity/maintainability

3. **PR Management**:
   - Push implementation branch
   - Create Phase PRs with descriptions
   - Respond to review comments
   - Make overall summary comments

4. **Conditional Logic Required**:
   - "When invoked post-implementation" (review and document)
   - "When responding to PR review comments" (review changes and reply)

**DO NOT Items Needed**:
- PAW-03A: "DO NOT generate docstrings or code comments — Implementation Review Agent handles that"
- PAW-03A: "DO NOT open Phase PRs — Implementation Review Agent handles that"
- PAW-03B: "DO NOT make functional code changes unless addressing review comments — Implementation Agent handles that"

## Code References

- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` - 214 lines, first-pass with some proven patterns
- `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md` - 97 lines, first-pass with partial proven patterns
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` - 329 lines, HumanLayer-derived with full proven patterns
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` - 521 lines, first-pass with extensive content but missing proven patterns
- `.github/chatmodes/PAW-03A Implementer.chatmode.md` - 129 lines, HumanLayer-derived with proven patterns but needs split alignment
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` - 0 lines, empty placeholder
- `.github/chatmodes/PAW-04 Documenter.chatmode.md` - 0 lines, empty placeholder
- `.github/chatmodes/PAW-05 PR.chatmode.md` - 0 lines, empty placeholder
- `.github/chatmodes/PAW-X Status Update.chatmode.md` - 76 lines, minimal first-pass
- `paw-specification.md` - PAW workflow specification defining all stages and artifacts
- `docs/agents/feature/finalize-initial-chatmodes/Spec.md` - Finalization specification with detailed requirements
- `docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md` - Research on current state and external best practices

## Architecture Documentation

### Proven Guidance Pattern Architecture

The HumanLayer-derived chatmodes (PAW-02A, PAW-03A) demonstrate a consistent architectural pattern for AI agent guidance:

1. **Constraint Layer** (Top):
   - CRITICAL section with all-caps emphasis
   - Comprehensive DO NOT lists (8-12 items)
   - Role boundary statements
   - Purpose: Prevent common mistakes through explicit prohibition

2. **Workflow Layer** (Middle):
   - Numbered sequential steps (5-10 steps)
   - Sub-steps with bullets
   - Conditional logic for different invocation scenarios
   - Purpose: Provide clear execution path

3. **Quality Layer** (Throughout):
   - IMPORTANT/CRITICAL inline notes
   - "What not to do" sections after procedures
   - Pause points with formatted outputs
   - Purpose: Reinforce discipline at critical junctures

4. **Context Layer** (Supporting):
   - File reading discipline (read fully, no partial reads)
   - Metadata generation instructions
   - Error/edge handling guidance
   - Purpose: Ensure complete understanding before action

This architecture creates multiple reinforcing layers of guidance that have proven effective in production use.

### Current Artifact Flow Architecture

```
Stage 01 (Specification):
  PAW-01A Spec Agent
    → writes: prompts/spec-research.prompt.md (needs path fix)
    → writes: Spec.md (needs frontmatter template)
  
  PAW-01B Spec Research Agent
    → reads: prompts/spec-research.prompt.md
    → writes: SpecResearch.md (needs frontmatter template)

Stage 02 (Implementation Plan):
  PAW-02A Code Researcher
    → reads: Spec.md, SpecResearch.md
    → writes: CodeResearch.md (needs path fix: docs/agent/ → docs/agents/)
    → may write: prompts/code-research.prompt.md (needs path fix)
  
  PAW-02B Impl Planner
    → reads: CodeResearch.md
    → writes: ImplementationPlan.md (needs path fix + frontmatter template)
    → opens: Planning PR (<target_branch>_plan → <target_branch>)

Stage 03 (Phased Implementation):
  PAW-03A Implementer
    → reads: ImplementationPlan.md
    → makes: code changes
    → (currently creates PRs - should handoff to 03B instead)
  
  PAW-03B Impl Reviewer (EMPTY - needs creation)
    → reads: ImplementationPlan.md
    → reviews: code changes from 03A
    → adds: docstrings and comments
    → opens/updates: Phase PRs (<target_branch>_phase<N> → <target_branch>)

Stage 04 (Documentation):
  PAW-04 Documenter (EMPTY - needs creation)
    → reads: Spec.md, ImplementationPlan.md, all Phase PRs
    → writes: Docs.md (needs frontmatter template)
    → opens: Docs PR (<target_branch>_docs → <target_branch>)

Stage 05 (Final PR):
  PAW-05 PR Agent (EMPTY - needs creation)
    → reads: all Phase PRs, Docs.md
    → validates: all prerequisites complete
    → opens: Final PR (<target_branch> → main)

Cross-Stage:
  PAW-X Status Update
    → reads: all artifacts and PRs
    → updates: GitHub Issue with status
    → maintains: PR summaries
```

### Gap Analysis Summary

**High Priority Gaps**:
1. **Path Standardization**: PAW-02A and PAW-02B use `docs/agent/` instead of `docs/agents/<target_branch>/`
2. **Empty Chatmodes**: PAW-03B, PAW-04, PAW-05 need complete creation with all proven patterns
3. **Frontmatter Templates**: Missing in PAW-01A, PAW-01B, PAW-02B, PAW-04
4. **Handoff Statements**: Missing in PAW-01B, PAW-02A, PAW-02B, PAW-03A, PAW-03B, PAW-04, PAW-05, PAW-X

**Medium Priority Gaps**:
1. **CRITICAL Sections**: Missing in PAW-01A, PAW-01B, PAW-02B, PAW-03A, PAW-X
2. **DO NOT Lists**: Incomplete or scattered in PAW-01A, PAW-01B, PAW-02B, PAW-X
3. **Pause Points**: Missing in PAW-01B, PAW-02B, PAW-X
4. **Code Researcher Refactor**: Reduce line-number emphasis while preserving proven patterns

**Low Priority Gaps**:
1. **Consistency**: Formatting, terminology, section ordering across all chatmodes
2. **Examples**: More concrete examples in some first-pass chatmodes

## Open Questions

None. All research objectives completed:
- ✓ HumanLayer-derived chatmode patterns extracted and documented
- ✓ First-pass chatmodes analyzed for gaps
- ✓ Empty chatmodes confirmed
- ✓ Artifact paths mapped and inconsistencies identified
- ✓ Cross-stage handoffs analyzed
- ✓ YAML frontmatter usage documented
- ✓ Code Researcher line-number emphasis analyzed
- ✓ Implementer/Reviewer split alignment issues identified
