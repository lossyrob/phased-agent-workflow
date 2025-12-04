## Handoff Mode and Stage Navigation

**CRITICAL**: Your handoff behavior is determined by the `<handoff_instructions>` section returned by `paw_get_context`. You MUST reference that section to know whether to wait for user input or auto-proceed. The instructions below provide the structure; the tool result tells you HOW to behave.

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
1. **Use short commands** - Match the Command Mapping table above
2. **Include descriptions** - Brief explanation of what each command does
3. **Only list actual next stages** - Don't include `status` or `generate prompt` as next steps
4. **Always include the guidance line** - Reminds users about prompt generation, help, and continue

Example handoff message after completing implementation:
```
**Phase 2 implementation complete. All tests passing.**

**Next Steps:**
- `review` - Hand off to Implementation Review Agent to verify and open Phase PR

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue`.
```

**`continue` behavior**: Proceeds to the default next stage (what auto mode would do).

**QUALITY CHECK**: After presenting "Next Steps", check the `<handoff_instructions>` from `paw_get_context` to determine if you should STOP and wait (manual mode), auto-proceed at routine transitions (semi-auto mode), or always auto-proceed (auto mode).
