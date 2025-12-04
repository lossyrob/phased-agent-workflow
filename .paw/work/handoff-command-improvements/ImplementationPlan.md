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

This is a documentation-focused change to agent prompt files. The changes are small and focused, affecting primarily the shared handoff-instructions component and one agent file.

## Phase Summary

1. **Phase 1: Command Recognition and Handoff Message Updates** - Add decision gate for command recognition and update handoff message format to include explicit continue targets

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

## Cross-Phase Testing Strategy

### Manual Testing Steps:
1. Start a PAW workflow in minimal/local mode
2. After Impl Reviewer completes, type `feedback: add comments`
3. Verify Impl Reviewer recognizes this as a handoff command to Implementer
4. Verify handoff message includes explicit continue target

## References

- User Feedback: `.paw/work/handoff-command-improvements/context/handoff-feedback.md`
- Research: `.paw/work/handoff-command-improvements/CodeResearch.md`
- Current handoff component: `agents/components/handoff-instructions.component.md`
