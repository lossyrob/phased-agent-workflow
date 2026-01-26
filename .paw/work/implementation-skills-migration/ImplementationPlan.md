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
3. **10 Activity Skills**: `paw-init`, `paw-spec`, `paw-spec-research`, `paw-code-research`, `paw-planning`, `paw-implement`, `paw-impl-review`, `paw-docs`, `paw-pr`, `paw-status`
4. **2 Utility Skills**:
   - `paw-review-response` for shared PR comment mechanics (loaded conditionally by activity skills)
   - `paw-git-operations` for branch naming conventions, strategy-based branching logic, and selective staging discipline
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
- **Transition Table**: Default mechanism (runSubagent vs paw_call_agent) and milestone classification
- **Artifact Structure**: Where artifacts live and their relationships
- **PR Comment Response Guidance**: Which skills handle which PR types

**Key insight**: The workflow skill is a **guide, not a state machine**. The PAW agent retrieves available skills dynamically via `paw_get_skills`, uses workflow guidance to understand typical patterns, then reasons about how to fulfill user requests—including non-linear paths.

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
2. **Phase 2: Create Activity and Utility Skills** - Extract domain content into 10 activity skills (including `paw-init` for initialization) plus utility skills for shared mechanics
3. **Phase 3: Create PAW Agent and Entry Point** - Build compact orchestrator agent that reasons about intent and delegates activities; create `/paw` entry point prompt
4. **Phase 4: Update Extension Tooling** - Modify handoff tool, VS Code initialization command, and installer to support the new architecture
5. **Phase 5: Deprecate Legacy Agents** - Remove individual implementation agents and old initialization template, update documentation

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
  | `paw-init` | Initialize workflow, create WorkflowContext.md, branch setup | WorkflowContext.md |
  | `paw-spec` | Create spec, revise spec, align with downstream artifacts | Spec.md |
  | `paw-spec-research` | Answer factual questions about existing system | SpecResearch.md |
  | `paw-code-research` | Document implementation details with file:line refs | CodeResearch.md |
  | `paw-planning` | Create implementation plan, revise plan, address PR comments | ImplementationPlan.md |
  | `paw-implement` | Execute plan phases, make code changes, address PR comments | Code files |
  | `paw-impl-review` | Review implementation, add docs, open PRs | Phase PRs |
  | `paw-docs` | Create Docs.md, update project docs | Docs.md |
  | `paw-pr` | Pre-flight validation, create final PR | Final PR |
  | `paw-status` | Diagnose workflow state, provide guidance | Status responses |
- Define artifact directory structure (`.paw/work/<feature-slug>/`)
- **Default Flow Guidance** (typical greenfield progression):
  - **Specification Stage**: `paw-spec` → `paw-spec-research` (if needed) → `paw-spec` (resume)
  - **Planning Stage**: `paw-code-research` → `paw-planning`
  - **Implementation Stage**: For each phase in plan: `paw-implement` → `paw-impl-review`
  - **Finalization Stage**: `paw-docs` → `paw-pr`
- **Default Transition Table** (guidance for typical flow, not exclusive paths):

  *Note: The implementation workflow includes explicit transition mechanisms because it has more stage transitions (10 activities) than the review workflow (6 activities). This table documents typical flow patterns; the PAW agent ultimately decides based on Session Policy and user intent.*

  | Transition | Milestone? | per-stage Mechanism |
  |------------|------------|---------------------|
  | spec → spec-research | No | paw_call_agent |
  | spec-research → spec (resume) | No | paw_call_agent |
  | spec → code-research | No | paw_call_agent |
  | code-research → planning | No | paw_call_agent |
  | planning → implement | **Yes** | paw_call_agent |
  | implement → impl-review (within phase) | No | runSubagent |
  | phase N complete → phase N+1 | **Yes** | paw_call_agent |
  | all phases complete → docs | **Yes** | paw_call_agent |
  | docs → final-pr | **Yes** | paw_call_agent |

- Document **Session Policy behavior**:
  - `per-stage`: Use mechanism column from transition table; each stage gets a fresh conversation via `paw_call_agent`
  - `continuous`: Always use `runSubagent` to preserve conversation context throughout workflow
  - *Note*: Verify during Phase 3 testing that `runSubagent` actually preserves context as expected in VS Code's subagent model
- Document **Review Policy behavior** (boundaries are artifact-level, not stage-level):
  - `always`: Pause after every artifact is produced for potential iteration
  - `milestones`: Pause at milestone artifacts; proceed automatically at non-milestone artifacts
  - `never`: Never pause, proceed continuously without review pauses
- **Explicit Milestone Artifacts** (for Review Policy `milestones` behavior):
  - **Milestone artifacts** (pause for review): Spec.md, ImplementationPlan.md, Phase PR completion, Docs.md, Final PR creation
  - **Non-milestone artifacts** (auto-proceed): WorkflowContext.md, SpecResearch.md, CodeResearch.md, intermediate commits
- Define stage gates (artifact verification between stages)
- Encode workflow mode handling (full/minimal/custom)
- **PR Comment Response Guidance** (which skills typically handle PR comments):
  - Planning PR → `paw-planning`
  - Phase PR → `paw-implement` → `paw-impl-review`
  - Docs PR → `paw-docs`
  - Final PR → `paw-implement` → `paw-impl-review`
- Document status skill integration
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
- [ ] Skill file exists at `skills/paw-workflow/SKILL.md`
- [ ] YAML frontmatter contains `name: paw-workflow` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Skill usage patterns table documents typical implementation skills with capabilities (PAW agent discovers skills dynamically via `paw_get_skills`)
- [ ] Default flow guidance covers typical greenfield progression
- [ ] Transition table framed as default guidance (not exclusive paths)
- [ ] Intelligent Routing Guidance section documents flexible intent-based delegation
- [ ] Review Policy behavior documented for all three values with artifact-level boundaries clarified
- [ ] Explicit milestone artifact list included (Spec.md, ImplementationPlan.md, Phase PR completion, Docs.md, Final PR)
- [ ] Session Policy behavior documented for both values with implementation note about `runSubagent` context preservation
- [ ] PR Comment Response Guidance covers all PR types
- [ ] Subagent Completion Contract clearly specifies activity skills return status, not handle handoffs

---

## Phase 2: Create Activity and Utility Skills

### Overview
Extract domain-specific content from each implementation agent into dedicated activity skills, plus create two utility skills: one for shared PR review response mechanics and one for git/branch operations. Activity skills describe **capabilities** (what they can do) rather than rigid modes, enabling flexible execution based on delegation instructions from the PAW agent.

### Changes Required:

#### 0. Initialization Skill
**File**: `skills/paw-init/SKILL.md`
**Changes**:
- Extract initialization logic from `src/prompts/workItemInitPrompt.template.md` into a skill
- Add YAML frontmatter with `name: paw-init`, `description`
- Define **capabilities**:
  - Generate Work Title from issue URL, branch name, or user description
  - Generate Feature Slug from Work Title (normalized, unique)
  - Create `.paw/work/<feature-slug>/` directory structure
  - Generate WorkflowContext.md with all configuration fields
  - Create and checkout git branch (explicit or auto-derived)
  - Commit initial artifacts if tracking is enabled
  - Open WorkflowContext.md for review
- Include WorkflowContext.md template
- Include validation rules (slug format, branch conflicts, review strategy constraints)
- **Completion response**: Return feature slug and next step based on Workflow Mode
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

#### 1. Specification Skill
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

#### 2. Spec Research Skill
**File**: `skills/paw-spec-research/SKILL.md`
**Changes**:
- Extract from `PAW-01B Spec Researcher.agent.md`: research methodology, behavioral documentation focus, document format
- Add YAML frontmatter
- Reference workflow principles
- Define **capabilities**: Answer factual questions about existing system behavior
- Define SpecResearch.md artifact template

#### 3. Code Research Skill
**File**: `skills/paw-code-research/SKILL.md`
**Changes**:
- Extract from `PAW-02A Code Researcher.agent.md`: research methodology (Code Location, Code Analysis, Pattern Finding), YAML frontmatter format, GitHub permalink generation
- Define **capabilities**: Document implementation details with file:line references, additional research on demand
- Define CodeResearch.md artifact template with frontmatter

#### 4. Planning Skill
**File**: `skills/paw-planning/SKILL.md`
**Changes**:
- Extract from `PAW-02B Impl Planner.agent.md`: context gathering steps, research process, plan template structure, important guidelines, quality checklist
- Define **capabilities**:
  - Create implementation plan from spec and research
  - Revise plan based on learnings
  - Address PR review comments (load `paw-review-response` for mechanics)
- Reference `paw-git-operations` for planning branch creation and commit mechanics
- Include ImplementationPlan.md template with phase structure

#### 5. Implementation Skill
**File**: `skills/paw-implement/SKILL.md`
**Changes**:
- Extract from `PAW-03A Implementer.agent.md`: implementation philosophy, blocking criteria, verification approach, committing guidelines
- Define **capabilities**:
  - Execute one or more plan items (typically a single phase) based on delegation instructions
  - Make focused code changes with appropriate verification (tests/lint) per repository norms
  - Address PR review comments on implementation work (load `paw-review-response` for mechanics)
  - Handle non-linear requests (e.g., "adjust implementation to match updated spec") when delegated by PAW agent
- Reference `paw-git-operations` for phase branch creation and selective staging
- Document one-phase-per-invocation pattern

#### 6. Implementation Review Skill
**File**: `skills/paw-impl-review/SKILL.md`
**Changes**:
- Extract from `PAW-03B Impl Reviewer.agent.md`: review process steps, documentation standards, PR description templates
- Define **capabilities**:
  - Review implementation for quality and maintainability
  - Add documentation/docstrings
  - Push changes and open Phase PRs
  - Verify PR comments have been addressed
- Reference `paw-git-operations` for push and PR creation mechanics
- Note: Named `paw-impl-review` to distinguish from `paw-review-*` skills for PR review workflow

#### 7. Documentation Skill
**File**: `skills/paw-docs/SKILL.md`
**Changes**:
- Extract from `PAW-04 Documenter.agent.md`: Docs.md artifact format, project doc update guidelines, style matching
- Define **capabilities**:
  - Create Docs.md technical reference
  - Update project docs (README, CHANGELOG)
  - Address PR review comments (load `paw-review-response` for mechanics)
- Reference `paw-git-operations` for docs branch creation (when using PRs strategy)
- Include Docs.md template

#### 8. Final PR Skill
**File**: `skills/paw-pr/SKILL.md`
**Changes**:
- Extract from `PAW-05 PR.agent.md`: pre-flight validation checks, PR description guidelines, artifact linking
- Define **capabilities**:
  - Run pre-flight validation
  - Create comprehensive PR description
  - Open final PR to main
- Document simple vs complex PR description formats

#### 9. Status Skill
**File**: `skills/paw-status/SKILL.md`
**Changes**:
- Extract from `PAW-X Status.agent.md`: workflow stages overview, artifact dependencies, common errors/resolutions
- Define **capabilities**:
  - Diagnose current workflow state
  - Recommend next steps
  - Explain PAW process
  - Post status updates to Issues/PRs

#### 10. Review Response Utility Skill
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

#### 11. Git Operations Utility Skill
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
    - Check `.paw/work/<feature-slug>/.gitignore` before staging `.paw/` artifacts
    - Pre-commit verification: `git diff --cached`
  - **Branch verification**:
    - Verify current branch matches expected pattern before commits
    - Handle incorrect branch situations (stop and switch)
- Activity skills load this utility for git operations to ensure consistent branch handling

**Tests**:
- Manual verification: Skill loads via `paw_get_skill('paw-git-operations')`
- Verify branch naming conventions match current agent behavior
- Verify strategy-based logic covers both PRs and local strategies

**Tests** (Phase 2 overall):
- Manual verification: Each skill loads via `paw_get_skill` and describes capabilities flexibly
- Verify skills are written for flexible execution based on delegation instructions
- Verify no duplicate PR mechanics across activity skills
- Verify artifact templates match current agent outputs

### Success Criteria:

#### Automated Verification:
- [ ] All 10 activity skill files exist in `skills/paw-*/SKILL.md` directories (including `paw-init`)
- [ ] Utility skills exist at `skills/paw-review-response/SKILL.md` and `skills/paw-git-operations/SKILL.md`
- [ ] Each skill has valid YAML frontmatter with `name` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Skills describe capabilities flexibly (not rigid modes)
- [ ] Skills are written for intelligent execution based on delegation instructions
- [ ] `paw-init` skill handles all initialization parameters and creates correct WorkflowContext.md
- [ ] Activity skills reference `paw-review-response` utility for PR comment work
- [ ] Activity skills reference `paw-git-operations` utility for branch/commit work
- [ ] No duplicate PR mechanics across activity skills (consolidated in utility skill)
- [ ] No duplicate git/branch mechanics across activity skills (consolidated in utility skill)
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
- Status integration: "Load `paw-status` skill when user requests status or help"
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
**Files**: `docs/reference/agents.md`, `docs/guide/index.md`, `README.md`
**Changes**:
- Update agent reference to document single PAW agent
- Update workflow guide to reflect unified entry point
- Update README quick start with new usage pattern

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

### Manual Testing Steps:
1. Run "PAW: New PAW Workflow" command
2. Complete quick pick selections (full mode, PRs strategy, milestones review policy)
3. Verify PAW agent receives configuration and delegates to `paw-init`
4. Verify WorkflowContext.md created with `Review Policy` and `Session Policy` fields
5. Verify PAW agent proceeds to specification stage without requiring "continue"
6. Complete specification stage, verify Spec.md created
7. Verify research stage triggers automatically (Review Policy: `milestones` doesn't pause at non-milestone artifacts)
8. Complete planning, verify ImplementationPlan.md created
9. Verify planning waits for user confirmation (milestone transition)
10. **Non-linear test**: Ask PAW to "align spec with planning changes" → verify it delegates to paw-spec with context
11. Complete implementation phase, verify phase PR created (prs strategy)
12. Complete documentation, verify Docs.md created
13. Complete final PR, verify PR to main created
14. Verify all artifacts in `.paw/work/<feature-slug>/`
15. **Session Policy test**: Re-run workflow with `Session Policy: continuous` and verify single conversation

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
- Spec: `.paw/work/implementation-skills-migration/Spec.md`
- Research: `.paw/work/implementation-skills-migration/SpecResearch.md`, `.paw/work/implementation-skills-migration/CodeResearch.md`
- Reference pattern: `agents/PAW Review.agent.md`, `skills/paw-review-workflow/SKILL.md`
- Planning docs: `planning/paw_v2/` on branch `planning/paw_v2`
