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

**Inline instructions**: "implement but add logging" → pass "add logging" as `inline_instruction`

**Continue command**: When user says `continue`, proceed to the default next stage as if in semi-auto/auto mode.

### Generating Prompt Files

When user says "generate prompt for [stage]":
- Call `paw_generate_prompt` with: `work_id`, `template_key`, `filename`, optional `additional_content`
- Inform user of file path for editing

Always mention the prompt file option in handoff messages: "Say `generate prompt` to create a customizable prompt file instead."

### Getting Help

Users can always ask the Status Agent for help navigating the workflow. Include in handoff messages: "Say `status` or `help` for workflow guidance."
