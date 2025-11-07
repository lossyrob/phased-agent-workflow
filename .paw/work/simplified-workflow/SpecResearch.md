# Spec Research: Simplified Workflow

## Summary

PAW currently implements a single comprehensive multi-stage workflow (Spec → Research → Planning → Phased Implementation → Documentation → Final PR). All agents follow consistent patterns for WorkflowContext.md handling, artifact discovery, and branch management. The `paw_create_prompt_templates` tool generates 10 fixed prompt files. Agents adapt to missing artifacts through defensive fallbacks (e.g., generating WorkflowContext.md if absent, using Issue URL when Spec.md missing). Branch strategy is hardcoded across agents with specific naming conventions (_plan, _phaseN, _docs suffixes). No workflow mode or configuration mechanism exists today—all workflows follow identical stages and branching patterns.

## Internal System Behavior

### 1. Agent Adaptation Patterns for Context Parameters

**WorkflowContext.md Handling Pattern** (consistent across all agents):
- Agents check for WorkflowContext.md in chat context or disk at `.paw/work/<feature-slug>/WorkflowContext.md`
- If present: Extract Target Branch, Work Title, Feature Slug, Issue URL, Remote (default to `origin` if omitted), Artifact Paths, Additional Inputs
- If missing or incomplete: Agents defensively create/update the file with required parameters
- Missing `Remote` entries treated as `origin` without prompting user

**Feature Slug Generation** (defensive fallback in agents PAW-01A, PAW-01B, PAW-02A, PAW-02B, PAW-03A, PAW-03B):
When WorkflowContext.md lacks Feature Slug:
1. Generate from Work Title (if Work Title exists) using normalization rules
2. Normalize: lowercase, replace spaces/special chars with hyphens, remove invalid chars, collapse consecutive hyphens, trim edges, enforce 100 char max
3. Validate format: only lowercase letters, numbers, hyphens; no leading/trailing/consecutive hyphens; not reserved names
4. Check uniqueness: verify `.paw/work/<slug>/` doesn't exist; if conflict, auto-append -2, -3, etc.
5. If both Work Title and Feature Slug missing, prompt user
6. Write complete WorkflowContext.md before proceeding

**Artifact Discovery Pattern**:
- Agents use auto-derived paths: `.paw/work/<feature-slug>/<Artifact>.md`
- No explicit "artifact exists" checks in instructions—agents assume artifacts from prior stages exist
- When artifact missing, agents handle gracefully via fallback sources (e.g., Issue URL instead of Spec.md for minimal workflow—though no explicit minimal mode exists today)

**Conditional Logic Approach**:
- No parameterized conditionals or mode-based branching in current agent instructions
- Agents include defensive fallback logic (e.g., "if WorkflowContext.md missing, create it") but not mode-aware conditionals
- All agents follow the same stage progression regardless of project scope

### 2. `paw_create_prompt_templates` Tool Implementation

**Location**: `vscode-extension/src/tools/createPromptTemplates.ts`

**Current Signature**:
```typescript
interface CreatePromptTemplatesParams {
  feature_slug: string;    // Normalized feature slug (e.g., "auth-system")
  workspace_path: string;  // Absolute path to workspace root
}
```

**Behavior**:
- Creates directory: `.paw/work/<feature_slug>/prompts/`
- Generates 10 fixed prompt template files (hardcoded array, no parameterization)
- Each template contains frontmatter (`---\nmode: <chatmode>\n---\n`) and instruction body
- Templates reference WorkflowContext.md: `<instruction> .paw/work/<feature_slug>/WorkflowContext.md`

**Generated Prompt Files** (fixed list):
1. `01A-spec.prompt.md` → mode: `PAW-01A Spec Agent`, instruction: `Create spec from`
2. `02A-code-research.prompt.md` → mode: `PAW-02A Code Researcher`, instruction: `Run code research from`
3. `02B-impl-plan.prompt.md` → mode: `PAW-02B Impl Planner`, instruction: `Create implementation plan from`
4. `03A-implement.prompt.md` → mode: `PAW-03A Implementer`, instruction: `Implement phase from`
5. `03B-review.prompt.md` → mode: `PAW-03B Impl Reviewer`, instruction: `Review implementation from`
6. `03C-pr-review.prompt.md` → mode: `PAW-03A Implementer`, instruction: `Address PR review comments from`
7. `03D-review-pr-review.prompt.md` → mode: `PAW-03B Impl Reviewer`, instruction: `Verify PR comment responses from`
8. `04-docs.prompt.md` → mode: `PAW-04 Documenter Agent`, instruction: `Generate documentation from`
9. `05-pr.prompt.md` → mode: `PAW-05 PR Agent`, instruction: `Create final PR from`
10. `0X-status.prompt.md` → mode: `PAW-0X Status Agent`, instruction: `Update status from`

**No Workflow Mode Support**:
- Tool has no mode/stage filtering parameters
- Always generates all 10 files regardless of workflow needs
- No mechanism to skip stages or customize prompt file generation

### 3. Existing Prompt File Structure and Parameterization

**Structure** (observed from `docs/agents/feature/finalize-initial-chatmodes/prompts/`):
```markdown
---
mode: '<chatmode-name>'
---
<instruction> <reference-to-context>
```

**Examples**:
- `spec-research.prompt.md`:
  - Frontmatter: `mode: 'PAW-01B Spec Research Agent'`
  - Body: Multi-line structured prompt with Target Branch, Issue URL, Additional Inputs, Questions sections
- `create-spec.prompt.md`:
  - Frontmatter: `mode: 'PAW-01A Spec Agent'`
  - Body: `Generate a spec for <issue-url> and with research at <research-path>`

**Parameterization Status**:
- Prompt files are NOT mode-aware or parameterized for workflow variations
- Content is static except for embedded WorkflowContext.md references
- No conditional sections based on workflow type
- No mechanism to indicate "this stage is optional" or "skip if minimal workflow"

**Mode Awareness**:
- Prompt files have no knowledge of workflow modes
- All prompts assume full workflow execution
- No differentiation between full vs simplified workflow paths in prompt content

### 4. Agent Artifact Discovery and Graceful Handling

**Discovery Mechanism**:
- Agents receive artifact paths via WorkflowContext.md or construct using convention: `.paw/work/<feature-slug>/<Artifact>.md`
- No explicit artifact existence checks in agent instructions before reading
- Agents rely on file reading tools to report missing files

**Fallback Behavior When Artifacts Missing**:

**PAW-03A Implementer**:
- Reads ImplementationPlan.md and CodeResearch.md at start
- If CodeResearch.md missing: No explicit fallback—agent would encounter read error
- If prior phase artifacts missing: No documented graceful degradation

**PAW-02B Impl Planner**:
- Expects Spec.md, SpecResearch.md, CodeResearch.md
- Instructions say "Read all mentioned files immediately and FULLY" but no fallback if files absent

**PAW-01A Spec Agent** (only agent with explicit artifact absence handling):
- If no SpecResearch.md yet: Generates `prompts/spec-research.prompt.md` and pauses
- If user says "skip research": Proceeds with assumptions list + explicit risk note
- If Issue URL provided but Spec.md missing: Uses issue as requirements source

**General Pattern**:
- Agents do NOT fail gracefully when expected artifacts missing
- No explicit "artifact optional" flags or conditional logic
- Only Spec Agent has built-in research skip mode—other agents assume linear progression

### 5. Current Branching Strategy Implementation

**Branch Naming Conventions** (hardcoded across agents):

**Planning Branch**: `<target_branch>_plan`
- Created by: PAW-02B Impl Planner
- Purpose: Planning PR containing Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md
- Merges into: `<target_branch>`

**Phase Branches**: `<target_branch>_phase[N]` or `<target_branch>_phase[M-N]`
- Created by: PAW-03A Implementer
- Purpose: Isolated implementation work for specific phase(s)
- Single phase: `feature/my-feature_phase3`
- Multiple consecutive phases: `feature/my-feature_phase1-3`
- Merges into: `<target_branch>` via Phase PR

**Documentation Branch**: `<target_branch>_docs`
- Created by: PAW-04 Documenter
- Purpose: Documentation updates in isolation
- Merges into: `<target_branch>`

**Final PR**: `<target_branch>` → `main` (or repo base branch)
- Created by: PAW-05 PR Agent
- Merges completed feature into base branch

**Agent Responsibilities**:

**PAW-01A Spec Agent**:
- Checks for WorkflowContext.md, extracts Target Branch
- Does NOT create branches—only prepares artifacts

**PAW-02B Impl Planner**:
- Creates `<target_branch>_plan` branch from `<target_branch>`
- Opens Planning PR: `<target_branch>_plan` → `<target_branch>`

**PAW-03A Implementer**:
- Creates phase branches: `git checkout -b <target_branch>_phase[N]`
- Verifies branch before commits: `git branch --show-current`
- Does NOT push branches—PAW-03B Impl Reviewer handles pushing

**PAW-03B Impl Reviewer**:
- Checks out existing phase branch or verifies current branch
- Pushes phase branch and opens Phase PR after review

**PAW-04 Documenter**:
- Creates `<target_branch>_docs` branch
- Opens Docs PR: `<target_branch>_docs` → `<target_branch>`

**PAW-05 PR Agent**:
- Works on `<target_branch>` directly (no new branch)
- Opens Final PR: `<target_branch>` → `main`

**Orchestration**:
- Branch creation is decentralized—each agent creates its own branch as needed
- No central orchestrator—agents follow conventions independently
- Extension does NOT create branches—agents handle all git operations

### 6. VS Code Extension Agent Invocation

**Entry Point**: Command `PAW: New PAW Workflow` (`initializeWorkItemCommand`)

**User Flow**:
1. Extension validates workspace and git repository
2. Collects user inputs via `collectUserInputs()`:
   - Target Branch (required)
   - Issue URL (optional)
3. Constructs agent prompt via `constructAgentPrompt()` using template `workItemInitPrompt.template.md`
4. Invokes agent: `vscode.commands.executeCommand('workbench.action.chat.open', { query: prompt, mode: 'agent' })`

**Initialization Prompt Structure** (from template):
- Target Branch variable substitution
- Issue URL variable substitution (or "Not provided")
- Work Title generation strategy (fetch from issue if URL provided, else derive from branch name)
- Workspace path variable substitution
- Custom instructions section (loaded from `.paw/instructions/init-instructions.md` if exists)

**Agent Instructions in Prompt**:
- Generate Work Title from issue title or branch name
- Generate Feature Slug from Work Title (normalize, validate, check uniqueness)
- Create `.paw/work/<feature-slug>/` directory structure
- Write WorkflowContext.md with all parameters
- Call `paw_create_prompt_templates` tool to generate prompt files
- Create and checkout target branch
- Open WorkflowContext.md in editor
- Display next step message

**No Workflow Mode Input**:
- Extension does NOT prompt for workflow mode
- No enum selection for workflow types
- No custom workflow instructions field (beyond optional init-instructions.md)

### 7. WorkflowContext.md Validation and Error Handling

**Parsing Validation**:
- No explicit schema validation in agents
- Agents extract fields using text parsing (no structured validation)
- Missing fields trigger defensive creation/update logic

**Error Handling Patterns**:

**Missing File**:
- Agents create WorkflowContext.md with gathered/derived parameters
- No error thrown—defensive fallback behavior

**Missing Required Fields** (Target Branch, Feature Slug):
- Agents explicitly state missing field
- Gather/derive value (Target Branch from current branch, Feature Slug from Work Title)
- Persist update before proceeding

**Missing Optional Fields** (Remote, Additional Inputs):
- Remote: Default to `origin` without prompting
- Additional Inputs: Default to `none` or empty list

**Malformed Content**:
- No explicit malformed content handling documented
- Agents rely on markdown structure with field labels (e.g., "Target Branch: <value>")
- Parsing failures would manifest as missing field scenario

**Incomplete Files**:
- Treated same as missing fields—agents gather/derive and persist updates
- Instructions emphasize "update the file whenever you learn a new parameter"

### 8. Existing "Modifier" Configuration Patterns

**Boolean Flags in WorkflowContext.md**: NONE

**Compound Fields**: NONE

**Current WorkflowContext.md Format** (all scalar fields):
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**No Existing Modifier Patterns**:
- No fields that modify behavior across agents (e.g., "skip stage X", "use single branch")
- No boolean flags or enum fields
- No workflow type or mode specification
- Only configuration is artifact path overrides (rarely used)

**Closest Pattern—Additional Inputs**:
- Comma-separated list of additional context files
- Agents read and incorporate these inputs into research/planning
- Not a modifier—purely additive context, doesn't change workflow stages or branching

**Implication for Design**:
- No precedent for modifier flags in WorkflowContext.md
- Adding workflow mode field would be first behavioral configuration parameter
- Agents currently expect WorkflowContext.md to be pure metadata, not behavioral config

## Open Unknowns

None. All internal questions answered through codebase exploration.

## User-Provided External Knowledge (Manual Fill)

### Optional External / Context

- [ ] **Industry best practices for workflow configuration syntax** (compound names vs separate fields vs flags)
- [ ] **Established patterns for LLM-based interpretation of free-text configuration** vs structured heuristics in agent systems
- [ ] **Common approaches to versioning workflow configuration files** to support backward compatibility

*(Add answers inline when available)*
