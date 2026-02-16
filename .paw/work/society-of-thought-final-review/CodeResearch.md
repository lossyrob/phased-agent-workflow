---
date: 2026-02-15T01:11:40+0000
git_commit: 48fc31c25b387afe3db1be3318e2ca52f4a5da43
branch: feature/society-of-thought-final-review
repository: lossyrob/phased-agent-workflow
topic: "Society-of-Thought Final Review Implementation Details"
tags: [research, codebase, paw-final-review, paw-init, multi-model, specialists]
status: complete
last_updated: 2026-02-15
---

# Research: Society-of-Thought Final Review Implementation Details

## Research Question

How is the multi-model final review currently implemented in paw-final-review? How does paw-init handle configuration fields and model resolution? What patterns exist for specialist file discovery? Where should new society-of-thought configuration be added?

## Summary

The multi-model final review infrastructure is fully functional and provides a robust foundation for society-of-thought mode. Key findings:

1. **Review execution**: paw-final-review spawns parallel subagents using the `task` tool with `model` parameter, then synthesizes findings with agreement-level classification
2. **Configuration management**: paw-init defines config fields (lines 26-45), resolves model intents to concrete names (lines 76-83), and stores them in WorkflowContext.md
3. **No existing specialist infrastructure**: `.paw/personas/` and `~/.paw/personas/` directories do not exist; precedence patterns can be modeled after skill discovery (`.github/skills/` for project, `~/.copilot/skills/` for user)
4. **Status reporting**: paw-status reads Final Review Mode and Planning Review Mode from WorkflowContext.md and displays them (lines 43-52)
5. **Documentation system**: MkDocs with Material theme, `mkdocs.yml` navigation, `docs/` directory structure

## Documentation System

- **Framework**: MkDocs with Material theme
- **Docs Directory**: `docs/` (from repo root)
- **Navigation Config**: `mkdocs.yml` (lines 61-77 define nav structure)
- **Style Conventions**: Clear sectioning with YAML frontmatter in code blocks, admonitions for callouts, code blocks with syntax highlighting
- **Build Command**: `mkdocs build` (build), `mkdocs serve` (local preview)
- **Standard Files**: 
  - `docs/index.md` (home)
  - `docs/guide/` (user guides: Getting Started, VS Code Extension, CLI Installation, Workflow Modes, Stage Transitions, Two Workflows)
  - `docs/specification/` (Overview, Implementation Workflow, Review Workflow)
  - `docs/reference/` (Agents, Artifacts)

## Verification Commands

- **Test Command**: `npm test` (unit tests), `npm run test:integration` (all integration tests), `npm run test:integration:skills` (skill tests), `npm run test:integration:workflows` (workflow tests)
- **Lint Command**: `npm run lint` (ESLint for TypeScript), `npm run lint:agent` (agent prompt linting), `npm run lint:skills` (skill linting)
- **Build Command**: `npm run compile` (TypeScript compilation), `npm run build-vsix` (VS Code extension package)
- **Type Check**: `tsc -p ./` (TypeScript compiler with project config)

## Detailed Findings

### 1. paw-final-review SKILL.md Structure

**Location**: `~/.copilot/skills/paw-final-review/SKILL.md`

**Single-model vs multi-model modes** (`SKILL.md:88-100`):
- Line 28: Configuration field `Final Review Mode`: `single-model` | `multi-model`
- Line 30: Configuration field `Final Review Models`: comma-separated model names (for multi-model)
- Lines 91-93: Single-model mode executes review inline, saves to `REVIEW.md`
- Lines 95-100: Multi-model mode reads resolved models from WorkflowContext.md, spawns parallel subagents using `task` tool with `model` parameter, saves per-model reviews to `REVIEW-{MODEL}.md`

**Review prompt template** (`SKILL.md:55-85`):
- Shared prompt used for all review executions (single-model or each multi-model subagent)
- Includes: Spec.md content, full diff, CodeResearch.md patterns
- Review criteria: Correctness, Pattern Consistency, Bugs and Issues, Token Efficiency, Documentation
- Each finding includes: issue description, current code, proposed fix, severity (must-fix | should-fix | consider)

**Artifact creation** (`SKILL.md:51-58`):
- Line 51: Create `.paw/work/<work-id>/reviews/` if it doesn't exist
- Line 52: Create `.paw/work/<work-id>/reviews/.gitignore` with content `*` (if not already present)
- Lines 240-247: Review artifacts table shows file naming patterns

**Interactive resolution** (`SKILL.md:142-232`):
- Lines 144-173: `Interactive = true` presents each finding to user with apply/skip/discuss options, tracks status (applied/skipped/discussed)
- Lines 176-220: `Interactive = smart` classifies findings by agreement level and severity, auto-applies consensus must-fix/should-fix, presents interactive for partial/single-model findings, reports consider-only
- Lines 223-225: `Interactive = false` auto-applies must-fix and should-fix, skips consider

**Multi-model synthesis structure** (`SKILL.md:103-136`):
- Lines 103-136: REVIEW-SYNTHESIS.md structure with sections for Consensus Issues (all models agree), Partial Agreement (2+ models), Single-Model Insights, Verification Checklist, Priority Actions (Must Fix, Should Fix, Consider)

**GitHub Permalinks**: https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/skills/paw-final-review/SKILL.md#L28 (config), https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/skills/paw-final-review/SKILL.md#L98 (task invocation)

### 2. paw-init SKILL.md Configuration

**Location**: `~/.copilot/skills/paw-init/SKILL.md`

**Configuration field definitions** (`SKILL.md:26-45`):
- Lines 26-45: Input parameters table with parameter name, required status, default value, and valid values
- Line 39: `final_review_mode` | No | `multi-model` | `single-model`, `multi-model`
- Line 40: `final_review_interactive` | No | `smart` | `true`, `false`, `smart`
- Line 41: `final_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents
- Lines 42-45: Planning Docs Review equivalents (planning_docs_review, planning_review_mode, planning_review_interactive, planning_review_models)

**Model resolution** (`SKILL.md:76-83`):
- Line 76: "Model Resolution (multi-model only)" section heading
- Line 78: Resolve model intents to concrete model names (e.g., "latest GPT" → `gpt-5.2`, "latest Gemini" → `gemini-3-pro-preview`, "latest Claude Opus" → `claude-opus-4.6`)
- Line 79: Present the resolved models for user confirmation as part of the configuration summary
- Line 80: If user requests changes, update the model list accordingly
- Line 81: Store the **resolved concrete model names** in WorkflowContext.md (not the intent strings)
- Line 83: "This ensures model selection is a one-time upfront decision during init, not a per-review-gate interruption."

**WorkflowContext.md template** (`SKILL.md:92-119`):
- Lines 92-119: Full template showing all fields including:
  - Line 106: `Final Review Mode: <final_review_mode>`
  - Line 107: `Final Review Interactive: <final_review_interactive>`
  - Line 108: `Final Review Models: <final_review_models>`
  - Lines 109-112: Planning Docs Review equivalents

**Configuration validation** (`SKILL.md:70-74`):
- Line 71: If `workflow_mode` is `minimal`, `review_strategy` MUST be `local`
- Line 72: If `review_policy` is `planning-only` or `final-pr-only`, `review_strategy` MUST be `local`
- Line 73: Invalid combinations: STOP and report error

**GitHub Permalinks**: https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/skills/paw-init/SKILL.md#L26 (params table), https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/skills/paw-init/SKILL.md#L76 (model resolution)

### 3. Task Tool Usage Patterns

**paw-final-review invocation** (`~/.copilot/skills/paw-final-review/SKILL.md:98`):
- "Then spawn parallel subagents using `task` tool with `model` parameter for each model. Each subagent receives the review prompt above. Save per-model reviews to `REVIEW-{MODEL}.md`."

**paw-planning-docs-review invocation** (`~/.copilot/skills/paw-planning-docs-review/SKILL.md:108`):
- "Resolve model intents to actual model names (e.g., 'latest GPT' → current GPT model). Log resolved models, then spawn parallel subagents using `task` tool with `model` parameter for each model. Each subagent receives the review prompt above. Save per-model reviews to `reviews/planning/REVIEW-{MODEL}.md`."

**multi-model-review pattern** (`.github/skills/multi-model-review/SKILL.md:70`):
- Line 70: "Use `task` tool with `model` parameter for each review"
- Lines 44-45: Models: GPT 5.2, Gemini 3 Pro, Claude Opus 4.5
- Lines 40-73: Parallel Model Reviews phase spawns three independent reviews

**Key pattern**: 
1. Read resolved model names from WorkflowContext.md
2. Log the models being used
3. Launch parallel subagents using `task` tool with `model` parameter for each model
4. Each subagent receives the same review prompt with full context
5. Save per-model outputs to separate files (`REVIEW-{MODEL}.md`)
6. After all complete, synthesize findings

**GitHub Permalinks**: https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/skills/paw-final-review/SKILL.md#L98 (paw-final-review), https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/skills/paw-planning-docs-review/SKILL.md#L108 (paw-planning-docs-review)

### 4. Specialist File Discovery Paths

**Current state**: No `.paw/personas/` or `~/.paw/personas/` directories exist in the project or user home.

**Skill discovery patterns** (observed file structure):
- **Project-level**: `.github/skills/<skill-name>/SKILL.md` (e.g., `.github/skills/multi-model-review/SKILL.md`, `.github/skills/prompt-annotation/SKILL.md`, `.github/skills/skill-creator/SKILL.md`)
- **User-level**: `~/.copilot/skills/<skill-name>/SKILL.md` (e.g., `~/.copilot/skills/paw-final-review/SKILL.md`, `~/.copilot/skills/paw-init/SKILL.md`, `~/.copilot/skills/paw-code-research/SKILL.md`)

**Proposed specialist precedence** (modeled after skill discovery):
1. **Workflow-level**: WorkflowContext.md field `Final Review Specialists: <list>` (explicit selection override)
2. **Project-level**: `.paw/personas/<name>.md` (team-specific specialists)
3. **User-level**: `~/.paw/personas/<name>.md` (personal specialists)
4. **Built-in**: Embedded in paw-final-review SKILL.md (default roster)

**Precedence semantics**: Most-specific-wins override (workflow > project > user > built-in). If a specialist file with the same name exists at multiple levels, the most specific level takes precedence.

**GitHub Permalinks**: N/A (directory structure observed via bash commands, no source file to reference)

### 5. paw-status SKILL.md Configuration Display

**Location**: `~/.copilot/skills/paw-status/SKILL.md`

**Configuration detection** (`SKILL.md:43-52`):
- Line 43: "Configuration Detection" section heading
- Line 45: "Read WorkflowContext.md for:"
- Line 46: "Workflow Mode, Review Strategy, Review Policy"
- Line 47: "Final Agent Review: `enabled` | `disabled`"
- Line 48: "Planning Docs Review: `enabled` | `disabled`"
- Line 49: "Final Review Mode: `single-model` | `multi-model`"
- Line 50: "Final Review Interactive: `true` | `false` | `smart`"
- Line 51: "Planning Review Mode: `single-model` | `multi-model`"
- Line 52: "Planning Review Interactive: `true` | `false` | `smart`"

**Status dashboard format** (`SKILL.md:160-168`):
- Line 161: "Synthesize findings into sections:"
- Line 162: "Artifacts: Existence and status"
- Line 163: "Phases: Current progress (N of M)"
- Line 164: "Phase Candidates: Pending/resolved candidate counts (if any exist)"
- Line 165: "Branch & Git: Current state, divergence"
- Line 166: "PRs: Open/merged status, review comments"
- Line 167: "Next Actions: Recommended commands"

**What needs updating**: Add society-of-thought configuration fields to the Configuration Detection section and Status Dashboard Format section. New fields to display:
- `Final Review Mode: society-of-thought` (alongside existing single-model/multi-model)
- `Final Review Specialists: <list or adaptive>` (specialist selection mode and roster)
- `Final Review Interaction Mode: parallel | debate` (review interaction pattern)
- `Final Review Interactive: true | false | smart` (already exists, reused for moderator mode)

**GitHub Permalinks**: https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/skills/paw-status/SKILL.md#L43 (config detection)

### 6. Documentation Infrastructure

**MkDocs configuration** (`mkdocs.yml`):
- Lines 1-8: Site metadata (name, URL, description, author, repo)
- Lines 10-42: Material theme with navigation features, search, dark/light mode toggle
- Lines 44-59: Plugins (search) and markdown extensions (code highlighting, admonitions, superfences, TOC)
- Lines 61-77: Navigation structure defining site hierarchy

**Documentation structure** (observed via `docs/` directory listing):
- `docs/index.md`: Home page
- `docs/guide/`: User-facing guides (Getting Started, VS Code Extension, CLI Installation, Workflow Modes, Stage Transitions, Two Workflows)
- `docs/specification/`: Technical specifications (Overview, Implementation Workflow, Review Workflow)
- `docs/reference/`: Reference documentation (Agents, Artifacts)

**Where to document society-of-thought**:
1. **User guide** (`docs/guide/`): New file `society-of-thought-review.md` explaining how to use the feature (specialist selection, interaction modes, custom specialists)
2. **Reference docs** (`docs/reference/`): 
   - Add section to `agents.md` or new `society-of-thought.md` for specialist persona template scaffold
   - Custom specialist creation guide with example personas

**Style conventions** (observed in mkdocs.yml and existing docs):
- YAML frontmatter for metadata in skill files
- Code blocks with language-specific syntax highlighting
- Admonitions for callouts/warnings
- Heading hierarchy: # for page title, ## for major sections, ### for subsections
- Inline code with backticks, code blocks with triple backticks and language identifier

**GitHub Permalinks**: https://github.com/lossyrob/phased-agent-workflow/blob/48fc31c25b387afe3db1be3318e2ca52f4a5da43/mkdocs.yml#L61 (nav structure)

## Code References

- `~/.copilot/skills/paw-final-review/SKILL.md:28-30` - Final Review Mode and Models configuration
- `~/.copilot/skills/paw-final-review/SKILL.md:55-85` - Review prompt template
- `~/.copilot/skills/paw-final-review/SKILL.md:88-100` - Single-model vs multi-model execution
- `~/.copilot/skills/paw-final-review/SKILL.md:103-136` - Synthesis structure
- `~/.copilot/skills/paw-final-review/SKILL.md:144-225` - Interactive resolution modes
- `~/.copilot/skills/paw-final-review/SKILL.md:240-247` - Review artifacts table
- `~/.copilot/skills/paw-init/SKILL.md:26-45` - Configuration parameters table
- `~/.copilot/skills/paw-init/SKILL.md:76-83` - Model resolution logic
- `~/.copilot/skills/paw-init/SKILL.md:92-119` - WorkflowContext.md template
- `~/.copilot/skills/paw-planning-docs-review/SKILL.md:108` - Task tool invocation pattern
- `.github/skills/multi-model-review/SKILL.md:70` - Multi-model review pattern
- `~/.copilot/skills/paw-status/SKILL.md:43-52` - Configuration detection
- `~/.copilot/skills/paw-status/SKILL.md:160-168` - Status dashboard format
- `mkdocs.yml:1-77` - Documentation configuration and navigation
- `package.json:scripts` - Verification commands (test, lint, compile)

## Architecture Documentation

### Multi-Model Review Architecture

**Three-phase pattern**:
1. **Configuration reading**: Read WorkflowContext.md for mode, models, interactive setting
2. **Parallel execution**: Spawn subagents using `task` tool with `model` parameter, each receives identical prompt with full context
3. **Synthesis and resolution**: Aggregate findings by agreement level (consensus > partial > single-model), classify by severity, route to interactive/auto-apply/report-only based on interactive setting

**Synthesis classification logic** (`paw-final-review/SKILL.md:186-191`):
- Consensus + must-fix/should-fix → auto-apply
- Partial agreement + must-fix/should-fix → interactive
- Single-model + must-fix/should-fix → interactive
- Any + consider → report-only

### Configuration Management Pattern

**paw-init responsibilities**:
1. Define input parameters with defaults
2. Prompt user for values (or use defaults)
3. Resolve intents to concrete values (e.g., "latest GPT" → `gpt-5.2`)
4. Validate configuration combinations (workflow mode vs review strategy constraints)
5. Store resolved values in WorkflowContext.md
6. One-time upfront decision, no per-review-gate interruptions

**Configuration field structure**:
- Mode field: Controls execution strategy (single-model, multi-model, society-of-thought)
- Interactive field: Controls resolution behavior (true, false, smart)
- Models field: Comma-separated concrete model names (resolved during init)
- Additional mode-specific fields: e.g., specialists, interaction mode for society-of-thought

### Specialist Discovery Pattern (Proposed)

**Four-level precedence** (most-specific-wins):
1. Workflow-level: WorkflowContext.md field (explicit list or adaptive)
2. Project-level: `.paw/personas/<name>.md` (discovered via file system)
3. User-level: `~/.paw/personas/<name>.md` (discovered via file system)
4. Built-in: Embedded in paw-final-review SKILL.md (fallback)

**Discovery algorithm**:
1. Check WorkflowContext.md for `Final Review Specialists` field
2. If fixed list: Use specified specialists, resolve from all 4 levels (most-specific-wins for name conflicts)
3. If adaptive mode: Discover all available specialists from all 4 levels, agent auto-selects up to N most relevant
4. If built-in only: Use default roster (5 built-in specialists)

### Review Artifact Management

**Artifact isolation**:
- All review outputs stored in `.paw/work/<work-id>/reviews/`
- `.gitignore` with `*` pattern excludes from version control
- Per-model files: `REVIEW-{MODEL}.md`
- Synthesis file: `REVIEW-SYNTHESIS.md`
- Planning reviews: `reviews/planning/` subdirectory

**Naming pattern**: `REVIEW-{IDENTIFIER}.md` where identifier is model name (e.g., `gpt-5.2`, `gemini-3-pro-preview`) or synthesis label (`SYNTHESIS`)

## Open Questions

1. **Specialist markdown format**: What fields should be required vs optional in specialist files? (name, cognitive strategy, behavioral rules, anti-sycophancy rules, model preference, example outputs)
2. **Adaptive selection algorithm**: How should the agent analyze the diff to select relevant specialists? (keyword matching, semantic analysis, user hints in commit messages)
3. **Debate mediation**: What data structure should the synthesis agent use for round summaries? (findings list, disagreement tracker, targeted questions)
4. **Interactive moderator UX**: How should the user summon a specialist mid-review? (command pattern like `@security-paranoid what about input validation?`, structured menu)
5. **Model-per-specialist fallback**: If a specialist's preferred model is unavailable, should we skip the specialist or use session default? (current: use session default with warning)
