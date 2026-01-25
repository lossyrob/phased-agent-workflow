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
2. **Workflow Skill** (`paw-workflow`) encodes stage sequencing, validation gates, handoff mode behavior
3. **10 Activity Skills**: `paw-spec`, `paw-spec-research`, `paw-code-research`, `paw-planning`, `paw-implement`, `paw-review`, `paw-docs`, `paw-pr`, `paw-status` (plus existing `paw-review-*` skills retained)
4. All existing artifacts produced in same locations with same formats
5. All workflow modes (full/minimal/custom) and handoff modes (manual/semi-auto/auto) function correctly

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
1. Create workflow skill that encodes stage sequencing and orchestration logic currently duplicated across agents
2. Extract domain-specific content from each agent into dedicated activity skills
3. Create compact orchestrator agent that loads workflow skill and delegates to activity skills
4. Update extension tooling to support the new agent
5. Deprecate individual implementation agents

The workflow skill will own:
- Stage dependency graph (Spec → SpecResearch → CodeResearch → Planning → Implementation phases → Review phases → Docs → Final PR)
- Handoff mode behavior (routine transitions vs decision points)
- Validation gates between stages
- Subagent delegation pattern

Activity skills will own:
- Domain-specific process steps and methodology
- Artifact templates and formats
- Quality checklists and validation criteria

## Phase Summary

1. **Phase 1: Create Workflow Skill** - Build `paw-workflow` skill with stage sequencing, validation gates, and subagent delegation pattern
2. **Phase 2: Create Activity Skills** - Extract domain content from agents into 10 activity skills following the review skill pattern
3. **Phase 3: Create PAW Agent** - Build compact orchestrator agent that loads workflow skill and delegates activities
4. **Phase 4: Update Extension Tooling** - Modify handoff tool and installer to support the new architecture
5. **Phase 5: Deprecate Legacy Agents** - Remove individual implementation agents, update documentation

---

## Phase 1: Create Workflow Skill

### Overview
Create the `paw-workflow` skill that encodes the implementation workflow's stage sequencing, validation gates, handoff mode behavior, and subagent delegation pattern. This is the architectural foundation that enables the compact PAW agent.

### Changes Required:

#### 1. Workflow Skill
**File**: `skills/paw-workflow/SKILL.md`
**Changes**: 
- Create skill following structure of `paw-review-workflow/SKILL.md`
- Define Core Implementation Principles (evidence-based documentation, file:line references, artifact completeness)
- Document Subagent Contract for skill loading pattern
- Define artifact directory structure (`.paw/work/<feature-slug>/`)
- Encode workflow orchestration with stage sequences:
  - **Specification Stage**: `paw-spec` → `paw-spec-research` (if needed) → `paw-spec` (resume)
  - **Planning Stage**: `paw-code-research` → `paw-planning`
  - **Implementation Stage**: For each phase in plan: `paw-implement` → `paw-review`
  - **Finalization Stage**: `paw-docs` → `paw-pr`
- Define stage gates (artifact verification between stages)
- Encode workflow mode handling (full/minimal/custom)
- Encode handoff mode behavior (routine transitions vs decision points)
- Document status skill integration

**Tests**:
- Manual verification: Load skill via `paw_get_skill('paw-workflow')` and verify content matches specification
- Verify stage sequences are clearly documented
- Verify handoff mode transitions match existing behavior in `handoff-instructions.component.md`

### Success Criteria:

#### Automated Verification:
- [ ] Skill file exists at `skills/paw-workflow/SKILL.md`
- [ ] YAML frontmatter contains `name: paw-workflow` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Stage sequences match dependency graph from Spec.md FR-002
- [ ] Handoff mode transitions match `handoff-instructions.component.md`
- [ ] Subagent contract follows pattern from `paw-review-workflow`

---

## Phase 2: Create Activity Skills

### Overview
Extract domain-specific content from each implementation agent into dedicated activity skills. Each skill is self-contained with complete instructions, references workflow principles, and defines clear input/output contracts.

### Changes Required:

#### 1. Specification Skill
**File**: `skills/paw-spec/SKILL.md`
**Changes**:
- Extract from `PAW-01A Specification.agent.md`: core principles, research question guidelines, drafting workflow, spec template, quality checklist
- Add YAML frontmatter with `name: paw-spec`, `description`
- Reference Core Implementation Principles from `paw-workflow`
- Define responsibilities and non-responsibilities
- Define execution modes: Initial (no Spec.md exists), Resume (after research), PR Review Response mode
- Include spec template structure and quality checklist

**Tests**:
- Manual verification: Skill loads correctly, contains complete spec drafting instructions
- Test file: N/A (skill content verification is manual)

#### 2. Spec Research Skill
**File**: `skills/paw-spec-research/SKILL.md`
**Changes**:
- Extract from `PAW-01B Spec Researcher.agent.md`: research methodology, behavioral documentation focus, document format
- Add YAML frontmatter
- Reference workflow principles
- Define SpecResearch.md artifact template

#### 3. Code Research Skill
**File**: `skills/paw-code-research/SKILL.md`
**Changes**:
- Extract from `PAW-02A Code Researcher.agent.md`: research methodology (Code Location, Code Analysis, Pattern Finding), YAML frontmatter format, GitHub permalink generation
- Define CodeResearch.md artifact template with frontmatter

#### 4. Planning Skill
**File**: `skills/paw-planning/SKILL.md`
**Changes**:
- Extract from `PAW-02B Impl Planner.agent.md`: context gathering steps, research process, plan template structure, important guidelines, quality checklist
- Define execution modes: Initial Planning, PR Review Response
- Include ImplementationPlan.md template with phase structure

#### 5. Implementation Skill
**File**: `skills/paw-implement/SKILL.md`
**Changes**:
- Extract from `PAW-03A Implementer.agent.md`: implementation philosophy, blocking criteria, verification approach, committing guidelines
- Define execution modes: Phase Implementation, PR Review Response
- Document one-phase-per-invocation pattern

#### 6. Review Skill
**File**: `skills/paw-impl-review/SKILL.md`
**Changes**:
- Extract from `PAW-03B Impl Reviewer.agent.md`: review process steps, documentation standards, PR description templates
- Define execution modes: Initial Phase Review, Review Comment Follow-up
- Note: Named `paw-impl-review` to distinguish from `paw-review-*` skills for PR review workflow

#### 7. Documentation Skill
**File**: `skills/paw-docs/SKILL.md`
**Changes**:
- Extract from `PAW-04 Documenter.agent.md`: Docs.md artifact format, project doc update guidelines, style matching
- Define execution modes: Initial Documentation, Review Comment Follow-up
- Include Docs.md template

#### 8. Final PR Skill
**File**: `skills/paw-pr/SKILL.md`
**Changes**:
- Extract from `PAW-05 PR.agent.md`: pre-flight validation checks, PR description guidelines, artifact linking
- Document simple vs complex PR description formats

#### 9. Status Skill
**File**: `skills/paw-status/SKILL.md`
**Changes**:
- Extract from `PAW-X Status.agent.md`: workflow stages overview, two-agent pattern explanation, artifact dependencies, common errors/resolutions
- Define help and status response formats

**Tests**:
- Manual verification: Each skill loads via `paw_get_skill` and contains domain-specific instructions
- Verify no duplicate content between skills (shared concepts reference workflow skill)
- Verify artifact templates match current agent outputs

### Success Criteria:

#### Automated Verification:
- [ ] All 9 skill files exist in `skills/paw-*/SKILL.md` directories
- [ ] Each skill has valid YAML frontmatter with `name` and `description`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Skills reference Core Implementation Principles from `paw-workflow`
- [ ] Artifact templates match existing agent outputs
- [ ] Quality checklists preserved from original agents
- [ ] Each skill is self-contained with complete instructions

---

## Phase 3: Create PAW Agent

### Overview
Create the compact PAW orchestrator agent (~4KB) that replaces the 9 individual implementation agents. The agent loads the workflow skill on initialization and delegates detailed activities to activity skills via subagent sessions.

### Changes Required:

#### 1. PAW Agent
**File**: `agents/PAW.agent.md`
**Changes**:
- Follow pattern from `PAW Review.agent.md` (~3.5KB)
- Include agent metadata (description) for VS Code prompts
- One-sentence role description
- Initialization: "Load the `paw-workflow` skill to understand orchestration, principles, and artifact structure"
- Context detection: Work ID from user input or WorkflowContext.md
- Workflow mode detection summary (full/minimal/custom from WorkflowContext.md)
- Skill-based execution summary: "Execute stages via subagent delegation per workflow skill"
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
- [ ] Agent prompts for Work ID when invoked without context

---

## Phase 4: Update Extension Tooling

### Overview
Modify the extension's TypeScript code to support the new PAW agent architecture. This includes updating the handoff tool to accept the new agent name and updating the installer to deploy the new agent.

### Changes Required:

#### 1. Handoff Tool Updates
**File**: `src/tools/handoffTool.ts`
**Changes**:
- Add `"PAW"` to the `AgentName` union type (keep existing agent names for backward compatibility during transition)
- The tool will support both old agent names and new "PAW" agent during migration

**Tests**:
- Unit tests in `src/test/tools/handoffTool.test.ts` (if exists) or manual verification
- Test cases: Verify `paw_call_agent` accepts `"PAW"` as valid `target_agent`

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
- [ ] All three handoff modes (manual/semi-auto/auto) work correctly

---

## Cross-Phase Testing Strategy

### Integration Tests:
- Complete full workflow (spec → PR) using PAW agent in full workflow mode
- Complete minimal workflow (skip spec) using PAW agent in minimal workflow mode
- Verify semi-auto handoff mode: automatic at routine transitions, pauses at decision points
- Verify manual handoff mode: pauses at all stage boundaries
- Verify auto handoff mode: continuous progression through all stages

### Manual Testing Steps:
1. Initialize new work item with `PAW Initialize`
2. Invoke PAW agent with Work ID
3. Complete specification stage, verify Spec.md created
4. Verify research stage triggers automatically (semi-auto)
5. Complete planning, verify ImplementationPlan.md created
6. Verify planning waits for `implement` command (decision point)
7. Complete implementation phase, verify phase PR created (prs strategy)
8. Complete documentation, verify Docs.md created
9. Complete final PR, verify PR to main created
10. Verify all artifacts in `.paw/work/<feature-slug>/`

## Performance Considerations

- **Token Efficiency**: Combined agent + active skill tokens should be lower than loading a full implementation agent (~15-23KB). Target: <10KB per active session (agent ~4KB + skill ~5KB)
- **Skill Loading Latency**: Skills are small text files; latency should be negligible. Monitor if issues arise.
- **Skill Caching**: Consider caching loaded skills within a session if performance issues arise (future optimization)

## Migration Notes

- **Backward Compatibility**: During Phase 4, both old and new agent names are supported in `paw_call_agent`
- **User Transition**: Users invoking old agent names will see them until Phase 5 completes
- **Data Migration**: No data migration needed—artifact locations and formats unchanged

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/164
- Spec: `.paw/work/implementation-skills-migration/Spec.md`
- Research: `.paw/work/implementation-skills-migration/SpecResearch.md`, `.paw/work/implementation-skills-migration/CodeResearch.md`
- Reference pattern: `agents/PAW Review.agent.md`, `skills/paw-review-workflow/SKILL.md`
- Planning docs: `planning/paw_v2/` on branch `planning/paw_v2`
