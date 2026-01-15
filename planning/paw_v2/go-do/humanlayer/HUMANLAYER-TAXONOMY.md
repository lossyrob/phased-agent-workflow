# Humanlayer Prompt Taxonomy

> Generated from annotation of humanlayer agents and commands (2025-12-23)

## Summary

Annotated **6 agent files** and **24 command files** from the humanlayer `.claude/` directory.

## Labels Reused from PAW Taxonomy

These existing labels applied naturally to humanlayer prompts:

| Label | Usage in Humanlayer | Notes |
|-------|---------------------|-------|
| `<agent-identity>` | 12 files | Agents use this; commands often omit |
| `<mission-statement>` | 10 files | Core identifier for agents |
| `<workflow-sequence>` | 28 files | Universal—every command/agent has steps |
| `<workflow-step>` | 30 files | Heavily used; often with `step` attribute |
| `<guardrail>` | 8 files | Hard constraints, especially "documentarian not critic" |
| `<anti-pattern>` | 6 files | Prohibited behaviors |
| `<artifact-format>` | 15 files | Output templates |
| `<behavioral-directive>` | 12 files | Specific behavior instructions |
| `<subagent-guidance>` | 10 files | Delegation patterns |
| `<verification-step>` | 8 files | Correctness confirmation |
| `<tool-guidance>` | 12 files | CLI and tool usage |
| `<communication-pattern>` | 8 files | User interaction styles |
| `<methodology>` | 8 files | Approach descriptions |
| `<search-strategy>` | 5 files | Search tactics |
| `<resumption-protocol>` | 3 files | Resume interrupted work |
| `<error-handling>` | 5 files | Error recovery |
| `<quality-gate>` | 6 files | Pass/fail checklists |
| `<example>` | 5 files | Illustrative samples |
| `<closing-directive>` | 6 files | Final operating principles |
| `<commit-protocol>` | 3 files | Git commit rules |

## New Labels Discovered

These labels emerged from humanlayer patterns not found in PAW:

### Agent-Specific

| Label | Description | Found In |
|-------|-------------|----------|
| `<tool-manifest>` | YAML frontmatter listing available tools | codebase-analyzer |
| `<pattern-category>` | Domain taxonomy for pattern types | codebase-pattern-finder |
| `<extraction-pattern>` | Patterns for identifying content types | thoughts-analyzer |
| `<path-transformation-rule>` | Rules for path normalization | thoughts-locator |
| `<reference-material>` | Static knowledge (directory schemas, etc.) | thoughts-locator, debug |
| `<frontmatter>` | YAML metadata block | web-search-researcher |
| `<scenario-guidance>` | Context-specific instructions | web-search-researcher |
| `<efficiency-heuristic>` | Resource optimization rules | web-search-researcher |

### Command-Specific: Workflow Control

| Label | Description | Found In |
|-------|-------------|----------|
| `<iteration-checkpoint>` | Human approval gates within workflow | create_plan |
| `<conditional-branch>` | Input-dependent path selection | resume_handoff, create_plan_nt |
| `<conditional-logic>` | State-based decision points | describe_pr, describe_pr_nt |
| `<ordering-constraint>` | Strict step dependencies | research_codebase |
| `<precondition-check>` | Gate before any action | linear |
| `<blocking-condition>` | Condition halting workflow | implement_plan |

### Command-Specific: User Interaction

| Label | Description | Found In |
|-------|-------------|----------|
| `<user-interaction>` | Explicit touchpoints with user | linear, research_codebase_generic |
| `<input-collection-prompt>` | Template for gathering inputs | create_plan, iterate_plan |
| `<confirmation-template>` | Template for confirmations | create_worktree, iterate_plan_nt |
| `<user-prompt-template>` | Canned response text | create_plan_nt |
| `<interaction-pattern>` | Dialogue choreography | create_plan_generic |

### Command-Specific: Subagent Orchestration

| Label | Description | Found In |
|-------|-------------|----------|
| `<sub-agent-delegation>` | Spawning and coordinating agents | create_plan_generic, research_codebase_nt |
| `<agent-selection>` | Choosing which agent to use | iterate_plan_nt |
| `<research-delegation>` | Research task delegation | iterate_plan_nt |
| `<delegation-strategy>` | Sub-agent orchestration patterns | create_plan_nt |
| `<agent-reference>` | Reference to specific sub-agent | create_plan_nt |

### Command-Specific: Outputs & Artifacts

| Label | Description | Found In |
|-------|-------------|----------|
| `<file-output-convention>` | File naming patterns | create_plan |
| `<file-naming-convention>` | Filepath patterns with placeholders | create_handoff |
| `<output-template>` | What agent says to user | create_handoff |
| `<output-format>` | Structure of outputs | iterate_plan |
| `<output-guidance>` | How to structure output | ci_describe_pr |
| `<structured-output>` | Formatted output blocks | iterate_plan_nt |
| `<output-artifact>` | Artifact caching patterns | describe_pr_nt |
| `<artifact-template>` | Document structure to produce | create_plan_nt |
| `<embedded-template>` | Literal template content | describe_pr_nt |

### Command-Specific: Behavior & Constraints

| Label | Description | Found In |
|-------|-------------|----------|
| `<behavioral-guideline>` | General conduct instructions | validate_plan, create_plan_generic |
| `<behavioral-constraints>` | Rules governing agent behavior | ci_describe_pr, research_codebase_nt |
| `<quality-guidelines>` | Principles for quality | create_handoff, iterate_plan_nt |
| `<constraints>` | Operational boundaries | debug |
| `<execution-rules>` | Step execution constraints | research_codebase_nt |

### Command-Specific: Domain & Context

| Label | Description | Found In |
|-------|-------------|----------|
| `<domain-conventions>` | Team-specific rules | linear |
| `<domain-pattern>` | Reusable implementation recipes | create_plan_generic |
| `<path-conventions>` | Worktree/path handling | create_worktree |
| `<path-handling>` | Path normalization rules | research_codebase |
| `<reference-data>` | Lookup tables (IDs, labels) | linear |
| `<situational-context>` | Situation for the command | founder_mode |

### Command-Specific: Relationships

| Label | Description | Found In |
|-------|-------------|----------|
| `<command-relationship>` | How command relates to others | validate_plan, founder_mode |
| `<command-frontmatter>` | YAML metadata for command | oneshot |
| `<command-identity>` | Command name/purpose (vs agent-identity) | research_codebase_nt |

### Command-Specific: Other Patterns

| Label | Description | Found In |
|-------|-------------|----------|
| `<quick-reference>` | Cheat sheet / command snippets | debug |
| `<scenario-catalog>` | Pattern-matching guidance | resume_handoff |
| `<guideline-set>` | Collection of behavioral guidelines | resume_handoff |
| `<example-interaction>` | Demo conversation flow | resume_handoff, create_plan_generic |
| `<example-scenario>` | Sample scenarios | iterate_plan_nt |
| `<initial-response>` | Starting response | create_plan_generic |
| `<research-strategy>` | Research approach | create_plan_generic |
| `<success-criteria>` | Verification requirements | create_plan_nt |
| `<progress-tracking>` | Todo/state management | create_plan_nt |
| `<design-pattern>` | Reusable recipes | create_plan_nt |
| `<tool-invocation>` | CLI command execution | describe_pr_nt |
| `<state-check>` | Read-before-write patterns | describe_pr_nt |
| `<analysis-directive>` | Instructions for analysis | describe_pr_nt |
| `<follow-up-action>` | Post-action steps | describe_pr_nt |
| `<role-definition>` | Agent persona statement | create_plan_nt |
| `<role-assignment>` | Task assignment | describe_pr_nt |
| `<entry-point-logic>` | Initial invocation handling | create_plan_nt |
| `<input-parsing>` | Parameter parsing | iterate_plan_nt |
| `<conditional-response>` | Input-state response | iterate_plan_nt |
| `<naming-convention>` | Naming patterns | research_codebase_nt |

---

## Key Observations

### 1. Commands vs Agents Pattern Differences

- **Agents** have strong `<agent-identity>` and focus on methodology
- **Commands** are procedural with heavy `<workflow-step>` usage
- Commands often omit identity—they're imperative instructions

### 2. Subagent Orchestration is First-Class

Humanlayer heavily uses parallel subagent spawning. Multiple new labels emerged:
- `<sub-agent-delegation>`, `<agent-selection>`, `<research-delegation>`
- PAW's `<subagent-guidance>` reused but more granular needs identified

### 3. Conditional Branching is Common

Commands often have 3+ input modes (no params, some params, all params):
- `<conditional-branch>`, `<conditional-logic>`, `<conditional-response>`
- This differs from PAW's more linear workflows

### 4. Human-in-the-Loop Gates

Multiple iteration checkpoints and confirmation patterns:
- `<iteration-checkpoint>`, `<confirmation-template>`, `<user-interaction>`
- PAW has this with `<handoff-instruction>` but humanlayer is more granular

### 5. "Documentarian not Critic" Pattern

Agents (especially codebase-*) heavily reinforce constraint:
- 19 anti-patterns in codebase-analyzer alone
- Repeated 3x in some agents for LLM emphasis

---

## Consolidation Opportunities

Labels that could potentially merge:

1. **Behavioral variants**: `<behavioral-directive>`, `<behavioral-guideline>`, `<behavioral-constraints>`, `<quality-guidelines>` → consider unified `<behavior>` with type attribute

2. **Conditional variants**: `<conditional-branch>`, `<conditional-logic>`, `<conditional-response>` → could be `<conditional>` with type

3. **Output variants**: `<output-format>`, `<output-template>`, `<output-guidance>`, `<structured-output>` → could nest under parent `<output>`

4. **User interaction**: `<user-interaction>`, `<user-prompt-template>`, `<confirmation-template>` → could be `<user-touchpoint>` with type

5. **Artifact/file naming**: `<file-output-convention>`, `<file-naming-convention>`, `<naming-convention>` → unified `<naming-convention>` with scope attribute
