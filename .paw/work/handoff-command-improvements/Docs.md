# Handoff Command Improvements

## Overview

The PAW agent handoff mechanism has been enhanced to prevent agents from misinterpreting user commands as actionable suggestions and to make the `continue` command behavior explicit and predictable. Previously, when users provided commands like `feedback: add comments`, agents would sometimes perform the requested work themselves instead of recognizing the command prefix as a handoff trigger. Additionally, handoff messages instructed users to say `continue` without clarifying which agent would be invoked next, leading to uncertainty about workflow transitions.

These improvements address both issues through five coordinated phases: explicit command recognition at decision gates, standardized handoff message formatting with explicit continue targets, workflow corrections to prevent premature specification creation, context preservation through research phases via agent notes, and improved agent-to-agent communication by including prompt file paths in handoff instructions.

The changes are primarily documentation updates to agent prompt files, focusing on the shared handoff component (`agents/components/handoff-instructions.component.md`) and individual agent files. No runtime code changes were required—the improvements work within GitHub Copilot's existing agent framework by clarifying instructions and establishing consistent patterns.

## Architecture and Design

### High-Level Architecture

The handoff mechanism consists of three layers:

1. **Shared Component Layer** - `agents/components/handoff-instructions.component.md` defines common handoff patterns, command mapping, and message formatting used across all implementation workflow agents
2. **Agent-Specific Layer** - Each agent file contains a handoff section that references the shared component and defines stage-specific transitions
3. **Tool Integration Layer** - The `paw_call_agent` tool (implemented in `src/tools/handoffTool.ts`) handles actual agent invocations with work ID and optional inline instructions

### Design Decisions

**Command Recognition as Decision Gate**

Rather than requiring agents to parse command syntax at runtime, we added a "Command Recognition (CRITICAL)" section at the top of the handoff component that explicitly lists command patterns and their meanings. This decision gate approach ensures agents check for command prefixes BEFORE attempting any work, preventing the confusion where an agent sees `feedback: add comments` and thinks "comments are my responsibility, I'll do this."

**Dynamic Continue Target Derivation**

Instead of hard-coding "when user says continue, do X" in each agent's handoff section, continue behavior is derived from the first item in the agent's presented "Next Steps" list. This design ensures continue targets are always consistent with what the agent tells the user, eliminates redundant documentation, and makes it obvious to both users and agents what will happen when continue is invoked.

The guidance line format was standardized to: `You can ask me to generate a prompt file for the next stage, ask for 'status' or 'help', or say 'continue' to [NEXT_STAGE_DESCRIPTION].` where the description matches the first Next Steps option.

**Agent Notes Through Research Workflow**

During specification development, the Spec Agent often accumulates important context—assumptions, constraints, initial thoughts—that would be valuable for the Spec Researcher. Rather than losing this context at the handoff boundary, we added an optional "Agent Notes" section to the research prompt format and a corresponding section in SpecResearch.md. This preserves agent thought process bidirectionally: Spec Agent → research prompt → SpecResearch.md → back to Spec Agent when integrating findings.

**Deferred Spec Creation Until Research Complete**

The original Spec Agent workflow had ambiguous timing for when to write Spec.md—it could create the specification before research, leading to specs with unresolved questions. We added three strategic checkpoints in the workflow to enforce correct sequencing: generate research prompt → pause and hand off → integrate research findings → THEN create Spec.md. This ensures specifications are complete and research-informed from the start.

**Prompt File Paths in Handoff Instructions**

When the Spec Agent hands off to the Spec Researcher, the researcher needs to know where to find the generated prompt file. Rather than requiring the researcher to search, we enhanced the handoff to include the prompt path as part of the `inline_instruction` parameter. This pattern generalizes to any agent-to-agent handoff where contextual information (file paths, phase numbers, additional requirements) should be passed along.

We also clarified the `inline_instruction` parameter description in `handoffTool.ts` to document its multiple use cases: user feedback, prompt file paths, and general agent-to-agent context.

### Integration Points

**Handoff Component Integration**

All implementation workflow agents (`PAW-01A` through `PAW-05`) include the handoff-instructions component at the end of their agent file. Review workflow agents (`PAW-R1A` through `PAW-R3B`) use a separate `review-handoff-instructions.component.md` that follows the same patterns but with review-specific command mappings.

The component integration happens at agent file render time (when GitHub Copilot loads the agent), meaning changes to the shared component automatically propagate to all agents that include it.

**Tool Integration**

The `paw_call_agent` tool defined in `src/tools/handoffTool.ts` is invoked by agents when transitioning stages. The tool takes three parameters:

- `target_agent` - The exact agent name from the command mapping table
- `work_id` - The feature slug identifying which workflow to continue
- `inline_instruction` (optional) - Additional context, feedback, or file paths to pass to the target agent

The tool opens a new GitHub Copilot chat session with the target agent, passing along the work ID and any inline instructions. The calling agent's conversation ends at this point.

**Workflow Context Integration**

All agents call `paw_get_context` at startup to retrieve workflow parameters from `WorkflowContext.md`, including the Review Strategy field that determines whether to use intermediate PRs (`prs` strategy) or direct commits to target branch (`local` strategy). The command recognition section differentiates behavior based on this strategy:

- `prs` strategy: `address comments` and `check pr` commands for PR review workflows
- `local` strategy: `feedback: <text>` commands for direct feedback without PRs

## User Guide

### Prerequisites

- GitHub Copilot installed and active in VS Code
- PAW agents installed (via extension or manual installation)
- An active PAW workflow with `WorkflowContext.md` present

### Basic Usage

#### Recognizing Command vs Suggestion

When working with PAW agents, messages starting with specific keywords are **commands** that trigger handoffs to other agents. These should NOT be interpreted as suggestions for the current agent to act on.

**Command patterns:**
- `feedback: <text>` - Hand off to Implementer with feedback (local strategy)
- `address comments` or `check pr` - Hand off to appropriate agent for PR comments
- `implement`, `review`, `docs`, `pr`, `spec`, `research`, `plan`, `status` - Stage transition commands

**Example - What NOT to do:**
```
User: feedback: add clarifying comments to the validation logic
❌ Agent interprets this as "I should add comments myself"
```

**Example - Correct behavior:**
```
User: feedback: add clarifying comments to the validation logic
✅ Agent recognizes "feedback:" prefix and hands off to PAW-03A Implementer
```

#### Understanding Continue Behavior

When an agent completes its work, it presents a handoff message with "Next Steps" options. The `continue` command proceeds to the **first option** in that list (the default/recommended next stage).

**Example handoff message:**
```
**Phase 2 implementation complete. All tests passing.**

**Next Steps:**
- `review` - Hand off to Implementation Review Agent to verify and open Phase PR
- `implement Phase 3` - Start next implementation phase
- `docs` - Skip to documentation (if all phases complete)

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue` to proceed to review.
```

In this example:
- Saying `continue` invokes the review agent (first option)
- Saying `implement Phase 3` skips review and goes to next phase
- Saying `docs` skips remaining phases and goes to documentation

The guidance line always explicitly states what `continue` will do, removing ambiguity.

#### Using Inline Instructions

You can customize agent behavior by adding context to commands:

**User feedback (local strategy):**
```
feedback: add error handling for edge cases
```

**Stage transition with customization:**
```
implement Phase 2 but add rate limiting
research but skip external dependencies
docs but focus on API reference
```

**Prompt generation with context:**
```
generate prompt for implementer Phase 3
```

The text after the command keyword becomes the `inline_instruction` passed to the target agent.

### Advanced Usage

#### Agent Notes in Spec Research

When the Spec Agent generates a research prompt, it can include accumulated notes and context:

**In research prompt (generated by Spec Agent):**
```markdown
## Agent Notes
- Considered using existing auth middleware but user requested custom implementation
- Security requirements imply need for rate limiting
- Integration with external API requires understanding current retry logic
```

These notes appear in `SpecResearch.md` and return to the Spec Agent when integrating research findings, preserving the agent's thought process across the handoff boundary.

#### Prompt File Path Handoffs

When agents hand off to others requiring prompt files, the prompt path is included in the handoff:

**Spec Agent handoff to Spec Researcher:**
```
Handing off to Spec Researcher...
inline_instruction: "Research prompt at: .paw/work/my-feature/prompts/01B-spec-research.prompt.md"
```

The Spec Researcher receives this path and can immediately read the prompt file without searching.

### Configuration

#### Review Strategy Impact on Commands

Your workflow's Review Strategy (from `WorkflowContext.md`) determines which commands are available:

**prs strategy** (uses intermediate PRs):
- `address comments` - Address PR review comments
- `check pr` - Alternative command for PR comments
- Phase PR → Implementer makes changes → Reviewer verifies and pushes
- Docs PR → Documenter addresses comments
- Final PR → Implementer makes changes → Reviewer verifies and pushes

**local strategy** (direct commits to target branch):
- `feedback: <text>` - Provide feedback directly without PRs
- Implementer makes changes and commits to target branch
- Reviewer verifies changes locally

## Technical Reference

### Key Components

**Handoff Instructions Component** (`agents/components/handoff-instructions.component.md`)

The shared component used by all implementation workflow agents defines:
- Command recognition patterns and decision gates
- Command-to-agent mapping table
- Handoff message format requirements and rules
- Continue behavior derivation logic
- Inline instruction usage patterns

Key sections:
1. Command Recognition (CRITICAL) - Decision gate for command prefix detection
2. Invoking Handoffs - Command mapping table and transition instructions
3. Required Handoff Message Format - Standardized format with 6 rules

**Review Handoff Instructions Component** (`agents/components/review-handoff-instructions.component.md`)

Similar to the main handoff component but tailored for review workflow agents (PAW-R1A through PAW-R3B):
- Review-specific command mapping (understanding, baseline, impact, gap, feedback, critic)
- Continue behavior for review stages
- Terminal stage guidance for PAW-R3B Feedback Critic

**Handoff Tool** (`src/tools/handoffTool.ts`)

Implements the `paw_call_agent` MCP tool that agents invoke to transition stages. Parameters:
- `target_agent` (required) - Exact agent name from command mapping
- `work_id` (required) - Feature slug for workflow continuity
- `inline_instruction` (optional) - Additional context or feedback

The tool opens a new GitHub Copilot chat session with the target agent, ending the caller's session.

### Behavior and Algorithms

#### Command Recognition Algorithm

When an agent receives a user message:

1. Check if message starts with any command pattern from the Command Recognition table
2. If match found:
   - Extract command keyword and optional inline instruction
   - Map command to target agent using Command Mapping table
   - Call `paw_call_agent` with target agent, work ID, and inline instruction
   - Agent's conversation ends (new chat opens for target agent)
3. If no match:
   - Process message as normal agent work (not a handoff command)

This algorithm runs as a conceptual "decision gate" that agents check before performing work.

#### Continue Target Derivation

When presenting a handoff message:

1. Determine logical next stages based on workflow state
2. Order next stages with recommended/default option first
3. Format "Next Steps" list with first item as default
4. Generate guidance line using first item's description
   - Template: `say 'continue' to [FIRST_OPTION_DESCRIPTION]`
5. When user says `continue`, proceed to first option in Next Steps

This ensures continue behavior is always explicit and consistent with what the agent presents.

#### Agent Notes Preservation Flow

**During Spec Agent workflow:**

1. Spec Agent accumulates notes during intake/decomposition
2. When generating research prompt:
   - Check if notes exist
   - If yes: Include "Agent Notes" section with notes content
   - If no: Omit section entirely (no empty placeholder)
3. Write prompt file to `.paw/work/<feature-slug>/prompts/01B-spec-research.prompt.md`

**During Spec Research workflow:**

1. Spec Researcher reads research prompt
2. If "Agent Notes" section exists:
   - Preserve notes verbatim in SpecResearch.md section 2
   - Include context when answering research questions
3. If section doesn't exist: Omit from SpecResearch.md

**During Spec Integration:**

1. Spec Agent reads SpecResearch.md
2. If "Agent Notes" section exists: Reference notes when integrating research and creating Spec.md
3. Notes inform specification decisions and assumption documentation

### Error Handling

**Unrecognized Commands**

If a user types a command that doesn't match the command mapping table, agents treat it as normal conversational input rather than a handoff trigger. This is intentional—only documented command patterns trigger handoffs.

If you meant to trigger a handoff but used the wrong keyword, refer to the Command Mapping table in the handoff component to find the correct command.

**Missing Work ID**

The `paw_call_agent` tool requires a work ID (feature slug) to maintain workflow context. If the work ID is missing or incorrect, the handoff will fail. Ensure you're working within an initialized PAW workflow with a valid `WorkflowContext.md` file.

**Invalid Target Agent**

If an agent attempts to hand off to a non-existent agent name, the tool will fail. Agent names must match exactly as shown in the Command Mapping table (e.g., `PAW-03A Implementer`, not `implementer` or `Implementation Agent`).

**Scope Boundary Violations (Implementation Review Agent)**

The Implementation Review Agent has explicit scope boundaries documented in its "Scope Boundaries (CRITICAL)" section. Before making any edit, the agent checks:

1. Did the user's message start with `feedback:`? → STOP, hand off to Implementer
2. Am I responding to a command that requires handoff? → STOP, hand off
3. Is this my initial review pass or responding to feedback?
   - Initial review → Can make documentation/polish changes
   - Responding to feedback → Hand off to Implementer

Violating these boundaries (e.g., making changes in response to `feedback:` commands) is considered an error. The decision gate prevents this.

## Usage Examples

### Example 1: Local Strategy Feedback Flow

User working in local strategy (no intermediate PRs) wants to provide feedback after Implementation Review:

**User:**
```
feedback: add error handling for network timeouts
```

**Implementation Review Agent:**
- Recognizes `feedback:` command prefix
- Extracts inline instruction: "add error handling for network timeouts"
- Calls `paw_call_agent`:
  - `target_agent`: `'PAW-03A Implementer'`
  - `work_id`: `'my-feature'`
  - `inline_instruction`: `'Address feedback: add error handling for network timeouts'`
- Agent's conversation ends

**PAW-03A Implementer (new chat):**
- Receives work ID and inline instruction
- Implements error handling for network timeouts
- Commits changes to target branch
- Presents handoff message with `review` as first option

### Example 2: Explicit Continue Behavior

Implementation Agent completes Phase 2 and presents handoff message:

**Agent:**
```
**Phase 2 implementation complete. All tests passing.**

**Next Steps:**
- `review` - Hand off to Implementation Review Agent to verify and open Phase PR
- `implement Phase 3` - Start next implementation phase

You can ask me to generate a prompt file for the next stage, ask for `status` or `help`, or say `continue` to proceed to review.
```

**User says `continue`:**
- Agent recognizes this as "proceed to first option in Next Steps"
- First option is `review`
- Agent calls `paw_call_agent` with `target_agent: 'PAW-03B Impl Reviewer'`

**User says `implement Phase 3` instead:**
- Agent recognizes explicit command
- Skips review and goes directly to Phase 3 implementation

### Example 3: Agent Notes Through Research

Spec Agent generates research prompt after intake:

**Research prompt file (`.paw/work/auth-system/prompts/01B-spec-research.prompt.md`):**
```markdown
---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Auth System

## Agent Notes
- User requested integration with existing session middleware
- Security requirement: passwords must be hashed with bcrypt (mentioned in issue)
- Considered JWT vs session tokens - leaning toward JWTs for stateless API
- Need to understand current user model structure before designing auth tables

## Questions
1. What is the current session middleware implementation?
2. What fields exist in the User model?
3. How are API authentication errors currently handled?
```

**Spec Researcher workflow:**
- Reads prompt file, sees Agent Notes section
- Understands context and constraints while researching
- Preserves notes in SpecResearch.md:

```markdown
# Auth System - Spec Research

## Summary
[research summary]

## Agent Notes
- User requested integration with existing session middleware
- Security requirement: passwords must be hashed with bcrypt (mentioned in issue)
- Considered JWT vs session tokens - leaning toward JWTs for stateless API
- Need to understand current user model structure before designing auth tables

## Research Findings
[answers to questions]
```

**Spec Agent integration:**
- Reads SpecResearch.md
- References Agent Notes when making design decisions
- Documents assumptions informed by both notes and research
- Creates Spec.md with complete context

## Edge Cases and Limitations

### Command Prefix Ambiguity

If a user's message naturally starts with a command keyword but isn't intended as a command, the agent may misinterpret it as a handoff trigger.

**Example:**
```
User: "Review the implementation and let me know if..."
Agent interprets "Review" as command, attempts handoff
```

**Mitigation:** Command matching is case-sensitive where appropriate, and full command phrases (like `address comments`) reduce false positives. If misinterpretation occurs, rephrase to avoid starting messages with command keywords.

### Terminal Stages

Some agents (PAW-05 PR, PAW-R3B Feedback Critic) are terminal stages where `continue` has context-specific meaning:

- **PAW-05 PR**: Continue addresses review comments on the final PR (if any exist)
- **PAW-R3B Feedback Critic**: Continue revises feedback based on critique findings

These agents clarify what `continue` does in their terminal context since there's no "next stage" in the workflow.

### Agent Notes Section Overhead

If the Spec Agent has no meaningful notes to share, the "Agent Notes" section should be omitted from the research prompt. Similarly, if the prompt has no notes section, the Spec Researcher should not create an empty placeholder in SpecResearch.md.

Always include notes only when they provide value—avoid creating empty sections.

### Spec Agent Token Limit

After adding deferred spec creation and agent notes handling, the Spec Agent file size increased to ~7000 tokens. A temporary threshold increase (to 10,000 tokens) was added to the agent linter script to accommodate this. Future optimization may be needed to reduce token count while preserving functionality.

## Testing Guide

### How to Test Command Recognition

**Test the feedback command (local strategy):**

1. Initialize a PAW workflow with Review Strategy: local
2. Run Implementation Agent for a phase
3. Run Implementation Review Agent
4. When review completes, type: `feedback: add unit tests for edge cases`
5. Verify the review agent hands off to the implementer instead of adding tests itself
6. Check that implementer receives the inline instruction correctly

**Test PR comment commands (prs strategy):**

1. Initialize a PAW workflow with Review Strategy: prs
2. Create a Phase PR with review comments
3. Type: `address comments` or `check pr`
4. Verify the agent hands off to the appropriate agent for the PR type
   - Phase PR → PAW-03A Implementer
   - Docs PR → PAW-04 Documenter
   - Final PR → PAW-03A Implementer

### How to Test Continue Behavior

**Test default continue target:**

1. Run any PAW agent through to completion
2. Note the "Next Steps" options in the handoff message
3. Note what the guidance line says `continue` will do
4. Type `continue`
5. Verify the first option in Next Steps is invoked
6. Verify it matches what the guidance line said

**Test explicit command overriding continue:**

1. Same setup as above, but instead of `continue`, type the second option from Next Steps
2. Verify that option is invoked instead of the default

### How to Test Agent Notes

**Test notes preservation through research:**

1. Initialize a PAW workflow and start Spec Agent
2. Let the agent accumulate notes during intake (it should mention assumptions or context)
3. When agent generates research prompt, check the file at `.paw/work/<feature-slug>/prompts/01B-spec-research.prompt.md`
4. Verify "Agent Notes" section exists if notes were mentioned
5. Run Spec Researcher agent
6. Check SpecResearch.md for "Agent Notes" section (should be section 2, after Summary)
7. Verify notes are preserved verbatim
8. Return to Spec Agent to integrate research
9. Verify agent references notes when creating Spec.md

**Test omission of empty notes:**

1. Create a research prompt manually without "Agent Notes" section
2. Run Spec Researcher
3. Verify SpecResearch.md does not have an empty "Agent Notes" section

### How to Test Deferred Spec Creation

**Test correct workflow sequence:**

1. Initialize a PAW workflow and start Spec Agent
2. Provide an issue that has unknowns requiring research
3. Monitor agent behavior:
   - ✅ Agent generates research prompt
   - ✅ Agent pauses and instructs running Spec Researcher
   - ✅ Agent does NOT write Spec.md yet
4. Run Spec Researcher
5. Return to Spec Agent with SpecResearch.md present
6. Verify agent integrates research THEN creates Spec.md
7. Check that Spec.md is informed by research findings

**Test explicit research skip:**

1. Start Spec Agent with a clear, unambiguous issue
2. Agent determines no research needed
3. Verify agent creates Spec.md immediately (no research phase)

### How to Test Prompt Path Handoff

**Test Spec Agent to Spec Researcher handoff:**

1. Initialize PAW workflow and start Spec Agent
2. Let agent generate research prompt
3. When agent hands off, check the inline instruction
4. Verify it includes: `Research prompt at: .paw/work/<feature-slug>/prompts/01B-spec-research.prompt.md`
5. Start Spec Researcher (new chat)
6. Verify researcher mentions reading the prompt file at that path
7. Confirm researcher doesn't waste time searching for the prompt

## Migration and Compatibility

### Upgrading from Pre-Improvement PAW

If you have existing PAW workflows using agents before these improvements:

1. **Update agents**: Reinstall PAW agents (via extension update or manual copy) to get improved handoff instructions
2. **No workflow file changes needed**: Existing `WorkflowContext.md`, `Spec.md`, `ImplementationPlan.md`, etc. remain compatible
3. **Handoff behavior changes**:
   - Agents will now recognize command prefixes and hand off instead of acting directly
   - Agents will present explicit continue targets in handoff messages
   - `feedback:` commands in local strategy will properly hand off to implementer
4. **Review Strategy**: Existing workflows should already have Review Strategy set in `WorkflowContext.md`. If missing, defaults to `prs` strategy.

### Backward Compatibility

**Agent notes in research prompts:** Optional section, can be omitted. Older SpecResearch.md files without "Agent Notes" section remain valid and work correctly.

**Hard-coded continue lines:** Older agent versions may have had "When user says continue, do X" lines in handoff sections. These are now removed (behavior is derived from Next Steps). If you manually created prompt files with these lines, they're harmless but redundant—delete them for clarity.

**Command recognition:** New command patterns (`feedback:`, `address comments`, `check pr`) are additions. Older workflows that didn't use these patterns continue to work as before.

### Breaking Changes

**None.** All changes are additive or clarifications to existing behavior. No existing workflows should break.

The only behavior change is **fixing a bug** where agents incorrectly acted on `feedback:` commands instead of handing off. This is a correction, not a breaking change.

## References

- User feedback: `.paw/work/handoff-command-improvements/context/handoff-feedback.md`
- Implementation plan: `.paw/work/handoff-command-improvements/ImplementationPlan.md`
- Code research: `.paw/work/handoff-command-improvements/CodeResearch.md`
- Handoff instructions component: `agents/components/handoff-instructions.component.md`
- Review handoff component: `agents/components/review-handoff-instructions.component.md`
- Handoff tool implementation: `src/tools/handoffTool.ts`
- PAW Specification: `paw-specification.md`
- Agent files: `agents/PAW-01A Specification.agent.md` through `PAW-05 PR.agent.md`
- Review agent files: `agents/PAW-R1A Understanding.agent.md` through `agents/PAW-R3B Feedback Critic.agent.md`
