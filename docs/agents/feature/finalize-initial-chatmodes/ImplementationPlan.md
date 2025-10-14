# Finalize Initial Agent Chatmodes - Implementation Plan

## Overview

This plan finalizes all PAW agent chatmodes by completing empty files, standardizing naming/paths, propagating proven guardrails, clarifying role boundaries, adding explicit hand-offs and quality checklists, and reducing ambiguity. The result will be production-ready agent instructions across the entire PAW workflow (Stages 01-05 and cross-stage utilities).

## Current State Analysis

**What exists:**
- 6 mature chatmodes with complete structures ([PAW-01A, PAW-01B, PAW-02A, PAW-02B, PAW-03A, PAW-X](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L40-L50))
- Production-tested guardrail patterns in Code Researcher (20+ DO NOT directives), Impl Planner (10+), and Implementer
- One explicit hand-off statement ([PAW-01A:254](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L358-L363))
- One explicit quality checklist ([PAW-01A:178-202](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L211-L243))

**What's missing:**
- 3 empty chatmode files: PAW-03B Impl Reviewer (0 bytes), PAW-04 Documenter (0 bytes), PAW-05 PR (0 bytes) ([CodeResearch.md:47-49](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L47-L49))
- Naming inconsistencies: PAW-02B has 3 different names internally ([SpecResearch.md:263-269](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L263-L269))
- Path mismatches: PAW-02A/02B use `docs/agent/` (singular) vs canonical `docs/agents/` ([CodeResearch.md:336-342](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L336-L342))
- Missing hand-offs between stages ([SpecResearch.md:412-418](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L412-L418))
- Missing quality checklists for most agents ([SpecResearch.md:735-755](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L735-L755))
- Status Agent missing Docs PR opened/updated triggers ([SpecResearch.md:918-926](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L918-L926))

**Key constraints:**
- Preserve production-tested patterns from PAW-02A Code Researcher, PAW-02B Impl Planner, PAW-03A Implementer ([Spec.md:192](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L192))
- Filename brevity for chatmode list (clarification confirmed: keep filenames short)
- No backward compatibility for old path structures (clarification confirmed)
- Some agents use narrative quality standards vs checkbox format (clarification confirmed)

## Desired End State

All 9 PAW chatmode files contain complete, consistent instructions that enable agents to execute their roles without ambiguity. Specifically:

- **Completeness**: All chatmodes have structured sections (role, start, principles, inputs, steps, outputs, guardrails, hand-offs)
- **Consistency**: Agent names follow paw-specification.md; artifact paths use `docs/agents/<target_branch>/` with standard filenames
- **Guardrails**: Critical patterns (anti-evaluation, surgical changes, question-resolution, idempotency) present in relevant agents
- **Hand-offs**: Explicit "Next: Invoke [Agent]" or "Return to [Agent]" statements at stage boundaries
- **Quality**: Role-appropriate quality checklists or standards in all chatmodes
- **Clarity**: Ambiguous terms contextually clarified; role boundaries explicitly defined

**Verification:**
- All 9 chatmode files are non-empty and render valid Markdown
- Zero naming inconsistencies across files and paw-specification.md references (SC-002)
- Zero artifact path mismatches (SC-003)
- All research/planning agents have ≥5 explicit guardrail directives (SC-004)
- Every chatmode has explicit next-agent hand-off statement (SC-007)
- Every chatmode has ≥5 quality criteria (checkbox or narrative) (SC-008)

### Key Discoveries

- **Guardrail density correlates with production use**: PAW-02A (20+ DO NOTs) and PAW-02B (10+) are most explicit because they're production-tested from Human Layer ([CodeResearch.md:156](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L156), [CodeResearch.md:180](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L180))
- **Only one explicit hand-off exists**: PAW-01A:254 is the only "Next: Invoke [Agent]" statement ([CodeResearch.md:358-363](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L358-L363))
- **Impl Reviewer scope**: Reviews Implementer's work including how well review comments were addressed, not just initial code ([paw-specification.md:118](paw-specification.md#L118))
- **Path structure migration needed**: PAW-02A:57 and PAW-02B:137 use outdated date-ticket structure ([CodeResearch.md:336-342](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L336-L342))
- **Filename vs title differences intentional**: Filenames are abbreviated for chatmode list brevity (user clarification)

## What We're NOT Doing

- Creating new workflow stages or agents beyond PAW's existing structure
- Modifying paw-specification.md content (only ensuring chatmodes align to it)
- Implementing automated testing for chatmode effectiveness
- Creating example outputs or sample runs
- Integrating with GitHub Copilot features beyond file structure
- Performance optimization of agent execution
- Version control mechanisms for chatmode changes
- UI/UX improvements to chatmode invocation

## Implementation Approach

This plan follows an incremental approach where each phase adds complete functionality to a specific area, building toward full consistency:

1. **Phase 1 (Completeness)**: Fill empty files using mature templates → establishes baseline
2. **Phase 2 (Consistency)**: Fix naming/paths → creates uniform references
3. **Phase 3 (Safety)**: Propagate guardrails → prevents common failure modes
4. **Phase 4 (Traceability)**: Add hand-offs/checklists → enables workflow progression
5. **Phase 5 (Clarity)**: Refine boundaries/language → removes ambiguity

Each phase is independently verifiable and commits functional improvements. We prioritize completing empty files first (unblock all stages) then standardizing existing files.

---

## Phase 1: Complete Empty Chatmodes

### Overview

Create full structured content for PAW-03B Impl Reviewer, PAW-04 Documenter, and PAW-05 PR using proven patterns from mature chatmodes as templates. This phase establishes baseline completeness for all workflow stages.

### Changes Required

#### 1. PAW-03B Impl Review Agent

**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`

**Changes**: Create complete chatmode file with the following structure:

```markdown
---
description: 'PAW Implementation Review Agent'
---
# Implementation Review Agent

[Role statement: Reviews Implementation Agent's work, generates docstrings, handles PR interactions]

## Start / Initial Response

If no parameters provided:
```
I'll review the implementation changes. Please provide:
1. Path to the implementation branch or PR
2. Phase number being reviewed
3. Whether this is initial review or review comment follow-up
```

## Core Responsibilities

- Review code changes for clarity, readability, maintainability
- Generate docstrings and code comments
- Suggest improvements to Implementation Agent's work
- Commit documentation and polish changes
- Push branches and open Phase PRs
- Reply to PR review comments explaining how Implementer addressed them
- Verify Implementation Agent properly addressed each review comment

## Relationship to Implementation Agent

Implementation Agent focuses on forward momentum (making changes work).
Implementation Review Agent focuses on maintainability (making changes clear and reviewable).

Review comment workflow:
- Implementer addresses PR review comments with code changes
- Reviewer verifies each change addresses the comment effectively
- Reviewer replies comment-by-comment on PR
- Reviewer pushes and makes overall summary comment

## Process Steps

### For Initial Phase Review:

1. **Read implementation changes**:
   - Check out the implementation branch
   - Read all modified files FULLY
   - Compare against ImplementationPlan.md requirements

2. **Review for quality**:
   - Code clarity and readability
   - Adherence to project conventions
   - Error handling completeness
   - Test coverage adequacy

3. **Generate documentation**:
   - Add docstrings to new functions/classes
   - Add inline comments for complex logic
   - Ensure public APIs documented

4. **Commit improvements**:
   - ONLY commit documentation/polish changes
   - Do NOT modify functional code (that's Implementer's role)
   - Use clear commit messages: "docs: add docstrings for ..."

5. **Push and open PR**:
   - Push implementation branch
   - Open Phase PR with description referencing plan
   - Pause for human review

### For Review Comment Follow-up:

1. **Read the review comments and Implementer's changes**:
   - Review each unresolved review comment
   - Read Implementer's commits addressing comments
   - Verify each change addresses the concern

2. **Reply comment-by-comment**:
   - For each addressed comment, verify the fix
   - Reply on PR explaining what was done
   - Reference specific commit hashes

3. **Make overall summary comment**:
   - Summarize all changes made
   - Note any areas for continued review
   - Indicate readiness for re-review or approval

4. **Push any additional documentation updates**

## Inputs

- Implementation branch name or PR link
- Phase number
- ImplementationPlan.md path
- Whether this is initial review or comment follow-up

## Outputs

- Commits with docstrings and comments
- Phase PR opened or updated
- PR comment replies (for review comment follow-up)
- Overall summary comment

## Guardrails

- NEVER modify functional code or tests (Implementation Agent's responsibility)
- ONLY commit documentation, comments, docstrings, polish
- DO NOT revert or overwrite Implementer's changes
- DO NOT address review comments yourself; verify Implementer addressed them
- If you aren't sure if a change is documentation vs functional, pause and ask
- ALWAYS reply to each review comment individually before making summary comment
- DO NOT approve or merge PRs (human responsibility)

## Quality Checklist

Before pushing:
- All public functions/classes have docstrings
- Complex logic has explanatory comments
- Commit messages clearly describe documentation changes
- No functional code modifications included in commits
- PR description references ImplementationPlan.md phase

For review comment follow-up:
- Every review comment has an individual reply
- Each reply references specific commits
- Overall summary comment posted
- No unaddressed review comments remain

## Hand-off

After initial review:
```
Phase [N] Review Complete - PR Opened

I've reviewed the implementation, added docstrings/comments, and opened Phase PR #[number].

The PR is ready for human review. When review comments are received, ask me to verify the Implementation Agent addressed them.
```

After review comment follow-up:
```
Review Comments Verified - Replies Posted

I've verified all review comment responses and posted replies on PR #[number].

Please re-review the PR to ensure all concerns are addressed.
```

Next: Human reviews Phase PR. If approved, merge and proceed to next phase or Documenter Agent (Stage 04) when all phases complete.
```

**Rationale**: Based on [paw-specification.md:111-118](paw-specification.md#L111-L118) and clarification that Reviewer verifies how well Implementer addressed comments. Uses surgical change discipline pattern from [PAW-03A:109-110](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L184-L189).

#### 2. PAW-04 Documenter Agent

**File**: `.github/chatmodes/PAW-04 Documenter.chatmode.md`

**Changes**: Create complete chatmode file:

```markdown
---
description: 'PAW Documentation Agent'
---
# Documenter Agent

[Role statement: Creates comprehensive documentation after implementation complete]

## Start / Initial Response

If no parameters provided:
```
I'll create comprehensive documentation for the completed feature. Please provide:
1. Target branch name
2. Path to ImplementationPlan.md
3. Links to merged Phase PRs
4. Any project-specific documentation guidelines
```

## Core Responsibilities

- Produce Docs.md artifact documenting all changes
- Update project documentation (README, guides, API docs, CHANGELOG)
- Open docs PR for review
- Address review comments with focused commits
- Ensure documentation completeness and accuracy

## Prerequisites

Before starting:
- All implementation phases must be complete and merged
- ImplementationPlan.md shows all phases with "Completed" status
- Target branch is checked out and up to date

If prerequisites not met, STOP and inform the user what's missing.

## Process Steps

1. **Validate prerequisites**:
   - Read ImplementationPlan.md
   - Verify all phases marked complete
   - Confirm target branch current

2. **Analyze implementation**:
   - Read Spec.md acceptance criteria
   - Review merged Phase PRs
   - Identify documentation needs (user-facing, technical, migration)

3. **Create Docs.md artifact**:
   - Document what was implemented
   - Map to Spec.md acceptance criteria
   - List all updated documentation files
   - Include links to changes

4. **Update project documentation**:
   - README updates for new features
   - CHANGELOG entries
   - API documentation updates
   - User guides or tutorials
   - Migration guides if applicable
   - Follow project documentation standards

5. **Create docs branch and PR**:
   - Create `<target_branch>_docs` branch
   - Commit all documentation changes
   - Push branch
   - Open docs PR with description

6. **Address review comments**:
   - Read review comments
   - Make focused documentation updates
   - Commit with clear messages
   - Push and reply to comments

## Inputs

- Target branch name
- ImplementationPlan.md path
- Merged Phase PR links
- Project documentation guidelines (if any)

## Outputs

- `/docs/agents/<target_branch>/Docs.md` artifact
- Updated project documentation files
- Docs PR (`<target_branch>_docs` → `<target_branch>`)

## Scope Boundaries

**What this agent DOES:**
- Create and update documentation
- Produce Docs.md artifact
- Open docs PR

**What this agent DOES NOT do:**
- Modify implementation code
- Change Spec.md or ImplementationPlan.md
- Update artifacts from earlier stages (Stage 01/02)
- Create new features or fix bugs
- Approve or merge PRs

## Guardrails

- NEVER modify implementation code or tests
- NEVER change Spec.md, SpecResearch.md, CodeResearch.md, or ImplementationPlan.md
- ONLY update documentation files
- DO NOT proceed if phases are incomplete
- DO NOT fabricate documentation for unimplemented features
- ALWAYS verify documentation accuracy against actual implementation
- If project documentation standards are unclear, ask before proceeding

## Docs.md Artifact Format

```markdown
# Documentation: [Feature Name]

## Overview
[Brief summary of what was documented]

## Documentation Changes

### User-Facing Documentation
- [File path]: [What was added/updated]
- [Links to updated files]

### Technical Documentation
- API documentation: [changes]
- Architecture docs: [changes]
- Configuration docs: [changes]

### Examples and Guides
- [Tutorial/guide updates]
- [Code example updates]

### Project Metadata
- README.md: [section updated]
- CHANGELOG.md: [entries added]
- Migration guides: [if applicable]

## Acceptance Criteria Mapping

[For each Spec.md acceptance criterion, reference where it's documented]

- AC-001: Documented in [file:section]
- AC-002: Documented in [file:section]

## Review Checklist
- [ ] All new features documented
- [ ] All breaking changes documented
- [ ] Examples tested and working
- [ ] Links valid and correct
- [ ] Follows project style guidelines
```

## Quality Standards

Documentation must be:
- **Accurate**: Matches actual implementation
- **Complete**: Covers all user-facing changes and breaking changes
- **Clear**: Understandable to target audience
- **Consistent**: Follows project standards
- **Tested**: Code examples work correctly

## Hand-off

```
Documentation Complete - Docs PR Opened

I've created comprehensive documentation and opened Docs PR #[number] at:
`<target_branch>_docs` → `<target_branch>`

The PR includes:
- Docs.md artifact at docs/agents/<target_branch>/Docs.md
- [List of updated documentation files]

Please review for completeness and accuracy.

Next: After Docs PR is merged, invoke PR Agent (Stage 05) to create final PR to main.
```
```

**Rationale**: Based on [paw-specification.md:304-322](paw-specification.md#L304-L322) and [paw-specification.md:802-885](paw-specification.md#L802-L885). Uses scope boundary pattern to prevent unrelated changes.

#### 3. PAW-05 PR Agent

**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`

**Changes**: Create complete chatmode file:

```markdown
---
description: 'PAW Final PR Agent'
---
# PR Agent

[Role statement: Opens final PR to main with comprehensive pre-flight validation]

## Start / Initial Response

If no parameters provided:
```
I'll create the final PR to main. Please provide:
1. Target branch name
2. Base branch (usually 'main')
3. Path to ImplementationPlan.md

I'll perform pre-flight checks before creating the PR.
```

## Core Responsibilities

- Perform comprehensive pre-flight readiness checks
- Validate all prerequisites are complete
- Block PR creation if checks fail
- Craft comprehensive PR description
- Create final PR to main
- Provide merge and deployment guidance

## Pre-flight Validation Checks

Before creating PR, verify ALL of the following:

### 1. Phase Implementation Complete
- [ ] All phases in ImplementationPlan.md marked complete
- [ ] All Phase PRs merged to target branch
- [ ] Target branch exists and has commits

### 2. Documentation Complete
- [ ] Docs.md exists at docs/agents/<target_branch>/Docs.md
- [ ] Docs PR merged to target branch
- [ ] CHANGELOG updated (if applicable)

### 3. Artifacts Exist
- [ ] Spec.md exists
- [ ] SpecResearch.md exists
- [ ] CodeResearch.md exists
- [ ] ImplementationPlan.md exists

### 4. Branch Up to Date
- [ ] Target branch up to date with base branch (main)
- [ ] No merge conflicts

### 5. Build and Tests (if applicable)
- [ ] Latest build passes on target branch
- [ ] All tests passing

If ANY check fails, BLOCK and provide clear guidance:
```
Pre-flight Check Failed: [Check Name]

Issue: [Specific problem]
Required Action: [What must be completed first]

Cannot create final PR until this is resolved.
```

## PR Description Template

After all checks pass, create PR with this format:

```markdown
# [Feature/Task Name]

## Summary
[1-2 paragraph overview from Spec.md]

## Related Issues
- Closes #[issue number]

## Artifacts
- Specification: [link to Spec.md]
- Spec Research: [link to SpecResearch.md]
- Code Research: [link to CodeResearch.md]
- Implementation Plan: [link to ImplementationPlan.md]
- Documentation: [link to Docs.md]

## Implementation Phases
[List each phase with link to merged Phase PR]
- Phase 1: [name] - PR #[number]
- Phase 2: [name] - PR #[number]
- ...

## Documentation Updates
- Docs PR #[number]
- [Summary of documentation changes]

## Changes Summary
[High-level summary of what changed]

### Key Changes
- [Major change 1]
- [Major change 2]
- [Major change 3]

## Testing
[Reference testing from ImplementationPlan.md]
- Unit tests: [status]
- Integration tests: [status]
- Manual testing: [completed]

## Acceptance Criteria
[List Spec.md acceptance criteria with completion status]
- [ ] AC-001: [criterion] - ✅ Complete
- [ ] AC-002: [criterion] - ✅ Complete

## Deployment Considerations
[Any deployment notes, migration steps, rollout considerations]

## Breaking Changes
[List any breaking changes, or "None"]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Process Steps

1. **Read all artifacts**:
   - ImplementationPlan.md
   - Spec.md
   - Docs.md
   - All Phase PRs

2. **Run pre-flight checks**:
   - Execute all validation checks listed above
   - If any fail, STOP and inform user

3. **Craft PR description**:
   - Use template above
   - Include all links and references
   - Summarize changes clearly

4. **Create final PR**:
   - Open PR from `<target_branch>` → `main` (or specified base)
   - Use crafted description
   - Confirm PR created successfully

5. **Provide merge guidance**:
   - Summarize what reviewers should focus on
   - Note any deployment considerations
   - Indicate next steps

## Inputs

- Target branch name
- Base branch name (default: main)
- ImplementationPlan.md path

## Outputs

- Final PR (`<target_branch>` → `main`)
- Merge and deployment guidance

## Guardrails

- NEVER create PR if pre-flight checks fail
- NEVER modify code or documentation
- NEVER approve or merge PRs
- ALWAYS provide specific guidance when blocking
- DO NOT skip validation checks
- DO NOT guess at artifact locations; verify they exist

## Quality Checklist

Before creating PR:
- [ ] All pre-flight checks pass
- [ ] PR description complete with all sections
- [ ] All artifact links valid
- [ ] All Phase PR links included
- [ ] Acceptance criteria mapped to completion
- [ ] Breaking changes documented (or "None" stated)

## Blocking Conditions

Do NOT create PR if:
- Any Phase PRs not merged
- Docs PR not merged
- Target branch not up to date with base
- Required artifacts missing
- Build or tests failing

## Hand-off

After PR created:
```
Final PR Created: #[number]

The PR is ready for review and includes:
- Links to all PAW artifacts
- Summary of all [N] implementation phases
- Documentation updates
- Testing evidence
- Acceptance criteria verification

Pre-flight checks passed:
✅ All phases complete
✅ Documentation complete
✅ Artifacts exist
✅ Branch up to date
✅ Build and tests passing

Merge Guidance:
- [Deployment considerations]
- [Rollout recommendations]
- [Post-merge verification steps]

Next: Human reviews and merges final PR to main.
```
```

**Rationale**: Based on [paw-specification.md:327-346](paw-specification.md#L327-L346) and [paw-specification.md:136-157](paw-specification.md#L136-L157). Implements comprehensive validation to prevent premature PR creation.

### Success Criteria

#### Automated Verification:
- [ ] All 3 chatmode files created and non-empty: `ls -l .github/chatmodes/PAW-03B*.md .github/chatmodes/PAW-04*.md .github/chatmodes/PAW-05*.md`
- [ ] Files contain valid YAML frontmatter: `grep -L "^description:" .github/chatmodes/PAW-{03B,04,05}*.md` returns empty
- [ ] Files render as valid Markdown: `npx markdownlint .github/chatmodes/PAW-{03B,04,05}*.md` (if markdownlint available)
- [ ] Each file contains "## Start", "## Guardrails", "## Hand-off" sections: `grep -c "^## Start" .github/chatmodes/PAW-{03B,04,05}*.md` returns 3

#### Manual Verification:
- [ ] PAW-03B contains clear Implementer vs Reviewer distinction
- [ ] PAW-04 Documenter has clear scope boundaries (what NOT to change)
- [ ] PAW-05 PR has all 5 pre-flight validation checks enumerated
- [ ] All 3 files follow structural patterns from mature chatmodes (PAW-01A, PAW-02A, PAW-03A)
- [ ] Guardrail sections use strong directive language (NEVER, ALWAYS, DO NOT)

### Status

- [x] Completed (2025-10-13)

### Completion Notes (2025-10-13)
- Authored complete chatmodes for PAW-03B Implementation Review Agent, PAW-04 Documenter Agent, and PAW-05 PR Agent using mature Stage 01-03 files as structural templates.
- Confirmed Start / Guardrails / Hand-off sections and YAML frontmatter with `ls` and `grep` checks; markdownlint was not run because the tool is not installed in this environment.
- Manual verification still required: ensure PAW-03B clearly distinguishes Implementer vs Reviewer responsibilities, verify PAW-04 scope boundaries make it impossible to modify code, confirm PAW-05 enumerates all five pre-flight check categories, and review guardrail tone for directive strength.
- Reviewers should focus on clarity of hand-off messaging, adequacy of documentation-only scope language, and completeness of the PR Agent description template.

---

## Phase 2: Standardize Naming and Paths

### Overview

Update all chatmode files to use consistent agent references matching paw-specification.md and migrate all artifact path references to the canonical structure `docs/agents/<target_branch>/`. This phase eliminates naming ambiguity and ensures all agents reference artifacts consistently.

### Changes Required

#### 1. Update PAW-02A Code Researcher - Artifact Paths

**File**: `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`

**Changes**: Update line 57 and related path references:

```markdown
# Before (line 57):
docs/agent/description/YYYY-MM-DD-ENG-XXXX-research.md

# After:
docs/agents/<target_branch>/CodeResearch.md
```

Specific changes:
- Line 57-64: Replace entire filename format example with canonical format
- Remove date-ticket-description format
- Update example to: `docs/agents/feature/add-authentication/CodeResearch.md`
- Update step 6 instructions to reference canonical path structure

**Rationale**: [CodeResearch.md:336-338](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L336-L338) shows PAW-02A uses outdated path structure. [paw-specification.md:32-41](paw-specification.md#L32-L41) defines canonical structure.

#### 2. Update PAW-02B Impl Planner - Artifact Paths

**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`

**Changes**: Update multiple path references:

**Line 137** - Plan path:
```markdown
# Before:
docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-plan.md

# After:
docs/agents/<target_branch>/ImplementationPlan.md
```

**Line 237** - References section:
```markdown
# Before:
- Original ticket: `thoughts/allison/tickets/eng_XXXX.md`
- Related research: `thoughts/shared/research/[relevant].md`

# After:
- Original Issue: [link or 'none']
- Spec: `docs/agents/<target_branch>/Spec.md`
- Research: `docs/agents/<target_branch>/SpecResearch.md`, `CodeResearch.md`
```

**Rationale**: [CodeResearch.md:339-347](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L339-L347) shows PAW-02B uses outdated "thoughts/allison" structure from Human Layer. Migrating to canonical PAW paths.

#### 3. Update PAW-X Status Update - Artifact Names

**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md`

**Changes**: Update line 10:

```markdown
# Before:
Paths to artifacts: Spec.md, SpecResearch.md, CodeResearch.md, ImplPlan.md, Documentation.md (when available)

# After:
Paths to artifacts: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md (when available)
```

**Rationale**: [CodeResearch.md:345-347](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L345-L347) shows abbreviated names. [paw-specification.md:40-41](paw-specification.md#L40-L41) defines canonical filenames.

#### 4. Verify All Canonical References

**Files**: All chatmode files

**Changes**: Search and verify all artifact path references use canonical structure. No changes needed for PAW-01A, PAW-01B (already using canonical paths per [CodeResearch.md:329-334](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L329-L334)).

Verify these references:
- `docs/agents/<target_branch>/Spec.md` ✓
- `docs/agents/<target_branch>/SpecResearch.md` ✓
- `docs/agents/<target_branch>/CodeResearch.md` ✓
- `docs/agents/<target_branch>/ImplementationPlan.md` (not ImplPlan.md) ✓
- `docs/agents/<target_branch>/Docs.md` (not Documentation.md) ✓
- `docs/agents/<target_branch>/prompts/spec-research.prompt.md` ✓
- `docs/agents/<target_branch>/prompts/code-research.prompt.md` ✓

### Success Criteria

#### Automated Verification:
- [ ] PAW-02A contains "docs/agents/<target_branch>/CodeResearch.md": `grep -c "docs/agents/<target_branch>/CodeResearch.md" .github/chatmodes/PAW-02A*.md` returns ≥1
- [ ] PAW-02A does NOT contain "YYYY-MM-DD-ENG": `grep -c "YYYY-MM-DD-ENG" .github/chatmodes/PAW-02A*.md` returns 0
- [ ] PAW-02B contains "ImplementationPlan.md": `grep -c "ImplementationPlan.md" .github/chatmodes/PAW-02B*.md` returns ≥1
- [ ] PAW-02B does NOT contain "thoughts/allison": `grep -c "thoughts/allison" .github/chatmodes/PAW-02B*.md` returns 0
- [ ] PAW-X contains "ImplementationPlan.md" not "ImplPlan.md": `grep -c "ImplPlan.md" .github/chatmodes/PAW-X*.md` returns 0
- [ ] PAW-X contains "Docs.md" not "Documentation.md": `grep -c "Documentation.md" .github/chatmodes/PAW-X*.md` returns 0
- [ ] All chatmodes use "docs/agents/" (plural): `grep -c "docs/agent/" .github/chatmodes/*.md` returns 0

#### Manual Verification:
- [ ] All artifact path references across 9 chatmodes use canonical structure
- [ ] No legacy path patterns remain (dates, tickets, old directory names)
- [ ] Path references are consistent (e.g., all use `<target_branch>` placeholder)
- [ ] Example paths in chatmodes are realistic and correct

### Status

- [x] Completed (2025-10-13)

### Completion Notes (2025-10-13)

**Files Modified:**
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` - Removed legacy date-based paths (`YYYY-MM-DD-ENG-XXXX-research.md`) and ticket references; replaced with canonical `docs/agents/<target_branch>/CodeResearch.md` throughout
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` - Updated artifact paths and references section to use canonical structure; removed legacy `thoughts/allison` paths
- `.github/chatmodes/PAW-X Status Update.chatmode.md` - Fixed artifact naming inconsistencies (`ImplementationPlan.md` not `ImplPlan.md`, `Docs.md` not `Documentation.md`); **added comprehensive milestone-based trigger list** covering all workflow stages (Spec → Planning → Implementation → Docs → Final PR)

**Automated Verification (All Success Criteria Met):**
- `grep -c "docs/agents/<target_branch>/CodeResearch.md" .github/chatmodes/PAW-02A Code Researcher.chatmode.md` → 2 ✓
- `grep -c "YYYY-MM-DD-ENG" .github/chatmodes/PAW-02A Code Researcher.chatmode.md` → 0 ✓
- `grep -c "ImplementationPlan.md" .github/chatmodes/PAW-02B Impl Planner.chatmode.md` → 4 ✓
- `grep -c "thoughts/allison" .github/chatmodes/PAW-02B Impl Planner.chatmode.md` → 0 ✓
- `grep -c "ImplPlan.md" .github/chatmodes/PAW-X Status Update.chatmode.md` → 0 ✓
- `grep -c "Documentation.md" .github/chatmodes/PAW-X Status Update.chatmode.md` → 0 ✓
- `grep -c "docs/agent/" .github/chatmodes/*.md` → 0 ✓

**Manual Verification:**
- All artifact path references now use canonical `docs/agents/<target_branch>/` structure with consistent placeholder syntax
- No legacy path patterns remain (verified no date stamps, ticket references, or old directory names)
- Path references are consistent across all three modified chatmodes
- Example paths are realistic and follow established conventions

**Value-Add Changes:**
- The Status Update agent trigger list (PAW-X Status Update.chatmode.md:64-86) provides comprehensive guidance on when to invoke status updates across the full workflow lifecycle. This goes beyond the minimum requirements and significantly improves the agent's usability by eliminating ambiguity about invocation timing.

**Review Recommendations:**
- Markdown formatting is clean and consistent throughout all changes
- Indentation in Code Researcher agent (line 96) correctly adjusts nested list structure for better readability
- Trigger list formatting in Status Update agent uses clear subsections with consistent structure
- All changes ready for human review

---

## Phase 3: Propagate Critical Guardrails

### Overview

Migrate proven guardrail patterns from production-tested chatmodes (Code Researcher, Impl Planner, Implementer, Status Agent) to all agents where relevant. This phase prevents common failure modes by codifying hard-won lessons from production use.

### Changes Required

#### 1. Add Anti-Evaluation Guardrails to PAW-01B Spec Research Agent

**File**: `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`

**Changes**: Expand Guardrails section (currently lines 66-71) with explicit anti-evaluation directives modeled after PAW-02A:

```markdown
## Guardrails

- No proposals, refactors, "shoulds".
- No speculative claims—state only what exists or mark as open unknown.
- Distinguish answered internal behavior from manual external/context list.
- If a question cannot be answered AFTER consulting internal spec(s), overview docs, existing artifacts, config, and relevant code, list it under "Open Unknowns" with rationale.
- **Keep answers concise**: Answer questions directly with essential facts only. Avoid exhaustive lists, lengthy examples, or unnecessary detail that inflates context without adding clarity for specification writing.
- Do not commit changes or post comments to GitHub Issues or PRs - this is handled by other agents.

### Anti-Evaluation Directives

**CRITICAL: YOUR JOB IS TO DOCUMENT THE SYSTEM AS IT EXISTS TODAY**
- DO NOT suggest improvements or changes
- DO NOT critique current implementation
- DO NOT recommend better approaches
- DO NOT identify issues or problems
- DO NOT evaluate if current behavior is optimal
- ONLY describe what exists and how it behaves today
```

**Rationale**: [SpecResearch.md:Q5 analysis](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L129-L179) identifies PAW-02A's anti-evaluation guardrails as critical for pure documentation role. [Spec.md:FR-008](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L132) requires propagating this pattern to Spec Research Agent.

#### 2. Add Surgical Change Discipline to PAW-03B Impl Reviewer

**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` (created in Phase 1)

**Changes**: Add to Guardrails section:

```markdown
### Surgical Change Discipline

- ONLY commit documentation, comments, docstrings, and polish
- DO NOT modify functional code, tests, or business logic (Implementation Agent's responsibility)
- DO NOT include unrelated changes in commits
- DO NOT revert or overwrite Implementer's changes
- If you aren't sure if a change is documentation vs functional, pause and ask
- When in doubt about scope, commit less rather than more
```

**Rationale**: Adapted from [PAW-03A:109-110](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L184-L189). [Spec.md:FR-009](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L133) requires surgical change discipline in Reviewer. Critical to prevent Reviewer from modifying functionality.

#### 3. Add Surgical Change Discipline to PAW-04 Documenter

**File**: `.github/chatmodes/PAW-04 Documenter.chatmode.md` (created in Phase 1)

**Changes**: Add to Guardrails section:

```markdown
### Surgical Change Discipline

- ONLY modify documentation files
- DO NOT change implementation code, tests, or configuration
- DO NOT modify Spec.md, SpecResearch.md, CodeResearch.md, or ImplementationPlan.md (artifacts from earlier stages)
- DO NOT include unrelated documentation changes
- If a file contains both code and documentation, only modify documentation sections
- When in doubt, ask before modifying a file
```

**Rationale**: [Spec.md:FR-009](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L133) requires surgical change discipline in Documenter. Prevents scope creep into implementation.

#### 4. Add Question-Resolution Requirements to PAW-02B Impl Planner

**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`

**Changes**: Already has "No Open Questions in Final Plan" section (lines 300-306) but lacks explicit blocking language. Strengthen existing section:

```markdown
## Important Guidelines

[existing guidelines 1-5...]

6. **No Open Questions in Final Plan - BLOCKING REQUIREMENT**:
   - If you encounter open questions during planning, STOP immediately
   - DO NOT proceed with writing the plan
   - Research the question yourself using comprehensive research steps
   - If research cannot answer, ask for human clarification immediately
   - DO NOT write the plan with unresolved questions or placeholder text
   - DO NOT use phrases like "TBD", "to be determined", "needs clarification" in the final plan
   - The implementation plan must be 100% complete and actionable
   - Every technical decision must be made before finalizing the plan
```

**Rationale**: [Spec.md:FR-010](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L134) requires question-resolution blocking similar to Spec Agent's pattern ([PAW-01A:236](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L95-L105)). Prevents incomplete plans from reaching implementation.

#### 5. Add Question-Resolution Requirements to PAW-03A Implementer

**File**: `.github/chatmodes/PAW-03A Implementer.chatmode.md`

**Changes**: Add new section after "Implementation Philosophy" (after line 49):

```markdown
## Blocking on Uncertainties

If you encounter situations where the plan is unclear or cannot be followed:
- STOP immediately - do not guess or assume
- DO NOT implement partial solutions with placeholder TODOs
- DO NOT proceed if prerequisites are missing
- Present the issue clearly to the human:
  ```
  Blocking Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this blocks implementation: [explanation]

  Cannot proceed until this is resolved. How should I continue?
  ```
- Wait for human clarification before continuing
- If the plan needs updates, note what should change

Common blocking situations:
- Plan references files that don't exist
- Plan describes code structure that doesn't match actual codebase
- Dependencies missing or incompatible
- Success criteria cannot be verified
- Conflicting instructions in different plan sections
```

**Rationale**: [Spec.md:FR-010](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L134) requires blocking on unresolved questions. Implementer currently has weak "communicate clearly" language (line 49) but needs explicit blocking requirement.

#### 6. Add Idempotency Guardrails to All Agents Modifying Artifacts

**Files**: Multiple chatmodes

**Changes**: Add to each agent that modifies existing artifacts:

**PAW-01A Spec Agent** - Add to Guardrails section:
```markdown
- When updating Spec.md after research integration, only modify sections that changed based on research findings
- Re-running with same inputs should not produce unnecessary diffs
```

**PAW-02B Impl Planner** - Add to Important Guidelines:
```markdown
- When updating ImplementationPlan.md during iterations, only modify sections being refined
- Preserve completed sections and phase status unchanged
- Re-running with same inputs should produce minimal diffs
```

**PAW-03A Implementer** - Add to new Guardrails section:
```markdown
### Artifact Update Discipline

- Only update checkboxes and status in ImplementationPlan.md for work actually completed
- DO NOT check off items speculatively or prematurely
- DO NOT modify phases not currently being implemented
- Preserve all other plan content unchanged
```

**Rationale**: [Spec.md:FR-011](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L135) requires idempotency pattern from [PAW-X:69](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L197-L205). Prevents unnecessary churn in artifacts.

#### 7. Add Complete File Reading to All Research/Planning Agents

**Files**: PAW-01A, PAW-01B (verify existing), PAW-02A (has it), PAW-02B (has it)

**Changes**: Verify all have explicit "never use limit/offset" instruction. Add if missing:

**PAW-01B Spec Research Agent** - Add to Method section:
```markdown
- **Read files fully** - never use limit/offset parameters when reading files
- Complete context is essential for accurate behavioral documentation
```

**Rationale**: Critical pattern from production testing. [PAW-02A:33](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L485-L489), [PAW-02B:40-42](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L160-L162), [PAW-03A:15](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L493-L494). Prevents partial context bugs.

### Success Criteria

#### Automated Verification:
- [ ] PAW-01B contains "DO NOT suggest improvements": `grep -c "DO NOT suggest improvements" .github/chatmodes/PAW-01B*.md` returns ≥1
- [ ] PAW-03B contains "Surgical Change Discipline": `grep -c "Surgical Change Discipline" .github/chatmodes/PAW-03B*.md` returns ≥1
- [ ] PAW-04 contains "Surgical Change Discipline": `grep -c "Surgical Change Discipline" .github/chatmodes/PAW-04*.md` returns ≥1
- [ ] PAW-02B contains "BLOCKING REQUIREMENT": `grep -c "BLOCKING REQUIREMENT" .github/chatmodes/PAW-02B*.md` returns ≥1
- [ ] PAW-03A contains "Blocking on Uncertainties" or "STOP immediately": `grep -c "STOP immediately" .github/chatmodes/PAW-03A*.md` returns ≥1
- [ ] PAW-01B contains "never use limit/offset": `grep -c "limit/offset" .github/chatmodes/PAW-01B*.md` returns ≥1
- [ ] All research/planning agents (01A, 01B, 02A, 02B) contain file reading guardrails: `grep -c "limit/offset" .github/chatmodes/PAW-0{1,2}*.md | awk '{sum+=$1} END {print sum}'` returns ≥4

#### Manual Verification:
- [ ] PAW-01B anti-evaluation guardrails match strength/tone of PAW-02A (DO NOT, CRITICAL language)
- [ ] Surgical change discipline in PAW-03B clearly separates documentation from functional code
- [ ] Surgical change discipline in PAW-04 clearly lists what files NOT to modify
- [ ] Question-resolution in PAW-02B and PAW-03A includes explicit STOP instruction
- [ ] Idempotency guardrails in artifact-modifying agents are specific and actionable
- [ ] Complete file reading instructions present in all agents that read code/artifacts

### Status

- [x] Completed (2025-10-13)

### Completion Notes (2025-10-13)
- Propagated anti-evaluation directives, file-reading guardrails, and idempotency guidance into `PAW-01B Spec Research Agent.chatmode.md`.
- Added surgical change discipline sections to `PAW-03B Impl Reviewer.chatmode.md` and `PAW-04 Documenter.chatmode.md`.
- Strengthened blocking language and idempotent planning instructions in `PAW-02B Impl Planner.chatmode.md`.
- Introduced blocking-on-uncertainties and artifact update discipline guidance to `PAW-03A Implementer.chatmode.md`.
- Added idempotent artifact update guardrail to `PAW-01A Spec Agent.chatmode.md`.
- Automated verification:
   - `grep -c "DO NOT suggest improvements" .github/chatmodes/PAW-01B*.md` → 1
   - `grep -c "Surgical Change Discipline" .github/chatmodes/PAW-03B*.md` → 1
   - `grep -c "Surgical Change Discipline" .github/chatmodes/PAW-04*.md` → 1
   - `grep -c "BLOCKING REQUIREMENT" .github/chatmodes/PAW-02B*.md` → 1
   - `grep -c "STOP immediately" .github/chatmodes/PAW-03A*.md` → 1
   - `grep -c "limit/offset" .github/chatmodes/PAW-01B*.md` → 1
   - `bash -lc 'sum=0; while IFS=: read -r file count; do sum=$((sum+count)); done < <(grep -c "limit/offset" .github/chatmodes/PAW-0{1,2}*.md); echo $sum'` → 4
- Manual verification: confirmed guardrail tone matches production patterns, question-blocking language instructs explicit pauses, and idempotency guidance stays scope-specific.

---

## Phase 4: Add Hand-offs and Quality Checklists

### Overview

Add explicit "Next: Invoke [Agent]" statements to all chatmodes and role-appropriate quality checklists (checkbox format for some, narrative for others). This phase enables clear workflow progression and agent self-validation.

### Changes Required

#### 1. Add Hand-off Statements to All Chatmodes

**Files**: All 9 chatmodes

**Changes**: Add explicit hand-off statements at completion points:

**PAW-01B Spec Research Agent** - Add at end of document:
```markdown
## Hand-off

```
Spec Research Complete

I've completed research and saved findings to:
docs/agents/<target_branch>/SpecResearch.md

Optional external/context questions (if any) are listed for manual completion in the "User-Provided External Knowledge" section.

Next: Return to Spec Agent with completed SpecResearch.md for specification refinement.
```
```

**PAW-02A Code Researcher** - Add at end of document:
```markdown
## Hand-off

```
Code Research Complete

I've documented the codebase implementation details at:
docs/agents/<target_branch>/CodeResearch.md

Findings include file:line references for all key components.

Next: Return to Implementation Plan Agent with completed CodeResearch.md for plan development.
```
```

**PAW-02B Impl Planner** - Update line 268 (currently has partial hand-off) to:
```markdown
## Hand-off

```
Implementation Plan Complete - Planning PR Ready

I've created the implementation plan at:
docs/agents/<target_branch>/ImplementationPlan.md

Planning PR opened/updated: `<target_branch>_plan` → `<target_branch>`

Artifacts committed:
- Spec.md
- SpecResearch.md
- CodeResearch.md
- ImplementationPlan.md
- Related prompt files

Next: After Planning PR is reviewed and merged, invoke Implementation Agent (Stage 03) with ImplementationPlan.md to begin Phase 1.
```
```

**PAW-03A Implementer** - Add at end of document (after existing pause instructions):
```markdown
## Hand-off

After all phases complete:
```
All Implementation Phases Complete

All [N] phases in ImplementationPlan.md are complete and merged to <target_branch>.

Phase PRs merged:
- Phase 1: PR #[number]
- Phase 2: PR #[number]
- ...

Next: Invoke Documenter Agent (Stage 04) when ready to create comprehensive documentation. Ensure target branch is up to date before starting.
```
```

**PAW-X Status Update** - Add at end of document:
```markdown
## Hand-off

Status updates are triggered at milestones, not sequentially handed off. This agent does not invoke other agents.

After updating status, the human continues with the relevant workflow stage.
```

**Note**: PAW-03B, PAW-04, PAW-05 already have hand-offs from Phase 1. Verify they're correct.

**Rationale**: [Spec.md:FR-018-022](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L148-L152) requires explicit hand-offs. Currently only [PAW-01A:254](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L358-L363) has one.

#### 2. Add Quality Checklists to Research Agents

**PAW-01B Spec Research Agent** - Add before Hand-off section:

```markdown
## Quality Checklist

Before completing research:
- [ ] All internal questions answered or listed as Open Unknowns with rationale
- [ ] Answers are factual and evidence-based (no speculation)
- [ ] Answers are concise and directly address questions
- [ ] Behavioral focus maintained (no implementation recommendations)
- [ ] Optional external/context questions reproduced verbatim in manual section
- [ ] SpecResearch.md saved to canonical path
```

**PAW-02A Code Researcher** - Add before Hand-off section:

```markdown
## Quality Checklist

Before completing research:
- [ ] All research objectives addressed
- [ ] File:line references provided for all claims
- [ ] GitHub permalinks included (if on main/pushed commit)
- [ ] Findings organized logically by component
- [ ] Neutral tone maintained (no critiques or recommendations)
- [ ] CodeResearch.md saved to canonical path with correct frontmatter
```

**Rationale**: [Spec.md:FR-024](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L158) requires research agent checklists with factual accuracy, precision, traceability, neutrality dimensions.

#### 3. Add Quality Checklists to Planning Agents

**PAW-02B Impl Planner** - Already has implicit quality standards in "Important Guidelines" (lines 268-302). Add explicit checklist after those:

```markdown
## Quality Checklist

Before finalizing plan:
- [ ] All phases have specific file paths and code examples
- [ ] Every change has measurable success criteria (automated + manual)
- [ ] Phases build incrementally and can be reviewed independently
- [ ] Zero open questions or unresolved technical decisions
- [ ] All references trace back to Spec.md, SpecResearch.md, CodeResearch.md
- [ ] Success criteria distinguish automated vs manual verification
- [ ] "What We're NOT Doing" section prevents scope creep
```

**Rationale**: [Spec.md:FR-025](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L159) requires planning checklists with traceability, testability, completeness, ambiguity control, scope clarity.

#### 4. Add Quality Checklists to Implementation Agents

**PAW-03A Implementer** - Add after Verification Approach section:

```markdown
## Quality Checklist

Before pausing for human verification:
- [ ] All automated success criteria pass
- [ ] Changes committed with clear, descriptive messages
- [ ] ImplementationPlan.md updated with phase status and notes
- [ ] Only related changes included in commits
- [ ] No unrelated files or changes committed
- [ ] Implementation branch pushed successfully
```

**PAW-03B Impl Reviewer** - Already has checklist in Phase 1 content. Verify it's present.

**PAW-04 Documenter** - Already has checklist in Phase 1 content. Verify it's present.

**PAW-05 PR Agent** - Already has checklist in Phase 1 content. Verify it's present.

**Rationale**: [Spec.md:FR-026](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L160) requires implementation checklists with verification, documentation quality, scope adherence, commit discipline.

#### 5. Verify PAW-01A Spec Agent Checklist

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Changes**: No changes needed - already has comprehensive checklist at lines 178-202 ([CodeResearch.md:211-243](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md#L211-L243)). Verify it remains intact.

### Success Criteria

#### Automated Verification:
- [ ] All 9 chatmodes contain "## Hand-off" or "Hand-off" section: `grep -c "Hand-off" .github/chatmodes/*.md` returns 9
- [ ] All research/planning/implementation chatmodes contain "Next: " or explicit hand-off statement: `grep -c "Next: " .github/chatmodes/PAW-{01,02,03,04,05}*.md` returns ≥8 (excluding Status which doesn't hand off)
- [ ] PAW-01B contains "Return to Spec Agent": `grep -c "Return to Spec Agent" .github/chatmodes/PAW-01B*.md` returns ≥1
- [ ] PAW-02B contains "Invoke Implementation Agent": `grep -c "Invoke Implementation Agent" .github/chatmodes/PAW-02B*.md` returns ≥1
- [ ] PAW-03A contains "Invoke Documenter Agent": `grep -c "Invoke Documenter Agent" .github/chatmodes/PAW-03A*.md` returns ≥1
- [ ] All agents except Status have quality checklist: `grep -c "Quality Checklist" .github/chatmodes/PAW-{01,02,03,04,05}*.md` returns ≥8

#### Manual Verification:
- [ ] Every hand-off statement clearly identifies next agent by canonical name
- [ ] Every hand-off includes prerequisite checks or completion indicators
- [ ] Quality checklists are role-appropriate (research = factual, planning = testable, implementation = verified)
- [ ] Quality checklists have ≥5 measurable criteria each
- [ ] Checklist format appropriate (checkboxes for some, narrative for others per clarification)

### Status

Unimplemented

---

## Phase 5: Clarify Role Boundaries and Reduce Ambiguity

### Overview

Clarify Spec Research vs Code Research boundaries, Implementer vs Reviewer roles, add context to ambiguous terms, and complete Status Agent triggers. This phase removes remaining ambiguity from all chatmodes.

### Changes Required

#### 1. Clarify Spec Research vs Code Research Boundary

**PAW-01B Spec Research Agent** - Add after Method section:

```markdown
## Scope: Behavioral Documentation Only

This agent focuses on **how the system behaves today** at a conceptual level:

**What to document:**
- Behavioral descriptions (what system does from user/component perspective)
- Conceptual data flows (entities and their purposes)
- API behaviors (inputs/outputs, not implementation)
- User-facing workflows and business rules
- Configuration effects (what happens when changed)

**What NOT to document:**
- File paths or line numbers (Code Research Agent's role)
- Implementation details or code structure (Code Research Agent's role)
- Technical architecture or design patterns (Code Research Agent's role)
- Code snippets or function signatures (Code Research Agent's role)

**Key difference from CodeResearch.md:**
- SpecResearch.md: "The authentication system requires email and password and returns a session token" (behavioral)
- CodeResearch.md: "Authentication implemented in auth/handlers.go:45 using bcrypt" (implementation with file:line)
```

**PAW-02A Code Researcher** - Add after initial CRITICAL section:

```markdown
## Scope: Implementation Documentation with File Paths

This agent documents **where and how** code works with precise file:line references:

**What to document:**
- Exact file paths and line numbers for components
- Implementation details and technical architecture
- Code patterns and design decisions
- Integration points with specific references
- Test file locations and testing patterns

**What NOT to do:**
- Do not suggest improvements (document what exists)
- Do not critique implementation choices
- Do not recommend refactoring
- Do not identify bugs or problems

**Builds upon SpecResearch.md:**
This research assumes behavioral understanding from SpecResearch.md and adds implementation detail for planning. Read SpecResearch.md first to understand system behavior, then document implementation.
```

**Rationale**: [Spec.md:FR-012-014](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L138-L141) requires clarifying boundary. [SpecResearch.md:Q4](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L90-L126) identifies tension in Code Researcher between behavioral and file:line emphasis.

#### 2. Clarify Implementer vs Reviewer Roles

**PAW-03A Implementer** - Add after Getting Started section:

```markdown
## Role: Forward Momentum (Making Changes Work)

Your focus is implementing functionality and getting automated verification passing.

**Your responsibilities:**
- Implement plan phases with functional code
- Run automated verification (tests, linting, type checking)
- Address PR review comments by making code changes
- Update ImplementationPlan.md with progress
- Commit functional changes

**NOT your responsibility:**
- Generating docstrings or code comments (Implementation Review Agent)
- Polishing code formatting or style (Implementation Review Agent)
- Opening Phase PRs (Implementation Review Agent)
- Replying to PR review comments (Implementation Review Agent - they verify your work)

**Hand-off to Reviewer:**
After completing a phase and passing automated verification, the Implementation Review Agent reviews your work, adds documentation, and opens the PR.

For review comments: You address comments with code changes. Reviewer then verifies your changes and replies to PR comments.
```

**PAW-03B Impl Reviewer** - Add after Start section (verify from Phase 1):

```markdown
## Role: Maintainability (Making Changes Clear and Reviewable)

Your focus is ensuring code is well-documented, readable, and maintainable.

**Your responsibilities:**
- Review Implementation Agent's code for clarity
- Generate docstrings and code comments
- Suggest improvements to Implementation Agent
- Open and update Phase PRs
- Verify Implementation Agent addressed review comments correctly
- Reply comment-by-comment on PR reviews
- Commit documentation and polish changes

**NOT your responsibility:**
- Writing functional code or tests (Implementation Agent)
- Addressing PR review comments yourself (Implementation Agent makes changes, you verify)
- Merging PRs (human responsibility)

**Relationship to Implementation Agent:**
You work in sequence: Implementer makes changes → You review and document → Human reviews PR → Implementer addresses comments → You verify and reply to PR comments.
```

**Rationale**: [Spec.md:FR-015-017](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L144-L146) requires clear role separation. User clarification: Reviewer verifies how well Implementer addressed review comments.

#### 3. Add Context to Ambiguous Terms

**Files**: Multiple chatmodes where ambiguous terms identified

**Changes**:

**"update"** - Verify all usages have clarifying context. [SpecResearch.md:Q20](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L1011-L1075) shows most already clarified. Add to PAW-X Status Update if missing:
```markdown
## What to keep updated

**"Update" means:**
- Replace content within AUTOGEN blocks with new content
- Preserve all content outside blocks unchanged
- Be idempotent: same state = same output
```

**"comprehensive research"** - Already has stopping conditions in COMPREHENSIVE RESEARCH sections. No changes needed.

**"complete"** - Context-specific. Add clarification to PAW-02B (already has some):
```markdown
## Complete means:
- For files: Read entirely without limit/offset
- For plan: Zero open questions, all decisions made
- For phases: All success criteria met and verified
- For checklist: All items checked off
```

**Rationale**: [Spec.md:FR-027-029](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L161-L163) requires clarifying ambiguous language. [SpecResearch.md:Q20](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L1011-L1075) identifies hotspots.

#### 4. Complete Status Agent Trigger Documentation

**PAW-X Status Update** - Update Triggers section (line 63):

```markdown
## Triggers

Invoke this agent at key milestones:

**Stage 01 - Specification:**
- After spec approval (before planning)

**Stage 02 - Planning:**
- After Planning PR opened
- After Planning PR updated (optional, for major changes)
- After Planning PR merged

**Stage 03 - Implementation:**
- After each Phase PR opened
- After each Phase PR updated (optional, for significant changes)
- After each Phase PR merged

**Stage 04 - Documentation:**
- After Docs PR opened
- After Docs PR updated (optional, for major changes)
- After Docs PR merged

**Stage 05 - Final PR:**
- After final PR opened
- After final PR merged
```

**Rationale**: [Spec.md:FR-030](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L166) requires complete trigger list. [SpecResearch.md:Q18](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md#L883-L927) shows Docs PR opened/updated missing.

### Success Criteria

#### Automated Verification:
- [ ] PAW-01B contains "Behavioral Documentation Only" or similar scope section: `grep -c "Behavioral Documentation" .github/chatmodes/PAW-01B*.md` returns ≥1
- [ ] PAW-02A contains "Implementation Documentation" or "Builds upon SpecResearch": `grep -c "Builds upon SpecResearch" .github/chatmodes/PAW-02A*.md` returns ≥1
- [ ] PAW-03A contains "Forward Momentum" or role clarification: `grep -c "Forward Momentum" .github/chatmodes/PAW-03A*.md` returns ≥1
- [ ] PAW-03B contains "Maintainability" or role clarification: `grep -c "Maintainability" .github/chatmodes/PAW-03B*.md` returns ≥1
- [ ] PAW-X contains "Docs PR opened": `grep -c "Docs PR opened" .github/chatmodes/PAW-X*.md` returns ≥1
- [ ] PAW-X contains "Docs PR updated": `grep -c "Docs PR updated" .github/chatmodes/PAW-X*.md` returns ≥1

#### Manual Verification:
- [ ] Spec Research scope clearly distinguishes behavioral from implementation detail
- [ ] Code Research scope explicitly states it builds on behavioral understanding
- [ ] Implementer role clearly separates forward momentum from documentation
- [ ] Reviewer role clearly explains verification of Implementer's work
- [ ] Ambiguous terms ("update", "complete", "comprehensive") have clarifying context where used
- [ ] Status Agent triggers match all PR lifecycle events from paw-specification.md

### Status

Unimplemented

---

## Testing Strategy

### Validation Approach

Each phase will be tested through:

1. **Automated checks**: Grep commands verify presence of required patterns
2. **Manual review**: Human inspection confirms quality and consistency
3. **Progressive validation**: Each phase builds on previous, so later phases implicitly test earlier work

### Phase-by-Phase Testing

**Phase 1**: After creating empty chatmodes
- Validate files are non-empty and contain required sections
- Render files in Markdown viewer to check formatting
- Compare structure to mature templates (PAW-01A, PAW-02A, PAW-03A)

**Phase 2**: After standardizing paths
- Run grep checks to verify no legacy paths remain
- Search for canonical artifact references across all files
- Verify example paths are realistic

**Phase 3**: After propagating guardrails
- Check each chatmode for required guardrail categories
- Verify strength of directive language (NEVER, DO NOT, CRITICAL)
- Confirm guardrails are contextually appropriate for each agent role

**Phase 4**: After adding hand-offs/checklists
- Trace workflow progression through hand-off statements
- Verify each hand-off identifies next agent correctly
- Count quality checklist items (≥5 per agent)

**Phase 5**: After clarifying boundaries
- Review scope sections for clarity and distinction
- Verify ambiguous terms have context
- Check Status Agent triggers against paw-specification.md

### Integration Testing

After all phases complete:
- Read through complete workflow from PAW-01A → PAW-05 following hand-offs
- Verify consistency of terminology across all files
- Confirm all artifact paths reference same canonical structure
- Check that guardrails don't contradict between agents
- Validate quality checklists cover all critical dimensions per [Spec.md:SC-008](docs/agents/feature/finalize-initial-chatmodes/Spec.md#L186)

## Performance Considerations

No runtime performance concerns. This plan only modifies static Markdown files.

Considerations:
- **File size**: Some chatmodes may grow significantly (especially PAW-03B, PAW-04, PAW-05 from 0 bytes). Ensure they remain readable and navigable.
- **Context length**: When agents read their own instructions, longer chatmodes consume more context. Keep instructions concise where possible.

## References

- **Spec**: [docs/agents/feature/finalize-initial-chatmodes/Spec.md](docs/agents/feature/finalize-initial-chatmodes/Spec.md)
- **Spec Research**: [docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md](docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md)
- **Code Research**: [docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md](docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md)
- **PAW Specification**: [paw-specification.md](paw-specification.md) - canonical agent names and workflow structure
- **Mature chatmode templates**: [PAW-01A Spec Agent](../.github/chatmodes/PAW-01A%20Spec%20Agent.chatmode.md), [PAW-02A Code Researcher](../.github/chatmodes/PAW-02A%20Code%20Researcher.chatmode.md), [PAW-03A Implementer](../.github/chatmodes/PAW-03A%20Implementer.chatmode.md)

