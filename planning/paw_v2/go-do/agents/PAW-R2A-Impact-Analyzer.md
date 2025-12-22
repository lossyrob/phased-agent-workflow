# PAW-R2A Impact Analyzer Agent Analysis

## Category
**Core Workflow** (within Review Workflow)

This agent is an essential stage in the PAW Review pipeline, positioned between Phase 1 (Understanding) and Phase 2B (Gap Analysis). It drives stage-to-stage transitions and produces a mandatory artifact (`ImpactAnalysis.md`) that downstream stages depend on.

## Current Responsibilities

1. **Integration Graph Building** - Map downstream consumers of changed code with file:line references
2. **Breaking Change Detection** - Compare before/after for API signature, config schema, data model, and export changes
3. **Performance Assessment** - Evaluate algorithmic complexity, database queries, hot path modifications, resource usage
4. **Security & Authorization Review** - Assess auth changes, input validation, data exposure, cryptography
5. **Design & Architecture Assessment** - Evaluate architectural fit, timing, system integration
6. **User Impact Evaluation** - Assess both end-user and developer-user impact
7. **Code Health Trend Assessment** - Determine if changes improve or degrade system health
8. **Deployment Considerations** - Document migrations, config changes, dependencies, rollout strategy
9. **Generate ImpactAnalysis.md** - Comprehensive artifact with all findings

## Artifacts Produced

- **`ImpactAnalysis.md`** - Primary output containing:
  - Summary with risk level
  - Baseline state (from CodeResearch.md)
  - Integration points table
  - Breaking changes table with migration needs
  - Performance implications
  - Security & authorization assessment
  - Design & architecture assessment
  - User impact evaluation
  - Deployment considerations
  - Risk assessment with code health trend and mitigation

## Dependencies

- **Inputs from**:
  - `ReviewContext.md` (PR metadata and parameters) - from PAW-R1A
  - `CodeResearch.md` (baseline codebase understanding) - from PAW-R1B
  - `DerivedSpec.md` (what the PR is trying to achieve) - from PAW-R1A
  - Git diff access (base vs head comparison)

- **Outputs to**:
  - PAW-R2B Gap Analyzer (consumes ImpactAnalysis.md for gap analysis)
  - PAW-R3A Feedback Generator (uses impact findings for feedback)

- **Tools used**:
  - File system operations (read artifacts, write ImpactAnalysis.md)
  - Code search/grep (find imports, usage sites, symbol references)
  - Git operations (diff analysis, compare base/head)
  - Semantic code understanding (parse function signatures, detect patterns)

## Subagent Invocations

- **Does NOT delegate to other agents** - This is a leaf node in execution
- Receives handoff FROM: PAW-R1B Baseline Researcher (or PAW-R1A in some flows)
- Hands off TO: PAW-R2B Gap Analyzer

## V2 Mapping Recommendation

### Suggested v2 home
**Workflow Skill** (Review Workflow Stage 2A)

This agent represents a critical stage in the review workflow. Its responsibilities are tightly coupled to the review pipeline's progression. However, several internal capabilities could be extracted.

### Subagent candidate
**No** - This is a core workflow stage, not a supporting capability. It should remain a top-level stage in the review workflow.

### Skills to extract

1. **Integration Graph Builder** (Capability Skill)
   - Standalone skill that maps dependencies and consumers of changed code
   - Reusable for: refactoring analysis, deprecation planning, change impact estimation
   - Input: list of changed files/symbols
   - Output: integration graph with file:line references

2. **Breaking Change Detector** (Capability Skill)
   - Compares API signatures, schemas, exports between two versions
   - Reusable for: version bump analysis, migration planning, API review
   - Input: before/after code state
   - Output: breaking changes list with migration needs

3. **Security Change Analyzer** (Capability Skill)
   - Focused security review of code changes
   - Reusable for: security audits, auth change reviews, compliance checks
   - Input: code diff
   - Output: security risk assessment

4. **Performance Impact Assessor** (Capability Skill)
   - Evaluates algorithmic and resource implications
   - Reusable for: performance review, optimization planning
   - Input: code changes, hot path info
   - Output: performance risk assessment

5. **Deployment Planning Analyzer** (Capability Skill)
   - Documents migration, config, and rollout needs
   - Reusable for: release planning, change management
   - Input: code changes, current deployment state
   - Output: deployment checklist

## Lessons Learned

### 1. Heavy Agents with Multiple Extractable Skills
This agent is a "heavy" stage agent with 8-9 distinct analysis steps. In v2, consider:
- Keeping the workflow stage thin (orchestration only)
- Having it invoke specialized capability skills for each analysis type
- This enables reuse of individual capabilities outside the review workflow

### 2. Heuristics Are Well-Documented
Each analysis step includes explicit heuristics (e.g., "flag nested loops with depth ≥2", "search for raw SQL"). These heuristics should:
- Be preserved in the extracted capability skills
- Serve as the "judgment logic" that makes agents valuable over pure tools
- Be versioned and refinable over time

### 3. Evidence-First Pattern
The guardrails require file:line references for all findings. This pattern:
- Ensures traceability
- Prevents hallucination
- Should be enforced in v2 through skill contracts or output schemas

### 4. Baseline-Informed Analysis
This agent doesn't just analyze the PR in isolation—it compares against baseline (CodeResearch.md). This pattern:
- Is essential for accurate impact assessment
- Requires artifact dependencies to be well-defined
- Suggests v2 skills need clear input contracts specifying required context

### 5. Multi-Dimensional Risk Assessment
Risk is assessed across multiple axes (performance, security, deployment, code health). In v2:
- Consider a "Risk Aggregator" skill that combines assessments
- Each dimension could be a separate capability skill
- Final risk judgment is a synthesis step

### 6. Workflow Navigation Pattern
The hand-off section shows explicit workflow navigation (`gaps`, `status`, `continue`). In v2:
- This navigation logic could be in the workflow orchestrator
- Individual skills shouldn't need to know about workflow progression
- Suggests clean separation between skill execution and workflow control

### 7. Strict Prerequisite Checking
The agent blocks if Phase 1 artifacts are missing. This:
- Ensures ordered execution
- Prevents incomplete analysis
- Should be enforced at the workflow level in v2, not within individual skills

### 8. Design/Architecture Assessment is High-Value
The new sections (Design & Architecture, User Impact, Code Health Trend) add significant value beyond mechanical analysis. These require:
- Holistic system understanding
- Judgment about "fit" and "timing"
- May be harder to extract as pure capability skills—they need broader context
