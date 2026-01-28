# Implementation Skills Migration Plan

## Overview

Migrate the 9 implementation agents (PAW-01A through PAW-05, PAW-X Status) to a single-agent skills-based architecture following the pattern established by the PAW Review workflow migration (PR #156). The new architecture replaces ~163KB of agent content with a ~4KB orchestrator agent plus on-demand skill loading.

## Current State Analysis

The implementation workflow currently consists of 9 separate agent files totaling ~163KB:
- Each agent contains duplicated scaffolding: PAW context loading (`{{PAW_CONTEXT}}` ~3KB), handoff instructions (`{{HANDOFF_INSTRUCTIONS}}` ~6.5KB)
- Workflow mode and review strategy handling is repeated in each agent
- Agents range from 6.5KB (PAW-01B Spec Researcher) to 23KB (PAW-01A Specification)

### Key Discoveries:
- PAW Review agent demonstrates target architecture: 3.5KB orchestrator + 9.7KB workflow skill + ~104KB activity skills
- Skills are loaded via `paw_get_skill` tool at runtime, registered in [src/tools/skillTool.ts](src/tools/skillTool.ts)
- Agent installation via `loadAgentTemplates()` in [src/agents/installer.ts](src/agents/installer.ts:226-370)
- Handoff tool in [src/tools/handoffTool.ts](src/tools/handoffTool.ts) validates agent names against hardcoded `AgentName` type

## Desired End State

After implementation:
1. **Single PAW Agent** (~4KB) replaces PAW-01A through PAW-05 and PAW-X Status
2. **Workflow Skill** (`paw-workflow`) provides activity catalog, default flow guidance, validation gates, default transition guidance, and PR comment response guidance
3. **11 Activity Skills**: `paw-init`, `paw-spec`, `paw-spec-research`, `paw-spec-review`, `paw-code-research`, `paw-planning`, `paw-plan-review`, `paw-implement`, `paw-impl-review`, `paw-pr`, `paw-status`
4. **3 Utility Skills**:
   - `paw-review-response` for shared PR comment mechanics (loaded conditionally by activity skills)
   - `paw-git-operations` for branch naming conventions, strategy-based branching logic, and selective staging discipline
   - `paw-docs-guidance` for documentation conventions, Docs.md template, and project documentation update patterns (loaded by implementer during docs phase)
5. **Entry Point Prompt** (`prompts/paw.prompt.md`) invoked by VS Code command
6. All existing artifacts produced in same locations with same formats
7. All workflow modes (full/minimal/custom) function correctly
8. **New policy configurations**:
   - Review Policy (`always | milestones | never`) controls when workflow pauses for human review at artifact boundaries
   - Session Policy (`per-stage | continuous`) controls conversation context management

### Verification:
- User completes full workflow (spec → PR) using only PAW agent
- Token count for active session measurably lower than equivalent multi-agent setup
- All automated tests pass; artifact locations unchanged
- VS Code "PAW: New PAW Workflow" command invokes `/paw` prompt and proceeds without "continue" step

## What We're NOT Doing

- Changing artifact locations or formats
- Modifying the review workflow (already migrated per PR #156)
- Multi-runtime portability (Claude Code, Codex, etc.)
- Changing the existing component file `paw-context.component.md`
- Note: `handoff-instructions.component.md` will require minimal updates to route commands to PAW agent

## Implementation Approach

Follow the PAW Review migration pattern:
1. Create workflow skill that provides capability catalog and default flow guidance
2. Extract domain-specific content from each agent into dedicated activity skills
3. Create compact orchestrator agent that reasons about requests and delegates intelligently
4. Update extension tooling to support the new agent and new WorkflowContext fields
5. Deprecate individual implementation agents

The workflow skill will provide:
- **Skill Discovery Pattern**: Document that PAW agent retrieves skills dynamically via `paw_get_skills` tool; workflow skill provides usage patterns for typical implementation skills
- **Default Flow Guidance**: Typical stage progression for greenfield implementation
- **Transition Table**: Default stage progression and milestone classification, plus guidance for orchestrator session boundaries (via `paw_call_agent`) versus activity execution (via delegated subagents)
- **Artifact Structure**: Where artifacts live and their relationships
- **PR Comment Response Guidance**: Which skills handle which PR types

**Key insight**: The workflow skill is a **guide, not a state machine**. The PAW agent retrieves available skills dynamically via `paw_get_skills`, uses workflow guidance to understand typical patterns, then reasons about how to fulfill user requests—including non-linear paths.

**Clarification (Session reset vs activity execution)**:
- `runSubagent` is the execution mechanism for activity work (delegated worker sessions that load the relevant activity skill and produce artifacts).
- `paw_call_agent` is the orchestrator session mechanism (start a fresh PAW agent session / reset chat context). After a session reset, the new PAW agent session re-loads the workflow skill and continues by delegating the intended next activity via `runSubagent`.

Activity skills will provide:
- **Capabilities**: What the skill can do (not rigid "modes")
- Domain-specific process steps and methodology
- Artifact templates and formats
- Quality checklists and validation criteria
- **Completion responses** (return status to PAW agent, NOT handle handoffs)

**Key architectural principles**:
1. PAW agent owns all orchestration and reasons about user intent
2. Activity skills are flexible—they receive instructions and execute intelligently
3. Transition table is default guidance, not exclusive paths
4. PAW agent constructs meaningful delegation prompts with user context

## Phase Summary

1. **Phase 1: Create Workflow Skill** - Build `paw-workflow` skill with skill usage patterns, default flow guidance, validation gates, default transition guidance, and PR comment response guidance (PAW agent discovers skills dynamically via `paw_get_skills`)
2. **Phase 2: Create Activity and Utility Skills** - Extract domain content into skills, split into sub-phases for context management:
   - **Phase 2A: Utility Skills** - Create `paw-git-operations` and `paw-review-response` foundation skills that other skills reference
   - **Phase 2B: Bootstrap & Specification Skills** - Create `paw-init` (bootstrap skill), `paw-spec`, `paw-spec-research`, `paw-spec-review` for early workflow stages
   - **Phase 2C: Planning Skills** - Create `paw-code-research`, `paw-planning`, `paw-plan-review` for the planning stage
   - **Phase 2D: Implementation Skills** - Create `paw-implement`, `paw-impl-review` for core execution
   - **Phase 2E: Finalization Skills** - Create `paw-pr`, `paw-status` for final workflow stages
3. **Phase 3: Create PAW Agent and Entry Point** - Build compact orchestrator agent that reasons about intent and delegates activities; create `/paw` entry point prompt
4. **Phase 4: Update Extension Tooling** - Modify handoff tool, VS Code initialization command, and installer to support the new architecture
5. **Phase 5: Deprecate Legacy Agents** - Remove individual implementation agents and old initialization template, update documentation
6. **Phase 6: Work Shaping Utility Skill** - Create `paw-work-shaping` utility skill for interactive pre-spec ideation sessions

---

## Phase 1: Create Workflow Skill

### Overview
Create the `paw-workflow` skill that provides the PAW agent with skill usage patterns, default flow guidance, and orchestration patterns. This skill is a **reference guide** that the PAW agent consults—the PAW agent discovers available skills dynamically via `paw_get_skills` tool rather than relying on a static catalog embedded in the workflow skill.

### Changes Required:

#### 1. Workflow Skill
**File**: `skills/paw-workflow/SKILL.md`
**Changes**: 
- Create skill following structure of `paw-review-workflow/SKILL.md`
- Define Core Implementation Principles (evidence-based documentation, file:line references, artifact completeness)
- **Activity Catalog Discovery**: Document that PAW agent retrieves available skills dynamically via `paw_get_skills` tool rather than embedding a static catalog; the workflow skill provides guidance on typical skill usage patterns:
  | Skill | Capabilities | Primary Artifacts |
  |-------|--------------|-------------------|
  | `paw-spec` | Create spec, revise spec, align with downstream artifacts | Spec.md |
  | `paw-spec-research` | Answer factual questions about existing system | SpecResearch.md |
  | `paw-code-research` | Document implementation details with file:line refs, discover docs infrastructure | CodeResearch.md |
  | `paw-planning` | Create implementation plan with documentation phase when warranted, revise plan, address PR comments | ImplementationPlan.md |
  | `paw-implement` | Execute plan phases, make code changes, execute docs phases (loads paw-docs-guidance), address PR comments | Code files, Docs.md |
  | `paw-impl-review` | Review implementation, add inline docs, open PRs | Phase PRs |
  | `paw-pr` | Pre-flight validation, create final PR | Final PR |
  
    **Note**: `paw-init` is a **bootstrap skill**, not an activity skill. It runs before the workflow skill is loaded to create WorkflowContext.md. The workflow skill assumes WorkflowContext.md already exists. `paw-status` is loaded directly by the PAW agent when the user asks for status/help (it does not need to appear in the workflow skill's usage-patterns table).
    
    **Utility skills** (`paw-review-response`, `paw-git-operations`, `paw-docs-guidance`) are loaded conditionally by activity skills—they don't appear in workflow guidance since the PAW orchestrator doesn't delegate to them directly.
- Define artifact directory structure (`.paw/work/<work-id>/`)
- **Default Flow Guidance** (typical greenfield progression):
  - **Specification Stage**: `paw-spec` → `paw-spec-research` (if needed) → `paw-spec` (resume)
  - **Planning Stage**: `paw-code-research` → `paw-planning`
  - **Implementation Stage**: For each phase in plan: `paw-implement` → `paw-impl-review`
  - **Finalization Stage**: `paw-pr`
- **Default Transition Table** (guidance for typical flow, not exclusive paths):

  *Note: This table documents workflow stage transitions. The `paw-init` bootstrap skill runs before the workflow starts and is not included here—it is invoked directly by the PAW agent when WorkflowContext.md doesn't exist.*

  | Transition | Milestone? | Session Policy: per-stage (orchestrator) | Activity execution |
  |------------|------------|------------------------------------------|------------------|
  | spec → spec-research | No | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-spec-research`) |
  | spec-research → spec (resume) | No | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-spec`) |
  | spec → code-research | No | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-code-research`) |
  | code-research → planning | No | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-planning`) |
  | planning → implement | **Yes** | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-implement`) |
  | implement → impl-review (within phase) | No | (same session) | `runSubagent` (`paw-impl-review`) |
  | phase N complete → phase N+1 | **Yes** | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-implement`) |
  | all phases complete → final-pr | **Yes** | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-pr`) |

- Document **Session Policy behavior**:
  - `per-stage`: Use `paw_call_agent` at stage boundaries to start a fresh PAW agent session, then continue by delegating the intended activity via `runSubagent`
  - `continuous`: Keep a single PAW agent session throughout; still delegate activities via `runSubagent`
  - *Note*: Verify during Phase 3 testing that `runSubagent` preserves context as expected for the "continuous" orchestrator session model
- Document **Review Policy behavior** (boundaries are artifact-level, not stage-level):
  - `always`: Pause after every artifact is produced for potential iteration
  - `milestones`: Pause at milestone artifacts; proceed automatically at non-milestone artifacts
  - `never`: Never pause, proceed continuously without review pauses
- **Explicit Milestone Artifacts** (for Review Policy `milestones` behavior):
  - **Milestone artifacts** (pause for review): Spec.md, ImplementationPlan.md, Phase PR completion, Final PR creation
  - **Non-milestone artifacts** (auto-proceed): WorkflowContext.md, SpecResearch.md, CodeResearch.md, Docs.md (part of implementation phase), intermediate commits
- Define stage gates (artifact verification between stages)
- Encode workflow mode handling (full/minimal/custom)
- **PR Comment Response Guidance** (which skills typically handle PR comments):
  - Planning PR → `paw-planning`
  - Phase PR → `paw-implement` → `paw-impl-review`
  - Final PR → `paw-implement` → `paw-impl-review`
- **Intelligent Routing Guidance**: Document that PAW agent should:
  - Reason about user intent, using workflow guidance as a reference
  - Select appropriate skill(s) based on what user wants to accomplish
  - Construct delegation prompts that include user's context and specific request
  - Handle non-linear requests (e.g., "update spec to align with plan changes")
- Document **Subagent Completion Contract**: Activity skills return completion status (artifact path, success/failure), do NOT make handoff decisions

**Tests**:
- Manual verification: Load skill via `paw_get_skill('paw-workflow')` and verify content matches specification
- Verify skill usage patterns table lists typical implementation skills with capabilities
- Verify transition table is framed as default guidance

### Success Criteria:

#### Automated Verification:
- [x] Skill file exists at `skills/paw-workflow/SKILL.md`
- [x] YAML frontmatter contains `name: paw-workflow` and `description`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] Skill usage patterns table documents typical implementation skills with capabilities (PAW agent discovers skills dynamically via `paw_get_skills`)
- [x] Default flow guidance covers typical greenfield progression
- [x] Transition table framed as default guidance (not exclusive paths)
- [x] Intelligent Routing Guidance section documents flexible intent-based delegation
- [x] Review Policy behavior documented for all three values with artifact-level boundaries clarified
- [x] Explicit milestone artifact list included (Spec.md, ImplementationPlan.md, Phase PR completion, Final PR)
- [x] Session Policy behavior documented for both values with implementation note about `runSubagent` context preservation
- [x] PR Comment Response Guidance covers all PR types
- [x] Subagent Completion Contract clearly specifies activity skills return status, not handle handoffs

### Phase 1 Completion Notes

**Completed**: 2026-01-26

Created `paw-workflow` skill (~10KB) following the pattern from `paw-review-workflow`. Key sections include:
- Core Implementation Principles (5 principles for activity skills to reference)
- Activity Skill Usage Patterns table (9 activity + 2 utility skills; `paw-init` is a separate bootstrap skill)
- Artifact Directory Structure
- Default Flow Guidance for 4 stages (Specification, Planning, Implementation, Finalization)
- Default Transition Table with milestone markers
- Review Policy behavior (`always`/`milestones`/`never`) at artifact-level boundaries
- Session Policy behavior (`per-stage`/`continuous`) with runSubagent implementation note
- PR Comment Response Guidance for all PR types
- Subagent Completion Contract (status-only returns)
- Intelligent Routing Guidance with non-linear request examples
- Workflow Mode handling (full/minimal/custom)

**Review notes**: Consider whether the skill size (~10KB) is appropriate or if some sections could be condensed. The content follows the Implementation Plan requirements closely.

---

## Phase 2: Create Activity and Utility Skills

### Overview
Extract domain-specific content from each implementation agent into dedicated activity skills, plus create two utility skills. Phase 2 is split into sub-phases for context management—each sub-phase creates 2-3 related skills to prevent context overload.

**Sub-phase structure**:
- **2A**: Utility skills (foundation that other skills reference)
- **2B**: Initialization & specification skills (early workflow)
- **2C**: Planning skills (middle workflow)
- **2D**: Implementation skills (core execution)
- **2E**: Finalization skills (docs, PR, status)

Activity skills describe **capabilities** (what they can do) rather than rigid modes, enabling flexible execution based on delegation instructions from the PAW agent.

---

## Phase 2A: Utility Skills

### Overview
Create the two utility skills that provide shared mechanics referenced by activity skills. These must be created first since activity skills will reference them.

### Changes Required:

#### 1. Git Operations Utility Skill
**File**: `skills/paw-git-operations/SKILL.md`
**Changes**:
- Create utility skill containing shared git and branch mechanics
- Content extracted from common patterns across PAW-02B, PAW-03A, PAW-03B, PAW-04:
  - **Branch naming conventions**:
    - Phase branches: `<target>_phase[N]` or `<target>_phase[M-N]`
    - Planning branches: `<target>_plan`
    - Docs branches: `<target>_docs`
  - **Strategy-based branching logic**:
    - PRs strategy: Create/verify phase branches, push to remote, create PRs
    - Local strategy: Work directly on target branch, no intermediate branches
  - **Selective staging discipline**:
    - Always `git add <file1> <file2>` (never `git add .` or `git add -A`)
    - Check `.paw/work/<work-id>/.gitignore` before staging `.paw/` artifacts
    - Pre-commit verification: `git diff --cached`
  - **Branch verification**:
    - Verify current branch matches expected pattern before commits
    - Handle incorrect branch situations (stop and switch)
- Activity skills load this utility for git operations to ensure consistent branch handling

**Tests**:
- Manual verification: Skill loads via `paw_get_skill('paw-git-operations')`
- Verify branch naming conventions match current agent behavior
- Verify strategy-based logic covers both PRs and local strategies

#### 2. Review Response Utility Skill
**File**: `skills/paw-review-response/SKILL.md`
**Changes**:
- Create utility skill containing shared PR review response mechanics
- Content extracted from common patterns across PAW-02B, PAW-03A, PAW-03B, PAW-04:
  - Read all unresolved PR comments via MCP tools
  - Create TODOs: one per comment (group small related comments)
  - For each TODO: make changes → check `.gitignore` before staging `.paw/` artifacts → commit with message referencing comment → push → reply with format `**🐾 [Activity] 🤖:** [Change summary + commit hash]`
  - Verify all comments addressed before signaling completion
- Activity skills load this utility when addressing PR comments
- Keeps activity skills focused on domain-specific guidance (what to change) while utility skill handles mechanics (how to commit/push/reply)

**Tests**:
- Manual verification: Skill loads via `paw_get_skill('paw-review-response')`
- Verify mechanics match current agent behavior

#### 3. Documentation Guidance Utility Skill
**File**: `skills/paw-docs-guidance/SKILL.md`
**Changes**:
- Create utility skill containing documentation conventions and templates
- Content extracted from `PAW-04 Documenter.agent.md`:
  - **Docs.md template structure**: Overview, architecture, usage patterns, API reference, configuration, testing approach
  - **What to include/exclude guidelines**: Focus on design decisions, integration points, user-facing behavior; exclude code reproduction, exhaustive API docs
  - **Project documentation update patterns**: README (concise summary), CHANGELOG (single entry), guides (match existing style)
  - **Style matching guidance**: Study existing docs, match verbosity level, be concise in project docs
- Implementer loads this utility when executing documentation phases
- Keeps `paw-implement` focused on execution mechanics while utility skill provides documentation domain knowledge

**Tests**:
- Manual verification: Skill loads via `paw_get_skill('paw-docs-guidance')`
- Verify Docs.md template matches current PAW-04 agent

### Success Criteria (Phase 2A):

#### Automated Verification:
- [x] Utility skills exist at `skills/paw-git-operations/SKILL.md`, `skills/paw-review-response/SKILL.md`, and `skills/paw-docs-guidance/SKILL.md`
- [x] Each skill has valid YAML frontmatter with `name` and `description`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] `paw-git-operations` covers branch naming, strategy-based logic, and selective staging
- [ ] `paw-review-response` covers PR comment mechanics with TODO workflow
- [ ] `paw-docs-guidance` provides Docs.md template and project doc update patterns
- [ ] All utilities can be loaded via `paw_get_skill`

### Phase 2A Completion Notes

**Completed**: 2026-01-27

Created three utility skills that provide shared mechanics for activity skills:

1. **`paw-git-operations`** (~2.5KB): Branch naming conventions table, strategy-based branching logic (prs vs local), selective staging discipline with `.gitignore` checking, branch verification patterns.

2. **`paw-review-response`** (~2.8KB): PR review comment workflow (read → TODO → address → commit → push → reply), reply format with activity names by PR type, commit message format, role separation between mechanics and domain logic.

3. **`paw-docs-guidance`** (~3.2KB): Docs.md template structure, include/exclude guidelines, project documentation update patterns with style matching discipline, documentation depth by workflow mode.

**Review notes**: Verify the utility skills can be loaded via `paw_get_skill` tool and that content matches expectations from the source agents.

---

## Phase 2B: Bootstrap & Specification Skills

### Overview
Create the bootstrap skill (`paw-init`) and specification-related activity skills for the early workflow stages.

**Architectural Note**: `paw-init` is a **bootstrap skill**, not an activity skill. It runs before the workflow skill is loaded, creating WorkflowContext.md which is required for the workflow to function. The PAW agent invokes `paw-init` directly when no WorkflowContext.md exists, then loads `paw-workflow` after initialization completes.

### Changes Required:

#### 1. Bootstrap Skill: paw-init
**File**: `skills/paw-init/SKILL.md`
**Changes**:
- Extract initialization logic from `src/prompts/workItemInitPrompt.template.md` into a bootstrap skill
- Add YAML frontmatter with `name: paw-init`, `description` (clarify it's a bootstrap skill in description)
- Define **capabilities**:
  - Generate Work Title from issue URL, branch name, or user description
  - Generate Work ID from Work Title (normalized, unique)
  - Create `.paw/work/<work-id>/` directory structure
  - Generate WorkflowContext.md with all configuration fields
  - Create and checkout git branch (explicit or auto-derived)
  - Commit initial artifacts if tracking is enabled
  - Open WorkflowContext.md for review
- Include WorkflowContext.md template
- Include validation rules (slug format, branch conflicts, review strategy constraints)
- **Completion response**: Return work ID and next step based on Workflow Mode
- Reference `paw-git-operations` for branch creation mechanics

**Input Parameters** (received via delegation from PAW agent):
- `target_branch`: Git branch name or empty for auto-derive
- `workflow_mode`: full | minimal | custom
- `review_strategy`: prs | local
- `review_policy`: always | milestones | never (maps from handoff_mode if provided)
- `session_policy`: per-stage | continuous
- `track_artifacts`: boolean
- `issue_url`: optional GitHub/Azure DevOps URL
- `custom_instructions`: optional (required if workflow_mode is custom)
- `work_description`: optional user-provided description

**Tests**:
- Manual verification: Skill loads correctly
- Test: Initialization creates correct directory structure and WorkflowContext.md

#### 2. Specification Skill
**File**: `skills/paw-spec/SKILL.md`
**Changes**:
- Extract from `PAW-01A Specification.agent.md`: core principles, research question guidelines, drafting workflow, spec template, quality checklist
- Add YAML frontmatter with `name: paw-spec`, `description`
- Reference Core Implementation Principles from `paw-workflow`
- Define **capabilities** (flexible, not rigid modes):
  - Create new specification from brief/issue
  - Integrate research findings into spec
  - Revise spec based on downstream learnings (e.g., align with implementation plan)
  - Address PR review comments on spec
- Include spec template structure and quality checklist
- **Design for flexible execution**: Skill interprets delegation instructions intelligently

**Tests**:
- Manual verification: Skill loads correctly, describes capabilities flexibly
- Test file: N/A (skill content verification is manual)

#### 3. Spec Research Skill
**File**: `skills/paw-spec-research/SKILL.md`
**Changes**:
- Extract from `PAW-01B Spec Researcher.agent.md`: research methodology, behavioral documentation focus, document format
- Add YAML frontmatter
- Reference workflow principles
- Define **capabilities**: Answer factual questions about existing system behavior
- Define SpecResearch.md artifact template

**Tests**:
- Manual verification: Skill loads correctly
- Verify SpecResearch.md template matches current format

#### 4. Spec Review Skill
**File**: `skills/paw-spec-review/SKILL.md`
**Changes**:
- Create new skill for reviewing specifications before planning proceeds
- Add YAML frontmatter with `name: paw-spec-review`, `description`
- Reference Core Implementation Principles from `paw-workflow`
- Define **capabilities**:
  - Review Spec.md for quality, completeness, and clarity
  - Validate against quality criteria (completeness, testability, no ambiguities, clear acceptance criteria)
  - Identify specific sections needing revision
  - Return structured feedback with pass/fail status
- Define quality criteria checklist:
  - All user stories have acceptance scenarios
  - Functional requirements are complete and unambiguous
  - Success criteria are testable
  - No placeholder content or TBDs
  - Scope is clearly defined (in/out)
- **Completion response**: Return structured feedback (pass/fail + specific issues) to PAW agent
- Skill runs in subagent to manage context isolation

**Tests**:
- Manual verification: Skill loads correctly
- Verify skill provides clear quality criteria for specs

### Success Criteria (Phase 2B):

#### Automated Verification:
- [x] Skills exist at `skills/paw-init/SKILL.md`, `skills/paw-spec/SKILL.md`, `skills/paw-spec-research/SKILL.md`, `skills/paw-spec-review/SKILL.md`
- [x] Each skill has valid YAML frontmatter with `name` and `description`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] `paw-init` handles all initialization parameters and creates correct WorkflowContext.md
- [x] `paw-init` references `paw-git-operations` for branch mechanics
- [x] `paw-spec` describes capabilities flexibly (not rigid modes)
- [x] `paw-spec` references `paw-review-response` for PR comment work
- [x] `paw-spec-research` defines SpecResearch.md template
- [x] `paw-spec-review` defines clear quality criteria for spec validation
- [x] `paw-spec-review` returns structured feedback (not orchestration decisions)
- [x] Quality checklists preserved from original agents

### Phase 2B Completion Notes

**Completed**: 2026-01-27

Created four skills for the bootstrap and specification stages:

1. **`paw-init`** (~6.3KB): Bootstrap skill with WorkflowContext.md template, input parameters table, execution steps for slug generation and branch creation, references `paw-git-operations` for branch mechanics.

2. **`paw-spec`** (~7.3KB): Specification activity skill with core principles (9 items from PAW-01A), research question guidelines, Spec.md template, quality checklist sections. Defines flexible capabilities including new spec creation, research integration, spec revision, and PR comment handling.

3. **`paw-spec-research`** (~5.1KB): Spec research skill with behavioral documentation scope, SpecResearch.md template with YAML frontmatter, anti-evaluation directives, and quality guidelines for concise answers.

4. **`paw-spec-review`** (~4.4KB): New spec review skill with quality criteria checklist covering content quality, narrative quality, requirement completeness, ambiguity control, scope & risk, and research integration. Returns structured PASS/FAIL feedback format.

**Review notes**: Verify `paw-spec` references `paw-review-response` for PR comment work (currently only mentions it in capabilities, may need explicit reference). Manual verification items remain for Phase 2B review.

### Addressed Review Comments (PR #168): 2026-01-28

Addressed review comments from owner and Copilot code review:

1. **Rename 'feature slug' to 'work ID'** (owner comment): Updated all references across all four skills to use 'Work ID' consistently.

2. **Default values with confirmation** (owner comment): Updated `paw-init` Input Parameters table to show defaults and added "Handling Missing Parameters" section explaining the confirmation flow.

3. **Remove hardcoded templates** (Copilot comments): Replaced static response templates with descriptions of what information to include in:
   - `paw-init`: Completion Response, Error Handling table removed
   - `paw-spec`: Completion Response templates, Research Prompt Format template
   - `paw-spec-research`: Completion Response template, Execution Steps
   - `paw-spec-review`: Feedback Format templates, Completion Response template

4. **Describe end states instead of procedures** (Copilot comments): Refactored procedural sections to describe desired end states:
   - `paw-spec`: Execution Based on Context sections
   - `paw-spec-research`: Converted Execution Steps to Desired End State + Research Process
   - `paw-spec-review`: Converted Execution Steps to Desired End State + Review Process

5. **Agent reference to skill reference** (Copilot comment): Changed Research Prompt Format from referencing `PAW-01B Spec Researcher` agent to `paw-spec-research` skill.

6. **Research Prompt → ResearchQuestions naming** (owner comment): Updated artifact naming from "Research Prompt" to "ResearchQuestions" to align with paw-review workflow pattern. The file is `ResearchQuestions.md` (plain markdown), not a `.prompt.md` file.

---

## Phase 2C: Planning Skills

### Overview
Create the code research and planning skills for the middle workflow stage.

### Changes Required:

#### 1. Code Research Skill
**File**: `skills/paw-code-research/SKILL.md`
**Changes**:
- Extract from `PAW-02A Code Researcher.agent.md`: research methodology (Code Location, Code Analysis, Pattern Finding), YAML frontmatter format, GitHub permalink generation
- Define **capabilities**: Document implementation details with file:line references, additional research on demand
- **Documentation System Research** (per issue #150): Include documentation infrastructure discovery as standard research component:
  - Discover documentation framework (mkdocs, docusaurus, sphinx, plain markdown, etc.)
  - Identify docs directory structure and navigation configuration files
  - Document existing documentation style and conventions
  - Note README, CHANGELOG, and other standard project docs locations
  - Capture any documentation build/serve commands
- Define CodeResearch.md artifact template with frontmatter, including **Documentation System** section:
  ```markdown
  ## Documentation System
  - **Framework**: [mkdocs/docusaurus/sphinx/markdown/none]
  - **Docs Directory**: [path to docs folder]
  - **Navigation Config**: [path to mkdocs.yml/sidebar.js/etc.]
  - **Style Conventions**: [key observations about existing doc style]
  - **Build Command**: [command to build/serve docs locally]
  - **Standard Files**: [README.md, CHANGELOG.md, etc. locations]
  ```

**Tests**:
- Manual verification: Skill loads correctly
- Verify CodeResearch.md template matches current format
- Verify Documentation System section is included in template

#### 2. Planning Skill
**File**: `skills/paw-planning/SKILL.md`
**Changes**:
- Extract from `PAW-02B Impl Planner.agent.md`: context gathering steps, research process, plan template structure, important guidelines, quality checklist
- Define **capabilities**:
  - Create implementation plan from spec and research
  - Revise plan based on learnings
  - Address PR review comments (load `paw-review-response` for mechanics)
  - **Documentation phase planning** (per issue #150): Include documentation as final implementation phase when documentation updates are warranted
- **Documentation Phase Planning Guidelines**:
  - Read Documentation System section from CodeResearch.md to understand project docs infrastructure
  - Include documentation phase when work creates user-facing features, changes APIs, or modifies existing behavior worth documenting
  - Documentation phase is the **final implementation phase** (not a separate stage) and goes through the same review flow as code changes
  - Documentation phase should specify:
    - Docs.md creation (comprehensive technical reference)
    - Project documentation updates (README, CHANGELOG, guides) following project conventions from CodeResearch.md
    - Documentation build verification command (if framework discovered)
  - Implementer executes documentation phase like any code phase, loading `paw-docs-guidance` utility for templates and conventions
  - **Omit documentation phase** for purely internal changes, refactors without behavior changes, or work where user explicitly indicates no docs needed
- Reference `paw-git-operations` for planning branch creation and commit mechanics
- Include ImplementationPlan.md template with phase structure

**Tests**:
- Manual verification: Skill loads correctly
- Verify ImplementationPlan.md template matches current format

#### 3. Plan Review Skill
**File**: `skills/paw-plan-review/SKILL.md`
**Changes**:
- Create new skill for reviewing implementation plans before implementation proceeds
- Add YAML frontmatter with `name: paw-plan-review`, `description`
- Reference Core Implementation Principles from `paw-workflow`
- Define **capabilities**:
  - Review ImplementationPlan.md for feasibility, completeness, and spec alignment
  - Validate against quality criteria (spec coverage, phase feasibility, clear success criteria, appropriate phase boundaries)
  - Identify specific phases or sections needing revision
  - Return structured feedback with pass/fail status
- Define quality criteria checklist:
  - All spec requirements mapped to plan phases
  - Each phase has clear, testable success criteria
  - Phase boundaries are logical (not too large, not too small)
  - Dependencies between phases are explicit
  - No placeholder content or TBDs
  - Code research findings are incorporated
- **Completion response**: Return structured feedback (pass/fail + specific issues) to PAW agent
- Skill runs in subagent to manage context isolation

**Tests**:
- Manual verification: Skill loads correctly
- Verify skill provides clear quality criteria for implementation plans

### Success Criteria (Phase 2C):

#### Automated Verification:
- [x] Skills exist at `skills/paw-code-research/SKILL.md`, `skills/paw-planning/SKILL.md`, `skills/paw-plan-review/SKILL.md`
- [x] Each skill has valid YAML frontmatter with `name` and `description`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [x] `paw-code-research` defines research methodology and CodeResearch.md template
- [x] `paw-code-research` includes Documentation System section in template (framework, docs dir, nav config, style, build command)
- [x] `paw-planning` references `paw-git-operations` for branch/commit mechanics
- [x] `paw-planning` references `paw-review-response` for PR comment work
- [x] `paw-planning` includes documentation phase planning guidelines (when to include, what to specify, references to paw-docs-guidance)
- [x] `paw-plan-review` defines clear quality criteria for plan validation
- [x] `paw-plan-review` returns structured feedback (not orchestration decisions)
- [x] ImplementationPlan.md template includes phase structure
- [x] Quality checklists preserved from original agents

### Phase 2C Completion Notes

**Completed**: 2026-01-28

Created three skills for the planning workflow stage:

1. **`paw-code-research`** (~5.5KB): Research methodology (Code Location, Code Analysis, Pattern Finding), CodeResearch.md template with YAML frontmatter and Documentation System section (framework, docs directory, nav config, style conventions, build command, standard files). Includes workflow mode adaptation and follow-up research handling.

2. **`paw-planning`** (~7KB): Implementation planning with strategic guidelines (C4 abstraction level), ImplementationPlan.md template with phase structure. Includes documentation phase planning guidelines (when to include/omit, what to specify, references paw-docs-guidance). References paw-git-operations for branching and paw-review-response for PR comment work.

3. **`paw-plan-review`** (~3KB): Plan review skill with quality criteria covering spec coverage, phase feasibility, completeness, research integration, strategic focus, and documentation planning. Returns structured PASS/FAIL feedback with categorized issues (BLOCKING, IMPROVE, NOTE).

**Review notes**: Skills follow established patterns from Phase 2B. Quality checklists preserved from PAW-02A and PAW-02B agents.

---

## Phase 2D: Implementation Skills

### Overview
Create the implementation and implementation review skills for core execution.

### Changes Required:

#### 1. Implementation Skill
**File**: `skills/paw-implement/SKILL.md`
**Changes**:
- Extract from `PAW-03A Implementer.agent.md`: implementation philosophy, blocking criteria, verification approach, committing guidelines
- Define **capabilities**:
  - Execute one or more plan items (typically a single phase) based on delegation instructions
  - Make focused code changes with appropriate verification (tests/lint) per repository norms
  - Execute documentation phases (create/update Docs.md, update project documentation)
  - Address PR review comments on implementation work (load `paw-review-response` for mechanics)
  - Handle non-linear requests (e.g., "adjust implementation to match updated spec") when delegated by PAW agent
- **Documentation Phase Execution** (per issue #150):
  - When executing a documentation phase (as specified in ImplementationPlan.md), load `paw-docs-guidance` utility skill for templates and conventions
  - Documentation phases are executed like any other implementation phase—same branch strategy, same review flow
  - The plan provides documentation phase details; the `paw-docs-guidance` utility provides the templates and guidance for creating Docs.md and updating project docs
  - Verify documentation builds correctly using command from CodeResearch.md (if documentation framework discovered)
- Reference `paw-git-operations` for phase branch creation and selective staging
- Reference `paw-docs-guidance` for documentation templates and conventions (loaded conditionally during docs phases)
- Document one-phase-per-invocation pattern

**Tests**:
- Manual verification: Skill loads correctly
- Verify implementation philosophy preserved
- Verify skill references paw-docs-guidance for documentation phases

#### 2. Implementation Review Skill
**File**: `skills/paw-impl-review/SKILL.md`
**Changes**:
- Extract from `PAW-03B Impl Reviewer.agent.md`: review process steps, documentation standards, PR description templates
- Define **capabilities**:
  - Review implementation for quality and maintainability
  - Add documentation/docstrings
  - Push changes and open Phase PRs
  - Verify PR comments have been addressed
  - Post progress updates as PR comments
- Reference `paw-git-operations` for push and PR creation mechanics
- **PR Update Policy**: Clarify that after a PR is opened, progress updates and change summaries should be posted as **PR comments**, not modifications to the PR body. PR body modifications require explicit user request. This prevents accidental overwrite of carefully crafted PR descriptions.
- Note: Named `paw-impl-review` to distinguish from `paw-review-*` skills for PR review workflow

**Tests**:
- Manual verification: Skill loads correctly
- Verify PR description templates preserved
- Verify skill documents PR update policy (comments over body modifications)

### Success Criteria (Phase 2D):

#### Automated Verification:
- [ ] Skills exist at `skills/paw-implement/SKILL.md`, `skills/paw-impl-review/SKILL.md`
- [ ] Each skill has valid YAML frontmatter with `name` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] `paw-implement` references `paw-git-operations` for branch/staging mechanics
- [ ] `paw-implement` references `paw-review-response` for PR comment work
- [ ] `paw-implement` references `paw-docs-guidance` for documentation phase execution
- [ ] `paw-implement` documents one-phase-per-invocation pattern
- [ ] `paw-implement` documents documentation phase execution (load paw-docs-guidance, verify docs build)
- [ ] `paw-impl-review` references `paw-git-operations` for push/PR mechanics
- [ ] `paw-impl-review` documents PR update policy (post comments, don't modify PR body)
- [ ] PR description templates preserved from original agents

---

## Phase 2E: Finalization Skills

### Overview
Create the final PR and status skills for the finalization stage. Note: Documentation is now handled as part of implementation phases (per issue #150), so there is no separate `paw-docs` skill. Documentation templates and conventions are provided by the `paw-docs-guidance` utility skill, which `paw-implement` loads conditionally during documentation phases.

### Changes Required:

#### 1. Final PR Skill
**File**: `skills/paw-pr/SKILL.md`
**Changes**:
- Extract from `PAW-05 PR.agent.md`: pre-flight validation checks, PR description guidelines, artifact linking
- Define **capabilities**:
  - Run pre-flight validation
  - Create comprehensive PR description
  - Open final PR to main
- Document simple vs complex PR description formats

**Tests**:
- Manual verification: Skill loads correctly
- Verify PR description formats preserved

#### 2. Status Skill
**File**: `skills/paw-status/SKILL.md`
**Changes**:
- Extract from `PAW-X Status.agent.md`: workflow stages overview, artifact dependencies, common errors/resolutions
- Define **capabilities**:
  - Diagnose current workflow state
  - Recommend next steps
  - Explain PAW process
  - Post status updates to Issues/PRs

**Tests**:
- Manual verification: Skill loads correctly
- Verify workflow stages documentation preserved

### Success Criteria (Phase 2E):

#### Automated Verification:
- [ ] Skills exist at `skills/paw-pr/SKILL.md`, `skills/paw-status/SKILL.md`
- [ ] Each skill has valid YAML frontmatter with `name` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] `paw-pr` documents simple vs complex PR description formats
- [ ] `paw-status` covers workflow stages and common errors

---

## Phase 2 Overall Success Criteria

After completing all Phase 2 sub-phases:

#### Automated Verification:
- [ ] All 11 activity skill files exist in `skills/paw-*/SKILL.md` directories (including `paw-init`, `paw-spec-review`, `paw-plan-review`; no `paw-docs` per issue #150)
- [ ] All 3 utility skills exist: `skills/paw-review-response/SKILL.md`, `skills/paw-git-operations/SKILL.md`, and `skills/paw-docs-guidance/SKILL.md`
- [ ] Each skill has valid YAML frontmatter with `name` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Skills describe capabilities flexibly (not rigid modes)
- [ ] Skills are written for intelligent execution based on delegation instructions
- [ ] `paw-init` skill handles all initialization parameters and creates correct WorkflowContext.md
- [ ] `paw-spec-review` validates specs against quality criteria and returns structured feedback
- [ ] `paw-plan-review` validates plans against quality criteria and returns structured feedback
- [ ] `paw-code-research` includes Documentation System section in CodeResearch.md template
- [ ] `paw-planning` includes documentation phase planning guidelines
- [ ] `paw-implement` references `paw-docs-guidance` for documentation phase execution
- [ ] `paw-docs-guidance` provides Docs.md template and project doc update patterns
- [ ] Activity skills reference `paw-review-response` utility for PR comment work
- [ ] Activity skills reference `paw-git-operations` utility for branch/commit work
- [ ] No duplicate PR mechanics across activity skills (consolidated in utility skill)
- [ ] No duplicate git/branch mechanics across activity skills (consolidated in utility skill)
- [ ] No duplicate documentation templates across skills (consolidated in `paw-docs-guidance` utility)
- [ ] Artifact templates match existing agent outputs
- [ ] Quality checklists preserved from original agents

---

## Phase 3: Create PAW Agent and Entry Point

### Overview
Create the compact PAW orchestrator agent (~4KB) that replaces the 9 individual implementation agents, plus the `/paw` entry point prompt. The agent **reasons about user intent** and delegates intelligently to activity skills. It uses the workflow skill as guidance (not rigid rules), constructs meaningful delegation prompts, and handles both linear and non-linear requests. The entry point prompt enables the VS Code command to invoke the PAW agent with configuration parameters.

### Changes Required:

#### 1. PAW Agent
**File**: `agents/PAW.agent.md`
**Changes**:
- Follow pattern from `PAW Review.agent.md` (~3.5KB)
- Include agent metadata (description) for VS Code prompts
- One-sentence role description
- Initialization: "Load the `paw-workflow` skill to understand available activities, default flow, and orchestration guidance"
- **Initialization Detection**: If invoked with initialization parameters (target_branch, workflow_mode, etc.) and no WorkflowContext.md exists, delegate to `paw-init` skill first
- Context detection: Work ID from user input, initialization parameters, or existing WorkflowContext.md
- **Policy detection from WorkflowContext.md**:
  - Read `Review Policy` (default: `milestones`)
  - Read `Session Policy` (default: `per-stage`)
- Workflow mode detection summary (full/minimal/custom from WorkflowContext.md)
- **Dynamic Skill Discovery**: Retrieve available skills via `paw_get_skills` tool rather than relying on static catalog in workflow skill
- **Intelligent Request Handling**:
  1. Reason about user intent (what do they want to accomplish?)
  2. Consult skills catalog via `paw_get_skills` (which skill has this capability?)
  3. Construct activity-specific delegation prompt:
     - Skill to load
     - Activity goal describing what the skill should accomplish
     - For non-linear requests: include user's specific request as part of activity context
     - Note: Not every delegation includes original user request verbatim—only when relevant
     - Relevant artifact paths
  4. Delegate via appropriate mechanism:
     - `runSubagent` if `continuous` Session Policy OR tight loop
     - `paw_call_agent` if `per-stage` Session Policy for stage transitions
  5. Receive completion status from activity
  6. Apply Review Policy for pause decisions (at artifact boundaries)
  7. Either continue to next activity OR present options to user
- **Non-linear request handling**:
  - "Update spec to align with plan" → delegate to paw-spec with alignment context
  - "Do more research on X" → delegate to appropriate research skill
  - Agent reasons about appropriate skill and constructs meaningful delegation
- Error handling: "If any stage fails, report error and seek guidance"
- Core guardrails (brief list)

**Tests**:
- Unit test: Verify agent file is under 5KB (per SC-008)
- Manual verification: Agent loads successfully in VS Code, prompts for Work ID

**Brief Example** (interface concept):
```markdown
# PAW Agent

You execute the PAW implementation workflow by loading the workflow skill...

## Initialization Detection
If initialization parameters provided and no WorkflowContext.md exists, delegate to paw-init...

## Context Detection
[Brief detection logic]

## Skill-Based Execution
[Summary of stage delegation]

## Error Handling
[One-line error handling]

## Guardrails
- Evidence-based only
- Load skills before executing
- Human authority over workflow decisions
```

#### 2. Entry Point Prompt
**File**: `prompts/paw.prompt.md`
**Changes**:
- Create prompt file following pattern from `prompts/paw-review.prompt.md`
- YAML frontmatter with `agent: PAW`
- Accept configuration parameters passed from VS Code command:
  - `$ARGUMENTS` placeholder for user arguments
- Prompt content instructs PAW agent to:
  - Load workflow skill
  - If initialization parameters present, delegate to `paw-init`
  - Otherwise, proceed based on existing WorkflowContext.md

**Prompt Template**:
```markdown
---
agent: PAW
---

Load the `paw-workflow` skill and execute it.

$ARGUMENTS
```

**Tests**:
- Prompt file exists and has correct frontmatter
- VS Code command can invoke the prompt

### Success Criteria:

#### Automated Verification:
- [ ] Agent file exists at `agents/PAW.agent.md`
- [ ] Agent file size under 5KB
- [ ] Agent linting passes: `./scripts/lint-agent.sh agents/PAW.agent.md`
- [ ] Prompt file exists at `prompts/paw.prompt.md`
- [ ] Prompt file has valid YAML frontmatter with `agent: PAW`
- [ ] Extension linting passes: `npm run lint`

#### Manual Verification:
- [ ] Agent loads in VS Code prompts
- [ ] Agent successfully loads workflow skill
- [ ] Agent detects initialization parameters and delegates to `paw-init` when no WorkflowContext.md
- [ ] Agent reads Review Policy and Session Policy from WorkflowContext.md
- [ ] Agent correctly pauses at milestone artifacts when Review Policy = `milestones`
- [ ] Agent retrieves skills dynamically via `paw_get_skills` tool
- [ ] Agent constructs activity-specific delegation prompts (activity goal vs verbatim user request)
- [ ] Agent uses appropriate mechanism based on Session Policy
- [ ] Agent handles non-linear requests (e.g., "update spec to align with plan")
- [ ] Agent constructs meaningful delegation prompts with user context
- [ ] `/paw` prompt can be invoked from VS Code

---

## Phase 4: Update Extension Tooling

### Overview
Modify the extension's TypeScript code to support the new PAW agent architecture. This includes updating the handoff tool, updating the VS Code initialization command to invoke `/paw` prompt, updating WorkflowContext initialization to include new policy fields, and updating the context tool to parse the new fields.

### Changes Required:

#### 1. Handoff Tool Updates
**File**: `src/tools/handoffTool.ts`
**Changes**:
- Add `"PAW"` to the `AgentName` union type (keep existing agent names for backward compatibility during transition)
- The tool will support both old agent names and new "PAW" agent during migration

**Tests**:
- Unit tests in `src/test/tools/handoffTool.test.ts` (if exists) or manual verification
- Test cases: Verify `paw_call_agent` accepts `"PAW"` as valid `target_agent`

#### 2. VS Code Initialization Command Updates
**File**: `src/commands/initializeWorkItem.ts`
**Changes**:
- Modify `initializeWorkItem()` to invoke `/paw` prompt instead of `workItemInitPrompt.template.md`
- Construct configuration object from quick pick selections:
  ```typescript
  const config = {
    target_branch: inputs.targetBranch,
    workflow_mode: inputs.workflowMode.mode,
    review_strategy: inputs.reviewStrategy,
    review_policy: mapHandoffModeToReviewPolicy(inputs.handoffMode),
    session_policy: 'per-stage', // default
    track_artifacts: inputs.trackArtifacts,
    issue_url: inputs.issueUrl,
    custom_instructions: inputs.workflowMode.customInstructions,
    work_description: inputs.workDescription
  };
  ```
- Format config as prompt arguments for `/paw` prompt
- Invoke prompt via `workbench.action.chat.open` with mode set to PAW agent

**Helper function**:
```typescript
function mapHandoffModeToReviewPolicy(handoffMode: string): string {
  switch (handoffMode) {
    case 'manual': return 'always';
    case 'semi-auto': return 'milestones';
    case 'auto': return 'never';
    default: return 'milestones';
  }
}
```

**Tests**:
- Manual verification: "PAW: New PAW Workflow" command invokes `/paw` prompt with configuration
- Verify initialization proceeds without "continue" step

#### 3. WorkflowContext Field Updates
**File**: `src/commands/initializeWorkItem.ts` (if template-based) OR handled by `paw-init` skill
**Changes**:
- Add `Review Policy` field to WorkflowContext.md (default: `milestones`)
- Add `Session Policy` field to WorkflowContext.md (default: `per-stage`)
- Note: With the new architecture, the `paw-init` skill creates WorkflowContext.md, so the template in TypeScript may be deprecated

**New WorkflowContext.md fields**:
```markdown
Review Policy: milestones
Session Policy: per-stage
```

**Field documentation**:
| Field | Values | Description |
|-------|--------|-------------|
| Review Policy | `always` / `milestones` / `never` | When workflow pauses for human review at artifact boundaries |
| Session Policy | `per-stage` / `continuous` | Whether each stage gets fresh chat or shares conversation |

**Tests**:
- Manual verification: Initialize new work item and verify new fields appear in WorkflowContext.md

#### 4. Context Tool Updates
**File**: `src/tools/contextTool.ts`
**Changes**:
- Parse `Review Policy` field from WorkflowContext.md (default: `milestones` if missing)
- Parse `Session Policy` field from WorkflowContext.md (default: `per-stage` if missing)
- Include parsed values in tool response for PAW agent consumption
- **Backward compatibility**: Map old `Handoff Mode` field to new `Review Policy` if present:
  - `manual` → `always`
  - `semi-auto` → `milestones`
  - `auto` → `never`

**Tests**:
- Manual verification: `paw_get_context` returns correct policy values
- Test backward compatibility: Old WorkflowContext.md with `Handoff Mode` still works

#### 5. Installer and Prompt Template Updates
**Files**: `src/agents/installer.ts`, `src/agents/promptTemplates.ts`
**Changes**:
- Verify `loadAgentTemplates()` will automatically pick up `PAW.agent.md` from `agents/` directory (no code changes expected—existing pattern handles this)
- Verify `loadPromptTemplates()` picks up `prompts/paw.prompt.md`
- Verify skill installation covers new `skills/paw-*/` directories (skill loader should automatically discover them)
- Update `src/agents/promptTemplates.ts` to include `paw.prompt.md` in the prompt templates list (following the pattern of `paw-review.prompt.md`)
- Add test for prompt template loading in `src/test/suite/promptTemplates.test.ts`

**Tests**:
- Manual verification: Build extension and verify PAW agent appears in VS Code prompts
- Verify `/paw` prompt is available and loads correctly
- Verify new skills appear in `paw_get_skills` catalog
- Unit test: Prompt templates include `paw.prompt.md`

#### 3. Type Compilation
**File**: `tsconfig.json` (existing)
**Changes**:
- No changes expected—existing TypeScript configuration should compile updates

**Tests**:
- Compilation passes: `npm run compile`
- Type checking passes with no errors

#### 4. Development Tooling Updates
**Files**: `scripts/lint-agent.sh`, `.github/workflows/pr-checks.yml`, `.github/copilot-instructions.md`
**Changes**:
- **Add skill linting to `lint-agent.sh`**:
  - Add `lint_skill()` function to lint skill files (`skills/*/SKILL.md`)
  - Define skill token thresholds (suggest: WARN=8000, ERROR=12000 - skills can be larger since loaded on-demand)
  - Add `--skills` flag to lint only skills, `--all` flag to lint both agents and skills
  - Update `npm run lint:agent:all` script in `package.json` to use `--all` flag
- **Update CI workflow** (`.github/workflows/pr-checks.yml`):
  - Add `skills/**` to the `paths` trigger so skill changes trigger PR checks
  - Update lint step to run `npm run lint:agent:all` (which now includes skills)
- **Update copilot instructions** (`.github/copilot-instructions.md`):
  - Add guidance to run skill linting when modifying skill files
  - Example: `./scripts/lint-agent.sh --skills` or `./scripts/lint-agent.sh skills/paw-spec/SKILL.md`

**Tests**:
- Manual verification: `./scripts/lint-agent.sh --skills` lints all skill files
- Manual verification: `./scripts/lint-agent.sh skills/paw-workflow/SKILL.md` lints single skill
- CI runs on skill file changes

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Extension activates without errors

#### Manual Verification:
- [ ] `paw_call_agent` tool accepts `"PAW"` as target agent
- [ ] "PAW: New PAW Workflow" command invokes `/paw` prompt with configuration parameters
- [ ] Initialization proceeds without "continue" step (PAW agent delegates to `paw-init`)
- [ ] PAW agent appears in VS Code prompts directory after installation
- [ ] `/paw` prompt is available and works
- [ ] New skills appear in `paw_get_skills` catalog
- [ ] New work items include `Review Policy` and `Session Policy` fields
- [ ] `paw_get_context` returns policy values correctly (including Review Policy)
- [ ] Old WorkflowContext.md files with `Handoff Mode` still work (backward compatibility)
- [ ] Skill linting works: `./scripts/lint-agent.sh --skills` passes for all new skills
- [ ] CI triggers on `skills/**` path changes

---

## Phase 5: Deprecate Legacy Agents and Templates

### Overview
Remove the 9 individual implementation agent files, the old initialization prompt template, and update documentation to reflect the new single-agent architecture. This is the final cleanup phase after the new architecture is verified working.

### Changes Required:

#### 1. Remove Legacy Agent Files
**Files to remove**:
- `agents/PAW-01A Specification.agent.md`
- `agents/PAW-01B Spec Researcher.agent.md`
- `agents/PAW-02A Code Researcher.agent.md`
- `agents/PAW-02B Impl Planner.agent.md`
- `agents/PAW-03A Implementer.agent.md`
- `agents/PAW-03B Impl Reviewer.agent.md`
- `agents/PAW-04 Documenter.agent.md`
- `agents/PAW-05 PR.agent.md`
- `agents/PAW-X Status.agent.md`

**Changes**:
- Delete each file
- The installer's `loadAgentTemplates()` will no longer find these files

**Tests**:
- Manual verification: Extension builds and activates without errors
- Verify old agent names no longer appear in VS Code prompts

#### 2. Remove Old Initialization Template
**File to remove**: `src/prompts/workItemInitPrompt.template.md`
**Changes**:
- Delete the template file (initialization now handled by `paw-init` skill)
- Remove any references in `src/prompts/workflowInitPrompt.ts` if not needed
- Keep `src/commands/initializeWorkItem.ts` but update to use new `/paw` invocation pattern

**Tests**:
- Compilation passes without template references
- Initialization still works via `/paw` prompt

#### 3. Update Handoff Tool
**File**: `src/tools/handoffTool.ts`
**Changes**:
- Remove deprecated agent names from `AgentName` union type, leaving only `"PAW"` and `"PAW Review"`
- Update validation logic if needed

**Tests**:
- Compilation passes: `npm run compile`
- Manual verification: `paw_call_agent` rejects old agent names gracefully

#### 3. Update Documentation
**Files**: `docs/reference/agents.md`, `docs/guide/index.md`, `README.md`, `paw-specification.md`, `docs/specification/implementation.md`, `docs/guide/stage-transitions.md`, `docs/guide/workflow-modes.md`, `docs/guide/two-workflows.md`
**Changes**:
- Update agent reference to document single PAW agent
- Update workflow guide to reflect unified entry point
- Update README quick start with new usage pattern
- Update workflow/spec docs to align with the new implementation workflow structure where documentation is handled as a final implementation phase (no separate documentation stage/agent in the skills-based architecture)
- Update stage transition guidance to remove/adjust any references to a dedicated `docs` stage/agent where it no longer applies, while preserving user-facing command semantics if still supported

**Tests**:
- Documentation builds: `mkdocs build --strict`
- Manual review: Documentation accurately describes new architecture

#### 4. Update Handoff Component
**File**: `agents/components/handoff-instructions.component.md`
**Changes**:
- Update Command Mapping table to reference `PAW` agent instead of individual agents
- Simplify command handling (all implementation commands route to PAW agent, which loads appropriate skill)

**Tests**:
- Agent linting passes for remaining agents
- Manual verification: Handoff messages reference correct agent

#### 5. Clean Up Linting Script
**File**: `scripts/lint-agent.sh`
**Changes**:
- Remove hardcoded special thresholds for deprecated agents:
  - Remove `STATUS_AGENT_WARN_THRESHOLD` and `STATUS_AGENT_ERROR_THRESHOLD` (PAW-X Status.agent.md)
  - Remove `SPEC_AGENT_WARN_THRESHOLD` and `SPEC_AGENT_ERROR_THRESHOLD` (PAW-01A Specification.agent.md)
- Remove conditional logic that checks for these specific agent filenames
- Keep standard thresholds (WARN=5000, ERROR=7000) for remaining agents (PAW.agent.md, PAW Review.agent.md)

**Tests**:
- Linting passes: `npm run lint:agent:all`
- No references to deprecated agent names in lint script

### Success Criteria:

#### Automated Verification:
- [ ] All 9 legacy agent files removed from `agents/` directory
- [ ] Old initialization template `src/prompts/workItemInitPrompt.template.md` removed
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Agent and skill linting passes: `npm run lint:agent:all`
- [ ] Documentation builds: `mkdocs build --strict`
- [ ] No hardcoded deprecated agent names in `scripts/lint-agent.sh`

#### Manual Verification:
- [ ] Extension activates without errors
- [ ] Only PAW and PAW Review agents appear in VS Code prompts
- [ ] Full workflow (spec → PR) completes using PAW agent
- [ ] All three workflow modes (full/minimal/custom) work correctly
- [ ] All Review Policy values work correctly (`always`/`milestones`/`never`) with artifact-level boundaries
- [ ] All Session Policy values work correctly (`per-stage`/`continuous`)
- [ ] "PAW: New PAW Workflow" command works end-to-end without "continue" step

---

## Phase 6: Work Shaping Utility Skill

### Overview
Create the `paw-work-shaping` utility skill that enables interactive pre-spec ideation sessions. This skill allows users to explore vague ideas collaboratively with the PAW agent before committing to formal specification, producing a structured document suitable for spec input or GitHub issue creation.

### Changes Required:

#### 1. Work Shaping Utility Skill
**File**: `skills/paw-work-shaping/SKILL.md`
**Changes**:
- Create utility skill for interactive pre-spec ideation
- **Session Flow**:
  - Agent-led Q&A to progressively clarify the idea
  - Signal when "complete enough" and offer to finish
  - User can end anytime
- **Codebase Research**: Delegate to `paw-code-research` skill via subagent when codebase context is needed
- **Execution Context**: Runs in main agent context (not a subagent) to maintain interactive conversation with user
- **Document Sections**:
  - Work breakdown (sub-items under main idea)
  - Edge cases and boundary conditions
  - Rough architecture (component interactions)
  - Critical analysis (value vs. alternatives, build vs. modify tradeoffs)
  - Codebase fit (similar existing features, reuse opportunities)
  - Risk assessment (negative impacts, gotchas)
- **Output Artifact**: `WorkShaping.md`
  - Location: `.paw/work/<work-id>/WorkShaping.md` if work directory exists
  - Otherwise: workspace root (prompt user for alternate location)

**Tests**:
- Manual verification: Skill loads via `paw_get_skill('paw-work-shaping')`
- Manual verification: Q&A session progresses interactively
- Manual verification: Codebase research delegates to subagent
- Manual verification: WorkShaping.md produced with expected sections

#### 2. Update PAW Agent Detection
**File**: `agents/PAW.agent.md` (or via workflow skill update)
**Changes**:
- Add detection patterns for when work shaping would be beneficial:
  - User explicitly asks to explore/shape an idea
  - Vague requests with exploratory language
  - Explicit uncertainty ("I'm not sure if...", "maybe we could...")
- When detected, load `paw-work-shaping` skill and begin interactive session

**Tests**:
- Manual verification: PAW agent detects exploratory requests
- Manual verification: PAW agent suggests shaping for vague requests

### Success Criteria:

#### Automated Verification:
- [ ] Skill file exists: `skills/paw-work-shaping/SKILL.md`
- [ ] Skill has valid YAML frontmatter with `name` and `description`
- [ ] Skill linting passes: `./scripts/lint-agent.sh skills/paw-work-shaping/SKILL.md`
- [ ] Overall linting passes: `npm run lint`

#### Manual Verification:
- [ ] Skill loads via `paw_get_skill('paw-work-shaping')`
- [ ] User can ask PAW to "help me think through an idea" and session begins
- [ ] Q&A progresses interactively with agent-led questions
- [ ] Codebase research delegates to `paw-code-research` via subagent
- [ ] Agent signals when idea is "complete enough" and offers to finish
- [ ] User can end session early if desired
- [ ] WorkShaping.md produced at correct location with all sections
- [ ] Document is suitable as input to spec process or GitHub issue

---

## Cross-Phase Testing Strategy

### Integration Tests:
- **Initialization flow**: Run "PAW: New PAW Workflow" command → verify `/paw` prompt invoked → PAW agent delegates to `paw-init` → WorkflowContext.md created → first stage begins automatically
- Complete full workflow (spec → PR) using PAW agent in full workflow mode
- Complete minimal workflow (skip spec) using PAW agent in minimal workflow mode
- **Review Policy testing** (verify artifact-level boundaries):
  - `always`: Verify pause after every artifact is produced
  - `milestones`: Verify pause only at milestone artifacts (Spec.md, ImplementationPlan.md, etc.); auto-proceed at non-milestone artifacts (SpecResearch.md, CodeResearch.md)
  - `never`: Verify continuous progression without review pauses
- **Session Policy testing**:
  - `per-stage`: Verify new chat created at stage transitions (via `paw_call_agent`)
  - `continuous`: Verify single conversation throughout (all via `runSubagent`)
- **Non-linear request handling**:
  - After updating plan, ask PAW to "update spec to align with plan changes" → verify routes to paw-spec with appropriate context
  - Mid-workflow, ask "do more research on X" → verify routes to appropriate research skill
  - Request revision of earlier artifact → verify PAW reasons about appropriate skill
- **Backward compatibility**: Verify old WorkflowContext.md with `Handoff Mode: semi-auto` still works
- **Work shaping flow**: Ask PAW to "help me think through an idea" → verify interactive Q&A session → verify codebase research delegates to subagent → verify WorkShaping.md produced

### Manual Testing Steps:
1. Run "PAW: New PAW Workflow" command
2. Complete quick pick selections (full mode, PRs strategy, milestones review policy)
3. Verify PAW agent receives configuration and delegates to `paw-init`
4. Verify WorkflowContext.md created with `Review Policy` and `Session Policy` fields
5. Verify PAW agent proceeds to specification stage without requiring "continue"
6. Complete specification stage, verify Spec.md created
7. Verify code research includes Documentation System section in CodeResearch.md (per issue #150)
8. Complete planning, verify ImplementationPlan.md created with documentation phase when appropriate
9. Verify planning waits for user confirmation (milestone transition)
10. **Non-linear test**: Ask PAW to "align spec with planning changes" → verify it delegates to paw-spec with context
11. Complete implementation phases including final documentation phase, verify phase PRs created (prs strategy)
12. Verify Docs.md created during documentation phase (implementer loads paw-docs-guidance)
13. Verify documentation build command runs successfully (if framework discovered in research)
14. Complete final PR, verify PR to main created
15. Verify all artifacts in `.paw/work/<work-id>/`
16. **Session Policy test**: Re-run workflow with `Session Policy: continuous` and verify single conversation

## Performance Considerations

- **Token Efficiency**: Combined agent + active skill tokens should be lower than loading a full implementation agent (~15-23KB). Target: <10KB per active session (agent ~4KB + skill ~5KB)
- **Token Measurement Baseline**: Current agents range from 6.5KB (PAW-01B) to 23KB (PAW-01A), or ~1.5K-5K tokens each. Validation: Compare PAW agent (~4KB) + one loaded skill (~5KB) vs previous single-agent prompt size
- **Skill Loading Latency**: Skills are small text files; latency should be negligible. Monitor if issues arise.
- **Skill Caching**: Consider caching loaded skills within a session if performance issues arise (future optimization)

## Migration Notes

- **Backward Compatibility**: 
  - During Phase 4, both old and new agent names are supported in `paw_call_agent`
  - Old `Handoff Mode` field maps to `Review Policy`: `manual`→`always`, `semi-auto`→`milestones`, `auto`→`never`
  - Missing `Session Policy` defaults to `per-stage` (current behavior)
- **User Transition**: Users invoking old agent names will see them until Phase 5 completes
- **Data Migration**: No data migration needed—artifact locations and formats unchanged
- **Policy defaults**: New work items use `Review Policy: milestones`, `Session Policy: per-stage`
- **Custom Workflow Instructions**: Users with `Workflow Mode: custom` whose Custom Workflow Instructions reference deprecated agent names (e.g., "start with PAW-02A", "use PAW-03A Implementer") should update their instructions to describe intent (e.g., "start with code research", "proceed to implementation") rather than specific agent names. The PAW agent will route requests to appropriate skills based on intent.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/164
- Documentation Integration: https://github.com/lossyrob/phased-agent-workflow/issues/150 (eliminate separate docs stage)
- Spec: `.paw/work/implementation-skills-migration/Spec.md`
- Research: `.paw/work/implementation-skills-migration/SpecResearch.md`, `.paw/work/implementation-skills-migration/CodeResearch.md`
- Reference pattern: `agents/PAW Review.agent.md`, `skills/paw-review-workflow/SKILL.md`
- Planning docs: `planning/paw_v2/` on branch `planning/paw_v2`
