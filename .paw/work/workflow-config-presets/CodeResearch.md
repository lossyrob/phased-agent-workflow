---
date: 2026-03-04T01:05:02Z
git_commit: f4e2e8dcb090126ce576b8fbc29bce2d4eabc09e
branch: feature/workflow-config-presets
repository: phased-agent-workflow
topic: "Workflow Configuration Presets"
tags: [research, codebase, paw-init, paw-status, presets, configuration, yaml]
status: complete
last_updated: 2026-03-04
---

# Research: Workflow Configuration Presets

## Research Question

Where and how do paw-init, paw-status, the WorkflowContext template, CLI paths, and SoT's multi-level discovery pattern work — to identify integration points for workflow configuration presets?

## Summary

Preset resolution will integrate primarily into the **paw-init skill** (`skills/paw-init/SKILL.md`), which already has a 3-step parameter resolution flow (table defaults → user-level defaults → confirmation summary). Presets slot in as a new precedence layer between table defaults and user-level defaults. The **paw-sot skill** provides the closest existing pattern for multi-level file discovery (`built-in → project → user → workflow`), scanning `~/.paw/personas/` and `references/specialists/` directories. The CLI already establishes `~/.paw/` as a user config directory via `cli/lib/paths.js:53-54`. The `skills/paw-init/` directory contains only `SKILL.md` (no `references/` subdirectory), but the Spec assumption notes that built-in presets can be embedded in the paw-init skill's prompt text or stored as reference files. However, `skills/` loaded via `paw_get_skill` tool **cannot access bundled resources** (per `.github/copilot-instructions.md`), so built-in presets must be embedded in `SKILL.md` itself. The VS Code command flow (`src/commands/initializeWorkItem.ts`) passes parameters to the agent as structured prompt arguments — a preset name would be an additional parameter in this flow.

## Documentation System

- **Framework**: mkdocs (Material theme)
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml` (repo root)
- **Style Conventions**: Markdown with admonitions, tabbed sections for VS Code/CLI
- **Build Command**: `source .venv/bin/activate && mkdocs build --strict`
- **Standard Files**: `README.md`, `CHANGELOG-cli-v0.1.0.md`, `DEVELOPING.md`, `LICENSE`

## Verification Commands

- **Test Command**: `npm test` (VS Code extension tests), `cd tests/integration && npm run test:integration:workflows` (integration)
- **Lint Command**: `npm run lint`, `npm run lint:agent:all`, `./scripts/lint-prompting.sh <file>`
- **Build Command**: `npm run build` (VS Code extension)
- **Type Check**: via `npm run build` (TypeScript compilation)

## Detailed Findings

### 1. paw-init Skill — Parameter Resolution Flow

The paw-init skill (`skills/paw-init/SKILL.md`) defines a complete parameter table and resolution flow that presets need to integrate with.

**Parameter Table** (`skills/paw-init/SKILL.md:25-60`): Defines 30+ configuration fields with defaults, including:
- Core: `workflow_mode` (default: `full`), `review_strategy` (default: `prs`/`local` if minimal), `review_policy` (default: `milestones`)
- Session: `session_policy` (default: `per-stage` vscode / `continuous` cli), `artifact_lifecycle` (default: `commit-and-clean`)
- Final Review: `final_agent_review`, `final_review_mode`, `final_review_interactive`, `final_review_models`, `final_review_specialists`, `final_review_interaction_mode`, `final_review_specialist_models`, `final_review_perspectives`, `final_review_perspective_cap`
- Planning: `plan_generation_mode`, `plan_generation_models`, `planning_docs_review`, `planning_review_mode`, `planning_review_interactive`, `planning_review_models`, `planning_review_specialists`, `planning_review_interaction_mode`, `planning_review_specialist_models`, `planning_review_perspectives`, `planning_review_perspective_cap`

**Resolution Flow** (`skills/paw-init/SKILL.md:62-69`):
```
1. Apply defaults from the table above
2. Check user-level defaults in copilot-instructions.md or AGENTS.md (these override table defaults)
3. Present configuration summary and ask for confirmation before proceeding
4. If user requests changes, update values and re-confirm
```

This is the primary integration point. Presets would insert between steps 1 and 2, or between 2 and 3, becoming: `table defaults → preset values → user-level defaults → explicit overrides → confirmation`.

**Conditional platform sections** (`skills/paw-init/SKILL.md:31-36`): The skill uses `{{#vscode}}` / `{{#cli}}` Mustache-style conditionals for platform-specific defaults (e.g., `session_policy` defaults differ). Presets must handle this — a preset created on CLI that references `per-stage` session policy will only work on VS Code.

**Configuration Validation** (`skills/paw-init/SKILL.md:86-91`): Paw-init validates field combinations after resolution:
- `minimal` mode → `review_strategy` MUST be `local`
- `planning-only` or `final-pr-only` review_policy → `review_strategy` MUST be `local`
- `society-of-thought` review modes → corresponding review feature MUST be `enabled`

Presets must produce valid combinations — invalid combinations trigger a STOP with error report.

### 2. WorkflowContext.md Template — Full Field List

The exact field list that presets need to map to is defined at `skills/paw-init/SKILL.md:136-174`:

```
Work Title, Work ID, Base Branch, Target Branch,
Workflow Mode, Review Strategy, Review Policy, Session Policy,
Final Agent Review, Final Review Mode, Final Review Interactive,
Final Review Models, Final Review Specialists, Final Review Interaction Mode,
Final Review Specialist Models, Final Review Perspectives, Final Review Perspective Cap,
Plan Generation Mode, Plan Generation Models,
Planning Docs Review, Planning Review Mode, Planning Review Interactive,
Planning Review Models, Planning Review Specialists, Planning Review Interaction Mode,
Planning Review Specialist Models, Planning Review Perspectives, Planning Review Perspective Cap,
Custom Workflow Instructions, Initial Prompt, Issue URL,
Remote, Artifact Lifecycle, Artifact Paths, Additional Inputs
```

**Fields NOT presetable** (per-workflow, not configuration): `Work Title`, `Work ID`, `Base Branch`, `Target Branch`, `Custom Workflow Instructions`, `Initial Prompt`, `Issue URL`, `Remote`, `Artifact Paths`, `Additional Inputs`.

**Presetable fields** (configuration that a preset can bundle): `Workflow Mode`, `Review Strategy`, `Review Policy`, `Session Policy`, `Final Agent Review`, `Final Review Mode`, `Final Review Interactive`, `Final Review Models`, `Final Review Specialists`, `Final Review Interaction Mode`, `Final Review Specialist Models`, `Final Review Perspectives`, `Final Review Perspective Cap`, `Plan Generation Mode`, `Plan Generation Models`, `Planning Docs Review`, `Planning Review Mode`, `Planning Review Interactive`, `Planning Review Models`, `Planning Review Specialists`, `Planning Review Interaction Mode`, `Planning Review Specialist Models`, `Planning Review Perspectives`, `Planning Review Perspective Cap`, `Artifact Lifecycle`.

### 3. paw-status Skill — Preset Discovery Point

The paw-status skill (`skills/paw-status/SKILL.md`) provides workflow state diagnosis and help.

**Capabilities** (`skills/paw-status/SKILL.md:16-20`):
- Diagnose current workflow state from artifacts and git
- Recommend appropriate next steps
- Explain PAW process and stages
- List active work items across workspace
- Post status updates to Issues/PRs (on explicit request)

**Multi-Work Management** (`skills/paw-status/SKILL.md:126-129`): Enumerates `.paw/work/` directories — this is the existing pattern for scanning directories. Preset listing (FR-009) would follow a similar pattern: enumerate `~/.paw/presets/` and built-in presets.

**Help Mode** (`skills/paw-status/SKILL.md:149-156`): Provides explanations when asked "How do I start?" — this is where preset discovery guidance would fit naturally (e.g., "Available presets: quick, standard, thorough, team").

**No existing YAML handling**: paw-status reads WorkflowContext.md (key-value markdown format), not YAML files. Preset listing would introduce YAML file reading as a new capability.

### 4. SoT Multi-Level Discovery Pattern (Closest Existing Analogue)

The paw-sot skill (`skills/paw-sot/SKILL.md:53-66`) implements a 4-level precedence discovery pattern for specialist personas that is the closest analogue to preset discovery:

```
1. Workflow: Parse from review context (most-specific-wins)
2. Project: Scan .paw/personas/<name>.md files in the repository
3. User: Scan ~/.paw/personas/<name>.md files
4. Built-in: Scan references/specialists/<name>.md files
```

**Resolution rules** (`skills/paw-sot/SKILL.md:60-66`):
- Most-specific-wins for name conflicts (project overrides user overrides built-in)
- Skip malformed or empty files with a warning
- If zero found, fall back to built-in defaults

**Perspective discovery** (`skills/paw-sot/SKILL.md:89-94`) mirrors the same 4-level pattern.

The preset system needs a simpler 2-level version:
1. User: `~/.paw/presets/<name>.yaml`
2. Built-in: embedded in paw-init SKILL.md (see constraint below)

### 5. Built-in Preset Storage Constraint

**Critical constraint from `.github/copilot-instructions.md`** (Skill Development section):

> `skills/` loaded via `paw_get_skill` tool: Only create the SKILL.md file. The `paw_get_skill` tool returns SKILL.md content as text—it cannot access bundled resources. Do not create `scripts/`, `references/`, or `assets/` subdirectories.

The `skills/paw-init/` directory currently contains only `SKILL.md` (confirmed at `skills/paw-init/` listing). Since paw-init is a `skills/` skill (not `.github/skills/`), it **cannot** use a `references/` subdirectory for built-in preset files.

**Implication**: Built-in presets must be **embedded directly in `skills/paw-init/SKILL.md`** as YAML content blocks or structured tables. This aligns with the Spec assumption at line 122: "Built-in presets can be embedded in the paw-init skill's prompt text."

**Contrast with paw-sot**: The paw-sot skill lives at `skills/paw-sot/` and has a `references/` directory with specialists and perspectives. However, paw-sot is loaded by `paw-final-review` and `paw-planning-docs-review` which run **directly in session** (not via `paw_get_skill`). Looking more closely, paw-sot does have `references/specialists/*.md` and `references/perspectives/*.md` files — these are read by the agent at runtime from disk, not served by `paw_get_skill`. The SoT skill instructs the agent to "Scan `references/specialists/<name>.md` files" — the agent reads these files using filesystem tools.

**Re-evaluation**: If the agent running paw-init can read files from the skill directory on disk (as paw-sot does), then a `references/presets/` subdirectory in `skills/paw-init/` could work. However, paw-sot runs in subagent context where the agent has full filesystem access, while paw-init runs **directly in session** (`skills/paw-init/SKILL.md:8`). Both contexts have filesystem access. The constraint about `paw_get_skill` returning only SKILL.md content is about what the **tool** returns — the agent can still read other files from known paths.

**Resolution**: Two viable approaches:
1. **Embed in SKILL.md**: Simple, no file discovery needed, but increases token cost on every init
2. **Separate files with known path convention**: Store at `skills/paw-init/references/presets/*.yaml` and instruct the agent to read them. This works because the agent has filesystem access; only `paw_get_skill` tool output is limited to SKILL.md

### 6. CLI Paths — ~/.paw/ Directory Usage

The CLI establishes `~/.paw/` as the user-level PAW directory (`cli/lib/paths.js:53-54`):

```javascript
export function getPawDir() {
  return join(getHomeDir(), '.paw');
}
```

**Current usage** (`cli/lib/paths.js:57-66`):
- `~/.paw/<target>-cli/manifest.json` — CLI installation manifests (e.g., `~/.paw/copilot-cli/manifest.json`)

**SoT usage** (`skills/paw-sot/SKILL.md:57,93`):
- `~/.paw/personas/<name>.md` — user-level specialist personas
- `~/.paw/perspectives/<name>.md` — user-level perspective overlays

**Proposed preset location**: `~/.paw/presets/<name>.yaml` — consistent with the existing `~/.paw/` convention. The directory may not exist yet for any given user; the Spec notes (edge cases): "Preset directory doesn't exist yet: Create it on first preset save, or skip gracefully when loading."

### 7. PAW Agent — paw-init Invocation

The PAW agent (`agents/PAW.agent.md:10`) invokes paw-init during initialization:

> On first request, identify work context from environment (current branch, `.paw/work/` directories) or user input. If no matching WorkflowContext.md exists, load `paw-init` to bootstrap.

**Execution model** (`agents/PAW.agent.md:170-171`): paw-init runs as **direct execution** (loaded into session, not subagent). This means the user's natural language request ("paw this with thorough") is available in the conversation context when paw-init runs.

**Mandatory transition** (`agents/PAW.agent.md:17`): After paw-init, the next step is `paw-spec` or `paw-work-shaping`, per user intent.

**No explicit preset parameter passing**: The agent prompt does not currently mention presets. The preset name would come from the user's natural language request (e.g., "paw this with quick") which paw-init would need to detect and resolve.

### 8. VS Code Command Flow — Parameter Passing

The VS Code extension has a separate initialization flow (`src/commands/initializeWorkItem.ts`):

**`collectUserInputs`** (`src/ui/userInput.ts:559-604`): Collects parameters via quick-pick UI in sequence: target branch → workflow mode → review strategy → review policy → session policy → artifact lifecycle → final review config → issue URL.

**`constructPawPromptArguments`** (`src/commands/initializeWorkItem.ts:13-62`): Formats collected inputs as a `## Initialization Parameters` block with `- **key**: value` entries, then sends to the PAW agent via `workbench.action.chat.open`.

**WorkItemInputs interface** (`src/ui/userInput.ts:62-108`): TypeScript interface defining all collected fields: `targetBranch`, `workflowMode`, `reviewStrategy`, `reviewPolicy`, `sessionPolicy`, `artifactLifecycle`, `finalReview`, `issueUrl`.

A preset name would need to be added as an optional parameter in both the quick-pick flow and the prompt arguments format. Alternatively, the VS Code flow could resolve presets before passing individual parameters, but this would require YAML parsing in the extension code.

### 9. Existing YAML/File Reading Patterns in Skills

**No YAML parsing in existing skills**: Skills operate through agent reasoning — they instruct the agent to read files and extract information. The agent reads YAML content as text and reasons about the structure.

**File reading pattern** (paw-sot specialist discovery, `skills/paw-sot/SKILL.md:56-58`):
```
2. Project: Scan .paw/personas/<name>.md files in the repository
3. User: Scan ~/.paw/personas/<name>.md files
4. Built-in: Scan references/specialists/<name>.md files
```

The agent uses filesystem tools (`readFile`, `readDir`, etc.) to scan directories and read file contents. This same pattern applies to preset discovery — the agent reads YAML files as text and extracts configuration fields.

**WorkflowContext.md parsing**: All skills that read WorkflowContext.md parse a simple `Key: value` line format (not YAML). Preset YAML would be a different format the agent needs to parse, but agents handle YAML well.

### 10. Configuration Validation Rules

Validation rules from paw-init that presets must satisfy (`skills/paw-init/SKILL.md:86-91`):

1. `workflow_mode: minimal` → `review_strategy` MUST be `local`
2. `review_policy: planning-only` or `final-pr-only` → `review_strategy` MUST be `local`
3. `final_review_mode: society-of-thought` → `final_agent_review` MUST be `enabled`
4. `planning_review_mode: society-of-thought` → `planning_docs_review` MUST be `enabled`

The Spec's built-in presets (FR-002) all satisfy these constraints:
- `quick`: minimal + local + final-pr-only ✓
- `standard`: full + local + milestones ✓
- `thorough`: full + local + planning-only ✓
- `team`: full + prs + every-stage ✓

### 11. Model Resolution Pattern

When `final_review_mode` or `plan_generation_mode` is `multi-model`, paw-init resolves model intent strings to concrete names (`skills/paw-init/SKILL.md:94-98`):

```
"latest GPT" → gpt-5.2
"latest Gemini" → gemini-3-pro-preview
"latest Claude Opus" → claude-opus-4.6
```

Presets could store either intent strings (portable across time) or concrete model names (exact reproduction). The Spec built-in presets table specifies behavioral descriptions ("enabled (multi-model)", "enabled (SoT, debate)") rather than specific model names, suggesting presets should store intent strings and let paw-init resolve them.

## Code References

- `skills/paw-init/SKILL.md:25-60` — Parameter table with all configurable fields and defaults
- `skills/paw-init/SKILL.md:62-69` — Parameter resolution flow (defaults → user-level → confirmation)
- `skills/paw-init/SKILL.md:86-91` — Configuration validation rules (constraint combinations)
- `skills/paw-init/SKILL.md:136-174` — WorkflowContext.md template with all fields
- `skills/paw-init/SKILL.md:31-36` — Platform-conditional defaults (`{{#vscode}}` / `{{#cli}}`)
- `skills/paw-init/SKILL.md:94-98` — Model intent resolution pattern
- `skills/paw-status/SKILL.md:16-20` — Status capabilities list (preset listing would extend)
- `skills/paw-status/SKILL.md:126-129` — Multi-work enumeration (directory scan pattern)
- `skills/paw-status/SKILL.md:149-156` — Help mode (preset discovery guidance fits here)
- `skills/paw-sot/SKILL.md:53-66` — 4-level specialist discovery pattern (precedence model)
- `skills/paw-sot/SKILL.md:89-94` — 4-level perspective discovery pattern (mirrors specialist)
- `skills/paw-sot/SKILL.md:60-66` — Resolution rules (most-specific-wins, skip malformed, fallback)
- `skills/paw-sot/references/specialists/` — Built-in specialist files (9 .md files)
- `skills/paw-sot/references/perspectives/` — Built-in perspective files (4 .md files)
- `cli/lib/paths.js:53-54` — `getPawDir()` → `~/.paw/` directory
- `cli/lib/paths.js:57-62` — `getManifestDir()` → `~/.paw/<target>-cli/` for manifests
- `agents/PAW.agent.md:10` — paw-init invocation trigger (no WorkflowContext.md → bootstrap)
- `agents/PAW.agent.md:17` — Mandatory transition: paw-init → paw-spec or paw-work-shaping
- `agents/PAW.agent.md:170-171` — paw-init is direct execution (not subagent)
- `src/commands/initializeWorkItem.ts:13-62` — VS Code prompt argument construction
- `src/commands/initializeWorkItem.ts:26-58` — Config object built from user inputs
- `src/ui/userInput.ts:62-108` — WorkItemInputs interface (all collected fields)
- `src/ui/userInput.ts:559-604` — collectUserInputs flow (sequential quick-picks)

## Architecture Documentation

### Precedence Pattern

PAW uses layered precedence consistently:
- **paw-sot**: workflow → project → user → built-in (most-specific-wins for name conflicts)
- **paw-init parameters**: table defaults → user-level defaults (copilot-instructions.md / AGENTS.md) → explicit user instructions
- **Presets would add**: table defaults → preset values → user-level defaults → explicit overrides → confirmation

### Skill Storage Architecture

Two skill locations exist with different capabilities:
- `.github/skills/` — VS Code skills system, supports `references/`, `scripts/`, `assets/` bundled resources
- `skills/` — `paw_get_skill` tool, returns SKILL.md content only as text; however agents can still read files from known paths on disk

The paw-sot skill at `skills/paw-sot/` has a `references/` directory that the agent reads directly from disk — this demonstrates that `skills/` directory skills CAN have adjacent files read by the agent, even though `paw_get_skill` only returns SKILL.md content. The constraint is about what the tool returns, not what the agent can access.

### Agent-Driven Configuration

PAW initialization is **agent-driven, not programmatic** (Spec assumption). The agent:
1. Reads the paw-init skill
2. Receives user's natural language request (may include preset name)
3. Reasons about parameter resolution
4. Creates WorkflowContext.md

Preset resolution will also be agent-driven: the agent reads preset YAML files, merges values, validates constraints, and presents the summary.

## Open Questions

1. **Built-in preset storage format**: Should built-in presets be embedded as YAML blocks within `skills/paw-init/SKILL.md`, or stored as separate files at a known path (e.g., `skills/paw-init/references/presets/*.yaml`)? Embedding increases init token cost but avoids file discovery. Separate files follow the paw-sot pattern but add complexity. Given the small number (4 presets), embedding in SKILL.md as a structured table or YAML blocks is likely more practical.

2. **VS Code command flow integration**: Should the VS Code UI add a preset quick-pick step before the individual parameter collection, or should preset resolution happen entirely in the agent? Agent-only is simpler (no extension code changes) but loses the structured UI. Adding a quick-pick requires reading YAML in the extension TypeScript code.

3. **Preset YAML schema**: Should preset field names use the WorkflowContext.md key format (`Review Policy`) or the paw-init parameter table format (`review_policy`)? The snake_case parameter format is more natural for YAML and avoids space-handling issues.
