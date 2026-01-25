---
date: 2026-01-25 01:43:52 EST
git_commit: f579841739f23c2847b6a7a3f192ea49541d815e
branch: feature/164-implementation-skills-migration
repository: phased-agent-workflow
topic: "Implementation Skills Migration Architecture"
tags: [research, codebase, agents, skills, migration, orchestration]
status: complete
last_updated: 2026-01-25
---

# Research: Implementation Skills Migration Architecture

**Date**: 2026-01-25 01:43:52 EST
**Git Commit**: f579841739f23c2847b6a7a3f192ea49541d815e
**Branch**: feature/164-implementation-skills-migration
**Repository**: phased-agent-workflow

## Research Question

Document the codebase implementation details for migrating 9 implementation agents (PAW-01A through PAW-05, PAW-X Status) to a single-agent skills-based architecture, following the review workflow pattern from PR #156.

## Summary

The PAW implementation workflow currently consists of 9 separate agent files totaling ~163KB of content. Each agent contains substantial shared scaffolding: PAW context loading via template variable `{{PAW_CONTEXT}}` (~3KB component), handoff instructions via `{{HANDOFF_INSTRUCTIONS}}` (~6.5KB component), and duplicated workflow mode/review strategy handling. The reference pattern for migration is PAW Review.agent.md (~3.5KB), which delegates to a workflow skill (`paw-review-workflow`, ~10KB) that orchestrates activity skills (~104KB total for 8 review skills). Skills are loaded on-demand via `paw_get_skill` tool, enabling smaller agent base prompts while preserving detailed behavior in skills.

The extension installer (`src/agents/installer.ts`) processes `.agent.md` files via `loadAgentTemplates()`, expanding component templates and installing to VS Code's prompts directory. Skills are loaded from `skills/<skill-name>/SKILL.md` via `src/skills/skillLoader.ts`. The migration requires creating new implementation skills, updating the installer to handle the consolidated agent, and deprecating the 9 individual agent files.

## Detailed Findings

### Current Implementation Agent Structure

Each implementation agent follows a consistent pattern with these structural elements:

**Agent Files** (in `agents/`):
| Agent | File | Size (chars) | Purpose |
|-------|------|--------------|---------|
| PAW-01A | `PAW-01A Specification.agent.md` | 23,266 | Convert issue/brief to structured specification |
| PAW-01B | `PAW-01B Spec Researcher.agent.md` | 6,550 | Answer factual questions about existing system |
| PAW-02A | `PAW-02A Code Researcher.agent.md` | 18,201 | Document implementation details with file:line refs |
| PAW-02B | `PAW-02B Impl Planner.agent.md` | 20,232 | Create phased implementation plans |
| PAW-03A | `PAW-03A Implementer.agent.md` | 19,377 | Execute plan phases, write code |
| PAW-03B | `PAW-03B Impl Reviewer.agent.md` | 18,538 | Review implementation, add docs, open PRs |
| PAW-04 | `PAW-04 Documenter.agent.md` | 21,885 | Create Docs.md and update project docs |
| PAW-05 | `PAW-05 PR.agent.md` | 12,688 | Open final PR to main |
| PAW-X | `PAW-X Status.agent.md` | 22,519 | Workflow navigation and status |

**Common Agent Structure** (observed across all agents):
```
---
description: 'Agent description'
---
# Agent Title

[Role description]

{{PAW_CONTEXT}}     ← Expands to ~3KB of context loading instructions

[Core Responsibilities]
[Process Steps]
[Guardrails]
[Quality Checklist]
[Hand-off section]

{{HANDOFF_INSTRUCTIONS}}     ← Expands to ~6.5KB of stage navigation

### Agent-Specific Handoff     ← Agent's custom handoff behavior
```

### Shared Component Files

**PAW Context Component** ([agents/components/paw-context.component.md](agents/components/paw-context.component.md)):
- ~3,020 characters
- Contains `paw_get_context` tool usage instructions
- Documents WorkflowContext.md fields table
- Precedence rules for custom instructions
- Template variable: `{{AGENT_NAME}}` substituted with agent identifier

**Handoff Instructions Component** ([agents/components/handoff-instructions.component.md](agents/components/handoff-instructions.component.md)):
- ~6,559 characters
- Command recognition patterns table (`implement`, `review`, `docs`, `pr`, etc.)
- Command → Agent mapping table
- `paw_call_agent` invocation instructions
- Required handoff message format
- `continue` command behavior

### PAW Review Reference Pattern

**PAW Review Agent** ([agents/PAW Review.agent.md](agents/PAW Review.agent.md)):
- ~3,573 characters (dramatically smaller than implementation agents)
- Retains only:
  - One-sentence role description
  - Initialization: "Load the `paw-review-workflow` skill"
  - Context detection (GitHub PR vs local branch)
  - Multi-repository detection triggers
  - Skill-based execution summary
  - Human control point
  - Error handling
  - Core guardrails

**PAW Review Workflow Skill** ([skills/paw-review-workflow/SKILL.md](skills/paw-review-workflow/SKILL.md)):
- ~9,732 characters
- YAML frontmatter: `name`, `description`
- Core Review Principles (6 principles referenced by activity skills)
- Subagent Contract (skill loading requirements)
- Artifact Directory Structure
- Workflow Orchestration with stage sequences:
  - Understanding Stage: `paw-review-understanding` → `paw-review-baseline` → `paw-review-understanding` (resume)
  - Evaluation Stage: `paw-review-impact` → `paw-review-gap`
  - Output Stage: `paw-review-feedback` → `paw-review-critic` → `paw-review-feedback` (critique response) → `paw-review-github`
- Stage gates (artifact verification between stages)
- Terminal behavior

### Activity Skill Structure

Activity skills follow a consistent pattern (example: `paw-review-understanding`):

```markdown
---
name: paw-review-understanding
description: Brief description for catalog display
---

# [Activity Name] Activity Skill

[One-sentence description]

> **Reference**: Follow Core Review Principles from `paw-review-workflow` skill.

## Responsibilities
- [What this skill does]

## Non-Responsibilities
- [Explicit boundaries]

## Execution Modes
[Different behaviors based on artifact state]

## [Process Steps]
[Numbered steps with specific actions]

## Validation Criteria
[Checklist for artifact completeness]

## Completion Response
[What to report when done]

## [Artifact Templates]
[Markdown templates for outputs]
```

Key characteristics:
- Self-contained with complete instructions
- Reference workflow principles rather than duplicating them
- Define clear input/output contracts
- Specify execution modes for different artifact states

### Extension Installer Implementation

**Agent Installation** ([src/agents/installer.ts](src/agents/installer.ts)):

`installAgents()` function (lines 226-370):
1. Determines prompts directory via `getPromptsDirectoryPath()` (platform-specific)
2. Creates prompts directory if needed
3. Calls `cleanupPreviousInstallation()` for version changes
4. Loads agent templates via `loadAgentTemplates(extensionUri)`
5. Writes each agent file to prompts directory
6. Loads and installs prompt templates via `loadPromptTemplates(extensionUri)`
7. Updates installation state in globalState

`needsInstallation()` function (lines 85-139):
- Checks for version changes
- Dev builds (`-dev` suffix) always reinstall
- Verifies expected agent and prompt files exist (repair case)

**Agent Templates** ([src/agents/agentTemplates.ts](src/agents/agentTemplates.ts)):

`loadAgentTemplates()` function (lines 86-122):
1. Reads all `.agent.md` files from `agents/` directory
2. Loads component templates from `agents/components/`
3. Processes template substitutions via `processAgentTemplate()`
4. Returns array of `AgentTemplate` objects with processed content

**Template Rendering** ([src/agents/agentTemplateRenderer.ts](src/agents/agentTemplateRenderer.ts)):

`loadComponentTemplatesFromDirectory()` (lines 12-34):
- Reads `.component.md` files from `agents/components/`
- Converts filename to placeholder: `paw-context.component.md` → `PAW_CONTEXT`

`processAgentTemplate()` (lines 54-73):
- Expands `{{COMPONENT_NAME}}` placeholders
- Substitutes `{{AGENT_NAME}}` variable with agent identifier

### Skills Infrastructure

**Skill Loader** ([src/skills/skillLoader.ts](src/skills/skillLoader.ts)):

`loadSkillCatalog()` (lines 172-199):
- Scans `skills/` directory for subdirectories containing `SKILL.md`
- Parses YAML frontmatter for `name` and `description`
- Returns array of `SkillCatalogEntry` objects

`loadSkillContent()` (lines 223-236):
- Loads full `SKILL.md` content by skill name
- Returns `SkillContent` with raw file content or error

`parseSkillFrontmatter()` (lines 82-137):
- Extracts and parses YAML frontmatter
- Required fields: `name`, `description`
- Optional fields: `metadata`, `license`, `compatibility`, `allowedTools`

**Skill Tool** ([src/tools/skillTool.ts](src/tools/skillTool.ts)):
- Registers `paw_get_skill` tool with VS Code Language Model API
- Takes `skill_name` parameter
- Returns full SKILL.md content via `loadSkillContent()`

**Skills Tool** ([src/tools/skillsTool.ts](src/tools/skillsTool.ts)):
- Registers `paw_get_skills` tool (catalog retrieval)
- Returns list of available skills with name, description, source

### PAW Tools Implementation

**Context Tool** ([src/tools/contextTool.ts](src/tools/contextTool.ts)):

`paw_get_context` tool (registered at lines 464-512):
- Parameters: `feature_slug` (Work ID), `agent_name`
- Loads workspace instructions from `.paw/instructions/<agent-name>-instructions.md`
- Loads user instructions from `~/.paw/instructions/<agent-name>-instructions.md`
- Loads WorkflowContext.md from `.paw/work/<feature-slug>/`
- Parses handoff mode and generates mode-specific instructions
- Returns XML-tagged sections for agent consumption

`parseHandoffMode()` (lines 97-110):
- Extracts `Handoff Mode: <mode>` from WorkflowContext.md
- Returns `manual`, `semi-auto`, or `auto` (default: `manual`)

`getHandoffInstructions()` (lines 127-146):
- Loads mode-specific template from `src/prompts/handoff*.template.md`
- Templates: `handoffManual.template.md`, `handoffSemiAuto.template.md`, `handoffAuto.template.md`

**Handoff Tool** ([src/tools/handoffTool.ts](src/tools/handoffTool.ts)):

`paw_call_agent` tool (registered at lines 101-143):
- Parameters: `target_agent`, `work_id`, optional `inline_instruction`
- Valid agents: `PAW-01A Specification`, `PAW-01B Spec Researcher`, `PAW-02A Code Researcher`, `PAW-02B Impl Planner`, `PAW-03A Implementer`, `PAW-03B Impl Reviewer`, `PAW-04 Documenter`, `PAW-05 PR`, `PAW-X Status`
- Creates new chat session with agent mode via VS Code commands
- Constructs prompt: `Work ID: <work_id>\n\n<inline_instruction>`

### Directory Structure for Skills

Current review skills location:
```
skills/
├── paw-review-baseline/
│   └── SKILL.md
├── paw-review-correlation/
│   └── SKILL.md
├── paw-review-critic/
│   └── SKILL.md
├── paw-review-feedback/
│   └── SKILL.md
├── paw-review-gap/
│   └── SKILL.md
├── paw-review-github/
│   └── SKILL.md
├── paw-review-impact/
│   └── SKILL.md
├── paw-review-understanding/
│   └── SKILL.md
└── paw-review-workflow/
    └── SKILL.md
```

Implementation skills would follow the same pattern:
```
skills/
├── paw-impl-workflow/
│   └── SKILL.md
├── paw-impl-spec/
│   └── SKILL.md
├── paw-impl-spec-research/
│   └── SKILL.md
├── paw-impl-code-research/
│   └── SKILL.md
├── paw-impl-planning/
│   └── SKILL.md
├── paw-impl-implement/
│   └── SKILL.md
├── paw-impl-review/
│   └── SKILL.md
├── paw-impl-docs/
│   └── SKILL.md
├── paw-impl-pr/
│   └── SKILL.md
└── paw-impl-status/
    └── SKILL.md
```

### Workflow Mode and Review Strategy Handling

Each implementation agent contains duplicated workflow mode handling:

**Pattern observed in all agents** (example from PAW-02A, lines 44-91):
```markdown
### Workflow Mode and Review Strategy Handling

Read Workflow Mode and Review Strategy from WorkflowContext.md at startup...

**Workflow Mode: full**
- [Mode-specific behavior]

**Workflow Mode: minimal**
- [Mode-specific behavior]

**Workflow Mode: custom**
- [Mode-specific behavior]

**Review Strategy (prs or local)**
- [Strategy-specific behavior]

**Defaults**
- If Workflow Mode or Review Strategy fields missing...
```

This pattern is repeated in each agent with stage-specific variations. In the skills architecture, this logic would be consolidated into the workflow skill.

### Handoff Mode Transitions

From `handoff-instructions.component.md`:

**Routine transitions** (semi-auto proceeds automatically):
- Spec → Spec Research (if research needed)
- Spec Research → Spec Agent
- Code Research → Impl Planner
- Implementer phase completion → Impl Reviewer

**Decision points** (semi-auto pauses):
- Impl Planner completion → wait for `implement`
- Impl Reviewer phase completion → wait for `implement Phase N+1` or `docs`
- Documenter completion → wait for `pr`

### Agent-Specific Content to Extract as Skills

**PAW-01A Specification** → `paw-impl-spec`:
- Core principles & guardrails (9 items)
- Research question guidelines
- Drafting workflow (9 detailed steps)
- Research prompt format
- Inline specification template
- Spec quality checklist (3 sections)

**PAW-01B Spec Researcher** → `paw-impl-spec-research`:
- Research methodology
- Behavioral documentation focus
- Document format with sections
- Anti-evaluation directives
- Quality checklist

**PAW-02A Code Researcher** → `paw-impl-code-research`:
- Research methodology (Code Location, Code Analysis, Pattern Finder)
- Document format with YAML frontmatter
- GitHub permalink generation
- Quality checklist

**PAW-02B Impl Planner** → `paw-impl-planning`:
- Context gathering steps
- Research & discovery process
- Plan template structure (phases, success criteria)
- Important guidelines (9 items)
- Quality checklist (2 sections: Initial Planning, PR Review Response)
- Success criteria guidelines

**PAW-03A Implementer** → `paw-impl-implement`:
- Implementation philosophy
- Blocking on uncertainties
- Verification approach (Initial Phase, Addressing PR Review Comments)
- Committing guidelines
- Quality checklist (2 sections)

**PAW-03B Impl Reviewer** → `paw-impl-review`:
- Review process steps (Initial Phase Review, Review Comment Follow-up)
- Quality checklist
- Guardrails

**PAW-04 Documenter** → `paw-impl-docs`:
- Docs.md artifact format
- Project documentation style matching
- Process steps (Initial Documentation, Review Comment Follow-up)
- Quality checklist

**PAW-05 PR** → `paw-impl-pr`:
- Pre-flight validation checks (6 categories)
- PR description guidelines (simple vs complex)
- Process steps (5 steps)
- Quality checklist

**PAW-X Status** → `paw-impl-status`:
- Workflow stages overview
- Two-agent implementation pattern
- Workflow mode behavior
- Review strategy behavior
- Handoff points & automation
- Artifact dependencies & detection
- Common user scenarios
- Common errors & resolutions
- Status-specific handoff notes

## Code References

### Agent Files
- [agents/PAW-01A Specification.agent.md](agents/PAW-01A%20Specification.agent.md) - 370 lines
- [agents/PAW-01B Spec Researcher.agent.md](agents/PAW-01B%20Spec%20Researcher.agent.md) - 150 lines
- [agents/PAW-02A Code Researcher.agent.md](agents/PAW-02A%20Code%20Researcher.agent.md) - 449 lines
- [agents/PAW-02B Impl Planner.agent.md](agents/PAW-02B%20Impl%20Planner.agent.md) - 459 lines
- [agents/PAW-03A Implementer.agent.md](agents/PAW-03A%20Implementer.agent.md) - 328 lines
- [agents/PAW-03B Impl Reviewer.agent.md](agents/PAW-03B%20Impl%20Reviewer.agent.md) - 291 lines
- [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md) - 404 lines
- [agents/PAW-05 PR.agent.md](agents/PAW-05%20PR.agent.md) - 289 lines
- [agents/PAW-X Status.agent.md](agents/PAW-X%20Status.agent.md) - 429 lines

### Component Files
- [agents/components/paw-context.component.md](agents/components/paw-context.component.md) - PAW context loading
- [agents/components/handoff-instructions.component.md](agents/components/handoff-instructions.component.md) - Stage navigation

### Reference Implementation
- [agents/PAW Review.agent.md](agents/PAW%20Review.agent.md) - Migrated review agent
- [skills/paw-review-workflow/SKILL.md](skills/paw-review-workflow/SKILL.md) - Review workflow skill
- [skills/paw-review-understanding/SKILL.md](skills/paw-review-understanding/SKILL.md) - Activity skill pattern

### Extension Source
- [src/agents/installer.ts](src/agents/installer.ts) - Agent installation logic
- [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts) - Agent template loading
- [src/agents/agentTemplateRenderer.ts](src/agents/agentTemplateRenderer.ts) - Template processing
- [src/skills/skillLoader.ts](src/skills/skillLoader.ts) - Skill catalog and content loading
- [src/tools/skillTool.ts](src/tools/skillTool.ts) - `paw_get_skill` tool
- [src/tools/skillsTool.ts](src/tools/skillsTool.ts) - `paw_get_skills` tool
- [src/tools/contextTool.ts](src/tools/contextTool.ts) - `paw_get_context` tool
- [src/tools/handoffTool.ts](src/tools/handoffTool.ts) - `paw_call_agent` tool

## Architecture Documentation

### Current Multi-Agent Architecture

```
User → VS Code prompts directory → Agent file (PAW-0XX)
                                       ↓
                              {{PAW_CONTEXT}} expansion
                              {{HANDOFF_INSTRUCTIONS}} expansion
                                       ↓
                              Agent executes with full content
                                       ↓
                              Handoff via paw_call_agent → Next agent
```

### Target Single-Agent Architecture (following review pattern)

```
User → VS Code prompts directory → PAW Implementation Agent (~3-4KB)
                                       ↓
                              Load paw-impl-workflow skill
                                       ↓
                              Workflow skill determines stage
                                       ↓
                              Load activity skill on-demand
                                       ↓
                              Execute activity skill
                                       ↓
                              Stage completion → Workflow orchestrates next
```

### Key Implementation Patterns

**Skill Loading Pattern** (from review workflow):
```
Every subagent MUST load their skill FIRST before executing any work:
1. Call `paw_get_skill` with the skill name
2. Read and internalize the skill instructions
3. Only then begin executing the activity
```

**Subagent Delegation** (from workflow skill):
```
Execute each activity by delegating to a separate agent session. Each delegated agent:
- Receives the skill name, PR context, and artifact path
- Loads and executes the specified skill
- Returns a completion status with artifact confirmation
```

**Artifact Verification Gates** (between stages):
- Understanding: Verify ReviewContext.md, CodeResearch.md, DerivedSpec.md exist
- Evaluation: Verify ImpactAnalysis.md, GapAnalysis.md exist
- Implementation equivalent: Verify Spec.md, CodeResearch.md, ImplementationPlan.md per stage

## Open Questions

None - the codebase provides sufficient detail for implementation planning.
