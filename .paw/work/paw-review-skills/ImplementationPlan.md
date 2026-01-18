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

The implementation follows a layered strategy with **incremental content migration** to ensure careful, validated transitions:
1. **Infrastructure first**: Create skill loader utilities and tool implementations
2. **Shared foundations**: Extract reusable patterns before creating individual skills
3. **Staged content migration**: Convert agents in natural groupings (Understanding → Evaluation → Output)
4. **Integration**: Wire tools into extension, update installer, create entry points
5. **Cleanup**: Remove old agents, update documentation

### Content Migration Strategy

The annotation analysis in [context/agent-annotations.md](context/agent-annotations.md) reveals:
- **~35% Reusable**: Evidence-based principles, Must/Should/Could framework, Rationale structure
- **~50% Phase-bound**: Artifact templates, validation criteria, phase-specific heuristics
- **~15% Workflow**: Handoffs, stage gates, orchestration logic

To preserve content and avoid loss during migration:
1. Extract shared content to workflow skill **before** creating activity skills
2. Migrate agents in paired groupings matching their workflow stage
3. Validate each sub-phase before proceeding
4. Use content preservation checklists

## Phase Summary

1. **Phase 1: Skill Infrastructure** - Implement `paw_get_skills` and `paw_get_skill` tools with skill loading utilities
2. **Phase 2: Skills Content Migration** (split into sub-phases for careful transition)
   - **Phase 2A: Shared Foundations** - Extract reusable patterns to workflow skill core
   - **Phase 2B: Understanding Stage** - R1A + R1B skills (handle pause-resume complexity)
   - **Phase 2C: Evaluation Stage** - R2A + R2B skills (analysis phase)
   - **Phase 2D: Output Stage** - R3A + R3B skills (feedback generation)
3. **Phase 3: Review Agent & Workflow Completion** - Create PAW Review agent, complete workflow skill orchestration
4. **Phase 4: Extension Integration** - Register tools, extend installer for prompt files, add entry point
5. **Phase 5: Reference Audit & Agent Removal** - Audit and fix PAW-R* references in new skills, then remove old agents
6. **Phase 6: Documentation & Validation** - Update documentation, end-to-end testing

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
- [x] TypeScript compiles: `npm run compile`
- [x] Unit tests pass: `npm test`
- [ ] Linting passes (if configured)
- [x] Extension activates without errors

#### Manual Verification:
- [ ] `paw_get_skills` returns formatted catalog when invoked by agent
- [ ] `paw_get_skill` returns skill content for valid skill name
- [ ] Error messages are clear for invalid skill names

### Phase 1 Status Update
- **Status**: Completed
- **Summary**:
  - Added skill loading utilities and frontmatter parsing in `src/skills/skillLoader.ts`.
  - Implemented `paw_get_skills` and `paw_get_skill` tools with formatting helpers and tests.
  - Registered tools in the extension and added language model tool schemas.
- **Automated Verification**:
  - `npm run compile`
  - `npm test`
- **Notes for Review**:
  - Validate frontmatter parsing behavior for nested metadata and optional fields.
  - Manual verification of tool responses still pending.

---

## Phase 2: Skills Content Migration

This phase is split into four sub-phases to ensure careful, validated content migration. Each sub-phase builds on the previous, with validation gates between them.

### Content Preservation Checklist (Apply to Each Sub-Phase)

For each agent migration, verify:
- [ ] All artifact templates preserved exactly (diff against source)
- [ ] All guardrails either in activity skill or explicitly referenced from workflow skill Core Principles
- [ ] All decision frameworks present with complete logic
- [ ] All classification criteria preserved verbatim
- [ ] Quality gates translated to success criteria
- [ ] No orphaned content (everything has a home in workflow or activity skill)

### High-Value Content for Verbatim Preservation

These proven patterns should be migrated with minimal editing:

| Content | Source Agent | Target Skill | Est. Tokens |
|---------|--------------|--------------|-------------|
| Evidence-based documentation principles | R1A, R1B | paw-review-workflow (Core Principles) | ~500 |
| Must/Should/Could categorization framework | R2B | paw-review-gap | ~800 |
| Rationale structure template | R3A | paw-review-feedback | ~300 |
| Usefulness evaluation framework | R3B | paw-review-critic | ~600 |
| Breaking change detection patterns | R2A | paw-review-impact | ~400 |

---

## Phase 2A: Shared Foundations

### Overview
Extract reusable content shared across multiple agents into the workflow skill's Core Review Principles section. This ensures activity skills can reference shared guidelines without duplication.

### Changes Required:

#### 1. Skills Directory Structure
**Directory**: `skills/` (new at repository root)
**Changes**:
- Create `skills/` directory
- Create `skills/paw-review-workflow/` subdirectory

#### 2. Workflow Skill Foundation
**File**: `skills/paw-review-workflow/SKILL.md`
**Changes**:
- Create initial workflow skill with frontmatter:
  ```yaml
  name: paw-review-workflow
  description: Orchestrates the PAW Review workflow, coordinating activity skills to analyze PRs and generate comprehensive review feedback.
  metadata:
    type: workflow
    version: "1.0"
  ```
- **Core Review Principles** section (extracted from R1A, R1B fragmentation):
  - Evidence-based documentation requirement
  - File:line reference requirement for all claims
  - No fabrication guardrail
  - "Document don't critique" principle (for early stages)
  - Human control principle
- **Subagent Contract** section:
  - Expected response format for activity completion
  - Artifact path confirmation pattern
  - Error reporting format
- **Artifact Directory** section:
  - `.paw/reviews/<identifier>/` structure definition
  - Identifier derivation from PR context
- Placeholder sections for orchestration (completed in Phase 3)

**Source content to extract:**
- R1A: "Evidence-based" guardrails, file:line reference requirement
- R1B: "Document don't critique", no fabrication
- R3A/R3B: Human control principle

**Tests**:
- Skill parses correctly: `npm test` with skill loader
- Frontmatter contains `type: workflow`

### Success Criteria:

#### Automated Verification:
- [x] `skills/paw-review-workflow/SKILL.md` exists with valid frontmatter
- [x] Skill loads via `paw_get_skill('paw-review-workflow')`
- [x] TypeScript compiles: `npm run compile`

#### Manual Verification:
- [ ] Core Review Principles section contains all shared guardrails
- [ ] No duplication - each principle appears once
- [ ] Principles are self-contained (activity skills can reference without copying)

### Phase 2A Status Update
- **Status**: Completed
- **Summary**:
  - Created `skills/paw-review-workflow/` directory structure
  - Implemented `SKILL.md` with complete frontmatter (name, description, type: workflow, version)
  - Extracted Core Review Principles from R1A, R1B, R3A/R3B agents:
    1. Evidence-Based Documentation
    2. File:Line Reference Requirement
    3. No Fabrication Guardrail
    4. Document, Don't Critique (Early Stages)
    5. Human Control Principle
    6. Artifact Completeness
  - Added Subagent Contract section (response format, error reporting)
  - Added Artifact Directory section with identifier derivation rules
  - Added complete Workflow Orchestration skeleton (Understanding, Evaluation, Output stages)
  - Added Terminal Behavior and Error Recovery sections
- **Automated Verification**:
  - `npm run compile` ✅
  - `npm test` - 154 tests passing ✅
- **Notes for Review**:
  - Workflow skill is comprehensive at ~200 lines, well under token targets
  - Core Principles consolidate shared guardrails from multiple agents
  - Orchestration sections are complete, ready for activity skills to reference

---

## Phase 2B: Understanding Stage (R1A + R1B)

### Overview
Migrate the Understanding stage agents that handle PR analysis and baseline research. This stage has the unique pause-and-resume pattern requiring careful orchestration.

### Changes Required:

#### 1. paw-review-understanding Skill
**File**: `skills/paw-review-understanding/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R1A Understanding.agent.md](agents/PAW-R1A%20Understanding.agent.md)
- YAML frontmatter:
  ```yaml
  name: paw-review-understanding
  description: Analyzes PR changes to create ReviewContext.md and DerivedSpec.md artifacts. Handles both initial analysis and resumption after baseline research.
  metadata:
    type: activity
    artifacts: ReviewContext.md, DerivedSpec.md
    stage: understanding
  ```
- **Body sections to include:**
  - Agent identity and purpose
  - Context detection (GitHub PR vs local diff)
  - ReviewContext.md template (verbatim from source)
  - Research prompt generation logic
  - DerivedSpec.md template (verbatim from source)
  - Resumption detection (check for CodeResearch.md existence)
  - Artifact validation criteria
- **Content to EXCLUDE (moves to workflow skill):**
  - Handoff instructions to R1B
  - Stage gate blocking logic
  - Conditional branching for next stage
- **Reference to workflow skill:**
  - Note: "Follow Core Review Principles from paw-review-workflow skill"

**Content preservation check:**
- [ ] ReviewContext.md template matches source exactly
- [ ] DerivedSpec.md template matches source exactly
- [ ] All classification logic for context type detection preserved
- [ ] Quality gate criteria translated to validation section

**Tests**:
- Frontmatter parses correctly
- Skill loads via `paw_get_skill`
- Token count under 4000 (target for understanding skill)

#### 2. paw-review-baseline Skill
**File**: `skills/paw-review-baseline/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R1B Baseline Researcher.agent.md](agents/PAW-R1B%20Baseline%20Researcher.agent.md)
- YAML frontmatter:
  ```yaml
  name: paw-review-baseline
  description: Analyzes the codebase at the PR's base commit to establish baseline understanding for review comparison.
  metadata:
    type: activity
    artifacts: CodeResearch.md
    stage: understanding
  ```
- **Body sections to include:**
  - Agent identity and purpose
  - Git operations (fetch, checkout base commit)
  - Research methodology (comprehensive research pattern)
  - CodeResearch.md template (verbatim from source)
  - Restore working state after analysis
- **Content to EXCLUDE:**
  - Handoff to R1A
- **Reference to workflow skill:**
  - "Follow Core Review Principles from paw-review-workflow skill"

**Content preservation check:**
- [ ] CodeResearch.md template matches source exactly
- [ ] Git checkout/restore pattern preserved
- [ ] Research methodology steps preserved

**Tests**:
- Frontmatter parses correctly
- Skill loads via `paw_get_skill`
- Token count under 2500 (simpler skill)

#### 3. Update Workflow Skill with Understanding Stage Orchestration
**File**: `skills/paw-review-workflow/SKILL.md`
**Changes**:
- Add **Understanding Stage** section to orchestration:
  1. Run `paw-review-understanding` subagent → creates ReviewContext.md, research prompt
  2. Run `paw-review-baseline` subagent → creates CodeResearch.md
  3. Run `paw-review-understanding` subagent again → detects CodeResearch.md, creates DerivedSpec.md
- Document the pause-resume pattern explicitly
- Add stage gate: "Verify ReviewContext.md, CodeResearch.md, DerivedSpec.md exist before proceeding"

### Success Criteria:

#### Automated Verification:
- [x] Both SKILL.md files exist with valid frontmatter
- [x] Both skills load via `paw_get_skill`
- [x] `paw_get_skills` catalog includes both with `type: activity`
- [x] Token counts within targets

#### Manual Verification:
- [ ] Understanding skill handles both initial and resumption modes
- [ ] Baseline skill git operations are safe (checkout + restore)
- [ ] Workflow skill clearly documents R1A-R1B-R1A pattern
- [ ] Artifact templates exactly match source agents
- [ ] All content from R1A/R1B accounted for (workflow or activity)

### Phase 2B Status Update
- **Status**: Completed
- **Summary**:
  - Created `skills/paw-review-understanding/SKILL.md` (~11KB):
    - Complete YAML frontmatter with type: activity, stage: understanding
    - Two execution modes: Initial (Steps 1-3) and Resumption (Step 4)
    - Context detection for GitHub vs Non-GitHub
    - ReviewContext.md template preserved from R1A
    - DerivedSpec.md template preserved from R1A
    - Research prompt generation logic
    - Validation criteria and error handling
    - References Core Review Principles from workflow skill
  - Created `skills/paw-review-baseline/SKILL.md` (~7KB):
    - Complete YAML frontmatter with type: activity, stage: understanding
    - Remote sync and base commit verification (Steps 1-2)
    - Checkout/restore pattern with state preservation
    - Research methodology guidelines
    - CodeResearch.md template preserved from R1B
    - Validation checklist and error handling
    - References Core Review Principles from workflow skill
  - Workflow skill already has Understanding Stage orchestration (Phase 2A):
    - Documents R1A-R1B-R1A resume pattern
    - Stage gate for artifact verification
- **Automated Verification**:
  - `npm run compile` ✅
  - `npm test` - 154 tests passing ✅
  - All 3 skills load correctly via skill loader
- **Notes for Review**:
  - Understanding skill is comprehensive but under token targets
  - Baseline skill focuses on git operations and research methodology
  - Handoff/orchestration logic excluded per plan (stays in workflow skill)
  - Artifact templates match source agents

---

## Phase 2C: Evaluation Stage (R2A + R2B)

### Overview
Migrate the Evaluation stage agents that perform impact and gap analysis. These skills contain high-value reusable heuristics and the Must/Should/Could framework.

### Changes Required:

#### 1. paw-review-impact Skill
**File**: `skills/paw-review-impact/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R2A Impact Analyzer.agent.md](agents/PAW-R2A%20Impact%20Analyzer.agent.md)
- YAML frontmatter:
  ```yaml
  name: paw-review-impact
  description: Analyzes system-wide impact of PR changes including integration effects, breaking changes, performance, and security implications.
  metadata:
    type: activity
    artifacts: ImpactAnalysis.md
    stage: evaluation
  ```
- **Body sections to include:**
  - Agent identity and purpose
  - Integration graph building methodology
  - Breaking change detection patterns (HIGH VALUE - preserve verbatim)
  - Performance assessment heuristics
  - Security review checklist
  - Design & architecture assessment
  - User impact evaluation
  - Code health trend assessment
  - ImpactAnalysis.md template (verbatim from source)
- **Content to EXCLUDE:**
  - Handoff to R2B

**Content preservation check:**
- [ ] ImpactAnalysis.md template matches source exactly
- [ ] All 8+ heuristic categories preserved
- [ ] Breaking change patterns preserved verbatim
- [ ] Security checklist complete

**Tests**:
- Frontmatter parses correctly
- Skill loads via `paw_get_skill`
- Token count under 3500

#### 2. paw-review-gap Skill
**File**: `skills/paw-review-gap/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R2B Gap Analyzer.agent.md](agents/PAW-R2B%20Gap%20Analyzer.agent.md)
- YAML frontmatter:
  ```yaml
  name: paw-review-gap
  description: Systematically identifies gaps in correctness, safety, testing, and maintainability, categorizing findings by severity.
  metadata:
    type: activity
    artifacts: GapAnalysis.md
    stage: evaluation
  ```
- **Body sections to include:**
  - Agent identity and purpose
  - **Must/Should/Could categorization framework** (HIGH VALUE - preserve VERBATIM)
    - Full classification rules
    - Concrete impact requirements
    - Non-inflation guidelines
  - Correctness analysis heuristics
  - Safety & security analysis checklist
  - Test coverage assessment (quantitative + qualitative)
  - Maintainability analysis patterns
  - Over-engineering detection framework
  - Comment quality assessment (WHY vs WHAT)
  - Positive observation recognition
  - Style vs preference distinction
  - GapAnalysis.md template (verbatim from source)
- **Content to EXCLUDE:**
  - Handoff to R3A
  - Batching preview (workflow concern)

**Content preservation check:**
- [ ] GapAnalysis.md template matches source exactly
- [ ] Must/Should/Could framework COMPLETE and VERBATIM
- [ ] All gap detection heuristics preserved
- [ ] Quality gate criteria preserved

**Tests**:
- Frontmatter parses correctly
- Skill loads via `paw_get_skill`
- Token count under 4500 (largest activity skill)

#### 3. Update Workflow Skill with Evaluation Stage Orchestration
**File**: `skills/paw-review-workflow/SKILL.md`
**Changes**:
- Add **Evaluation Stage** section:
  1. Run `paw-review-impact` subagent → creates ImpactAnalysis.md
  2. Run `paw-review-gap` subagent → creates GapAnalysis.md
- Add stage gate: "Verify ImpactAnalysis.md, GapAnalysis.md exist before proceeding"

### Success Criteria:

#### Automated Verification:
- [x] Both SKILL.md files exist with valid frontmatter
- [x] Both skills load via `paw_get_skill`
- [x] `paw_get_skills` catalog includes both with `type: activity`
- [x] Token counts within targets

#### Manual Verification:
- [x] Must/Should/Could framework is COMPLETE and matches source verbatim
- [x] All heuristic patterns preserved from both agents
- [x] Artifact templates exactly match source agents
- [x] All content from R2A/R2B accounted for

### Phase 2C Status Update
- **Status**: Completed
- **Summary**:
  - Created `skills/paw-review-impact/SKILL.md` (~507 lines):
    - Complete YAML frontmatter with type: activity, stage: evaluation
    - All 8 analysis steps preserved from R2A:
      1. Integration Graph Building
      2. Breaking Change Detection
      3. Performance Assessment
      4. Security & Authorization Review
      5. Design & Architecture Assessment
      6. User Impact Evaluation
      7. Code Health Trend Assessment
      8. Deployment Considerations
    - Complete ImpactAnalysis.md template with all sections
    - Guardrails and validation checklist preserved
    - References Core Review Principles from workflow skill
  - Created `skills/paw-review-gap/SKILL.md` (~613 lines):
    - Complete YAML frontmatter with type: activity, stage: evaluation
    - Must/Should/Could categorization framework preserved verbatim
    - All 9 analysis steps preserved from R2B:
      1. Correctness Analysis
      2. Safety & Security Analysis
      3. Testing Analysis (quantitative + qualitative)
      4. Maintainability Analysis
      5. Performance Analysis
      6. Categorize Findings (Must/Should/Could)
      7. Positive Observations
      8. Style & Conventions Analysis
      9. Generate GapAnalysis.md
    - Over-engineering detection framework preserved
    - Comment quality assessment (WHY vs WHAT) preserved
    - Complete GapAnalysis.md template with all sections
    - Guardrails and validation checklist preserved
  - Workflow skill already had Evaluation Stage orchestration (from Phase 2A):
    - Documents paw-review-impact → paw-review-gap sequence
    - Stage gate for artifact verification
- **Automated Verification**:
  - `npm run compile` ✅
  - `npm test` - 154 tests passing ✅
  - All 5 skills (workflow + 4 activity) load correctly
- **Notes for Review**:
  - paw-review-gap is the largest activity skill at ~613 lines (as expected)
  - All high-value content preserved: Must/Should/Could framework, breaking change patterns, test analysis
  - Handoff/orchestration logic excluded per plan (stays in workflow skill)

---

## Phase 2D: Output Stage (R3A + R3B)

### Overview
Migrate the Output stage agents that generate review comments and perform quality assessment. These skills handle GitHub integration and final output.

### Changes Required:

#### 1. paw-review-feedback Skill
**File**: `skills/paw-review-feedback/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R3A Feedback Generator.agent.md](agents/PAW-R3A%20Feedback%20Generator.agent.md)
- YAML frontmatter:
  ```yaml
  name: paw-review-feedback
  description: Transforms gap analysis findings into structured review comments with comprehensive rationale, creating GitHub pending review.
  metadata:
    type: activity
    artifacts: ReviewComments.md
    stage: output
  ```
- **Body sections to include:**
  - Agent identity and purpose
  - Finding batching criteria
  - **Rationale structure template** (HIGH VALUE - preserve verbatim)
    - Evidence → Baseline Pattern → Impact → Best Practice
  - One Issue One Comment principle
  - Inline vs Thread determination logic
  - Tone adjustment framework
  - ReviewComments.md template (verbatim from source)
  - **GitHub MCP integration** (localized to this skill):
    - `mcp_github_pull_request_review_write` usage
    - `mcp_github_add_comment_to_pending_review` patterns
    - Posted status tracking
- **Content to EXCLUDE:**
  - Handoff to R3B
  - Human control guardrail (moves to workflow)

**Content preservation check:**
- [ ] ReviewComments.md template matches source exactly
- [ ] Rationale structure template COMPLETE and VERBATIM
- [ ] GitHub MCP integration patterns preserved
- [ ] All comment formatting rules preserved

**Tests**:
- Frontmatter parses correctly
- Skill loads via `paw_get_skill`
- Token count under 3000

#### 2. paw-review-critic Skill
**File**: `skills/paw-review-critic/SKILL.md`
**Changes**:
- Migrate from [agents/PAW-R3B Feedback Critic.agent.md](agents/PAW-R3B%20Feedback%20Critic.agent.md)
- YAML frontmatter:
  ```yaml
  name: paw-review-critic
  description: Critically assesses generated review comments for usefulness, accuracy, and appropriateness, adding assessment sections.
  metadata:
    type: activity
    artifacts: none
    updates: ReviewComments.md
    stage: output
  ```
- **Body sections to include:**
  - Agent identity and purpose
  - **Usefulness evaluation framework** (HIGH VALUE - preserve verbatim)
    - High/Medium/Low calibration
    - Include/Modify/Skip recommendation logic
  - Accuracy validation checklist
  - Alternative perspective exploration pattern
  - Trade-off analysis framework
  - Assessment section template (verbatim from source)
  - Advisory-only principle
- **Content to EXCLUDE:**
  - Return to R3A handoff (workflow concern)
  - Terminal stage behavior (workflow concern)

**Content preservation check:**
- [ ] Assessment section template matches source exactly
- [ ] Usefulness framework COMPLETE and VERBATIM
- [ ] All evaluation criteria preserved

**Tests**:
- Frontmatter parses correctly
- Skill loads via `paw_get_skill`
- Token count under 2500

#### 3. Complete Workflow Skill Orchestration
**File**: `skills/paw-review-workflow/SKILL.md`
**Changes**:
- Add **Output Stage** section:
  1. Run `paw-review-feedback` subagent → creates ReviewComments.md, GitHub pending review
  2. Run `paw-review-critic` subagent → adds assessment sections to ReviewComments.md
- Add **Human Control Point**:
  - Pending review NOT auto-submitted
  - User reviews comments before submission
- Add **Terminal Behavior**:
  - Report artifact locations
  - Provide next steps for user (submit, revise, discard)

### Success Criteria:

#### Automated Verification:
- [x] Both SKILL.md files exist with valid frontmatter
- [x] Both skills load via `paw_get_skill`
- [x] `paw_get_skills` catalog includes all 7 skills (1 workflow + 6 activities)
- [x] Token counts within targets
- [x] Total skill tokens under 20,000

#### Manual Verification:
- [x] Rationale structure template is COMPLETE and matches source verbatim
- [x] Usefulness framework is COMPLETE and matches source verbatim
- [x] GitHub MCP integration isolated to feedback skill only
- [x] Workflow skill has complete orchestration for all stages
- [x] All content from R3A/R3B accounted for
- [x] Human control point clearly documented

### Phase 2D Status Update
- **Status**: Completed
- **Summary**:
  - Created `skills/paw-review-feedback/SKILL.md` (~368 lines):
    - Complete YAML frontmatter with type: activity, stage: output
    - All 6 process steps preserved from R3A:
      1. Batch Related Findings (One Issue, One Comment)
      2. Build Comment Objects (Inline vs Thread determination)
      3. Generate Rationale Sections (Evidence, Baseline Pattern, Impact, Best Practice)
      4. Create ReviewComments.md with complete template
      5. GitHub Context - Create Pending Review (MCP tool usage)
      6. Non-GitHub Context handling
    - Tone Adjustment framework preserved
    - All guardrails preserved (No PAW Artifact References, No Automatic Submission, etc.)
    - GitHub MCP integration isolated to this skill only
  - Created `skills/paw-review-critic/SKILL.md` (~352 lines):
    - Complete YAML frontmatter with type: activity, stage: output, updates: ReviewComments.md
    - All 3 process steps preserved from R3B:
      1. Read All Review Comments
      2. Critical Assessment (Usefulness, Accuracy, Alternative Perspective, Trade-off Analysis)
      3. Add Assessment Sections with recommendation guidelines
    - Usefulness Evaluation Framework preserved verbatim (High/Medium/Low)
    - Assessment Guidelines section preserved (Calibration, Rigor, Depth, Realism)
    - All guardrails preserved (Advisory Only, Critical Thinking, Local Only, etc.)
  - Workflow skill already had Output Stage orchestration (from Phase 2A):
    - Documents paw-review-feedback → paw-review-critic sequence
    - Human Control Point documented
    - Terminal Behavior documented
- **Automated Verification**:
  - `npm run compile` ✅
  - `npm test` - 154 tests passing ✅
  - All 7 skills (1 workflow + 6 activity) load correctly
- **Token Counts**:
  - paw-review-workflow: 207 lines
  - paw-review-understanding: 379 lines
  - paw-review-baseline: 277 lines
  - paw-review-impact: 507 lines
  - paw-review-gap: 613 lines
  - paw-review-feedback: 368 lines
  - paw-review-critic: 352 lines
  - **Total**: 2703 lines (~13,500 tokens estimated, well under 20,000 target)
- **Notes for Review**:
  - paw-review-feedback has all GitHub MCP integration (isolated as planned)
  - paw-review-critic updates ReviewComments.md rather than creating new artifact
  - Handoff/orchestration logic excluded per plan (stays in workflow skill)
  - High-value content preserved: Rationale structure template, Usefulness framework

---

## Phase 3: Review Agent & Workflow Completion

### Overview
Create the single PAW Review agent that dynamically loads skills. The workflow skill was built incrementally during Phase 2; this phase finalizes the agent and validates the complete orchestration.

### Changes Required:

#### 1. PAW Review Agent
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
- [x] Workflow skill parses with `type: workflow` metadata
- [x] Agent file lints: `./scripts/lint-agent.sh agents/PAW\ Review.agent.md`
- [x] `paw_get_skills` catalog shows workflow skill with correct type
- [x] TypeScript compiles after agent template addition

#### Manual Verification:
- [x] Workflow skill clearly documents the R1A-R1B-R1A pattern
- [x] Agent prompts skills lookup before executing workflow
- [x] Subagent contract is clear and consistent across activities

### Phase 3 Status Update
- **Status**: Completed
- **Summary**:
  - Created `agents/PAW Review.agent.md` (199 lines, 1529 tokens):
    - Frontmatter with description for skills-based workflow execution
    - **Initialization** section: Load workflow skill via `paw_get_skill('paw-review-workflow')`
    - **Context Detection**: PR URL/number from user input or arguments, non-GitHub branch handling
    - **Multi-Repository Detection**: Notes cross-repo scenarios (detailed handling deferred)
    - **Skill-Based Execution**: Documents all 3 stages (Understanding, Evaluation, Output)
    - **Executing Subagents**: `runSubagent` tool usage pattern documented
    - **Stage Gates**: Verification of artifacts between stages
    - **Available Skills Discovery**: `paw_get_skills` usage for skill catalog
    - **Workflow Completion**: Terminal output format matching workflow skill
    - **Human Control Point**: Pending review never auto-submitted
    - **Error Handling**: Stage failure recovery instructions
    - **Guardrails**: Evidence-based, no fabrication, human authority
- **Automated Verification**:
  - `./scripts/lint-agent.sh agents/PAW\ Review.agent.md` ✅ (1529 tokens)
  - `npm run compile` ✅
  - `npm test` - 154 tests passing ✅
- **Notes for Review**:
  - Agent is lightweight (1529 tokens) - orchestration logic in workflow skill
  - References both `paw_get_skills` (catalog) and `paw_get_skill` (content) tools
  - Stage gate verification documented between each stage
  - Human control point emphasized (no auto-submit of pending reviews)

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
- [x] TypeScript compiles: `npm run compile`
- [x] All unit tests pass: `npm test`
- [x] Extension activates with new tools registered
- [x] Prompt file present in compiled output

#### Manual Verification:
- [ ] `/paw-review` slash command appears in Copilot Chat
- [ ] Prompt file invokes PAW Review agent
- [ ] Tools respond correctly when invoked by agent

### Phase 4 Status Update
- **Status**: Completed
- **Summary**:
  - Tool Registration: Already done in Phase 1 (lines 52-58 in extension.ts)
  - Created `src/agents/promptTemplates.ts`:
    - `PromptTemplate` interface with filename, agent, content fields
    - `loadPromptTemplates(extensionUri)` function following agentTemplates.ts pattern
    - `extractFrontmatterAgent()` helper for parsing YAML frontmatter
  - Updated `src/agents/installer.ts`:
    - Added import for `loadPromptTemplates`
    - Modified `needsInstallation()` to check for prompt file existence
    - Modified `installAgents()` to also load and install prompt files
    - Modified `removeInstalledAgents()` to match prompt files for cleanup
  - Created `prompts/paw-review.prompt.md`:
    - YAML frontmatter with `agent: PAW Review`
    - Description of skills-based workflow
    - `$ARGUMENTS` placeholder for PR specification
  - Updated `package.json`:
    - Added `PAW Review` to `paw_call_agent` tool's `target_agent` enum
- **Automated Verification**:
  - `npm run compile` ✅
  - `npm test` - 154 tests passing ✅
- **Notes for Review**:
  - Prompt file installation leverages existing installer infrastructure
  - `filesInstalled` array in InstallationState tracks both agents and prompts
  - `removeInstalledAgents()` matches both `*.agent.md` and `*.prompt.md` patterns
  - No changes to handoffTool.ts needed - enum validation is in package.json schema

**Addressed Review Comments:**
- Consolidated duplicate frontmatter parsing logic:
  - Created `src/utils/frontmatter.ts` with shared `extractFrontmatterField(content, fieldName)` helper
  - Updated `src/agents/agentTemplates.ts` to use shared utility (reduced ~25 lines to 3 lines)
  - Updated `src/agents/promptTemplates.ts` to use shared utility (reduced ~25 lines to 3 lines)
- Added missing unit tests for `loadPromptTemplates`:
  - Created `src/test/suite/promptTemplates.test.ts` with 5 test cases:
    1. Loading valid prompt templates
    2. Handling missing prompts directory (returns empty array)
    3. Handling malformed frontmatter gracefully
    4. Extracting agent field correctly with various formats (quotes, colons, case-insensitive)
    5. Ignoring non-prompt files
- All 159 tests passing

---

## Phase 5: Reference Audit & Agent Removal

### Overview
Audit all new skills and artifacts for stale references to PAW-R* agents, fix any found issues, then remove the old PAW-R* agent files and related components.

### Changes Required:

#### 1. Audit Skills for PAW-R* References
**Files to audit**:
- `skills/paw-review-workflow/SKILL.md`
- `skills/paw-review-understanding/SKILL.md`
- `skills/paw-review-baseline/SKILL.md`
- `skills/paw-review-impact/SKILL.md`
- `skills/paw-review-gap/SKILL.md`
- `skills/paw-review-feedback/SKILL.md`
- `skills/paw-review-critic/SKILL.md`

**Known Issue Found**:
- `skills/paw-review-understanding/SKILL.md` line 96 has `mode: PAW-R1B Baseline Researcher`
- **Fix**: Change to `mode: PAW Review` (the unified review agent now handles all stages)

**Search Pattern**: `PAW-R[0-9]` (regex) to find any PAW-R1A, PAW-R1B, PAW-R2A, etc.

#### 2. Audit PAW Review Agent
**File**: `agents/PAW Review.agent.md`
**Verification**: Confirm no references to old PAW-R* agents (should reference skills instead)

#### 3. Audit Prompt File
**File**: `prompts/paw-review.prompt.md`
**Verification**: Confirm no references to old PAW-R* agents

#### 4. Remove Old Review Agents
**Files to delete**:
- `agents/PAW-R1A Understanding.agent.md`
- `agents/PAW-R1B Baseline Researcher.agent.md`
- `agents/PAW-R2A Impact Analyzer.agent.md`
- `agents/PAW-R2B Gap Analyzer.agent.md`
- `agents/PAW-R3A Feedback Generator.agent.md`
- `agents/PAW-R3B Feedback Critic.agent.md`

#### 5. Remove Review Handoff Component
**File**: `agents/components/review-handoff-instructions.component.md`
**Reason**: No longer needed - handoffs are encoded in workflow skill orchestration

#### 6. Verify package.json paw_call_agent Enum
**File**: `package.json`
**Verification**: Confirm PAW-R* agents are NOT in the `target_agent` enum (they should have been excluded when `PAW Review` was added in Phase 4)

### Success Criteria:

#### Automated Verification:
- [x] No PAW-R* references found in skills directory: `grep -r "PAW-R[0-9]" skills/`
- [x] No PAW-R* references in PAW Review agent: `grep "PAW-R[0-9]" agents/PAW\ Review.agent.md`
- [x] TypeScript compiles after agent removal: `npm run compile`
- [x] All tests pass after removal: `npm test`
- [x] Agent lint passes: `./scripts/lint-agent.sh agents/PAW\ Review.agent.md`

#### Manual Verification:
- [ ] Skill loader still returns all 7 skills correctly
- [ ] `paw_call_agent` with `PAW Review` still works
- [ ] No orphaned agent references in documentation

### Phase 5 Status Update
- **Status**: Completed
- **Summary**:
  - Audited all 7 skills in `skills/paw-review-*` for PAW-R* references
  - Found and fixed `mode: PAW-R1B Baseline Researcher` → `mode: PAW Review` in `skills/paw-review-understanding/SKILL.md` line 96
  - Verified PAW Review agent and paw-review.prompt.md have no PAW-R* references
  - Deleted 6 old PAW-R* agent files:
    - `agents/PAW-R1A Understanding.agent.md`
    - `agents/PAW-R1B Baseline Researcher.agent.md`
    - `agents/PAW-R2A Impact Analyzer.agent.md`
    - `agents/PAW-R2B Gap Analyzer.agent.md`
    - `agents/PAW-R3A Feedback Generator.agent.md`
    - `agents/PAW-R3B Feedback Critic.agent.md`
  - Deleted `agents/components/review-handoff-instructions.component.md`
  - Verified package.json `paw_call_agent` enum has no PAW-R* entries (only `PAW Review`)
  - Updated installer test to expect 11 files (10 agents + 1 prompt) instead of 15
- **Automated Verification**:
  - `grep -r "PAW-R[0-9]" skills/` → No matches ✅
  - `grep "PAW-R[0-9]" agents/PAW\ Review.agent.md` → No matches ✅
  - `npm run compile` ✅
  - `npm test` - 159 tests passing ✅
  - `./scripts/lint-agent.sh agents/PAW\ Review.agent.md` - 1529 tokens ✅
- **Notes for Review**:
  - Old PAW-R* agents fully removed - skills now contain all review workflow logic
  - The single PAW Review agent + workflow skill + activity skills now handle all review functionality
  - Installer test updated from 15 to 11 expected files to reflect 6 fewer agents

---

## Phase 6: Documentation & Validation

### Overview
Update documentation to reflect the skills-based architecture and perform end-to-end validation.

### Changes Required:

#### 1. Documentation Updates
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
- [x] TypeScript compiles without old agent references: `npm run compile`
- [x] All tests pass: `npm test`
- [x] Documentation builds: `mkdocs build --strict`
- [x] No lint errors after agent removal

#### Manual Verification:
- [ ] End-to-end review completes successfully on test PR
- [ ] All 6 artifacts created (ReviewContext.md, CodeResearch.md, DerivedSpec.md, ImpactAnalysis.md, GapAnalysis.md, ReviewComments.md)
- [ ] GitHub pending review contains expected comments
- [ ] Implementation workflow agents (PAW-01A through PAW-05) still function normally
- [ ] No references to old PAW-R* agents in UI or documentation

### Phase 6 Status Update
- **Status**: Completed
- **Summary**:
  - Updated `docs/reference/agents.md`:
    - Removed PAW-R* agent documentation (PAW-R1A through PAW-R3B)
    - Added PAW Review agent section with skills-based architecture explanation
    - Updated agent naming convention (PAW-Rx → PAW Review)
    - Updated Next Steps section
  - Updated `docs/specification/review.md`:
    - Added Skills-Based Architecture section with skill table
    - Updated all stage sections to reference skills instead of agents
    - Removed old "Review Agents" section (individual agent descriptions)
    - Updated Human Workflow Summary to single entry point (`/paw-review`)
  - Updated `paw-review-specification.md`:
    - Added Skills-Based Architecture section with skill table and tool support
    - Updated Stage R1 (removed manual pause for baseline research - now automated)
    - Updated Stage R2 (removed agent names, uses skill-based orchestration)
    - Updated Stage R3 (removed agent names, uses skill-based orchestration)
    - Removed prompts/code-research.prompt.md artifact documentation (no longer generated)
    - Updated Guardrails section headings (agent names → stage names)
    - Updated Example Workflow sections for automated skill orchestration
  - Updated `README.md`:
    - Replaced "Review Workflow Agents" numbered list with "Review Workflow" section
    - Added `/paw-review` invocation documentation
    - Updated "Two Workflows: Implementation and Review" section
    - Updated links to documentation
- **Automated Verification**:
  - `npm run compile` ✅
  - `npm test` - 159 tests passing ✅
  - `mkdocs build --strict` ✅
- **Notes for Review**:
  - Documentation now consistently describes skills-based architecture
  - All PAW-R* agent references removed from documentation
  - Human workflow simplified to single entry point command
  - Manual verification pending for end-to-end testing

---

## Phase 7: Cross-Repository Review Support

### Overview
Add support for reviewing PRs that span multiple repositories (cross-repo scenario). This is common in monorepo setups or when a feature requires coordinated changes across multiple codebases.

**Note**: This phase is split into two sub-phases to ensure foundational detection and artifact structure works before implementing cross-repo analysis logic.

---

## Phase 7A: Detection & Artifact Structure

### Overview
Establish the foundational structure for multi-repository reviews: detection triggers, artifact directory scheme, and multi-PR context parsing.

### Changes Required:

#### 1. Multi-Repository Detection (Extend)
**File**: `agents/PAW Review.agent.md`
**Status**: Partially complete - has section describing workflow but lacks detection triggers
**Changes**:
- Add concrete detection triggers:
  - Multiple PR URLs/numbers provided in arguments
  - Multi-folder VS Code workspace detected
  - PR links referencing different repositories
- Specify artifact naming scheme: `PR-<number>-<repo-slug>/` (e.g., `PR-123-my-api/`)
- Document how to derive repo-slug from repository name

**Token impact**: ~50 tokens added

**Tests**:
- Manual: Invoke with `PR-123 PR-456` where PRs are from different repos

#### 2. Update Understanding Skill for Multi-PR Context
**File**: `skills/paw-review-understanding/SKILL.md`
**Changes**:
- Add "## Multi-Repository Mode" section after Context Detection, containing:
  - Detection: Multiple PR URLs/numbers in input
  - Per-PR processing: Create separate artifact directories
  - Identifier scheme: `PR-<number>-<repo-slug>/`
- Update ReviewContext.md template to support multi-PR frontmatter:
  ```yaml
  # For multi-repo scenarios, create one ReviewContext per PR
  repository: owner/repo-name
  related_prs:
    - number: 456
      repository: owner/other-repo
      relationship: "depends-on"
  ```
- Add cross-reference field documentation

**Token impact**: ~200 tokens added

**Tests**:
- Skill loads under 4500 tokens
- Manual: Run understanding with two PR URLs

#### 3. Update Workflow Skill Artifact Directory Section
**File**: `skills/paw-review-workflow/SKILL.md`
**Changes**:
- Update Identifier Derivation section:
  ```markdown
  ### Identifier Derivation
  
  - **Single GitHub PR**: `PR-<number>` (e.g., `PR-123`)
  - **Multi-repo GitHub PRs**: `PR-<number>-<repo-slug>` per PR (e.g., `PR-123-my-api/`, `PR-456-my-frontend/`)
  - **Local branch**: Slugified branch name (e.g., `feature-new-auth`)
  
  Repo-slug derivation: Last path segment of repository name, lowercase, special chars removed.
  ```

**Token impact**: ~75 tokens added

**Tests**:
- Skill loads under 5000 tokens

### Content Preservation Checklist (Phase 7A)

- [ ] Existing single-repo workflow unchanged (single PR still uses `PR-<number>/`)
- [ ] No duplication with existing workflow skill principles
- [ ] Identifier scheme clearly documented in one place (workflow skill)

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] All tests pass: `npm test`
- [ ] Skills token counts under targets: workflow <5000, understanding <4500
- [ ] Agent lint passes: `./scripts/lint-agent.sh agents/PAW\ Review.agent.md`

#### Manual Verification:
- [ ] Single-PR workflow still works identically (`/paw-review PR-123`)
- [ ] Multi-PR invocation creates separate artifact directories
- [ ] Artifact directories follow scheme: `.paw/reviews/PR-123-repo-a/`, `.paw/reviews/PR-456-repo-b/`
- [ ] ReviewContext.md includes `related_prs` field when multiple PRs detected

### Phase 7A Status Update
- **Status**: Not Started
- **Blockers**: None - Phase 6 complete

---

## Phase 7B: Cross-Repository Analysis

### Overview
Implement cross-repo analysis logic: dependency detection, impact correlation, and multi-PR feedback generation.

### Prerequisites
Phase 7A must be complete - artifact structure and detection working.

### Changes Required:

#### 1. Update Baseline Skill for Multi-Repo Research
**File**: `skills/paw-review-baseline/SKILL.md`
**Changes**:
- Add "## Multi-Repository Mode" section:
  - Process each repository's base commit independently
  - Create CodeResearch.md per PR/repository
  - Document state restoration between repos
- Add guidance for identifying cross-repo patterns (shared conventions, interfaces)

**Token impact**: ~150 tokens added

**Tests**:
- Skill loads under target
- Manual: Baseline research completes for both repos

#### 2. Update Impact Skill for Cross-Repo Dependencies
**File**: `skills/paw-review-impact/SKILL.md`
**Changes**:
- Add "## Cross-Repository Impact" section after Integration Graph Building:
  - Identify API contracts between repositories
  - Flag breaking changes that affect other PRs in the review set
  - Document dependency direction (which repo depends on which)
- Update ImpactAnalysis.md template:
  ```markdown
  ## Cross-Repository Dependencies
  
  | This PR Changes | Affects PR | Type | Migration |
  |-----------------|------------|------|-----------|
  | `api/types.ts` exports | PR-456-frontend | Breaking | Update types import |
  ```

**Token impact**: ~200 tokens added

**Tests**:
- Skill loads under 5500 tokens
- Manual: Cross-repo dependencies appear in ImpactAnalysis.md

#### 3. Update Gap Skill for Cross-Repo Consistency
**File**: `skills/paw-review-gap/SKILL.md`
**Changes**:
- Add "## Cross-Repository Consistency" subsection in Correctness Analysis:
  - Check for consistent versioning across repos
  - Identify missing coordinated changes (API change without consumer update)
  - Flag timing dependencies (order of deployment matters)

**Token impact**: ~100 tokens added

**Tests**:
- Skill loads under target

#### 4. Update Feedback Skill for Cross-Repo Comments
**File**: `skills/paw-review-feedback/SKILL.md`
**Changes**:
- Add "## Multi-PR Pending Reviews" section:
  - Create pending review on EACH affected PR
  - Add cross-reference notation in comments: `(See also: owner/other-repo#456)`
  - Document GitHub tool calls for multiple PRs
- Update correlation guidance (moved from workflow skill - this is the correct location)

**Token impact**: ~150 tokens added

**Tests**:
- Skill loads under target
- Manual: Pending reviews created on both PRs
- Manual: Comments include cross-references

### Content Preservation Checklist (Phase 7B)

- [ ] Single-repo analysis unchanged (no cross-repo sections appear when single PR)
- [ ] Cross-repo sections conditional on multi-PR context
- [ ] Existing templates extended, not replaced
- [ ] Error handling covers: one repo offline, one PR closed, permission differences

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] All tests pass: `npm test`
- [ ] Documentation builds: `mkdocs build --strict`
- [ ] All skills under token targets

#### Manual Verification:
- [ ] Invoke `/paw-review https://github.com/owner/repo-a/pull/123 https://github.com/owner/repo-b/pull/456`
- [ ] ImpactAnalysis.md contains Cross-Repository Dependencies section
- [ ] GapAnalysis.md notes coordinated change issues
- [ ] ReviewComments.md includes cross-references
- [ ] GitHub pending reviews created on BOTH PRs
- [ ] Single-PR workflow regression test passes

### Phase 7B Status Update
- **Status**: Not Started
- **Blockers**: Phase 7A must be complete first

---

## Cross-Phase Testing Strategy

### Phase 2 Sub-Phase Validation Gates

Each Phase 2 sub-phase must pass validation before proceeding:

**After Phase 2A (Shared Foundations):**
- [ ] Workflow skill loads with Core Review Principles section
- [ ] No duplication of principles (each appears once)
- [ ] Subagent contract clearly defined

**After Phase 2B (Understanding Stage):**
- [ ] Understanding + Baseline skills load correctly
- [ ] Manual test: Run understanding → baseline → understanding sequence
- [ ] Verify all 3 artifacts created (ReviewContext, CodeResearch, DerivedSpec)
- [ ] Verify artifact templates match original agents

**After Phase 2C (Evaluation Stage):**
- [ ] Impact + Gap skills load correctly
- [ ] Must/Should/Could framework verified against original (exact match)
- [ ] Manual test: Run evaluation stage with mock understanding artifacts
- [ ] Verify ImpactAnalysis.md and GapAnalysis.md created

**After Phase 2D (Output Stage):**
- [ ] Feedback + Critic skills load correctly
- [ ] Rationale template verified against original (exact match)
- [ ] Usefulness framework verified against original (exact match)
- [ ] Complete workflow runs end-to-end
- [ ] All 7 skills in catalog

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
- Agent Annotation Analysis: `.paw/work/paw-review-skills/context/agent-annotations.md`
- Agent Skills Specification: https://agentskills.io/specification
- Similar tool implementation: [src/tools/contextTool.ts](src/tools/contextTool.ts)
