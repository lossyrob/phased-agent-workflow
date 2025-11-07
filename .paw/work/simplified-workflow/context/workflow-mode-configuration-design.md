# Workflow Mode Configuration Design

**Date**: 2025-11-06  
**Status**: Design in Progress  
**Related Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/13

## Problem Statement

Currently, PAW implements a single, comprehensive multi-stage workflow optimized for large features. This workflow can be overkill for smaller tasks like bug fixes, minor enhancements, or well-scoped changes where a full specification stage or multi-branch PR strategy adds unnecessary overhead.

**Goal**: Enable flexible workflow paths that allow users to:
- Skip unnecessary stages (e.g., Specification for well-defined issues)
- Work locally without multiple branches and PRs (planning branch, phase branches, docs branch)
- Maintain quality and traceability while reducing iteration time
- Keep the full rigorous workflow available for complex features

## Design Decisions

### 1. Configuration Mechanism: VS Code Extension + WorkflowContext.md

**Approach**: Interactive setup via `PAW: New PAW Workflow` command that captures workflow mode and stores it in WorkflowContext.md.

**User Flow**:
1. User runs `PAW: New PAW Workflow` command (required first step)
2. Extension prompts for:
   - **Target Branch** name (e.g., "feature/my-feature")
   - **Issue/Work Item URL** (optional - GitHub Issue or Azure DevOps Work Item)
   - **Workflow Mode** (NEW - enum selection from predefined modes)
   - If mode = `custom`: **Custom Workflow Instructions** (NEW - free text describing desired workflow)
3. Extension invokes agent via chat with initialization prompt containing all inputs
4. Agent performs:
   - Generates Work Title (from issue title if provided, otherwise from branch name)
   - Generates Feature Slug (normalized from Work Title)
   - Creates `.paw/work/<feature-slug>/` directory structure
   - Writes WorkflowContext.md with all parameters including workflow mode
   - Calls `paw_create_prompt_templates` tool with mode context to generate appropriate prompt files
   - Creates and checks out target branch
   - Opens WorkflowContext.md in editor
5. Agent displays message: "Run prompt file: `.paw/work/<feature-slug>/prompts/<next-prompt>.prompt.md`"

**WorkflowContext.md Format**:
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url_or_none>
Workflow Mode: <mode_enum>
Custom Workflow Instructions: <instructions_if_custom>
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**Rationale**:
- Centralized configuration that all agents can reference
- One-time setup captures user intent explicitly
- Version controlled with workflow artifacts
- Extension handles complexity of translating mode → prompt files
- Custom mode provides escape hatch for unique workflows

### 2. Predefined Workflow Modes (Enums)

Initial set of predefined modes to support:

1. **`full`** - Complete PAW workflow (current behavior)
   - Stages: Spec → Code Research → Plan → Implementation (phases) → Docs → Final PR
   - Branches: Planning branch, phase branches, docs branch
   - All artifacts created

2. **`final-pr-only`** - Full stages, single branch (modifier mode)
   - Stages: Spec → Code Research → Plan → Implementation → Docs
   - All work on target branch (no planning/phase/docs branches)
   - Only final PR created (to main/base branch)
   - All artifacts created and committed to target branch
   - **Note**: This is a **modifier** that can be combined with other modes to indicate single-branch workflow

3. **`minimal`** - Fastest path for small changes
   - Stages: Code Research → Implementation (single phase) → Final PR
   - All work on target branch
   - Artifacts: CodeResearch.md, ImplementationPlan.md (single phase)
   - No spec, no docs, no phase branches
   - Can be combined with `final-pr-only` modifier (though already implies single branch)

4. **`custom`** - User-defined workflow
   - User provides free-text instructions describing:
     - Which stages to include/skip
     - Branch strategy preferences
     - Artifact requirements
     - Any special considerations
   - Agents interpret instructions and adapt behavior
   - Extension/agent reasons about which prompt files to generate based on instructions

**Notes**:
- These modes are starting points and may evolve based on usage
- Mode names should be descriptive and self-documenting
- `final-pr-only` is a modifier that can be applied to other modes (e.g., "full with final-pr-only" means all stages but single branch)
- Each mode implies specific agent behaviors (documented in agent instructions)

### 3. Extension as Required Entry Point

**Shift in Philosophy**: 
- Previously: Agents could create WorkflowContext.md if missing (manual workflow supported)
- New direction: **Require VS Code extension and `PAW: New PAW Workflow` command as entry point**

**Benefits**:
- Consistent setup experience across all workflows
- Extension handles complex logic (mode → prompt file mapping)
- Reduces agent instruction complexity (no need to handle missing WorkflowContext.md)
- Better UX: guided setup vs. manual file creation
- Natural place for workflow mode selection

**Implementation Changes Needed**:
- Remove WorkflowContext.md creation logic from agent instructions
- Agents assume WorkflowContext.md exists and is valid
- Update documentation to require extension installation
- Extension becomes the authoritative workflow bootstrapper

### 4. Prompt File Generation Strategy

**Challenge**: Different workflow modes require different prompt files.

**Approach**: Agent generates prompt files dynamically based on mode by calling the `paw_create_prompt_templates` tool with mode context.

**Current Tool Interface** (from `vscode-extension/src/tools/createPromptTemplates.ts`):
```typescript
interface CreatePromptTemplatesParams {
  feature_slug: string;
  workspace_path: string;
}
```

**Enhanced Tool Interface** (to support workflow modes):
```typescript
interface CreatePromptTemplatesParams {
  feature_slug: string;
  workspace_path: string;
  workflow_mode: string;           // NEW: mode enum value (full, final-pr-only, minimal, custom)
  stages?: WorkflowStage[];        // NEW: explicit list of stages to generate prompts for
}

enum WorkflowStage {
  Spec = "spec",                    // 01A-spec.prompt.md, 01B-spec-research.prompt.md
  CodeResearch = "code-research",   // 02A-code-research.prompt.md
  Plan = "plan",                    // 02B-impl-plan.prompt.md
  Implementation = "implementation", // 03A-implement.prompt.md, 03B-review.prompt.md, 
                                    // 03C-pr-review.prompt.md, 03D-review-pr-review.prompt.md
  Documentation = "documentation",  // 04-docs.prompt.md
  FinalPR = "final-pr",            // 05-pr.prompt.md
  Status = "status"                // 0X-status.prompt.md (always included)
}
```

**Stage to Prompt File Mapping**:
- `Spec` → `01A-spec.prompt.md`, `01B-spec-research.prompt.md`
- `CodeResearch` → `02A-code-research.prompt.md`
- `Plan` → `02B-impl-plan.prompt.md`
- `Implementation` → `03A-implement.prompt.md`, `03B-review.prompt.md`, `03C-pr-review.prompt.md`, `03D-review-pr-review.prompt.md`
- `Documentation` → `04-docs.prompt.md`
- `FinalPR` → `05-pr.prompt.md`
- `Status` → `0X-status.prompt.md` (always generated regardless of stages list)

**For Predefined Modes** (agent determines stages based on mode):
- `full` mode → agent calls tool with: `[Spec, CodeResearch, Plan, Implementation, Documentation, FinalPR, Status]`
- `minimal` mode → agent calls tool with: `[CodeResearch, Plan, Implementation, FinalPR, Status]`
- `final-pr-only` modifier → agent passes workflow_mode but same stages as base mode

**For Custom Mode**:
- Agent reads Custom Workflow Instructions from WorkflowContext.md
- Agent reasons about which stages are needed based on instructions
- Agent calls tool with explicit list of stages
- Example: User says "just code research and implementation" → agent calls with `[CodeResearch, Plan, Implementation, FinalPR, Status]`

**Tool Behavior**:
- Receives workflow_mode and optional stages list
- If stages list provided: generates prompt files for those stages only
- If stages list omitted: uses default mapping based on workflow_mode
- Injects workflow_mode context into generated prompt files (for agent awareness)

**Rationale**:
- Agent has full control over which prompts to generate
- Tool remains simple with clear stage→prompt mapping
- Supports both predefined modes (agent uses built-in logic) and custom modes (agent reasons from instructions)
- Explicit stage enum prevents errors from typos or invalid stage names

### 5. Agent Behavior Adaptation

**Agents receive workflow mode context via WorkflowContext.md**. Each agent includes mode-specific instructions:

**Example Agent Instruction Pattern**:
```markdown
## Workflow Mode Handling

Read Workflow Mode from WorkflowContext.md. Adapt behavior as follows:

### Mode: full
- [Standard full workflow behavior]

### Mode: final-pr-only
- All work on target branch (no planning/phase/docs branches)
- Skip branch creation/checkout operations for planning, phases, docs
- Commit artifacts and code together to target branch
- Create only final PR (target branch → main/base)

### Mode: minimal
- Single implementation phase only
- Skip docs stage preparation
- Focus on essential artifacts (CodeResearch.md, ImplementationPlan.md with single phase)
- Use Issue URL content as requirements source (no Spec.md)

### Mode: custom
- Read Custom Workflow Instructions from WorkflowContext.md
- Adapt behavior according to those instructions
- Ask clarifying questions if instructions ambiguous
```

**Rationale**:
- Agents remain flexible and mode-aware
- Clear, explicit behavior for each mode
- Custom mode provides escape hatch without hardcoding every variation

### 6. Artifact Requirements by Mode

**Decision**: Skipped stages omit artifacts entirely (no stub files).

**Artifact Matrix**:

| Artifact | full | final-pr-only | minimal | custom |
|----------|------|---------------|---------|--------|
| WorkflowContext.md | ✓ | ✓ | ✓ | ✓ |
| Spec.md | ✓ | ✓ | ✗ | ? |
| SpecResearch.md | ✓ | ✓ | ✗ | ? |
| CodeResearch.md | ✓ | ✓ | ✓ | ? |
| ImplementationPlan.md | ✓ | ✓ | ✓ (single phase) | ? |
| Docs.md | ✓ | ✓ | ✗ | ? |

**Note**: `final-pr-only` is a branch strategy modifier and includes all artifacts from the stages being run. When combined with another mode (e.g., "minimal with final-pr-only"), use the artifact requirements of the base mode.

**Agent Handling of Missing Artifacts**:
- Agents check if artifact exists before referencing
- Use alternative sources when artifact missing (e.g., Issue URL instead of Spec.md)
- No errors for legitimately missing artifacts in simplified modes

### 7. Quality Gates

**Decision**: All current quality gates remain mandatory regardless of mode.

**Mandatory Quality Requirements**:
- Tests pass (unit, integration as applicable)
- Linting passes
- Type checking passes
- Build succeeds
- Manual review/approval before merge

**Rationale**:
- Simplified workflow = fewer stages, not lower quality
- Quality gates protect codebase integrity
- Can still iterate faster with fewer artifacts/PRs
- User can always skip checks manually (git bypass) if truly needed

**Note**: This decision may evolve if we identify specific scenarios where certain checks should be optional.

## Open Questions

1. **Custom mode reasoning approach**: Should agent use LLM to interpret custom instructions, or rely on hardcoded heuristics?
   - LLM: More flexible but adds complexity
   - Heuristics: Simpler but less flexible
   - Hybrid: Structured parsing with LLM fallback

2. **Mode evolution**: How do we handle adding new predefined modes over time?
   - Extension versioning considerations
   - Backward compatibility with old WorkflowContext.md files
   - Migration path for existing workflows

3. **Prompt file templates**: Should prompt files contain mode-specific content, or be generic with mode referenced?
   - Mode-specific: "Skip to code research (minimal mode)"
   - Generic: "Create spec from WorkflowContext.md" (agent interprets mode)

4. **final-pr-only modifier syntax**: How should users specify this modifier?
   - Option A: Separate field in WorkflowContext.md (`Branch Strategy: final-pr-only`)
   - Option B: Compound mode name (`full-final-pr-only`, `minimal-final-pr-only`)
   - Option C: Boolean flag (`Final PR Only: true`)

5. **Extension requirement fallback**: How do we handle users who want to use PAW without the extension?
   - Maintain legacy manual WorkflowContext.md creation in agent instructions?
   - Clear error message directing to extension install?
   - Deprecate manual approach entirely?

## Next Steps

1. Finalize predefined mode list and exact behaviors
2. Update WorkflowContext.md specification to include Workflow Mode and Custom Workflow Instructions fields
3. Design extension prompt file generation logic (mode → prompt file mapping)
4. Update all agent instructions to include workflow mode handling sections
5. Implement mode-aware behavior in each agent
6. Test each workflow mode end-to-end
7. Document workflow mode selection guidance (when to use which mode)

## Related Decisions

- **Artifact Paths**: Remain `auto-derived` (`.paw/work/<feature-slug>/`) regardless of mode
- **Git Remote**: Remains `origin` default regardless of mode
- **Feature Slug**: Generation/normalization rules unchanged
- **Final PR**: Always created regardless of mode (simplified workflows still merge to main)

## Document History

- 2025-11-06: Initial design capture based on discussion
  - Researched current VS Code extension implementation
  - Corrected user flow to match actual extension behavior
  - Updated tool interface to match existing implementation in `createPromptTemplates.ts`
  - Removed `code-research-only` mode (can be added later if needed)
  - Renamed `local-only` to `final-pr-only` and clarified as branch strategy modifier
  - Noted that `final-pr-only` can be combined with other modes
