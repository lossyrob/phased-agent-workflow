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
3. **10 Activity Skills**: `paw-spec`, `paw-spec-research`, `paw-code-research`, `paw-planning`, `paw-implement`, `paw-impl-review`, `paw-docs`, `paw-pr`, `paw-status`
4. **1 Utility Skill**: `paw-review-response` for shared PR comment mechanics (loaded conditionally by activity skills)
5. All existing artifacts produced in same locations with same formats
6. All workflow modes (full/minimal/custom) function correctly
7. **New policy configurations**:
   - Confirmation Policy (`always | milestones | never`) controls when workflow pauses for user input
   - Session Policy (`per-stage | continuous`) controls conversation context management

### Verification:
- User completes full workflow (spec → PR) using only PAW agent
- Token count for active session measurably lower than equivalent multi-agent setup
- All automated tests pass; artifact locations unchanged

## What We're NOT Doing

- Changing artifact locations or formats
- Modifying the review workflow (already migrated per PR #156)
- Multi-runtime portability (Claude Code, Codex, etc.)
- Changing the existing component files (`paw-context.component.md`, `handoff-instructions.component.md`)

## Implementation Approach

Follow the PAW Review migration pattern:
1. Create workflow skill that provides capability catalog and default flow guidance
2. Extract domain-specific content from each agent into dedicated activity skills
3. Create compact orchestrator agent that reasons about requests and delegates intelligently
4. Update extension tooling to support the new agent and new WorkflowContext fields
5. Deprecate individual implementation agents

The workflow skill will provide:
- **Activity Catalog**: Available skills and their capabilities (what each can do)
- **Default Flow Guidance**: Typical stage progression for greenfield implementation
- **Transition Table**: Default mechanism (runSubagent vs paw_call_agent) and milestone classification
- **Artifact Structure**: Where artifacts live and their relationships
- **PR Comment Response Guidance**: Which skills handle which PR types

**Key insight**: The workflow skill is a **guide, not a state machine**. The PAW agent uses it to understand available capabilities, then reasons about how to fulfill user requests—including non-linear paths.

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

1. **Phase 1: Create Workflow Skill** - Build `paw-workflow` skill with activity catalog, default flow guidance, validation gates, default transition guidance, and PR comment response guidance
2. **Phase 2: Create Activity and Utility Skills** - Extract domain content into 10 activity skills plus `paw-review-response` utility skill for PR comment mechanics
3. **Phase 3: Create PAW Agent** - Build compact orchestrator agent that reasons about intent and delegates activities
4. **Phase 4: Update Extension Tooling** - Modify handoff tool and installer to support the new architecture
5. **Phase 5: Deprecate Legacy Agents** - Remove individual implementation agents, update documentation

---

## Phase 1: Create Workflow Skill

### Overview
Create the `paw-workflow` skill that provides the PAW agent with an activity catalog, default flow guidance, and orchestration patterns. This skill is a **reference guide** that the PAW agent consults, not a rigid state machine that constrains behavior.

### Changes Required:

#### 1. Workflow Skill
**File**: `skills/paw-workflow/SKILL.md`
**Changes**: 
- Create skill following structure of `paw-review-workflow/SKILL.md`
- Define Core Implementation Principles (evidence-based documentation, file:line references, artifact completeness)
- **Activity Catalog** with capabilities:
  | Skill | Capabilities | Primary Artifacts |
  |-------|--------------|-------------------|
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
  - `per-stage`: Use mechanism column from transition table
  - `continuous`: Always use `runSubagent` (single conversation)
- Document **Confirmation Policy behavior**:
  - `always`: Pause at every transition
  - `milestones`: Pause only where Milestone? = Yes
  - `never`: Never pause, run to completion
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
- Verify activity catalog lists all skills with capabilities
- Verify transition table is framed as default guidance

### Success Criteria:

#### Automated Verification:
- [ ] Skill file exists at `skills/paw-workflow/SKILL.md`
- [ ] YAML frontmatter contains `name: paw-workflow` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Activity catalog includes all 9 activity skills with capabilities
- [ ] Default flow guidance covers typical greenfield progression
- [ ] Transition table framed as default guidance (not exclusive paths)
- [ ] Intelligent Routing Guidance section documents flexible intent-based delegation
- [ ] Confirmation Policy behavior documented for all three values
- [ ] Session Policy behavior documented for both values
- [ ] PR Comment Response Guidance covers all PR types
- [ ] Subagent Completion Contract clearly specifies activity skills return status, not handle handoffs

---

## Phase 2: Create Activity and Utility Skills

### Overview
Extract domain-specific content from each implementation agent into dedicated activity skills, plus create a utility skill for shared PR review response mechanics. Activity skills describe **capabilities** (what they can do) rather than rigid modes, enabling flexible execution based on delegation instructions from the PAW agent.

### Changes Required:

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
- Note: Named `paw-impl-review` to distinguish from `paw-review-*` skills for PR review workflow

#### 7. Documentation Skill
**File**: `skills/paw-docs/SKILL.md`
**Changes**:
- Extract from `PAW-04 Documenter.agent.md`: Docs.md artifact format, project doc update guidelines, style matching
- Define **capabilities**:
  - Create Docs.md technical reference
  - Update project docs (README, CHANGELOG)
  - Address PR review comments (load `paw-review-response` for mechanics)
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

**Tests** (Phase 2 overall):
- Manual verification: Each skill loads via `paw_get_skill` and describes capabilities flexibly
- Verify skills are written for flexible execution based on delegation instructions
- Verify no duplicate PR mechanics across activity skills
- Verify artifact templates match current agent outputs

### Success Criteria:

#### Automated Verification:
- [ ] All 10 activity skill files exist in `skills/paw-*/SKILL.md` directories
- [ ] Utility skill exists at `skills/paw-review-response/SKILL.md`
- [ ] Each skill has valid YAML frontmatter with `name` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Skills describe capabilities flexibly (not rigid modes)
- [ ] Skills are written for intelligent execution based on delegation instructions
- [ ] Activity skills reference `paw-review-response` utility for PR comment work
- [ ] No duplicate PR mechanics across activity skills (consolidated in utility skill)
- [ ] Artifact templates match existing agent outputs
- [ ] Quality checklists preserved from original agents

---

## Phase 3: Create PAW Agent

### Overview
Create the compact PAW orchestrator agent (~4KB) that replaces the 9 individual implementation agents. The agent **reasons about user intent** and delegates intelligently to activity skills. It uses the workflow skill as guidance (not rigid rules), constructs meaningful delegation prompts, and handles both linear and non-linear requests.

### Changes Required:

#### 1. PAW Agent
**File**: `agents/PAW.agent.md`
**Changes**:
- Follow pattern from `PAW Review.agent.md` (~3.5KB)
- Include agent metadata (description) for VS Code prompts
- One-sentence role description
- Initialization: "Load the `paw-workflow` skill to understand available activities, default flow, and orchestration guidance"
- Context detection: Work ID from user input or WorkflowContext.md
- **Policy detection from WorkflowContext.md**:
  - Read `Confirmation Policy` (default: `milestones`)
  - Read `Session Policy` (default: `per-stage`)
- Workflow mode detection summary (full/minimal/custom from WorkflowContext.md)
- **Intelligent Request Handling**:
  1. Reason about user intent (what do they want to accomplish?)
  2. Consult activity catalog from workflow skill (which skill has this capability?)
  3. Construct delegation prompt with:
     - Skill to load
     - User's specific request/context
     - Relevant artifact paths
  4. Delegate via appropriate mechanism:
     - `runSubagent` if `continuous` Session Policy OR tight loop
     - `paw_call_agent` if `per-stage` Session Policy for stage transitions
  5. Receive completion status from activity
  6. Apply Confirmation Policy for pause decisions
  7. Either continue to next activity OR present options to user
- **Non-linear request handling**:
  - "Update spec to align with plan" → delegate to paw-spec with alignment context
  - "Do more research on X" → delegate to appropriate research skill
  - Agent reasons about appropriate skill and constructs meaningful delegation
- Status integration: "Load `paw-status` skill when user requests status or help"
- Error handling: "If any stage fails, report error and seek guidance"
- Core guardrails (brief list)

**Tests**:
- Unit test: Verify agent file is under 5KB (per SC-006)
- Manual verification: Agent loads successfully in VS Code, prompts for Work ID

**Brief Example** (interface concept):
```markdown
# PAW Agent

You execute the PAW implementation workflow by loading the workflow skill...

## Initialization
Load the `paw-workflow` skill...

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

### Success Criteria:

#### Automated Verification:
- [ ] Agent file exists at `agents/PAW.agent.md`
- [ ] Agent file size under 5KB
- [ ] Agent linting passes: `./scripts/lint-agent.sh agents/PAW.agent.md`
- [ ] Extension linting passes: `npm run lint`

#### Manual Verification:
- [ ] Agent loads in VS Code prompts
- [ ] Agent successfully loads workflow skill
- [ ] Agent reads Confirmation Policy and Session Policy from WorkflowContext.md
- [ ] Agent correctly pauses at milestones when Confirmation Policy = `milestones`
- [ ] Agent uses appropriate mechanism based on Session Policy
- [ ] Agent handles non-linear requests (e.g., "update spec to align with plan")
- [ ] Agent constructs meaningful delegation prompts with user context
- [ ] Agent prompts for Work ID when invoked without context

---

## Phase 4: Update Extension Tooling

### Overview
Modify the extension's TypeScript code to support the new PAW agent architecture. This includes updating the handoff tool, updating WorkflowContext initialization to include new policy fields, and updating the context tool to parse the new fields.

### Changes Required:

#### 1. Handoff Tool Updates
**File**: `src/tools/handoffTool.ts`
**Changes**:
- Add `"PAW"` to the `AgentName` union type (keep existing agent names for backward compatibility during transition)
- The tool will support both old agent names and new "PAW" agent during migration

**Tests**:
- Unit tests in `src/test/tools/handoffTool.test.ts` (if exists) or manual verification
- Test cases: Verify `paw_call_agent` accepts `"PAW"` as valid `target_agent`

#### 2. WorkflowContext Initialization Updates
**File**: `src/commands/initializeWorkItem.ts`
**Changes**:
- Add `Confirmation Policy` field to WorkflowContext.md template (default: `milestones`)
- Add `Session Policy` field to WorkflowContext.md template (default: `per-stage`)
- Update field documentation in template

**New WorkflowContext.md fields**:
```markdown
Confirmation Policy: milestones
Session Policy: per-stage
```

**Field documentation**:
| Field | Values | Description |
|-------|--------|-------------|
| Confirmation Policy | `always` / `milestones` / `never` | When workflow pauses for user confirmation |
| Session Policy | `per-stage` / `continuous` | Whether each stage gets fresh chat or shares conversation |

**Tests**:
- Manual verification: Initialize new work item and verify new fields appear in WorkflowContext.md

#### 3. Context Tool Updates
**File**: `src/tools/contextTool.ts`
**Changes**:
- Parse `Confirmation Policy` field from WorkflowContext.md (default: `milestones` if missing)
- Parse `Session Policy` field from WorkflowContext.md (default: `per-stage` if missing)
- Include parsed values in tool response for PAW agent consumption
- **Backward compatibility**: Map old `Handoff Mode` field to new `Confirmation Policy` if present:
  - `manual` → `always`
  - `semi-auto` → `milestones`
  - `auto` → `never`

**Tests**:
- Manual verification: `paw_get_context` returns correct policy values
- Test backward compatibility: Old WorkflowContext.md with `Handoff Mode` still works

#### 2. Installer Verification
**File**: `src/agents/installer.ts`
**Changes**:
- Verify `loadAgentTemplates()` will automatically pick up `PAW.agent.md` from `agents/` directory (no code changes expected—existing pattern handles this)
- Verify skill installation covers new `skills/paw-*/` directories (skill loader should automatically discover them)

**Tests**:
- Manual verification: Build extension and verify PAW agent appears in VS Code prompts
- Verify new skills appear in `paw_get_skills` catalog

#### 3. Type Compilation
**File**: `tsconfig.json` (existing)
**Changes**:
- No changes expected—existing TypeScript configuration should compile updates

**Tests**:
- Compilation passes: `npm run compile`
- Type checking passes with no errors

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Extension activates without errors

#### Manual Verification:
- [ ] `paw_call_agent` tool accepts `"PAW"` as target agent
- [ ] PAW agent appears in VS Code prompts directory after installation
- [ ] New skills appear in `paw_get_skills` catalog
- [ ] New work items include `Confirmation Policy` and `Session Policy` fields
- [ ] `paw_get_context` returns policy values correctly
- [ ] Old WorkflowContext.md files with `Handoff Mode` still work (backward compatibility)

---

## Phase 5: Deprecate Legacy Agents

### Overview
Remove the 9 individual implementation agent files and update documentation to reflect the new single-agent architecture. This is the final cleanup phase after the new architecture is verified working.

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

#### 2. Update Handoff Tool
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

### Success Criteria:

#### Automated Verification:
- [ ] All 9 legacy agent files removed from `agents/` directory
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Documentation builds: `mkdocs build --strict`

#### Manual Verification:
- [ ] Extension activates without errors
- [ ] Only PAW and PAW Review agents appear in VS Code prompts
- [ ] Full workflow (spec → PR) completes using PAW agent
- [ ] All three workflow modes (full/minimal/custom) work correctly
- [ ] All Confirmation Policy values work correctly (`always`/`milestones`/`never`)
- [ ] All Session Policy values work correctly (`per-stage`/`continuous`)

---

## Cross-Phase Testing Strategy

### Integration Tests:
- Complete full workflow (spec → PR) using PAW agent in full workflow mode
- Complete minimal workflow (skip spec) using PAW agent in minimal workflow mode
- **Confirmation Policy testing**:
  - `always`: Verify pause at every stage boundary
  - `milestones`: Verify pause only at milestone transitions (planning→implement, phase complete, docs→pr)
  - `never`: Verify continuous progression through all stages
- **Session Policy testing**:
  - `per-stage`: Verify new chat created at stage transitions (via `paw_call_agent`)
  - `continuous`: Verify single conversation throughout (all via `runSubagent`)
- **Non-linear request handling**:
  - After updating plan, ask PAW to "update spec to align with plan changes" → verify routes to paw-spec with appropriate context
  - Mid-workflow, ask "do more research on X" → verify routes to appropriate research skill
  - Request revision of earlier artifact → verify PAW reasons about appropriate skill
- **Backward compatibility**: Verify old WorkflowContext.md with `Handoff Mode: semi-auto` still works

### Manual Testing Steps:
1. Initialize new work item with `PAW Initialize`
2. Verify WorkflowContext.md includes `Confirmation Policy` and `Session Policy` fields
3. Invoke PAW agent with Work ID
4. Complete specification stage, verify Spec.md created
5. Verify research stage triggers automatically (Confirmation Policy: `milestones`)
6. Complete planning, verify ImplementationPlan.md created
7. Verify planning waits for user confirmation (milestone transition)
8. **Non-linear test**: Ask PAW to "align spec with planning changes" → verify it delegates to paw-spec with context
9. Complete implementation phase, verify phase PR created (prs strategy)
10. Complete documentation, verify Docs.md created
11. Complete final PR, verify PR to main created
12. Verify all artifacts in `.paw/work/<feature-slug>/`
13. **Session Policy test**: Re-run workflow with `Session Policy: continuous` and verify single conversation

## Performance Considerations

- **Token Efficiency**: Combined agent + active skill tokens should be lower than loading a full implementation agent (~15-23KB). Target: <10KB per active session (agent ~4KB + skill ~5KB)
- **Skill Loading Latency**: Skills are small text files; latency should be negligible. Monitor if issues arise.
- **Skill Caching**: Consider caching loaded skills within a session if performance issues arise (future optimization)

## Migration Notes

- **Backward Compatibility**: 
  - During Phase 4, both old and new agent names are supported in `paw_call_agent`
  - Old `Handoff Mode` field maps to `Confirmation Policy`: `manual`→`always`, `semi-auto`→`milestones`, `auto`→`never`
  - Missing `Session Policy` defaults to `per-stage` (current behavior)
- **User Transition**: Users invoking old agent names will see them until Phase 5 completes
- **Data Migration**: No data migration needed—artifact locations and formats unchanged
- **Policy defaults**: New work items use `Confirmation Policy: milestones`, `Session Policy: per-stage`

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/164
- Spec: `.paw/work/implementation-skills-migration/Spec.md`
- Research: `.paw/work/implementation-skills-migration/SpecResearch.md`, `.paw/work/implementation-skills-migration/CodeResearch.md`
- Reference pattern: `agents/PAW Review.agent.md`, `skills/paw-review-workflow/SKILL.md`
- Planning docs: `planning/paw_v2/` on branch `planning/paw_v2`
