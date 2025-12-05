# Handoff Command Improvements Implementation Plan

## Overview

Improve the PAW agent handoff mechanism to prevent agents from acting on feedback commands instead of handing off, and make "continue" behavior explicit in handoff messages.

## Current State Analysis

The handoff mechanism in `agents/components/handoff-instructions.component.md` documents command patterns but lacks explicit "decision gate" instructions that would prevent agents from misinterpreting commands as actionable suggestions. Additionally, handoff messages tell users to say "continue" without specifying which agent will be invoked.

### Key Discoveries:
- `handoff-instructions.component.md:38-42` documents the `feedback:` command but doesn't emphasize it as a handoff trigger
- `handoff-instructions.component.md:52-89` defines handoff message format but guidance line is vague about continue target
- `PAW-03B Impl Reviewer.agent.md:197` allows "small refactors" which can conflict with `feedback:` commands about documentation
- Agent-specific handoff sections define default next stages, but this isn't surfaced to users in handoff messages

## Desired End State

1. When a user's message starts with `feedback:`, `address comments`, or other command keywords, agents immediately recognize this as a handoff command and do NOT perform the work themselves
2. Handoff messages explicitly state which agent will be invoked when the user says "continue", e.g., `say 'continue' to proceed to Implementation`
3. The Impl Reviewer agent has explicit scope boundaries clarifying when to hand off vs when to act

### Verification:
- Agents can parse and recognize command prefixes in user messages
- Handoff messages include explicit continue targets
- Impl Reviewer documentation clearly distinguishes initial review scope from post-feedback scope

## What We're NOT Doing

- Adding runtime command parsing logic to TypeScript extension code
- Modifying the `paw_call_agent` tool implementation
- Changing the handoff mode templates in `src/prompts/` (the runtime-injected templates are mode-specific; command recognition belongs in the compile-time component)
- Creating automated tests for agent prompt behavior

## Implementation Approach

This is a documentation-focused change to agent prompt files. The changes are small and focused, affecting primarily the shared handoff-instructions component and agent files.

## Phase Summary

1. **Phase 1: Command Recognition and Handoff Message Updates** - Add decision gate for command recognition and update handoff message format to include explicit continue targets
2. **Phase 2: Dynamic Continue Target and Missing Agent Coverage** - Replace hard-coded continue lines with dynamic derivation and extend continue guidance to all agents
3. **Phase 3: Defer Spec Creation Until Research Complete** - Fix workflow so Spec Agent hands off to researcher BEFORE creating Spec.md when research questions exist
4. **Phase 4: Carry Agent Notes Through Research** - Include Spec Agent notes in research prompt and preserve them in SpecResearch.md
5. **Phase 5: Include Prompt Path in Handoff Instructions** - Add research prompt path to handoff inline instructions and clarify parameter description

---

## Phase 1: Command Recognition and Handoff Message Updates

### Overview
Add command recognition decision gate to the shared handoff component and update handoff message format to require explicit continue targets. Also add scope boundary documentation to the Impl Reviewer agent.

### Changes Required:

#### 1. Add Command Recognition Section
**File**: `agents/components/handoff-instructions.component.md`
**Changes**: 
- Add a new "Command Recognition (CRITICAL)" section immediately after the existing "CRITICAL" header (around line 4)
- This section should list command prefixes that trigger handoffs and instruct agents to NOT perform work themselves
- Include `feedback:`, `address comments`, `check pr`, and command mapping keywords

**Location**: Insert after line 4, before "### Invoking Handoffs" section

**Content to add**:
```markdown
### Command Recognition (CRITICAL)

When the user's message starts with one of these patterns, it is a **COMMAND** that triggers a handoff—do NOT perform the work yourself:

| Pattern | Action |
|---------|--------|
| `feedback: <text>` | Hand off to PAW-03A Implementer (local strategy) |
| `address comments`, `check pr` | Hand off to appropriate agent for PR comments |
| `implement`, `review`, `docs`, `pr` | Hand off per Command Mapping table below |
| `spec`, `research`, `plan`, `status` | Hand off per Command Mapping table below |

**IMPORTANT**: Even if the command content seems within your current scope (e.g., `feedback: add clarifying comments` for a Reviewer), the command prefix means the user wants the designated agent to handle it. Recognize the command and hand off.
```

#### 2. Update Handoff Message Format
**File**: `agents/components/handoff-instructions.component.md`
**Changes**:
- Update the guidance line format to include explicit continue target
- Update the example handoff message to show explicit continue behavior
- Add a rule about including the continue target

**Location**: Lines 52-89 (Required Handoff Message Format section)

**Changes to make**:
1. Update guidance line template from:
   ```
   You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue`.
   ```
   To:
   ```
   You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue` to [NEXT_STAGE_DESCRIPTION].
   ```

2. Update the example handoff message to show the pattern

3. Add a rule: "**Make continue explicit** - The guidance line must include what `continue` does, e.g., `say 'continue' to proceed to review`"

#### 3. Add Scope Boundary Documentation to Impl Reviewer
**File**: `agents/PAW-03B Impl Reviewer.agent.md`
**Changes**:
- Add a "Scope Boundaries" section after the "Relationship to Implementation Agent" section (around line 145)
- Clarify what the Reviewer handles vs what requires handoff to Implementer
- Add decision gate before making changes

**Content to add** (insert after line 145, before "## Process Steps"):
```markdown
### Scope Boundaries (CRITICAL)

**You (Reviewer) handle:**
- Adding docstrings/comments **during your initial review pass** (before first push)
- Small refactors discovered during review (unused parameters, dead code)
- Verifying Implementer's changes after they address feedback
- Pushing branches and opening PRs

**Implementer handles:**
- All changes requested via `feedback:` command, even documentation changes
- Addressing PR review comments (you verify after)
- Any change requested after your initial review is complete

### Before Making Any Edit (Decision Gate)

Before modifying any file, check:
1. Did the user's message start with `feedback:`? → **STOP, hand off to Implementer**
2. Am I responding to a `feedback:` or `address comments` command? → **STOP, hand off to Implementer**
3. Is this my initial review pass, or am I responding to user feedback?
   - Initial review → I can make documentation/polish changes
   - Responding to feedback → Hand off to Implementer
```

#### 4. Update Agent-Specific Handoff Sections for Explicit Continue
**Files**: Update key agent files to include explicit continue targets in their handoff section examples

**File**: `agents/PAW-03B Impl Reviewer.agent.md` (lines 388-418)
**Changes**: Update example handoff messages to include explicit continue target in guidance line

**File**: `agents/PAW-02B Impl Planner.agent.md` (lines 420-430)
**Changes**: Update handoff section to mention explicit continue target

**File**: `agents/PAW-03A Implementer.agent.md` (lines 352-358)
**Changes**: Update handoff section to mention explicit continue target

**Tests**:
- Manually verify that agent files render correctly through the template system
- Run `./scripts/lint-agent.sh` on all modified agent files

### Success Criteria:

#### Automated Verification:
- [x] Agent linter passes: `./scripts/lint-agent.sh agents/components/handoff-instructions.component.md`
- [x] Agent linter passes: `./scripts/lint-agent.sh agents/PAW-03B\ Impl\ Reviewer.agent.md`
- [x] Agent linter passes: `./scripts/lint-agent.sh agents/PAW-02B\ Impl\ Planner.agent.md`
- [x] Agent linter passes: `./scripts/lint-agent.sh agents/PAW-03A\ Implementer.agent.md`
- [x] TypeScript compiles: `npm run compile`
- [x] Extension tests pass: `npm test`

#### Manual Verification:
- [x] Command Recognition section appears near top of handoff-instructions.component.md
- [x] Handoff message examples include explicit continue targets
- [x] Impl Reviewer has clear scope boundary documentation
- [ ] Agent renders correctly when used in VS Code Chat

---

### Phase 1 Completion Summary (2025-12-04)

**Changes implemented:**
1. Added "Command Recognition (CRITICAL)" section to `agents/components/handoff-instructions.component.md` with table of command patterns that trigger handoffs
2. Updated handoff message format to require explicit continue targets with new rule #5 and updated example
3. Added "Scope Boundaries (CRITICAL)" and "Before Making Any Edit (Decision Gate)" sections to `agents/PAW-03B Impl Reviewer.agent.md`
4. Updated handoff examples in PAW-03B, PAW-02B, and PAW-03A to include explicit continue targets

**Additional changes to stay within token limits:**
- Consolidated redundant "Relationship to Implementation Agent" reference in PAW-03B
- Merged "Role" and "Core Responsibilities" sections in PAW-03B (removed duplication)
- Consolidated "Guardrails" and "Surgical Change Discipline" sections in PAW-03B
- Made new "Scope Boundaries" content more concise

**Verification:**
- All agent linters pass
- TypeScript compiles without errors  
- All 143 tests pass

---

## Phase 2: Dynamic Continue Target and Missing Agent Coverage

### Overview
Address two issues: (1) Extend explicit continue guidance to all agents missing it (PAW-01A, PAW-01B, PAW-02A, PAW-05, and all PAW-R* agents), and (2) Replace hard-coded "When user says continue" lines with dynamic derivation from presented next steps.

### Changes Required:

#### 1. Update handoff-instructions.component.md for Dynamic Continue Behavior
**File**: `agents/components/handoff-instructions.component.md`
**Changes**:
- Update the "`continue` behavior" section to explicitly state that the continue target is derived from the first/default option in "Next Steps"
- Add a rule that agents must order their "Next Steps" with the default/recommended action first
- Clarify that the guidance line's continue target must match the first presented option

**Location**: Update the section after "Required Handoff Message Format" (around lines 68-85)

**Changes to make**:
1. Update the "`continue` behavior" line to explain derivation:
   ```
   **`continue` behavior**: Proceeds to the **first command** in the "Next Steps" list (the default next stage). Agents must order options with the recommended default first.
   ```

2. Add a new rule #6 about ordering:
   ```
   6. **Order options by recommendation** - Place the default/recommended next step first in "Next Steps"; this becomes the `continue` target
   ```

3. Add guidance that agent-specific handoff sections should NOT include hard-coded "When user says continue" lines since the behavior is derived from the presented options

#### 2. Remove Hard-Coded Continue Lines from PAW-02B Impl Planner
**File**: `agents/PAW-02B Impl Planner.agent.md`
**Changes**:
- Remove the line `- When user says 'continue': proceed to PAW-03A Implementer` from the "Planning Handoff" section
- The behavior is now derived from the first option in Next Steps

**Location**: Around line 429

#### 3. Remove Hard-Coded Continue Lines from PAW-03A Implementer
**File**: `agents/PAW-03A Implementer.agent.md`
**Changes**:
- Remove the line `- When user says 'continue': proceed to PAW-03B Impl Reviewer` from the "Implementation Handoff" section
- The behavior is now derived from the first option in Next Steps

**Location**: Around line 357

#### 4. Remove Hard-Coded Continue Lines from PAW-03B Impl Reviewer  
**File**: `agents/PAW-03B Impl Reviewer.agent.md`
**Changes**:
- Remove the line `- When user says 'continue': proceed to PAW-03A (next phase) or PAW-04 (if all phases complete)` from the handoff section
- The behavior is now derived from the first option in Next Steps (which the agent dynamically determines based on whether more phases remain)

**Location**: Around line 400

#### 5. Remove Hard-Coded Continue Lines from PAW-04 Documenter
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**:
- Remove the line `- When user says 'continue': proceed to PAW-05 PR` from the "Documentation Handoff" section
- The behavior is now derived from the first option in Next Steps

**Location**: Around line 473

#### 6. Update PAW-01A Specification Agent Handoff Section
**File**: `agents/PAW-01A Specification.agent.md`
**Changes**:
- Update the "Specification Handoff" section to include explicit guidance on continue behavior
- The continue target is dynamically determined: if spec research is needed, continue → Spec Researcher; if spec is complete, continue → Code Researcher
- Ensure example handoff message shows the continue target in guidance line

**Location**: Around lines 315-335 (Specification Handoff section)

**Update to include**: Dynamic continue target based on workflow state is already correctly described, just need to ensure the guidance line format is explicit in examples

#### 7. Update PAW-01B Spec Researcher Agent Handoff Section
**File**: `agents/PAW-01B Spec Researcher.agent.md`
**Changes**:
- Add explicit continue guidance to the "Spec Research Handoff" section
- Continue target: PAW-01A Specification (return to integrate research)
- Update example handoff message to include continue target in guidance line

**Location**: Around lines 130-140 (Spec Research Handoff section)

#### 8. Update PAW-02A Code Researcher Agent Handoff Section
**File**: `agents/PAW-02A Code Researcher.agent.md`
**Changes**:
- Add explicit continue guidance to the "Code Research Handoff" section
- Continue target: PAW-02B Impl Planner
- Update example handoff message to include continue target in guidance line

**Location**: Around lines 430-439 (Code Research Handoff section)

#### 9. Update PAW-05 PR Agent Handoff Section
**File**: `agents/PAW-05 PR.agent.md`
**Changes**:
- The Final PR Handoff section already exists but the guidance line should be updated
- This is a terminal stage - continue is not applicable as there's no default next stage
- Update guidance line to clarify: "say `continue` to address comments" or remove continue from guidance since it's terminal

**Location**: Around lines 275-310 (Final PR Handoff section)

#### 10. Update PAW-R* Review Agents Handoff Sections
**Files**: All PAW-R* agents in `agents/` directory

Each PAW-R* agent needs its handoff section updated to:
- Follow the consistent handoff message format from handoff-instructions.component.md
- Include the guidance line with continue target
- Order Next Steps with the default option first

**Specific changes**:

**PAW-R1A Understanding** (lines 563-602):
- Update handoff message to include guidance line with continue target
- Continue target: PAW-R1B Baseline Researcher (if research needed) or PAW-R2A Impact Analyzer (if research complete)

**PAW-R1B Baseline Researcher** (lines 322-350):
- Update handoff message to include guidance line with continue target
- Continue target: PAW-R1A Understanding (return to complete derived spec)

**PAW-R2A Impact Analyzer** (lines 444-469):
- Update handoff message to include guidance line with continue target
- Continue target: PAW-R2B Gap Analyzer

**PAW-R2B Gap Analyzer** (lines 596-630):
- Update handoff message to include guidance line with continue target
- Continue target: PAW-R3A Feedback Generator

**PAW-R3A Feedback Generator** (lines 405-440):
- Update handoff message to include guidance line with continue target
- Continue target: PAW-R3B Feedback Critic

**PAW-R3B Feedback Critic** (lines 335-375):
- Terminal stage - update guidance line to clarify continue is not applicable
- User takes manual action (posts feedback, makes edits)

**Tests**:
- Run `./scripts/lint-agent.sh` on all modified agent files to ensure token limits not exceeded
- Verify TypeScript compiles
- Run extension tests

### Success Criteria:

#### Automated Verification:
- [x] Agent linter passes on all modified agents: `./scripts/lint-agent.sh`
- [x] TypeScript compiles: `npm run compile`
- [x] Extension tests pass: `npm test`

#### Manual Verification:
- [x] No agent contains hard-coded "When user says continue" lines
- [x] All agent handoff sections follow consistent format with guidance line
- [x] PAW-R* agents use review-handoff-instructions.component.md consistently
- [x] Terminal stages (PAW-05, PAW-R3B) clarify that continue is not applicable or clarify what it does

---

### Phase 2 Completion Summary (2025-12-04)

**Changes implemented:**

1. Updated `agents/components/handoff-instructions.component.md`:
   - Modified "Continue command" section to explain continue target derivation from first item in "Next Steps"
   - Added rule #6 about ordering options by recommendation (default first)
   - Updated "`continue` behavior" section to explicitly state not to use hard-coded "When user says continue" lines

2. Removed hard-coded "When user says continue" lines from:
   - `agents/PAW-02B Impl Planner.agent.md`
   - `agents/PAW-03A Implementer.agent.md`
   - `agents/PAW-03B Impl Reviewer.agent.md`
   - `agents/PAW-04 Documenter.agent.md`

3. Updated handoff sections with explicit continue behavior and example handoff messages:
   - `agents/PAW-01A Specification.agent.md` - conditional continue based on research state
   - `agents/PAW-01B Spec Researcher.agent.md` - continue returns to Specification Agent
   - `agents/PAW-02A Code Researcher.agent.md` - continue proceeds to planning
   - `agents/PAW-05 PR.agent.md` - terminal stage, continue addresses PR comments

4. Updated `agents/components/review-handoff-instructions.component.md`:
   - Added "Continue Behavior" section explaining continue target derivation for PAW-R* agents
   - Added terminal stage guidance for PAW-R3B

5. Updated PAW-R* agent handoff sections with explicit continue behavior and example messages:
   - `agents/PAW-R1A Understanding.agent.md` - conditional continue based on research state
   - `agents/PAW-R1B Baseline Researcher.agent.md` - continue returns to Understanding Agent
   - `agents/PAW-R2A Impact Analyzer.agent.md` - continue proceeds to gap analysis
   - `agents/PAW-R2B Gap Analyzer.agent.md` - continue proceeds to feedback generation
   - `agents/PAW-R3A Feedback Generator.agent.md` - continue proceeds to feedback critique
   - `agents/PAW-R3B Feedback Critic.agent.md` - terminal stage, continue revises feedback

**Verification:**
- All agent linters pass (with expected warnings for larger agents)
- TypeScript compiles without errors
- All 143 tests pass

**Review notes:**
- The handoff message format is now consistent across all agents
- Continue targets are dynamically determined by the first item in Next Steps
- Terminal stages (PAW-05 PR, PAW-R3B Feedback Critic) have clarified behavior for `continue`

---

## Phase 3: Defer Spec Creation Until Research Complete

### Overview
Fix the Spec Agent workflow so it does NOT create Spec.md before handing off to the Spec Researcher. Currently the spec agent can create a specification with open research questions and then hand off to research—this is backwards. The agent should generate the research prompt, hand off to the researcher, and only create Spec.md AFTER research is integrated.

## Phase 4: Carry Agent Notes Through Research

### Overview
When the Spec Agent generates the research prompt, it may have accumulated notes and context during intake/decomposition that are valuable for the researcher. These notes should be included in the research prompt file so the Spec Researcher has full context. Additionally, the Spec Researcher should preserve these notes in a dedicated section of SpecResearch.md so they return to the Spec Agent after research.


## Phase 5: Include Prompt Path in Handoff Instructions

### Overview
Currently when the Spec Agent hands off to the Spec Researcher, it doesn't include the path to the generated research prompt file in the handoff. The Spec Researcher has to find it, which wastes time. The handoff should include the prompt file path as part of the inline instructions. Also update the `inline_instruction` parameter description to clarify it's for both user instructions AND agent-to-agent context.


## Cross-Phase Testing Strategy

### Manual Testing Steps:
1. Start a PAW workflow in minimal/local mode
2. After Impl Reviewer completes, type `feedback: add comments`
3. Verify Impl Reviewer recognizes this as a handoff command to Implementer
4. Verify handoff message includes explicit continue target
5. After Phase 2: Test that saying "continue" at each stage invokes the first listed option
6. After Phase 2: Verify that all agents present consistent handoff message format
7. After Phase 3: Start a new Spec Agent session, verify it generates research prompt BEFORE creating Spec.md
8. After Phase 4: Verify notes from Spec Agent appear in research prompt and are preserved in SpecResearch.md
9. After Phase 5: Verify Spec Agent handoff to Spec Researcher includes the prompt file path

## References

- User Feedback: `.paw/work/handoff-command-improvements/context/handoff-feedback.md`
- Research: `.paw/work/handoff-command-improvements/CodeResearch.md`
- Current handoff component: `agents/components/handoff-instructions.component.md`
