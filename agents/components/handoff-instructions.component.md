````markdown
## Handoff Mode and Stage Navigation

Read `Handoff Mode` from WorkflowContext.md at startup. Values: **manual** (default), **semi-auto**, or **auto**.

### Mode Behavior

- **Manual**: Present next-step options, wait for user command
- **Semi-Auto**: Auto-chain at routine transitions, pause at decision points
- **Auto**: Chain immediately (requires local strategy)

### Invoking Handoffs

When transitioning to another stage:
1. Map user request to target agent (e.g., "research" → `PAW-01B Spec Researcher`)
2. Call `paw_call_agent` with: `target_agent`, `work_id`, optional `inline_instruction`
3. Tool opens new chat - your conversation ends

**Inline instructions**: "implement Phase 2 but add logging" → pass "Phase 2 but add logging" as `inline_instruction`

### Generating Prompt Files

When user says "generate prompt for [stage]":
- Call `paw_generate_prompt` with: `work_id`, `template_key`, `filename`, optional `additional_content`
- Inform user of file path for editing

### Prerequisite Validation

Before handoff, validate required artifacts exist. If missing, provide actionable error with artifact path and which command to run first.
````
