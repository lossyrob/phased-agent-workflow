# Simplified Workflow Documentation

**Feature**: Workflow Mode Configuration System  
**Target Branch**: feature/simplified-workflow  
**Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/13  
**Status**: Complete

## Overview

The Simplified Workflow feature introduces configurable workflow modes (Full, Minimal, Custom) and review strategies (PRs, Local) to PAW, enabling developers to tailor the workflow complexity to their task scope. This system allows users to skip unnecessary stages for smaller tasks while maintaining quality gates, and choose between multi-branch PR reviews or single-branch workflows based on their development style.

### What Was Built

This feature adds three primary capabilities to PAW:

1. **Workflow Mode Selection**: Users can choose Full (all stages), Minimal (core stages only), or Custom (user-defined) modes during workflow initialization
2. **Review Strategy Selection**: Users can choose between PRs strategy (intermediate branches and PRs) or Local strategy (single branch) for how work is reviewed
3. **Dynamic Prompt Generation**: The system generates only the prompt files relevant to the selected workflow mode

### Key Benefits

- **Reduced Overhead**: Minimal mode eliminates specification and documentation stages for straightforward tasks
- **Flexible Review Process**: Choose between incremental PR reviews or consolidated final PR review
- **Maintainability**: All workflows share the same agent codebase with mode-aware behavior
- **Backward Compatibility**: Existing workflows without explicit mode configuration default to Full mode with PRs strategy

## Architecture

### Component Overview

The feature spans four main components:

1. **VS Code Extension** (`vscode-extension/src/`)
   - User input collection for workflow mode and review strategy
   - WorkflowContext.md generation with mode/strategy fields
   - Initialization prompt construction

2. **Prompt Template Tool** (`vscode-extension/src/tools/createPromptTemplates.ts`)
   - Mode-aware prompt file generation
   - Stage-to-prompt mapping
   - Conditional file creation based on stages

3. **PAW Agents** (`.github/chatmodes/PAW-*.chatmode.md`)
   - Mode-aware behavior adaptation
   - Review strategy-specific branching logic
   - Graceful handling of missing artifacts

4. **Type System** (`vscode-extension/src/ui/userInput.ts`)
   - TypeScript types for workflow modes and review strategies
   - Input validation interfaces
   - Type-safe mode selection

### Data Flow

```
User Input (VS Code UI)
    ↓
WorkflowModeSelection { mode, customInstructions? }
ReviewStrategy
    ↓
WorkflowContext.md (persisted)
    ↓
Agent Initialization (reads mode/strategy)
    ↓
paw_create_prompt_templates tool (generates relevant prompts)
    ↓
Agents adapt behavior based on mode/strategy
```

### WorkflowContext.md Schema

```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url_or_none>
Workflow Mode: <full|minimal|custom>
Review Strategy: <prs|local>
Custom Workflow Instructions: <text_if_custom_mode>
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: <comma-separated or none>
```

### Stage-to-Prompt Mapping

The system maps workflow stages to prompt files:

| Stage | Prompt Files | Full Mode | Minimal Mode |
|-------|--------------|-----------|--------------|
| Spec | 01A-spec.prompt.md | ✓ | ✗ |
| CodeResearch | 02A-code-research.prompt.md | ✓ | ✓ |
| Plan | 02B-impl-plan.prompt.md | ✓ | ✓ |
| Implementation | 03A-implement.prompt.md | ✓ | ✓ |
| ImplementationReview | 03B-review.prompt.md | ✓ | ✓ |
| PRReviewResponse | 03C-pr-review.prompt.md, 03D-review-pr-review.prompt.md | ✓ | ✓ |
| Documentation | 04-docs.prompt.md | ✓ | ✗ |
| FinalPR | 05-pr.prompt.md | ✓ | ✓ |
| Status | 0X-status.prompt.md | ✓ | ✓ |

**Total Prompt Files**: Full mode = 10, Minimal mode = 8

## Implementation Details

### Phase 1: Extension UI and WorkflowContext.md Schema

**Files Modified**:
- `vscode-extension/src/ui/userInput.ts`
- `vscode-extension/src/prompts/workItemInitPrompt.template.md`
- `vscode-extension/src/prompts/workflowInitPrompt.ts`
- `vscode-extension/src/commands/initializeWorkItem.ts`

**Key Changes**:

#### Type System
```typescript
type WorkflowMode = 'full' | 'minimal' | 'custom';
type ReviewStrategy = 'prs' | 'local';

interface WorkflowModeSelection {
  mode: WorkflowMode;
  customInstructions?: string;
}

interface WorkItemInputs {
  targetBranch: string;
  issueUrl?: string;
  workflowMode: WorkflowModeSelection;
  reviewStrategy: ReviewStrategy;
}
```

#### User Input Collection
The `collectWorkflowMode()` function presents a Quick Pick with:
- **Full**: Complete PAW workflow (all stages)
- **Minimal**: Fast path for small changes (core stages only)
- **Custom**: Define your own workflow

For custom mode, users provide free-text instructions describing their desired workflow.

The `collectReviewStrategy()` function presents:
- **PRs**: Review stages via intermediate PRs
- **Local**: Review locally, single final PR

Minimal mode automatically enforces Local strategy without prompting.

#### WorkflowContext.md Generation
The initialization agent receives workflow mode and review strategy parameters and generates WorkflowContext.md with both fields, then calls the prompt template tool to generate appropriate prompt files.

### Phase 2: Prompt Template Tool Enhancement

**Files Modified**:
- `vscode-extension/src/tools/createPromptTemplates.ts`
- `vscode-extension/package.json` (tool schema)

**Key Changes**:

#### WorkflowStage Enum
```typescript
enum WorkflowStage {
  spec = 'spec',
  codeResearch = 'code-research',
  plan = 'plan',
  implementation = 'implementation',
  implementationReview = 'implementation-review',
  prReviewResponse = 'pr-review-response',
  documentation = 'documentation',
  finalPR = 'final-pr',
  status = 'status'
}
```

#### Stage Determination Logic
The `determineStagesFromMode()` function maps workflow modes to stages:

```typescript
function determineStagesFromMode(
  mode?: string,
  explicitStages?: WorkflowStage[]
): WorkflowStage[] {
  // Custom mode with explicit stages
  if (explicitStages && explicitStages.length > 0) {
    return explicitStages;
  }
  
  // Minimal mode: skip spec and documentation
  if (mode === 'minimal') {
    return [
      WorkflowStage.codeResearch,
      WorkflowStage.plan,
      WorkflowStage.implementation,
      WorkflowStage.implementationReview,
      WorkflowStage.prReviewResponse,
      WorkflowStage.finalPR,
      WorkflowStage.status
    ];
  }
  
  // Full mode or undefined: all stages
  return Object.values(WorkflowStage);
}
```

#### Conditional Generation
The tool filters the `PROMPT_TEMPLATES` array to generate only files matching the determined stages:

```typescript
const stagesToGenerate = determineStagesFromMode(workflow_mode, stages);
const templatesToGenerate = PROMPT_TEMPLATES.filter(template =>
  stagesToGenerate.includes(template.stage)
);
```

### Phase 3: Agent Instruction Updates

**Files Modified**: All 8 PAW agent chatmode files:
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`
- `.github/chatmodes/PAW-03A Implementer.chatmode.md`
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`
- `.github/chatmodes/PAW-04 Documenter.chatmode.md`
- `.github/chatmodes/PAW-05 PR.chatmode.md`
- `.github/chatmodes/PAW-X Status Update.chatmode.md`

**Key Changes**:

Each agent now includes a "Workflow Mode and Review Strategy Handling" section that:
1. Reads Workflow Mode and Review Strategy from WorkflowContext.md at startup
2. Describes behavior for each mode (full, minimal, custom)
3. Describes behavior for each strategy (prs, local)
4. Handles defaults when fields are missing

#### Example: Implementation Reviewer Agent Branching Logic

**PRs Strategy**:
```
1. Push implementation branch (includes both Implementer's commits and Reviewer's commits)
2. Open phase PR with description referencing plan
3. Title: [<Work Title>] Implementation Phase <N>: <brief description>
4. Include phase objectives, changes made, testing performed
5. Pause for human review
```

**Local Strategy**:
```
1. Push target branch only (no phase branch)
2. Skip Phase PR creation (work proceeds directly on target branch)
3. Document review completion in ImplementationPlan.md notes only
```

#### Artifact Discovery Patterns

Agents gracefully handle missing artifacts in minimal/custom modes:

**Code Researcher**:
```
- Full mode: Read Spec.md and SpecResearch.md for context
- Minimal mode: Use Issue URL as requirements source (Spec.md may not exist)
- Check if Spec.md exists before reading
- If missing, note it and continue with Issue URL as source
```

**PR Agent**:
```
- Dynamically check which artifacts exist before including in PR description
- Full mode: Reference all artifacts (Spec.md, SpecResearch.md, CodeResearch.md, etc.)
- Minimal mode: Reference only available artifacts (CodeResearch.md, ImplementationPlan.md)
```

### Phase 4: Testing, Validation, and Documentation

**Files Added/Modified**:
- `vscode-extension/src/test/suite/createPromptTemplates.test.ts` (new)
- `vscode-extension/src/test/suite/userInput.test.ts`
- `vscode-extension/src/test/suite/errorHandling.test.ts` (new)
- `README.md` (workflow modes section)
- `paw-specification.md` (comprehensive workflow modes documentation)

**Test Coverage**:

1. **Prompt Template Generation** (8 tests):
   - Full mode generates 10 files
   - Minimal mode generates 8 files
   - Custom mode with explicit stages generates only specified files
   - Default behavior generates all files
   - Frontmatter format validation
   - Status stage always included
   - Idempotent file generation
   - PRReviewResponse stage includes both 03C and 03D

2. **User Input Validation** (8 tests):
   - WorkflowMode type validation
   - WorkflowModeSelection interface usage
   - ReviewStrategy type validation
   - Branch name validation
   - Issue URL validation

3. **Error Handling** (6 tests):
   - Custom mode validation at UI level
   - TypeScript compile-time safety
   - Runtime validation of workflow mode strings
   - Minimal mode + prs strategy prevention
   - Clear error messages for missing WorkflowContext.md fields

**Documentation Updates**:

- **README.md**: Added concise "Workflow Modes" section with overview and link to detailed documentation
- **paw-specification.md**: Added comprehensive "Workflow Modes" section (~130 lines) with:
  - Detailed description of each mode
  - Review strategies explanation
  - When to use each mode/strategy
  - Quality gates clarification
  - Defaults handling

## Configuration Reference

### Workflow Modes

#### Full Mode
- **Stages**: All stages from Spec through Documentation
- **Review Strategies**: Supports both PRs and Local
- **Use When**: Building large features, complex changes, formal specifications needed
- **Prompt Files**: 10 files (01A, 01B, 02A, 02B, 03A, 03B, 03C, 03D, 04, 05, 0X)

#### Minimal Mode
- **Stages**: Code Research → Implementation → Final PR
- **Review Strategy**: Local only (enforced)
- **Use When**: Bug fixes, small enhancements, well-defined requirements
- **Prompt Files**: 8 files (02A, 02B, 03A, 03B, 03C, 03D, 05, 0X)

#### Custom Mode
- **Stages**: User-defined
- **Review Strategies**: Supports both PRs and Local
- **Use When**: Unique workflows, project-specific requirements
- **Prompt Files**: Based on custom instructions

### Review Strategies

#### PRs Strategy
- **Branch Structure**: Planning (_plan), Phase (_phaseN), Docs (_docs) branches
- **PRs Created**: Planning PR, Phase PRs, Docs PR, Final PR
- **Use When**: Complex work, incremental review needed, multiple reviewers

#### Local Strategy
- **Branch Structure**: Single target branch only
- **PRs Created**: Final PR only
- **Use When**: Simple work, consolidated review preferred, minimal PR overhead

### Defaults

When WorkflowContext.md lacks mode/strategy fields:
- **Workflow Mode**: Defaults to `full`
- **Review Strategy**: Defaults to `prs`
- **Behavior**: Agents log informational message about using defaults

## Usage Guide

### Initializing a Workflow with Mode Selection

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run: `PAW: New PAW Workflow`
3. Enter target branch name (e.g., `feature/my-feature`)
4. (Optional) Provide issue/work item URL
5. **Select Workflow Mode**:
   - Choose from: Full, Minimal, or Custom
   - If Custom: provide instructions describing desired workflow
6. **Select Review Strategy**:
   - Choose from: PRs or Local
   - (Skipped if Minimal mode selected—automatically set to Local)
7. Agent creates WorkflowContext.md with selections
8. Agent generates appropriate prompt files
9. Agent creates and checks out target branch

### Example: Minimal Workflow for Bug Fix

**Scenario**: Fix a clear bug with well-defined requirements in the issue.

**Initialization**:
- Target Branch: `fix/login-validation`
- Issue URL: `https://github.com/org/repo/issues/123`
- Workflow Mode: `minimal`
- Review Strategy: `local` (auto-selected)

**Generated Prompt Files**:
- `02A-code-research.prompt.md`
- `02B-impl-plan.prompt.md`
- `03A-implement.prompt.md`
- `03B-review.prompt.md`
- `03C-pr-review.prompt.md`
- `03D-review-pr-review.prompt.md`
- `05-pr.prompt.md`
- `0X-status.prompt.md`

**Workflow Execution**:
1. Run `02A-code-research.prompt.md` → creates CodeResearch.md (uses Issue URL as requirements)
2. Run `02B-impl-plan.prompt.md` → creates ImplementationPlan.md (single phase)
3. Run `03A-implement.prompt.md` → commits code to `fix/login-validation` branch
4. Run `03B-review.prompt.md` → reviews, adds docs, pushes `fix/login-validation`
5. Run `05-pr.prompt.md` → creates Final PR from `fix/login-validation` → `main`

**Result**: Single PR, no intermediate branches, all commits on target branch.

### Example: Full Workflow with Local Strategy

**Scenario**: Implement a new feature with full documentation but prefer consolidated review.

**Initialization**:
- Target Branch: `feature/user-preferences`
- Issue URL: `https://github.com/org/repo/issues/456`
- Workflow Mode: `full`
- Review Strategy: `local`

**Generated Prompt Files**: All 10 files (01A through 0X)

**Workflow Execution**:
1. Run spec stages → creates Spec.md, SpecResearch.md (committed to `feature/user-preferences`)
2. Run code research → creates CodeResearch.md (committed to `feature/user-preferences`)
3. Run planning → creates ImplementationPlan.md (committed to `feature/user-preferences`)
4. Run implementation phases → code committed to `feature/user-preferences`
5. Run documentation → creates Docs.md (committed to `feature/user-preferences`)
6. Run PR agent → creates Final PR from `feature/user-preferences` → `main`

**Result**: Single final PR with all stages included, no intermediate branches or PRs.

### Example: Custom Workflow

**Scenario**: Need code research and implementation, but skip specification and documentation. Use PR strategy for phase reviews.

**Initialization**:
- Target Branch: `feature/api-optimization`
- Issue URL: `https://github.com/org/repo/issues/789`
- Workflow Mode: `custom`
- Custom Instructions: `Skip specification and documentation stages. Include code research, planning, and implementation with multiple phases. Use prs review strategy.`
- Review Strategy: `prs`

**Agent Reasoning**:
Agent interprets instructions and calls prompt tool with:
```typescript
stages: [
  WorkflowStage.codeResearch,
  WorkflowStage.plan,
  WorkflowStage.implementation,
  WorkflowStage.implementationReview,
  WorkflowStage.prReviewResponse,
  WorkflowStage.finalPR,
  WorkflowStage.status
]
```

**Generated Prompt Files**: 8 files (02A, 02B, 03A, 03B, 03C, 03D, 05, 0X)

**Workflow Execution** (with PRs strategy):
1. Run code research → creates CodeResearch.md (uses Issue URL)
2. Run planning → creates ImplementationPlan.md, commits to `feature/api-optimization_plan`, opens Planning PR
3. Once Planning PR merged → run implementation phases
4. Each phase → commits to `feature/api-optimization_phase[N]`, opens Phase PR
5. Run PR agent → creates Final PR from `feature/api-optimization` → `main`

**Result**: Multiple intermediate PRs for planning and phases, no spec or docs.

## Testing

### Automated Tests

**Test Suite**: 31 tests covering all aspects of the workflow mode system.

**Running Tests**:
```bash
cd vscode-extension
npm test
```

**Test Categories**:

1. **Prompt Template Generation** (`createPromptTemplates.test.ts`):
   - Verifies correct file count for each mode
   - Validates frontmatter format
   - Tests stage filtering logic
   - Confirms idempotency

2. **User Input Validation** (`userInput.test.ts`):
   - Type system validation
   - Branch name validation
   - Issue URL validation
   - Mode/strategy interface usage

3. **Error Handling** (`errorHandling.test.ts`):
   - Custom mode validation
   - Type safety verification
   - Runtime validation
   - Error message clarity

4. **Extension Activation** (`extension.test.ts`):
   - Command registration
   - Extension activation
   - Basic functionality

### Manual Testing Scenarios

**Recommended Manual Tests**:

1. **Minimal Mode End-to-End**:
   - Initialize with minimal mode
   - Verify exactly 8 prompt files generated
   - Execute workflow start to finish
   - Verify no intermediate branches created
   - Verify single final PR

2. **Full Mode with PRs Strategy**:
   - Initialize with full mode and prs strategy
   - Verify all 10 prompt files generated
   - Execute workflow with intermediate PRs
   - Verify planning, phase, and docs branches created

3. **Full Mode with Local Strategy**:
   - Initialize with full mode and local strategy
   - Verify all 10 prompt files generated
   - Execute workflow on single branch
   - Verify no intermediate branches or PRs

4. **Custom Mode Interpretation**:
   - Initialize with custom instructions
   - Verify agent correctly interprets instructions
   - Verify appropriate prompt files generated

5. **Defaults Handling**:
   - Remove mode/strategy fields from WorkflowContext.md
   - Run any agent
   - Verify defaults to full mode with prs strategy
   - Verify informational log message

## Migration Guide

### For Existing Workflows

**No Action Required**: Existing `.paw/work/<feature-slug>/` directories without Workflow Mode or Review Strategy fields in WorkflowContext.md continue to work. Agents automatically default to full mode with prs strategy.

**Optional Enhancement**: To make the mode explicit, add to WorkflowContext.md:
```markdown
Workflow Mode: full
Review Strategy: prs
```

### For New Workflows

**Recommended**: Always use the VS Code extension command `PAW: New PAW Workflow` to initialize workflows. This ensures:
- Workflow mode and review strategy are explicitly selected
- Appropriate prompt files are generated
- WorkflowContext.md is correctly populated

**Manual Initialization**: If creating WorkflowContext.md manually, include:
```markdown
Workflow Mode: <full|minimal|custom>
Review Strategy: <prs|local>
Custom Workflow Instructions: <text if mode is custom>
```

## Design Decisions

### Why Three Modes?

**Full Mode**: Preserves the comprehensive workflow for large features requiring documentation and formal specifications.

**Minimal Mode**: Addresses feedback that PAW was "overkill" for small tasks. Eliminates specification and documentation stages while maintaining quality gates.

**Custom Mode**: Provides an escape hatch for unique workflows without requiring hardcoded support for every variation. Leverages LLM reasoning to interpret free-text instructions.

### Why Separate Review Strategy Field?

**Alternative Considered**: Compound mode names like "minimal-local" or "full-prs".

**Decision**: Separate fields for Workflow Mode and Review Strategy.

**Rationale**:
- **Separation of Concerns**: Mode determines stages, strategy determines how reviews happen
- **No Combinatorial Explosion**: Keeps mode options simple
- **Extensibility**: Can add new strategies independently of modes
- **Natural UI Pattern**: Two separate selections in sequence

### Why Enforce Local Strategy for Minimal Mode?

**Rationale**: Minimal mode is designed for simplicity. Allowing PRs strategy (multiple intermediate PRs) contradicts the goal of reducing overhead. Local strategy aligns with the intent of minimal mode: fast path to final PR.

**Implementation**: When user selects minimal mode, review strategy is automatically set to local without prompting.

### Why Not Change Quality Gates?

**Decision**: All quality gates (tests, linting, type checking, build) remain mandatory regardless of mode.

**Rationale**:
- Simplified workflow should mean fewer stages, not lower quality
- Quality gates protect codebase integrity
- Users can manually bypass checks if truly needed (git push --no-verify)
- Maintaining consistent quality standards across all workflows

## Troubleshooting

### Issue: Agent Errors About Missing Spec.md in Minimal Mode

**Symptom**: Agent fails when trying to read Spec.md in minimal workflow.

**Cause**: Agent not correctly reading workflow mode from WorkflowContext.md.

**Solution**: 
1. Verify WorkflowContext.md contains `Workflow Mode: minimal`
2. Ensure agent chatmode file includes "Workflow Mode and Review Strategy Handling" section
3. Check agent logs for mode detection message

### Issue: Intermediate Branches Created in Local Strategy

**Symptom**: Planning branch or phase branches exist despite selecting local strategy.

**Cause**: Agent not correctly adapting behavior to review strategy.

**Solution**:
1. Verify WorkflowContext.md contains `Review Strategy: local`
2. Check agent instruction updates in Phase 3 implementation
3. Ensure agent reads strategy at startup

### Issue: Wrong Number of Prompt Files Generated

**Symptom**: Minimal mode generates 10 files instead of 8, or full mode generates 8 files.

**Cause**: Prompt template tool not receiving correct mode parameter.

**Solution**:
1. Check initialization agent prompt construction
2. Verify tool call includes `workflow_mode` parameter
3. Check `determineStagesFromMode()` logic in tool implementation

### Issue: Custom Instructions Not Working

**Symptom**: Agent doesn't follow custom workflow instructions.

**Cause**: Instructions ambiguous or agent unable to interpret.

**Solution**:
1. Provide explicit stage names in instructions (e.g., "Include code research, implementation, and documentation stages")
2. Specify review strategy clearly (e.g., "Use local strategy" or "Use prs strategy")
3. If agent asks clarifying questions, provide specific answers

## Future Enhancements

### Potential Additional Modes

Based on usage patterns, consider adding:
- **Spec-Only Mode**: Specification stages only for requirements refinement
- **Docs-Only Mode**: Documentation stages only for updating docs
- **Research-Only Mode**: Code research without implementation

### Enhanced Custom Mode Support

- **Structured Configuration**: JSON or YAML format for custom instructions instead of free-text
- **Mode Templates**: Pre-built custom mode templates for common patterns
- **Visual Configuration**: UI builder for custom workflows

### Workflow Mode Transitions

Currently, mode is set once during initialization. Future enhancement:
- Allow mode changes mid-workflow with validation
- Migration tools for converting between modes
- Checkpoint/resume capabilities

### Recommendations System

- **Automatic Mode Suggestion**: Analyze issue complexity and suggest appropriate mode
- **Mode Analytics**: Track which modes are used most frequently
- **Best Practices**: Recommend mode based on issue type, size, and project patterns

## References

### Related Artifacts

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/13
- **Specification**: `.paw/work/simplified-workflow/Spec.md`
- **Implementation Plan**: `.paw/work/simplified-workflow/ImplementationPlan.md`
- **Design Document**: `.paw/work/simplified-workflow/context/workflow-mode-configuration-design.md`
- **Code Research**: `.paw/work/simplified-workflow/CodeResearch.md`

### Implementation Files

**Extension UI**:
- `vscode-extension/src/ui/userInput.ts` - Workflow mode and review strategy collection
- `vscode-extension/src/prompts/workItemInitPrompt.template.md` - Initialization prompt template
- `vscode-extension/src/prompts/workflowInitPrompt.ts` - Prompt construction
- `vscode-extension/src/commands/initializeWorkItem.ts` - Command handler

**Prompt Template Tool**:
- `vscode-extension/src/tools/createPromptTemplates.ts` - Mode-aware prompt generation
- `vscode-extension/package.json` - Tool schema and registration

**Agent Instructions**:
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`
- `.github/chatmodes/PAW-03A Implementer.chatmode.md`
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`
- `.github/chatmodes/PAW-04 Documenter.chatmode.md`
- `.github/chatmodes/PAW-05 PR.chatmode.md`
- `.github/chatmodes/PAW-X Status Update.chatmode.md`

**Tests**:
- `vscode-extension/src/test/suite/createPromptTemplates.test.ts`
- `vscode-extension/src/test/suite/userInput.test.ts`
- `vscode-extension/src/test/suite/errorHandling.test.ts`
- `vscode-extension/src/test/suite/extension.test.ts`

**Documentation**:
- `README.md` - Workflow modes overview
- `paw-specification.md` - Comprehensive workflow modes documentation

### External Resources

- **GitHub Copilot Agent Mode**: https://docs.github.com/en/copilot/using-github-copilot/using-copilot-agent-mode
- **VS Code Extension Development**: https://code.visualstudio.com/api
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/

## Maintenance Notes

### Code Ownership

- **Extension UI & Types**: TypeScript/VS Code extension developers
- **Prompt Template Tool**: Language model tool developers
- **Agent Instructions**: PAW workflow maintainers
- **Documentation**: Technical writers and maintainers

### Adding New Workflow Modes

To add a new predefined mode (e.g., "docs-only"):

1. **Update Type Definition** (`userInput.ts`):
   ```typescript
   type WorkflowMode = 'full' | 'minimal' | 'custom' | 'docs-only';
   ```

2. **Add UI Option** (`userInput.ts`):
   ```typescript
   { label: 'Docs-only', description: 'Documentation updates only' }
   ```

3. **Update Stage Logic** (`createPromptTemplates.ts`):
   ```typescript
   if (mode === 'docs-only') {
     return [WorkflowStage.documentation, WorkflowStage.status];
   }
   ```

4. **Update All Agents**: Add "docs-only mode" behavior to each agent's "Workflow Mode and Review Strategy Handling" section

5. **Add Tests**: Add test cases for new mode in `createPromptTemplates.test.ts`

6. **Update Documentation**: Add mode description to README.md and paw-specification.md

### Adding New Review Strategies

To add a new review strategy (e.g., "draft-prs"):

1. **Update Type Definition** (`userInput.ts`):
   ```typescript
   type ReviewStrategy = 'prs' | 'local' | 'draft-prs';
   ```

2. **Add UI Option** (`userInput.ts`):
   ```typescript
   { label: 'Draft PRs', description: 'Create draft PRs for review' }
   ```

3. **Update All Agents**: Add "draft-prs strategy" behavior to branching logic in each agent

4. **Add Tests**: Add test cases for new strategy

5. **Update Documentation**: Add strategy description to paw-specification.md

### Linting Agent Chatmode Files

After modifying agent instructions:
```bash
./scripts/lint-chatmode.sh .github/chatmodes/*.chatmode.md
```

Expected warnings about token counts are acceptable. Other errors should be addressed.

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-10  
**Author**: PAW Documenter Agent  
**Workflow**: Simplified Workflow Implementation
