````markdown
## Handoff Mode and Stage Navigation

**CRITICAL**: Your handoff behavior is determined by the `<handoff_instructions>` section returned by `paw_get_context`. You MUST reference that section to know whether to wait for user input or auto-proceed. The instructions below provide the structure; the tool result tells you HOW to behave.

### Command Recognition (CRITICAL)

When the user's message starts with one of these patterns, it is a **COMMAND** that triggers a handoff—do NOT perform the work yourself:

| Pattern | Action |
|---------|--------|
| `spec`, `research`, `plan`, `validate` | Hand off per Command Mapping table below |
| `status`, `help` | Hand off to PAW-X Status |

**IMPORTANT**: Even if the command content seems within your current scope, the command prefix means the user wants the designated agent to handle it. Recognize the command and hand off.

### Invoking Handoffs

When transitioning to another stage:
1. Map user request to target agent (see Command Mapping below)
2. Call `paw_call_agent` with: `target_agent`, `work_id`, optional `inline_instruction`
3. Tool opens new chat - your conversation ends

**Command Mapping** (user command → agent):
| Command | Cross-Repo Agent |
|---------|-----------------|
| `spec`, `specification` | PAW-M01A Cross-Repo Spec |
| `research` | PAW-M01B Cross-Repo Spec Researcher (from spec stage) or PAW-M02A Cross-Repo Code Researcher (from planning stages) |
| `plan`, `planner` | PAW-M02B Cross-Repo Impl Planner |
| `validate`, `validator` | PAW-M03 Cross-Repo Validator |
| `status`, `help` | PAW-X Status |

Context-sensitive commands:
- `research`: Maps to Spec Researcher when coming from Spec stage, Code Researcher when coming from completed spec research or planning stages

**Note**: Cross-repo workflows do NOT have `implement`, `review`, `docs`, or `pr` commands at the coordinator level. Those operations happen within child workflows in each affected repository. Use `validate` to check child workflow implementations.

**Inline instructions**: Use `inline_instruction` parameter to pass context to the next agent. Common uses:
- Prompt file paths: `"Research prompt at: .paw/multi-work/<work-id>/prompts/M01B-cross-repo-spec-research.prompt.md"`
- Additional context: `"validate repo-a and repo-b only"`

**Continue command**: When user says `continue`, proceed to the **first command** in your presented "Next Steps" list (the default next stage). Agents must order their options with the recommended default action first—this becomes the `continue` target.

### Generating Prompt Files

When user says "generate prompt for [stage]":
- Call `paw_generate_prompt` with: `work_id`, `template_key`, `filename`, optional `additional_content`
- Inform user of file path for editing

### Required Handoff Message Format

**CRITICAL**: At the end of your completed work, you MUST present a handoff message with next-step options. Handoff messages are for **successful completion only**. If you are blocked (e.g., missing artifacts, unresolved questions), present the blocker clearly and STOP - do NOT add "Next Steps" until the blocker is resolved and work is complete.

Format your handoff message as:
1. A brief status line (what was completed)
2. A "Next Steps" list with the logical next stage(s) as short commands with descriptions
3. A guidance line mentioning `generate prompt`, `status`/`help`, and `continue`

```
**[Status of completed work]**

**Next Steps:**
- `[command]` - [description of what this does]

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue` to [NEXT_STAGE_DESCRIPTION].
```

Rules for handoff messages:
1. **Use short commands** - Match the Command Mapping table above
2. **Include descriptions** - Brief explanation of what each command does
3. **Only list actual next stages** - Don't include `status` or `generate prompt` as next steps
4. **Always include the guidance line** - Reminds users about prompt generation, help, and continue
5. **Make continue explicit** - The guidance line must specify what `continue` does, e.g., `say 'continue' to proceed to code research`
6. **Order options by recommendation** - Place the default/recommended next step first in "Next Steps"; this becomes the `continue` target

Example handoff message after completing cross-repo spec:
```
**CrossRepoSpec.md complete. Ready for implementation planning.**

**Next Steps:**
- `research` - Hand off to Code Researcher to analyze implementation details
- `plan` - Skip research and proceed directly to implementation planning

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue` to proceed to code research.
```

**`continue` behavior**: Proceeds to the first command in "Next Steps" (your default next stage). Do NOT include hard-coded "When user says continue" lines in agent-specific handoff sections—the behavior is derived from your presented options.

**AFTER presenting your handoff message, IMMEDIATELY check handoff mode and act:**
- **Manual mode** → STOP and wait for user command
- **Semi-Auto mode at routine transition** → call `paw_call_agent` now
- **Auto mode** → call `paw_call_agent` now

Reference `<handoff_instructions>` from `paw_get_context` to determine your mode and whether this is a routine transition.

````
