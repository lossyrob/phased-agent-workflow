---
date: 2025-12-04T17:34:06-05:00
git_commit: 086d7681650734d1605fffdd23a3eba53e528537
branch: feature/handoff-command-improvements
repository: phased-agent-workflow
topic: "Handoff Command Recognition and Continue Behavior Improvements"
tags: [research, codebase, handoff, commands, agents, templates]
status: complete
last_updated: 2025-12-04
---

# Research: Handoff Command Recognition and Continue Behavior Improvements

**Date**: 2025-12-04 17:34:06 EST
**Git Commit**: 086d7681650734d1605fffdd23a3eba53e528537
**Branch**: feature/handoff-command-improvements
**Repository**: phased-agent-workflow

## Research Question

Focus on: (1) How agents handle feedback: prefix commands and where command recognition logic should be added, (2) How handoff messages are generated and where to add explicit "continue" behavior descriptions, (3) The handoff-instructions.component.md and related agent files that need updates

## Summary

The research focuses on three areas of the PAW handoff mechanism:

1. **Command Recognition**: Currently, command recognition is documented in `handoff-instructions.component.md` but lacks explicit "decision gate" logic that would prevent agents from acting on commands they should hand off. The `feedback:` prefix is mentioned as a local strategy command that should trigger handoff to the Implementer, but there's no explicit instruction for agents to recognize it as a command that preempts their normal behavior.

2. **Continue Behavior**: The `continue` command is documented generically as "proceed to the default next stage", but handoff messages don't explicitly tell users what the next stage will be when they say `continue`. This ambiguity needs to be addressed by making handoff messages include the explicit next agent that will be invoked.

3. **Files to Update**: The primary files requiring updates are `agents/components/handoff-instructions.component.md` (shared component), the three handoff templates (`handoffManual.template.md`, `handoffSemiAuto.template.md`, `handoffAuto.template.md`), and agent-specific handoff sections in key agents.

## Detailed Findings

### 1. Command Recognition Patterns

#### Current State of Command Mapping

The command mapping table exists in `agents/components/handoff-instructions.component.md:12-28`:

```markdown
**Command Mapping** (user command → agent):
| Command | Agent |
|---------|-------|
| `spec`, `specification` | PAW-01A Specification |
| `research` | PAW-01B Spec Researcher (from spec stage) or PAW-02A Code Researcher |
| `plan`, `planner` | PAW-02B Impl Planner |
| `implement`, `implementer` | PAW-03A Implementer |
| `review`, `reviewer` | PAW-03B Impl Reviewer |
| `docs`, `documenter`, `documentation` | PAW-04 Documenter |
| `pr`, `final pr` | PAW-05 PR |
| `status`, `help` | PAW-X Status |
```

#### Feedback Command Documentation

The `feedback:` command is documented in `agents/components/handoff-instructions.component.md:38-42`:

```markdown
**Providing Local Feedback** (local strategy only):
When using local strategy without PRs, the user provides feedback directly:
- `feedback: <user's feedback>` - Hand off to PAW-03A Implementer with feedback as inline instruction
- Example: User says `feedback: add error handling for edge cases` → call `paw_call_agent` with `target_agent: 'PAW-03A Implementer'`, `inline_instruction: 'Address feedback: add error handling for edge cases'`
```

#### Missing Command Recognition Gate

Per the user feedback in `.paw/work/handoff-command-improvements/context/handoff-feedback.md`, the issue is that agents don't have explicit instructions to recognize command prefixes before processing user input. The suggested improvement is to add a decision gate section:

```markdown
### Command Recognition (CRITICAL)

When the user's message starts with one of these patterns, it is a COMMAND that triggers a handoff—do NOT perform the work yourself:

- `feedback: <text>` → Hand off to PAW-03A Implementer (local strategy)
- `address comments` → Hand off to appropriate agent for PR comments
- `implement`, `review`, `docs`, `pr` → Hand off per Command Mapping table

Even if the feedback seems within your documentation/polish scope, the `feedback:` prefix means the user wants the Implementer to address it.
```

This section would need to be added to `agents/components/handoff-instructions.component.md` near the top of the file (after the CRITICAL header).

#### PAW-03B Impl Reviewer Agent-Specific Handling

The Impl Reviewer has additional `feedback:` references in its agent-specific handoff section at `agents/PAW-03B Impl Reviewer.agent.md:400-423`:

```markdown
**local strategy** (no Phase PRs):

Present exactly TWO next steps after pushing changes:
1. `feedback: <your feedback>` - Provide feedback for the Implementer to address (user types feedback inline)
2. `implement` - Continue to Phase N+1 (only if N < M) OR `docs` - Continue to documentation (if N = M)
...
- For local strategy: User types `feedback: <their feedback>` which passes to Implementer as inline instruction
```

This agent is specifically vulnerable to the command recognition issue because its role ("Maintainability - Making Changes Clear and Reviewable") includes documentation changes, which could conflict with `feedback:` commands about documentation.

### 2. Handoff Message Generation

#### Template Structure

Handoff messages are generated according to instructions in `agents/components/handoff-instructions.component.md:52-89`:

```markdown
### Required Handoff Message Format

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
```

#### Current "Continue" Documentation

The continue command behavior is documented generically in `agents/components/handoff-instructions.component.md:45` and `:87`:

- Line 45: `**Continue command**: When user says `continue`, proceed to the default next stage as if in semi-auto/auto mode.`
- Line 87: `**`continue` behavior**: Proceeds to the default next stage (what auto mode would do).`

However, handoff messages don't tell users what the "default next stage" actually is. The guidance line just says "or say `continue`" without specifying the target agent.

#### Required Change: Explicit Continue Target

The handoff message format should be updated to include the explicit next stage when mentioning continue. The guidance line at `agents/components/handoff-instructions.component.md:68` and `:84` should change from:

```markdown
You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue`.
```

To something like:

```markdown
You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue` to proceed to [NEXT_AGENT].
```

Where `[NEXT_AGENT]` is filled in by each agent based on its handoff section.

### 3. Handoff Template Files

#### Template Loading in contextTool.ts

Templates are loaded in `src/tools/contextTool.ts:135-165`:

```typescript
const HANDOFF_TEMPLATE_FILES: Record<HandoffMode, string> = {
  'manual': 'handoffManual.template.md',
  'semi-auto': 'handoffSemiAuto.template.md',
  'auto': 'handoffAuto.template.md',
};

export function getHandoffInstructions(mode: HandoffMode): string {
  const templateFile = HANDOFF_TEMPLATE_FILES[mode] || HANDOFF_TEMPLATE_FILES['manual'];
  const templatePath = getHandoffTemplatePath(templateFile);
  
  try {
    if (templatePath && fs.existsSync(templatePath)) {
      return normalizeContent(fs.readFileSync(templatePath, "utf-8"));
    }
  } catch (error) {
    // Fall through to fallback
  }
  // ...
}
```

#### Template Contents

**Manual Mode** (`src/prompts/handoffManual.template.md:1-14`):
- Key instructions: "STOP and wait for the user to type a command"
- Does NOT auto-proceed

**Semi-Auto Mode** (`src/prompts/handoffSemiAuto.template.md:1-26`):
- Key instructions: Auto-proceed at routine transitions, wait at decision points
- Lists specific routine transitions and decision points

**Auto Mode** (`src/prompts/handoffAuto.template.md:1-16`):
- Key instructions: "Immediately call `paw_call_agent`"
- Does NOT wait for user input

#### Templates Are Runtime-Injected

These templates are injected at runtime via `formatContextResponse()` in `contextTool.ts:420-425`:

```typescript
// Parse handoff mode and add instructions at END for recency bias
const handoffMode = parseHandoffMode(result.workflow_context.content || '');
const handoffInstructions = getHandoffInstructions(handoffMode);
sections.push(`<handoff_instructions>\n${handoffInstructions}\n</handoff_instructions>`);
```

This means the handoff mode templates don't know which agent is currently running or what its default next stage is. The agent-specific logic is in the agent files themselves.

### 4. Agent Files Containing Handoff Logic

#### Files Using {{HANDOFF_INSTRUCTIONS}} Component

All these files include the handoff-instructions component:

| File | Line |
|------|------|
| `agents/PAW-01A Specification.agent.md` | 319 |
| `agents/PAW-01B Spec Researcher.agent.md` | 109 |
| `agents/PAW-02A Code Researcher.agent.md` | 432 |
| `agents/PAW-02B Impl Planner.agent.md` | 420 |
| `agents/PAW-03A Implementer.agent.md` | 350 |
| `agents/PAW-03B Impl Reviewer.agent.md` | 361 |
| `agents/PAW-04 Documenter.agent.md` | 460 |
| `agents/PAW-05 PR.agent.md` | 278 |
| `agents/PAW-X Status.agent.md` | 10 |

#### Agent-Specific Handoff Sections

Each agent has its own handoff section after the `{{HANDOFF_INSTRUCTIONS}}` placeholder:

| Agent | Handoff Section | Default Next Stage |
|-------|-----------------|-------------------|
| PAW-01A Specification | Lines 321-337 | PAW-01B (if research) or PAW-02A |
| PAW-01B Spec Researcher | Lines 111-117 | PAW-01A Specification |
| PAW-02A Code Researcher | Lines 434-441 | PAW-02B Impl Planner |
| PAW-02B Impl Planner | Lines 422-430 | PAW-03A Implementer |
| PAW-03A Implementer | Lines 352-358 | PAW-03B Impl Reviewer |
| PAW-03B Impl Reviewer | Lines 363-423 | PAW-03A (next phase) or PAW-04 |
| PAW-04 Documenter | Lines 462-474 | PAW-05 PR |
| PAW-05 PR | Lines 280-310 | Terminal (workflow complete) |

#### PAW-03B Impl Reviewer Specific Vulnerability

The Impl Reviewer (`agents/PAW-03B Impl Reviewer.agent.md`) is most vulnerable to the command recognition issue because:

1. Its role description at lines 122-134 includes "Generate docstrings and code comments"
2. Its "small refactors" guidance at line 197 says: `For **small refactors** (removing a parameter, extracting duplicate utility to shared location): Make the change yourself and commit it`
3. When a user says `feedback: add clarifying comments`, the agent may interpret this as within its documentation scope rather than as a handoff command

## Code References

- `agents/components/handoff-instructions.component.md:1-91` - Main handoff component with command mapping and message format
- `agents/components/handoff-instructions.component.md:38-42` - Feedback command documentation
- `agents/components/handoff-instructions.component.md:45` - Continue command definition
- `agents/components/handoff-instructions.component.md:52-89` - Required handoff message format
- `src/tools/contextTool.ts:128-165` - Handoff template loading and injection
- `src/prompts/handoffManual.template.md:1-14` - Manual mode template
- `src/prompts/handoffSemiAuto.template.md:1-26` - Semi-auto mode template
- `src/prompts/handoffAuto.template.md:1-16` - Auto mode template
- `agents/PAW-03B Impl Reviewer.agent.md:361-423` - Impl Reviewer handoff section with feedback command usage
- `.paw/work/handoff-command-improvements/context/handoff-feedback.md` - User feedback describing the issue

## Architecture Documentation

### Component Inclusion Pattern

Agent files use `{{HANDOFF_INSTRUCTIONS}}` placeholder which is replaced at runtime by `agentTemplateRenderer.ts:52-71`:

```typescript
export function processAgentTemplate(
  content: string,
  agentIdentifier: string,
  components: Map<string, string>
): string {
  let result = content;

  for (const [componentName, componentContent] of components.entries()) {
    const componentPlaceholder = `{{${componentName}}}`;
    if (!result.includes(componentPlaceholder)) {
      continue;
    }

    const expandedComponent = substituteVariables(
      componentContent,
      new Map<string, string>([['AGENT_NAME', agentIdentifier]])
    );

    result = result.split(componentPlaceholder).join(expandedComponent);
  }

  return result;
}
```

### Handoff Instruction Flow

1. Agent calls `paw_get_context` tool
2. `contextTool.ts:getContext()` loads WorkflowContext.md
3. `contextTool.ts:parseHandoffMode()` extracts handoff mode from content
4. `contextTool.ts:getHandoffInstructions()` loads appropriate template
5. `contextTool.ts:formatContextResponse()` injects template into `<handoff_instructions>` section
6. Agent receives mode-specific instructions telling it how to behave

### Key Design Insight

The handoff mode templates are generic and don't know which agent is running. Agent-specific next stages are defined in each agent file's handoff section. This means:

- The "continue" target is implicitly defined by each agent's handoff section
- Users don't know what "continue" does because handoff messages don't specify the target
- Command recognition must be added to the shared component since all agents should recognize commands uniformly

## Open Questions

1. **Template vs Component location for command recognition**: Should the command recognition decision gate be in `handoff-instructions.component.md` (compile-time inclusion) or in the handoff mode templates (runtime injection via contextTool)?

2. **Continue target format**: Should the guidance line be updated to always say `continue → [Agent Name]` or should it use a more user-friendly format like `continue to implementation`?

3. **Scope boundaries for Impl Reviewer**: The user feedback suggests adding explicit scope boundary documentation. Should this be in `handoff-instructions.component.md` or only in `PAW-03B Impl Reviewer.agent.md`?
