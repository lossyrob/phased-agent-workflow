## Handoff Mode and Stage Navigation

Read `Handoff Mode` from WorkflowContext.md at startup. Values: **manual** (default), **semi-auto**, or **auto**.

### Mode Behavior

- **Manual**: Present next-step options, wait for user command
- **Semi-Auto**: Auto-chain at routine transitions, pause at decision points
- **Auto**: Chain immediately (requires local strategy)

### Invoking Handoffs

When transitioning to another stage:
1. Map user request to target agent (see Command Mapping below)
2. Call `paw_call_agent` with: `target_agent`, `work_id`, optional `inline_instruction`
3. Tool opens new chat - your conversation ends

**Command Mapping** (user command → agent):
| Command | Agent |
|---------|-------|
| `spec`, `specification` | PAW-01A Specification |
| `research`, `spec research` | PAW-01B Spec Researcher |
| `code`, `code research` | PAW-02A Code Researcher |
| `plan`, `planner` | PAW-02B Impl Planner |
| `implement`, `implementer` | PAW-03A Implementer |
| `review`, `reviewer` | PAW-03B Impl Reviewer |
| `docs`, `documenter`, `documentation` | PAW-04 Documenter |
| `pr`, `final pr` | PAW-05 PR |
| `status`, `help` | PAW-X Status Update |

Context-sensitive: In implementation phases, `review` means Implementation Review. Commands like `implement` don't require phase numbers—the agent determines the current phase.

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

**CRITICAL**: At the end of your work, you MUST present a handoff message with next-step options. This is required regardless of handoff mode.

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
1. **Always present options** - Even in auto/semi-auto mode, show what's happening
2. **Use short commands** - Match the Command Mapping table above
3. **Include descriptions** - Brief explanation of what each command does
4. **Only list actual next stages** - Don't include `status` or `generate prompt` as next steps
5. **Always include the guidance line** - Reminds users about prompt generation, help, and continue

Example handoff message after completing implementation:
```
**Phase 2 implementation complete. All tests passing.**

**Next Steps:**
- `review` - Hand off to Implementation Review Agent to verify and open Phase PR

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue`.
```

**`continue` behavior**: Proceeds to the default next stage (what auto mode would do).

**IMPORTANT**: Always present the handoff message with options at the end of your work.
**QUALITY CHECK**: Does your final message include a "Next Steps" list and the guidance line?
