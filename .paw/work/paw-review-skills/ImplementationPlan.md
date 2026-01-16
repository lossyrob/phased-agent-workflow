# PAW Review Skills Implementation Plan

## Overview

This plan migrates the PAW Review workflow from 6 discrete agents to a skills-based architecture. A single PAW Review agent will dynamically load skills via `paw_get_skills` and `paw_get_skill` tools, orchestrating the review workflow through subagent execution without manual pauses.

## Current State Analysis

The review workflow currently operates through six specialized agents (PAW-R1A through PAW-R3B) executing in sequence with manual handoffs. Each agent produces specific artifacts (ReviewContext.md, CodeResearch.md, DerivedSpec.md, ImpactAnalysis.md, GapAnalysis.md, ReviewComments.md). The workflow has a unique pause-and-resume pattern where R1A hands off to R1B for baseline research, then resumes.

### Key Discoveries:
- Extension tool registration follows consistent pattern in [src/extension.ts](src/extension.ts#L47-52) using `vscode.lm.registerTool<TParams>()`
- Agent installer in [src/agents/installer.ts](src/agents/installer.ts#L252-355) handles file installation and state tracking
- Existing YAML frontmatter parser in [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts#L41-75) can be extended for skills
- Fragmentation analysis reveals ~35% reusable content across agents suitable for extraction to workflow skill
- Token estimates show skills total ~19,500 tokens vs ~60,000 tokens in current agents due to deduplication

## Desired End State

After implementation:
- Users invoke `/paw-review` slash command with PR number
- Single PAW Review agent loads `paw-review-workflow` skill
- Workflow skill orchestrates 6 activity skills via subagent execution
- Complete review runs without pauses, producing all artifacts
- GitHub pending review created with line-specific comments
- Six PAW-R* agents removed, replaced by skills

### Verification:
- `paw_get_skills` returns catalog with all 7 review skills
- `paw_get_skill('paw-review-workflow')` returns complete workflow skill content
- End-to-end review on test PR produces ReviewComments.md and pending review

## What We're NOT Doing

- Workspace skills (`.github/skills/` discovery) - deferred to VS Code native support
- User-level skills (`~/.paw/skills/` discovery) - out of scope
- Custom skill override mechanisms
- Implementation workflow migration to skills (PAW-01A through PAW-05 unchanged)
- Cross-repo workflow skill content (structure prepared, detailed implementation deferred)
- Skill dependency resolution or versioning

## Implementation Approach

The implementation follows a layered strategy:
1. **Infrastructure first**: Create skill loader utilities and tool implementations
2. **Content migration**: Convert agent content to skill format
3. **Integration**: Wire tools into extension, update installer, create entry points
4. **Cleanup**: Remove old agents, update documentation

## Phase Summary

1. **Phase 1: Skill Infrastructure** - Implement `paw_get_skills` and `paw_get_skill` tools with skill loading utilities
2. **Phase 2: Activity Skills Creation** - Convert 6 PAW-R* agents to activity skill SKILL.md files
3. **Phase 3: Workflow Skill & Review Agent** - Create orchestrating workflow skill and single PAW Review agent
4. **Phase 4: Extension Integration** - Register tools, extend installer for prompt files, add entry point
5. **Phase 5: Cleanup & Validation** - Remove old agents, update documentation, end-to-end testing

---

## Phase 1: Skill Infrastructure

### Overview
Implement the foundational skill loading utilities and the two new language model tools (`paw_get_skills`, `paw_get_skill`) that enable dynamic skill discovery and retrieval.

### Changes Required:

#### 1. Skill Loader Utilities
**File**: `src/skills/skillLoader.ts` (new)
**Changes**:
- Implement `ensureSkillsDirectory(extensionUri)` following pattern in [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts#L27-38)
- Implement `parseSkillFrontmatter(content)` to extract `name`, `description`, `metadata`, `license`, `compatibility`, `allowed-tools` per Agent Skills specification
- Implement `loadSkillCatalog(extensionUri)` returning `SkillCatalogEntry[]` with name, description, type, source
- Implement `loadSkillContent(extensionUri, skillName)` returning full SKILL.md content or error

**Interfaces to define**:
```typescript
interface SkillCatalogEntry {
  name: string;
  description: string;
  type?: string;  // from metadata.type
  source: 'builtin';  // only builtin for this phase
}

interface SkillContent {
  name: string;
  content: string;
  error?: string;
}
```

**Tests**:
- Unit tests in `src/test/suite/skillLoader.test.ts`
- Test cases: valid skill parsing, missing required fields, malformed frontmatter, skill not found
- Mock file system for isolated testing

#### 2. paw_get_skills Tool
**File**: `src/tools/skillsTool.ts` (new)
**Changes**:
- Implement `registerSkillsTool(context, outputChannel)` following pattern in [src/tools/contextTool.ts](src/tools/contextTool.ts#L443-455)
- `prepareInvocation`: Return confirmation message with skill count
- `invoke`: Call `loadSkillCatalog()`, format as markdown list with name and description for each skill

**Tests**:
- Unit tests in `src/test/suite/skillsTool.test.ts`
- Test cases: returns all bundled skills, handles empty skills directory, error on read failure

#### 3. paw_get_skill Tool
**File**: `src/tools/skillTool.ts` (new)
**Changes**:
- Implement `registerSkillTool(context, outputChannel)` with `skill_name` parameter
- `prepareInvocation`: Confirm loading of specified skill
- `invoke`: Call `loadSkillContent()`, return full SKILL.md content or error message

**Tests**:
- Unit tests in `src/test/suite/skillTool.test.ts`
- Test cases: valid skill retrieval, skill not found error, handles large skill content

#### 4. Tool Schema Registration
**File**: `package.json`
**Changes**:
- Add `paw_get_skills` tool schema to `languageModelTools` array:
  - name: `paw_get_skills`
  - displayName: `Get PAW Skills Catalog`
  - modelDescription: "Retrieve a catalog of available PAW skills with metadata. Returns skill names, descriptions, and types for the agent to select appropriate skills."
  - inputSchema: empty object (no parameters)
- Add `paw_get_skill` tool schema:
  - name: `paw_get_skill`
  - displayName: `Get PAW Skill Content`
  - modelDescription: "Retrieve the full content of a specific PAW skill by name. Use after consulting the catalog to load skills needed for the current task."
  - inputSchema: `skill_name` (string, required)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Unit tests pass: `npm test`
- [ ] Linting passes (if configured)
- [ ] Extension activates without errors

#### Manual Verification:
- [ ] `paw_get_skills` returns formatted catalog when invoked by agent
- [ ] `paw_get_skill` returns skill content for valid skill name
- [ ] Error messages are clear for invalid skill names

---

## Phase 2: Activity Skills Creation

### Overview
Convert the content of 6 PAW-R* agents into SKILL.md files following the Agent Skills specification. Each activity skill encapsulates the artifact production logic from its source agent.

### Changes Required:

#### 1. Skills Directory Structure
**Directory**: `skills/` (new at repository root)
**Changes**:
- Create directory structure with subdirectory for each skill
- Each skill directory contains single `SKILL.md` file

#### 2. paw-review-understanding Skill
**File**: `skills/paw-review-understanding/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R1A Understanding.agent.md](agents/PAW-R1A%20Understanding.agent.md)
- YAML frontmatter: `name`, `description`, `metadata.type: activity`, `metadata.artifacts: ReviewContext.md, DerivedSpec.md`
- Body: Artifact templates, PR analysis instructions, DerivedSpec creation logic
- Remove orchestration content (handoffs, stage gates) - these move to workflow skill
- Include resumption detection logic (check for CodeResearch.md to know if creating DerivedSpec vs initial analysis)

**Tests**:
- Verify frontmatter parses correctly via unit test
- Verify skill loads via `paw_get_skill` in integration test

#### 3. paw-review-baseline Skill
**File**: `skills/paw-review-baseline/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R1B Baseline Researcher.agent.md](agents/PAW-R1B%20Baseline%20Researcher.agent.md)
- Frontmatter: `name`, `description`, `metadata.type: activity`, `metadata.artifacts: CodeResearch.md`
- Body: Base commit checkout, codebase analysis, evidence-based documentation patterns
- Include comprehensive research methodology from source agent

**Tests**:
- Verify frontmatter parses correctly
- Verify skill loads via `paw_get_skill`

#### 4. paw-review-impact Skill
**File**: `skills/paw-review-impact/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R2A Impact Analyzer.agent.md](agents/PAW-R2A%20Impact%20Analyzer.agent.md)
- Frontmatter: `name`, `description`, `metadata.type: activity`, `metadata.artifacts: ImpactAnalysis.md`
- Body: Ripple effect analysis, system integration assessment, callers/callees tracing

**Tests**:
- Verify frontmatter parses correctly
- Verify skill loads via `paw_get_skill`

#### 5. paw-review-gap Skill
**File**: `skills/paw-review-gap/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R2B Gap Analyzer.agent.md](agents/PAW-R2B%20Gap%20Analyzer.agent.md)
- Frontmatter: `name`, `description`, `metadata.type: activity`, `metadata.artifacts: GapAnalysis.md`
- Body: Must/Should/Could categorization framework (complete from source), gap detection heuristics, coverage analysis

**Tests**:
- Verify frontmatter parses correctly
- Verify skill loads via `paw_get_skill`

#### 6. paw-review-feedback Skill
**File**: `skills/paw-review-feedback/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R3A Feedback Generator.agent.md](agents/PAW-R3A%20Feedback%20Generator.agent.md)
- Frontmatter: `name`, `description`, `metadata.type: activity`, `metadata.artifacts: ReviewComments.md`
- Body: Comment generation, rationale structure template, GitHub MCP integration for pending review
- Include GitHub tool usage patterns: `mcp_github_pull_request_review_write`, `mcp_github_add_comment_to_pending_review`

**Tests**:
- Verify frontmatter parses correctly
- Verify skill loads via `paw_get_skill`

#### 7. paw-review-critic Skill
**File**: `skills/paw-review-critic/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R3B Feedback Critic.agent.md](agents/PAW-R3B%20Feedback%20Critic.agent.md)
- Frontmatter: `name`, `description`, `metadata.type: activity`, `metadata.artifacts: none (updates ReviewComments.md)`
- Body: Usefulness assessment framework, accuracy validation, trade-off analysis

**Tests**:
- Verify frontmatter parses correctly
- Verify skill loads via `paw_get_skill`

### Success Criteria:

#### Automated Verification:
- [ ] All 6 SKILL.md files exist with valid frontmatter: `npm test` (skill loader tests)
- [ ] `paw_get_skills` catalog includes all 6 activity skills with `type: activity`
- [ ] Each skill loads without parse errors via `paw_get_skill`
- [ ] Each skill is under 5000 tokens (check via `node scripts/count-tokens.js`)

#### Manual Verification:
- [ ] Skill content preserves essential logic from source agents
- [ ] Artifact templates match current agent templates
- [ ] No orchestration content in activity skills (handoffs, stage gates)

---

## Phase 3: Workflow Skill & Review Agent

### Overview
Create the orchestrating workflow skill and single PAW Review agent. The workflow skill encodes the review sequence and subagent invocation patterns. The agent dynamically loads skills rather than having hardcoded logic.

### Changes Required:

#### 1. paw-review-workflow Skill
**File**: `skills/paw-review-workflow/SKILL.md`
**Changes**:
- Frontmatter: `name: paw-review-workflow`, `description`, `metadata.type: workflow`, `metadata.activities: paw-review-understanding, paw-review-baseline, paw-review-impact, paw-review-gap, paw-review-feedback, paw-review-critic`
- Body structure:
  - **Core Review Principles**: Extracted common guardrails (evidence-based, file:line references, no fabrication)
  - **Workflow Sequence**: Detailed orchestration steps
  - **Subagent Contract**: Expected response format for activity completion
  - **Artifact Directory**: `.paw/reviews/<identifier>/` structure
  - **Error Handling**: Guidance for subagent failures
- Orchestration logic handling R1A pause-and-resume pattern:
  1. Run understanding activity → creates ReviewContext.md, research prompt
  2. Run baseline activity → creates CodeResearch.md
  3. Run understanding activity again (detects CodeResearch.md) → creates DerivedSpec.md
  4. Linear flow: impact → gap → feedback → critic
- Include human control point at end (pending review submission decision)

**Tests**:
- Verify frontmatter parses correctly with `type: workflow`
- Verify skill loads via `paw_get_skill`
- Verify orchestration sequence is documented in testable format

#### 2. PAW Review Agent
**File**: `agents/PAW Review.agent.md` (new)
**Changes**:
- Frontmatter: `name: PAW Review`, `description: Executes the PAW Review workflow using dynamically loaded skills`
- Body structure:
  - **Initialization**: Load workflow skill via `paw_get_skill('paw-review-workflow')`
  - **Context Detection**: Identify PR number/URL from user input or context
  - **Skill-Based Execution**: Follow workflow skill instructions
  - **Multi-Repo Detection**: Check for multiple working directories; if detected, note cross-repo scenario (detailed handling deferred)
  - **Completion**: Report final artifact locations, pending review status
- Reference `runSubagent` tool for activity execution
- Include `paw_get_skills` usage for discovering available activities

**Tests**:
- Agent file lints successfully: `./scripts/lint-agent.sh agents/PAW\ Review.agent.md`
- Frontmatter parses correctly

### Success Criteria:

#### Automated Verification:
- [ ] Workflow skill parses with `type: workflow` metadata
- [ ] Agent file lints: `./scripts/lint-agent.sh agents/PAW\ Review.agent.md`
- [ ] `paw_get_skills` catalog shows workflow skill with correct type
- [ ] TypeScript compiles after agent template addition

#### Manual Verification:
- [ ] Workflow skill clearly documents the R1A-R1B-R1A pattern
- [ ] Agent prompts skills lookup before executing workflow
- [ ] Subagent contract is clear and consistent across activities

---

## Phase 4: Extension Integration

### Overview
Wire the new tools into the extension, extend the installer to handle prompt files, and add the user entry point.

### Changes Required:

#### 1. Tool Registration
**File**: `src/extension.ts`
**Changes**:
- Import `registerSkillsTool` from `./tools/skillsTool`
- Import `registerSkillTool` from `./tools/skillTool`
- Add tool registration calls in `activate()` function following pattern at [src/extension.ts](src/extension.ts#L47-52):
  ```
  registerSkillsTool(context, outputChannel);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_get_skills');
  
  registerSkillTool(context, outputChannel);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_get_skill');
  ```

**Tests**:
- Integration test verifying tools are registered on activation
- Manual test invoking tools via GitHub Copilot

#### 2. Prompt File Support in Installer
**File**: `src/agents/installer.ts`
**Changes**:
- Add `loadPromptTemplates(extensionUri)` function parallel to `loadAgentTemplates`:
  - Load `.prompt.md` files from `prompts/` directory in extension
  - Parse frontmatter for `agent` field
  - Return array of `PromptTemplate` objects
- Modify `installAgents()` to also install prompt files:
  - Call `loadPromptTemplates(extensionUri)`
  - Write prompt files to same prompts directory as agents
  - Track in `filesInstalled` array for cleanup
- Update `needsInstallation()` to check for prompt file existence

**File**: `src/agents/promptTemplates.ts` (new)
**Changes**:
- Define `PromptTemplate` interface with `filename`, `mode`, `content` fields
- Implement `loadPromptTemplates(extensionUri)` following pattern in [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts#L119-166)

**Tests**:
- Unit tests for `loadPromptTemplates` in `src/test/suite/promptTemplates.test.ts`
- Integration test verifying prompt file installation

#### 3. Entry Point Prompt File
**File**: `prompts/paw-review.prompt.md` (new in extension source)
**Changes**:
- Create prompt file following VS Code prompt format:
  ```markdown
  ---
  agent: PAW Review
  ---
  
  Review the specified pull request.
  
  PR: $ARGUMENTS
  ```
- User invokes via `/paw-review PR-123` or `/paw-review https://github.com/...`

**Tests**:
- Verify prompt file installs to user's prompts directory
- Verify slash command appears in Copilot Chat

#### 4. Update paw_call_agent Tool
**File**: `package.json`
**Changes**:
- Add `PAW Review` to `target_agent` enum in `paw_call_agent` tool schema

**File**: `src/tools/handoffTool.ts`
**Changes**:
- Update any agent name validation to include `PAW Review`

**Tests**:
- Verify `paw_call_agent` accepts `PAW Review` as target

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] All unit tests pass: `npm test`
- [ ] Extension activates with new tools registered
- [ ] Prompt file present in compiled output

#### Manual Verification:
- [ ] `/paw-review` slash command appears in Copilot Chat
- [ ] Prompt file invokes PAW Review agent
- [ ] Tools respond correctly when invoked by agent

---

## Phase 5: Cleanup & Validation

### Overview
Remove old PAW-R* agent files, update documentation to reflect the skills-based architecture, and perform end-to-end validation.

### Changes Required:

#### 1. Remove Old Review Agents
**Files to delete**:
- `agents/PAW-R1A Understanding.agent.md`
- `agents/PAW-R1B Baseline Researcher.agent.md`
- `agents/PAW-R2A Impact Analyzer.agent.md`
- `agents/PAW-R2B Gap Analyzer.agent.md`
- `agents/PAW-R3A Feedback Generator.agent.md`
- `agents/PAW-R3B Feedback Critic.agent.md`

**File**: `agents/components/review-handoff-instructions.component.md`
**Changes**:
- Delete file (no longer needed - handoffs encoded in workflow skill)

**File**: `package.json`
**Changes**:
- Update `paw_call_agent` tool schema to remove PAW-R* agents from `target_agent` enum (keep only `PAW Review`)

**Tests**:
- Verify old agents no longer appear in catalog
- Verify agent templates load without errors after removal

#### 2. Documentation Updates
**File**: `docs/reference/agents.md`
**Changes**:
- Remove PAW-R* agent documentation
- Add PAW Review agent documentation with skills architecture explanation
- Document skill-based workflow

**File**: `docs/specification/review.md`
**Changes**:
- Update to describe skills-based architecture
- Document the 7 bundled skills
- Update workflow sequence to reference skills

**File**: `paw-review-specification.md`
**Changes**:
- Update to reflect skills migration
- Add skills architecture section
- Update "Human Workflow" to describe single entry point

**File**: `README.md`
**Changes**:
- Update review workflow section if applicable
- Add note about skills architecture

**Tests**:
- Documentation builds: `mkdocs build --strict`
- Links validate correctly

#### 3. End-to-End Validation
**Manual testing sequence**:
1. Build VSIX package: `./scripts/build-vsix.sh`
2. Install in fresh VS Code instance
3. Verify `/paw-review` command available
4. Execute review on test PR
5. Verify all artifacts created in `.paw/reviews/`
6. Verify GitHub pending review created with comments

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without old agent references: `npm run compile`
- [ ] All tests pass: `npm test`
- [ ] Documentation builds: `mkdocs build --strict`
- [ ] No lint errors after agent removal

#### Manual Verification:
- [ ] End-to-end review completes successfully on test PR
- [ ] All 6 artifacts created (ReviewContext.md, CodeResearch.md, DerivedSpec.md, ImpactAnalysis.md, GapAnalysis.md, ReviewComments.md)
- [ ] GitHub pending review contains expected comments
- [ ] Implementation workflow agents (PAW-01A through PAW-05) still function normally
- [ ] No references to old PAW-R* agents in UI or documentation

---

## Cross-Phase Testing Strategy

### Integration Tests:
- Extension activation with all tools registered
- Full skill catalog returned by `paw_get_skills`
- Individual skill retrieval via `paw_get_skill`
- Prompt file installation alongside agents

### Manual Testing Steps:
1. Fresh VS Code install with extension
2. Verify `/paw-review` available in Copilot Chat
3. Execute complete review workflow on real PR
4. Verify artifact creation in `.paw/reviews/`
5. Verify GitHub integration (pending review, line comments)
6. Test error handling (invalid PR, missing permissions)

## Performance Considerations

- Skill catalog should be cached during extension session to avoid repeated file reads
- Individual skills loaded on-demand (not all at once)
- Each skill targets <5000 tokens to fit in context
- Subagents execute sequentially (not parallel) to avoid context conflicts

## Migration Notes

- Existing `.paw/reviews/` directories remain compatible
- Users with old workflow can continue manual handoffs until they adopt new `/paw-review` command
- No data migration required - artifacts format unchanged

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/154
- Spec: `.paw/work/paw-review-skills/Spec.md`
- Research: `.paw/work/paw-review-skills/SpecResearch.md`, `.paw/work/paw-review-skills/CodeResearch.md`
- Agent Skills Specification: https://agentskills.io/specification
- Similar tool implementation: [src/tools/contextTool.ts](src/tools/contextTool.ts)
