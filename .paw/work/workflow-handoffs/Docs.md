# Workflow Handoffs - Feature Documentation

## Overview

The Workflow Handoffs feature transforms PAW from a manual stage-navigation system into an intelligent, guided workflow with three automation levels. Previously, users had to manually navigate between stages—completing a specification, then remembering which stage comes next, navigating to the correct prompt file in `.paw/work/<slug>/prompts/`, and manually executing it. This created friction that hindered adoption, especially when returning to a workflow after days or weeks away.

With Workflow Handoffs, when a PAW agent completes its work, it analyzes findings and presents clear, actionable next steps. Users can type simple commands like `research` or `implement Phase 2` to instantly transition to the appropriate agent in a fresh chat session, with all context automatically carried forward through the Work ID.

**Key capabilities introduced:**

1. **Contextual Stage Transitions** — Agents present formatted next-step options with commands like `research`, `code`, `implement Phase 2`, `status`. Users type simple commands to instantly transition to appropriate agents.

2. **Three Handoff Modes** — WorkflowContext.md includes a "Handoff Mode" field (manual/semi-auto/auto). Manual waits for user commands. Semi-Auto auto-chains at designated transitions with pauses at decision points. Auto chains all stages with only tool approval interactions.

3. **Enhanced Status Agent** — Users can ask "where am I?" and receive comprehensive analysis including completed artifacts, current phase progress, git divergence, PR status with review comment analysis, and actionable next steps.

4. **Dynamic Prompt Generation** — Prompts are generated on-demand via `paw_generate_prompt` tool only when customization is needed, reducing filesystem noise.

5. **Inline Customization** — Users provide inline instructions during handoffs (`continue Phase 2 but add rate limiting`) without creating prompt files.

6. **PAW: Get Work Status Command** — Quick access to workflow status via Command Palette, with work item picker sorted by recency.

## Architecture and Design

### Design Principles

The Workflow Handoffs feature follows PAW's core architecture philosophy: **tools provide procedural operations, agents provide decision-making logic**. This separation ensures:

- **Agent autonomy**: Agents determine which stage to transition to based on user requests and workflow context
- **Tool simplicity**: Tools validate inputs and execute operations without making workflow decisions
- **Extensibility**: New stages or workflows can be added by updating agent instructions without tool changes

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Commands                               │
│   "research" | "implement Phase 2" | "status" | "continue"      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PAW Agent (Current)                          │
│  - Reads Handoff Mode from WorkflowContext.md                   │
│  - Maps user command to target agent                            │
│  - Determines inline instructions                               │
│  - Presents next-step options                                   │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
    ┌───────────────────────┐     ┌───────────────────────────────┐
    │   paw_call_agent      │     │   paw_generate_prompt         │
    │   (Handoff Tool)      │     │   (Prompt Generation Tool)    │
    │                       │     │                               │
    │ • Validates Work ID   │     │ • Validates template key      │
    │ • Opens new chat      │     │ • Writes prompt file          │
    │ • Passes Work ID +    │     │ • Appends additional content  │
    │   inline instruction  │     │                               │
    └───────────────┬───────┘     └───────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────────────────────────┐
    │                   Target PAW Agent                         │
    │  - Calls paw_get_context with Work ID                     │
    │  - Retrieves WorkflowContext.md, custom instructions      │
    │  - Proceeds with stage-specific work                      │
    └───────────────────────────────────────────────────────────┘
```

### Handoff Tool Design

The `paw_call_agent` tool uses VS Code's Language Model API to create a new chat session with the target agent. Key design decisions:

- **Fire-and-forget pattern**: VS Code API doesn't allow waiting for agent completion, so the tool opens a new chat and returns immediately
- **Work ID validation**: Enforces lowercase letters, numbers, and hyphens only to ensure filesystem safety
- **Inline instruction passthrough**: Optional text appended to the Work ID prompt for customization
- **Tool approval UI**: Clear confirmation messages showing target agent and work ID before execution

### Prompt Generation Tool Design

The `paw_generate_prompt` tool follows agent-driven design:

- **Agent determines template**: Template key parameter lets agent specify exactly which template (e.g., `03A-implement`, `03C-pr-review`)
- **Agent determines filename**: Agent provides exact filename, enabling phase-specific prompts (e.g., `03A-implement-phase3.prompt.md`)
- **Tool validates and writes**: Tool only validates inputs and writes the file—no procedural logic for template selection

### Handoff Mode Behavior

| Mode | Behavior | Best For |
|------|----------|----------|
| **Manual** (default) | Present next-step options, wait for user command | Learning PAW, wanting full control |
| **Semi-Auto** | Auto-chain routine transitions, pause at decisions | Experienced users wanting speed with control |
| **Auto** | Chain immediately through all stages | Routine work, full automation (requires local strategy) |

**Semi-Auto auto-chain points:**
- Spec → Spec Research → Spec (round-trip)
- Code Research → Implementation Plan
- Implementation Phase → Implementation Review

**Semi-Auto pause points:**
- Before Code Research (after Spec finalized)
- Before Implementation Phase 1
- Before each subsequent phase (Phase N+1)
- Before Documentation
- Before Final PR

### Integration Points

**WorkflowContext.md**: New field `Handoff Mode` (manual, semi-auto, auto) stored alongside existing workflow metadata. Auto mode validates against Review Strategy—incompatible with `prs` strategy.

**Agent Instructions**: All 14 PAW agents updated with `{{HANDOFF_INSTRUCTIONS}}` component that provides:
- Mode-aware handoff behavior
- Command-to-agent mapping table
- Inline instruction parsing
- Required handoff message format

**VS Code Commands**: New `PAW: Get Work Status` command integrates with extension commands system.

## User Guide

### Getting Started with Handoffs

When you initialize a new PAW workflow via `PAW: New PAW Workflow`, you'll be prompted to select a Handoff Mode:

- **Manual** — Full control - you command each stage transition
- **Semi-Auto** — Thoughtful automation - automatic at research/review, pause at decisions
- **Auto** — Full automation - agents chain through all stages (local strategy required)

The selected mode is stored in `WorkflowContext.md` and can be changed manually at any time.

### Stage Transition Commands

After completing work, agents present next-step options. Use these commands to navigate:

| Command | Target Agent | When to Use |
|---------|--------------|-------------|
| `spec`, `specification` | PAW-01A Specification | Start or refine specification |
| `research` | PAW-01B Spec Researcher | Answer spec research questions |
| `research`, `code` | PAW-02A Code Researcher | Analyze codebase patterns |
| `plan`, `planner` | PAW-02B Impl Planner | Create implementation plan |
| `implement`, `implement Phase N` | PAW-03A Implementer | Execute implementation phase |
| `review`, `reviewer` | PAW-03B Impl Reviewer | Verify and push implementation |
| `docs`, `documenter` | PAW-04 Documenter | Create documentation |
| `pr`, `final pr` | PAW-05 PR | Create final PR |
| `status`, `help` | PAW-X Status | Check workflow status |

**Context-sensitive commands:**
- `research` maps to Spec Researcher from Spec stage, Code Researcher from other stages
- `implement` auto-determines current phase from ImplementationPlan.md

### Using Inline Instructions

Customize agent behavior without creating prompt files:

```
implement Phase 2 but add rate limiting
continue but focus on error handling
research but skip external dependencies
```

The text after "but" or "with" is extracted and passed to the target agent as an inline instruction.

### The `continue` Command

Saying `continue` proceeds to the default next stage—what auto mode would do. This is useful in Manual mode when you want to proceed without typing the full command.

### Generating Prompt Files

When you need deep customization, generate a prompt file to edit:

```
generate prompt for implementer Phase 3
```

This creates `.paw/work/<slug>/prompts/03A-implement-phase3.prompt.md` that you can edit before execution.

### Checking Workflow Status

**Via Command Palette:**
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "PAW: Get Work Status"
3. Select a work item from the picker (sorted by recency) or "Auto-detect from context"
4. Status Agent provides workflow analysis and next steps

**Via Agent Command:**
At any point, type `status` or ask "where am I?" to get:
- Completed artifacts
- Current phase progress
- Git branch status
- PR states with review comment analysis
- Actionable next steps

### Handling PR Review Comments

When using `prs` strategy, PRs may receive review comments that need addressing:

```
address comments    # Hand off to appropriate agent for the PR type
check pr           # Alternative command
```

The system routes to the correct agent based on PR type:
- Planning PR → Implementation Planner
- Phase PR → Implementer → Implementation Reviewer
- Docs PR → Documenter
- Final PR → Implementer → Implementation Reviewer

### Help Mode

Ask the Status Agent educational questions:

- "What does Code Research stage do?"
- "How do I start a PAW workflow?"
- "What are the PAW stages?"
- "What's the difference between Manual and Semi-Auto mode?"

### Multi-Work-Item Management

When juggling multiple features:

```
What PAW work items do I have?
```

Lists all workflows sorted by most recently modified, showing Work Title, Work ID, last modified time, and current stage.

## Technical Reference

### paw_call_agent Tool

**Purpose:** Invoke a PAW agent in a new chat session with Work ID context.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target_agent` | enum | Yes | Exact agent name (e.g., `PAW-03A Implementer`) |
| `work_id` | string | Yes | Normalized Work ID (feature slug) |
| `inline_instruction` | string | No | Optional instruction to pass to agent |

**Valid target_agent values:**
- `PAW-01A Specification`
- `PAW-01B Spec Researcher`
- `PAW-02A Code Researcher`
- `PAW-02B Impl Planner`
- `PAW-03A Implementer`
- `PAW-03B Impl Reviewer`
- `PAW-04 Documenter`
- `PAW-05 PR`
- `PAW-X Status`

**Work ID validation:** Must match pattern `/^[a-z0-9-]+$/` (lowercase letters, numbers, hyphens only).

**Behavior:**
1. Validates Work ID format
2. Creates new chat via `workbench.action.chat.newChat`
3. Opens chat with agent mode via `workbench.action.chat.open`
4. Returns empty string on success (new chat interrupts conversation)

### paw_generate_prompt Tool

**Purpose:** Generate customizable prompt files on demand.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `work_id` | string | Yes | Normalized Work ID (feature slug) |
| `template_key` | enum | Yes | Template identifier (e.g., `03A-implement`) |
| `filename` | string | Yes | Exact filename (must end with `.prompt.md`) |
| `additional_content` | string | No | Content to append to prompt body |

**Valid template_key values:**
- `01A-spec`, `02A-code-research`, `02B-impl-plan`, `02C-planning-pr-review`
- `03A-implement`, `03B-review`, `03C-pr-review`, `03D-review-pr-review`
- `04-docs`, `04B-docs-pr-review`, `04C-docs-review-pr-review`
- `05-pr`, `05B-final-pr-review`, `05C-final-review-pr-review`
- `0X-status`

**Behavior:**
1. Validates Work ID, template key, and filename
2. Locates `.paw/work/<work_id>/prompts/` directory
3. Generates prompt file with frontmatter and Work ID
4. Appends additional content if provided
5. Returns file path for user editing

### PAW: Get Work Status Command

**Command ID:** `paw.getWorkStatus`
**Title:** Get Work Status
**Category:** PAW

**Behavior:**
1. Scans `.paw/work/` directories for WorkflowContext.md files
2. Presents QuickPick with:
   - "Auto-detect from context" option (first)
   - Work items sorted by most recent modification
3. Opens Status Agent chat with selected Work ID

### WorkflowContext.md Handoff Mode Field

**Field:** `Handoff Mode`
**Values:** `manual` (default), `semi-auto`, `auto`
**Location:** `.paw/work/<feature-slug>/WorkflowContext.md`

**Example:**
```markdown
# WorkflowContext

Work Title: Auth System
Work ID: auth-system
Target Branch: feature/auth-system
Workflow Mode: full
Review Strategy: prs
Handoff Mode: semi-auto
Issue URL: https://github.com/example/repo/issues/42
Remote: origin
```

**Validation:** Auto mode is incompatible with `prs` review strategy. If both are selected during initialization, the extension rejects the combination with an error message.

### Handoff Instructions Component

**File:** `agents/components/handoff-instructions.component.md`
**Included by:** All PAW agents with stage transitions (14 agents total)

**Provides:**
- Mode-aware behavior instructions
- Command mapping table (user command → agent name)
- Inline instruction parsing guidance
- Prompt generation instructions
- Required handoff message format
- Quality check reminders

### Error Messages

| Error | Cause | Resolution |
|-------|-------|------------|
| "Work ID cannot be empty" | Empty work_id parameter | Provide valid Work ID |
| "Invalid Work ID format" | Non-lowercase/special characters | Use only lowercase letters, numbers, hyphens |
| "Unknown template_key" | Invalid template key | Use valid key from TEMPLATE_KEY_MAP |
| "Auto mode requires local review strategy" | Auto + prs combination | Use local strategy or semi-auto mode |

## Testing Guide

### How to Test Workflow Handoffs

**Manual Mode Verification:**
1. Initialize workflow with Manual mode: `PAW: New PAW Workflow`
2. Complete Spec stage
3. Agent should present formatted next-step options with commands
4. Type `research` to test handoff
5. Verify new chat opens with Spec Research Agent and Work ID context

**Semi-Auto Mode Verification:**
1. Initialize workflow with Semi-Auto mode
2. Complete Spec stage with research questions
3. Agent should auto-chain to Spec Research Agent
4. After research completes, should auto-return to Spec
5. After Spec finalization, should pause and present options
6. Verify pause points: before Code Research, before Phase 1, before each Phase N+1

**Auto Mode Verification:**
1. Initialize workflow with Auto mode (local strategy required)
2. Agents should chain through all stages automatically
3. User interaction limited to tool approvals
4. Verify full workflow: Spec → Research → Code → Plan → Implement → Review → Docs → PR

**Status Agent Verification:**
1. At any point, type `status` or ask "where am I?"
2. Verify agent reports: artifacts, phase progress, git status, PR states
3. Test multi-work-item: "What PAW work items do I have?"
4. Test help mode: "What does Code Research do?"

**Get Work Status Command:**
1. Open Command Palette
2. Run `PAW: Get Work Status`
3. Verify QuickPick shows work items sorted by recency
4. Select an item, verify Status Agent opens with Work ID

**Inline Instructions:**
1. After any stage, type `implement Phase 2 but add rate limiting`
2. Verify Implementer receives inline instruction in context
3. No prompt file should be created

**Dynamic Prompt Generation:**
1. Type `generate prompt for implementer Phase 3`
2. Verify file created at `.paw/work/<slug>/prompts/03A-implement-phase3.prompt.md`
3. Edit file and execute to verify customization works

## Edge Cases and Limitations

### Known Limitations

- **Fire-and-forget pattern**: Cannot wait for agent completion or access agent output after handoff
- **Tool approval required**: Each handoff requires user approval unless "Always Allow" is enabled
- **Auto mode constraint**: Requires local review strategy (incompatible with prs)
- **Workspace scope**: Status Agent operates within single VS Code workspace

### Edge Case Handling

- **Missing WorkflowContext.md**: Agents default to manual mode with informational message
- **Invalid Handoff Mode value**: Defaults to manual mode with warning
- **Missing prerequisites**: Validation error with actionable fix instructions
- **Detached HEAD**: Status Agent reports state and suggests checkout
- **PR search failures**: Reports "Not found" without error, suggests checking configuration

## Migration and Compatibility

### Backward Compatibility

Existing PAW workflows created before this feature continue to work:
- WorkflowContext.md without Handoff Mode field defaults to manual mode
- Agents check for field presence and use default behavior if missing
- No migration script required
- Workflows gain handoff capability on next agent invocation

### Adding Handoff Mode to Existing Workflows

Manually add to WorkflowContext.md:
```markdown
Handoff Mode: semi-auto
```

### On-Demand Prompt Generation

With this feature, prompt files are no longer auto-created during workflow initialization. Instead:
- Use handoff commands for navigation (`research`, `implement Phase 2`)
- Generate prompts only when customization needed (`generate prompt for implementer Phase 3`)
- The `paw_create_prompt_templates` tool remains available for bulk prompt generation

## References

- [Workflow Handoffs Issue #69](https://github.com/lossyrob/phased-agent-workflow/issues/69)
- [PAW Workflow Status Capability Issue #60](https://github.com/lossyrob/phased-agent-workflow/issues/60)
- [Planning PR #114](https://github.com/lossyrob/phased-agent-workflow/pull/114)
- [PAW Specification](../../paw-specification.md)
- Specification: [Spec.md](./Spec.md)
- Implementation Plan: [ImplementationPlan.md](./ImplementationPlan.md)
