## Handoff Mode and Stage Navigation

Read `Handoff Mode` from WorkflowContext.md at startup. Values: **manual** (default), **semi-auto**, or **auto**.

### Mode Behavior

- **Manual**: Present next-step options, wait for user command
- **Semi-Auto**: Auto-chain at routine transitions (automatically invoke `paw_call_agent` after presenting the handoff message), pause only at decision points requiring user input
- **Auto**: Chain immediately - always invoke `paw_call_agent` after presenting the handoff message (requires local strategy)

### Invoking Handoffs

When transitioning to another stage:
1. Map user request to target agent (see Command Mapping below)
2. Call `paw_call_agent` with: `target_agent`, `work_id`, optional `inline_instruction`
3. Tool opens new chat - your conversation ends

**Command Mapping** (user command → agent):
| Command | Agent |
|---------|-------|
| `spec`, `specification` | PAW-01A Specification |
| `research` | PAW-01B Spec Researcher (from spec stage) or PAW-02A Code Researcher (from spec research/planning stages) |
| `plan`, `planner` | PAW-02B Impl Planner |
| `implement`, `implementer` | PAW-03A Implementer |
| `review`, `reviewer` | PAW-03B Impl Reviewer |
| `docs`, `documenter`, `documentation` | PAW-04 Documenter |
| `pr`, `final pr` | PAW-05 PR |
| `status`, `help` | PAW-X Status |

Context-sensitive commands:
- `research`: Maps to Spec Researcher when coming from Spec stage, Code Researcher when coming from completed spec research or planning stages
- `review`: Maps to Implementation Review during implementation phases
- `implement`: Agent determines current phase automatically

**Addressing PR Review Comments** (prs strategy only):
When a Planning PR, Phase PR, Docs PR, or Final PR has review comments that need addressing:
- `address comments` - Hand off to the appropriate agent to address PR review comments
  - Planning PR → PAW-02B Impl Planner
  - Phase PR → PAW-03A Implementer (makes changes) → PAW-03B Impl Reviewer (verifies and pushes)
  - Docs PR → PAW-04 Documenter
  - Final PR → PAW-03A Implementer (makes changes) → PAW-03B Impl Reviewer (verifies and pushes)
- `check pr` - Alternative command for addressing PR review comments

**Providing Local Feedback** (local strategy only):
When using local strategy without PRs, the user provides feedback directly:
- `feedback: <user's feedback>` - Hand off to PAW-03A Implementer with feedback as inline instruction
- Example: User says `feedback: add error handling for edge cases` → call `paw_call_agent` with `target_agent: 'PAW-03A Implementer'`, `inline_instruction: 'Address feedback: add error handling for edge cases'`

**Inline instructions**: "implement but add logging" → pass "add logging" as `inline_instruction`

**Continue command**: When user says `continue`, proceed to the default next stage as if in semi-auto/auto mode.

### Generating Prompt Files

When user says "generate prompt for [stage]":
- Call `paw_generate_prompt` with: `work_id`, `template_key`, `filename`, optional `additional_content`
- Inform user of file path for editing

### Required Handoff Message Format

**CRITICAL**: At the end of your completed work, you MUST present a handoff message with next-step options. Handoff messages are for **successful completion only**. If you are blocked (e.g., merge conflicts, missing info, errors needing user input), present the blocker clearly and STOP - do NOT add "Next Steps" until the blocker is resolved and work is complete.

Format your handoff message as:
1. A brief status line (what was completed)
2. A "Next Steps" list with the logical next stage(s) as short commands with descriptions
3. A guidance line mentioning `generate prompt`, `status`/`help`, and `continue`

```
**[Status of completed work]**

**Next Steps:**
- `[command]` - [description of what this does]

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue`.
```

Rules for handoff messages:
1. **Always re-check the handoff mode**: Understand whether you're in manual, semi-auto, or auto mode

Rules for handoff messages **when pausing**:
2. **Always present options**
3. **Use short commands** - Match the Command Mapping table above
4. **Include descriptions** - Brief explanation of what each command does
5. **Only list actual next stages** - Don't include `status` or `generate prompt` as next steps
6. **Always include the guidance line** - Reminds users about prompt generation, help, and continue

Rules when auto-proceeding:
1. **Always indicate what step you are handing off to**
2. **Always call `paw_call_agent` as the last step**

Example handoff message after completing implementation:
```
**Phase 2 implementation complete. All tests passing.**

**Next Steps:**
- `review` - Hand off to Implementation Review Agent to verify and open Phase PR

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue`.
```

**`continue` behavior**: Proceeds to the default next stage (what auto mode would do).

**IMPORTANT**: Always present the handoff message. Then:
- **Manual**: STOP and wait for user command
- **Semi-Auto**: Auto-proceed only at routine transitions (Spec↔Spec Research, Code Research→Plan, Implement→Review), otherwise wait for user command
- **Auto**: Always add "Automatically proceeding..." and immediately call `paw_call_agent`

**QUALITY CHECK**: Does your message have "Next Steps"? In auto mode (or semi-auto at routine transition), did you call `paw_call_agent`?
