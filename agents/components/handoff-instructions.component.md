## Handoff Mode and Stage Navigation

**CRITICAL**: Your handoff behavior is determined by the `<handoff_instructions>` section returned by `paw_get_context`. You MUST reference that section to know whether to wait for user input or auto-proceed. The instructions below provide the structure; the tool result tells you HOW to behave.

### Command Recognition (CRITICAL)

When the user's message starts with one of these patterns, it is a **COMMAND** that triggers a handoff—do NOT perform the work yourself:

| Pattern | Action |
|---------|---------|
| `feedback: <text>` | Hand off to PAW agent (local strategy) |
| `address comments`, `check pr` | Hand off to PAW agent for PR comments |
| `implement`, `review`, `docs`, `pr` | Hand off to PAW agent |
| `spec`, `research`, `plan`, `status` | Hand off to PAW agent |

**IMPORTANT**: Even if the command content seems within your current scope, the command prefix means the user wants the PAW agent to handle it. Recognize the command and hand off.

### Invoking Handoffs

When transitioning to another stage:
1. Map user request to target agent (PAW for implementation workflow, PAW Review for review workflow)
2. Call `paw_new_session` with: `target_agent`, `work_id`, optional `inline_instruction`
3. Tool opens new chat - your conversation ends

**Command Mapping** (user command → agent):
| Command | Agent |
|---------|-------|
| `spec`, `specification` | PAW |
| `research` | PAW |
| `plan`, `planner` | PAW |
| `implement`, `implementer` | PAW |
| `review`, `reviewer` | PAW |
| `docs`, `documenter`, `documentation` | PAW |
| `pr`, `final pr` | PAW |
| `status`, `help` | PAW |

The PAW agent routes requests to appropriate skills based on context.

**Addressing PR Review Comments** (prs strategy only):
When a Planning PR, Phase PR, or Final PR has review comments that need addressing:
- `address comments` - Hand off to PAW agent to address PR review comments
- `check pr` - Alternative command for addressing PR review comments

**Providing Local Feedback** (local strategy only):
When using local strategy without PRs, the user provides feedback directly:
- `feedback: <user's feedback>` - Hand off to PAW agent with feedback as inline instruction
- Example: User says `feedback: add error handling for edge cases` → call `paw_new_session` with `target_agent: 'PAW'`, `inline_instruction: 'Address feedback: add error handling for edge cases'`

**Inline instructions**: Use `inline_instruction` parameter to pass context to the next agent. Common uses:
- User feedback: `"Address feedback: add error handling"`
- Prompt file paths: `"Research prompt at: .paw/work/<work-id>/prompts/01B-spec-research.prompt.md"`
- Additional context: `"implement but add logging"`

**Continue command**: When user says `continue`, proceed to the **first command** in your presented "Next Steps" list (the default next stage). Agents must order their options with the recommended default action first—this becomes the `continue` target.

### Required Handoff Message Format

**CRITICAL**: At the end of your completed work, you MUST present a handoff message with next-step options. Handoff messages are for **successful completion only**. If you are blocked (e.g., merge conflicts, missing info, errors needing user input), present the blocker clearly and STOP - do NOT add "Next Steps" until the blocker is resolved and work is complete.

Format your handoff message as:
1. A brief status line (what was completed)
2. A "Next Steps" list with the logical next stage(s) as short commands with descriptions
3. A guidance line mentioning `status`/`help` and `continue`

```
**[Status of completed work]**

**Next Steps:**
- `[command]` - [description of what this does]

You can ask for `status` or `help`, or say `continue` to [NEXT_STAGE_DESCRIPTION].
```

Rules for handoff messages:
1. **Use short commands** - Match the Command Mapping table above
2. **Include descriptions** - Brief explanation of what each command does
3. **Only list actual next stages** - Don't include `status` or `generate prompt` as next steps
4. **Always include the guidance line** - Reminds users about help and continue
5. **Make continue explicit** - The guidance line must specify what `continue` does, e.g., `say 'continue' to proceed to review`
6. **Order options by recommendation** - Place the default/recommended next step first in "Next Steps"; this becomes the `continue` target

Example handoff message after completing implementation:
```
**Phase 2 implementation complete. All tests passing.**

**Next Steps:**
- `review` - Hand off to PAW agent for implementation review and Phase PR

You can ask for `status` or `help`, or say `continue` to proceed to review.
```

**`continue` behavior**: Proceeds to the first command in "Next Steps" (your default next stage). Do NOT include hard-coded "When user says continue" lines in agent-specific handoff sections—the behavior is derived from your presented options.

**AFTER presenting your handoff message, IMMEDIATELY check handoff mode and act:**
- **Manual mode** → STOP and wait for user command
- **Semi-Auto mode at routine transition** → call `paw_new_session` now
- **Auto mode** → call `paw_new_session` now

Reference `<handoff_instructions>` from `paw_get_context` to determine your mode and whether this is a routine transition.
