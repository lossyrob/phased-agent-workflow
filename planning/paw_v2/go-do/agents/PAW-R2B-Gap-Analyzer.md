# PAW-R2B Gap Analyzer Agent Analysis

## Category
**Core Workflow**

This agent is an essential stage in the Review workflow pipeline. It sits between PAW-R2A Impact Analyzer and PAW-R3A Feedback Generator, transforming impact analysis into categorized, evidence-based findings that feed directly into review comment generation.

## Current Responsibilities
- Correctness analysis: Logic errors, edge cases, error handling gaps, state transition issues
- Safety & security analysis: Input validation, authorization, data exposure, injection risks
- Testing analysis: Quantitative coverage (if reports available) + qualitative depth/breadth/effectiveness
- Maintainability analysis: Code duplication, pattern adherence, naming clarity, documentation
- Performance analysis: Algorithmic inefficiency, resource usage issues
- Comment quality assessment: WHY vs WHAT, necessity, anti-patterns
- Over-engineering detection: Solving future vs current problems, unnecessary abstractions
- Style & conventions check: Style guide compliance with "Nit:" labeling for preferences
- Positive observations: Commend good practices for mentoring value
- Finding categorization: Must/Should/Could with evidence and rationale
- Related findings identification: Grouping for efficient batching in Phase 3

## Artifacts Produced
- **GapAnalysis.md** - Comprehensive gap analysis document containing:
  - Summary with counts of Must/Should/Could findings
  - Positive observations section
  - Must Address findings (correctness/safety/security)
  - Should Address findings (quality/completeness)
  - Could Consider findings (optional improvements)
  - Test Coverage Assessment (quantitative + qualitative)
  - Scope Assessment

## Dependencies
- **Inputs from**:
  - Phase 1 artifacts: `ReviewContext.md`, `CodeResearch.md`, `DerivedSpec.md`
  - Phase 2A artifact: `ImpactAnalysis.md`
  - Repository codebase (base and head commits)
  - Coverage reports (optional): `coverage/summary.json`, `lcov.info`, `coverage.xml`
  
- **Outputs to**:
  - PAW-R3A Feedback Generator (consumes GapAnalysis.md to generate ReviewComments.md)
  
- **Tools used**:
  - File system operations (read artifacts, write GapAnalysis.md)
  - Code analysis (grep, semantic search for finding issues)
  - Coverage report parsing (JSON, LCOV, XML formats)
  - Handoff tool (via paw_call_agent to PAW-R3A)

## Subagent Invocations
- **None** - This agent does not delegate to other agents
- It is purely a processing stage that consumes artifacts and produces its own artifact
- Hands off TO: PAW-R3A Feedback Generator (not invocation, but stage transition)

## V2 Mapping Recommendation
- **Suggested v2 home**: **Workflow Skill** - This is a core pipeline stage with strict input/output contracts
- **Subagent candidate**: **No** - Too central to the review workflow to be optional
- **Skills to extract**:
  1. **Correctness Analyzer** - Logic error detection, edge case identification
  2. **Security Scanner** - Input validation, authorization, injection risk detection
  3. **Test Coverage Analyzer** - Coverage report parsing + qualitative assessment
  4. **Code Quality Scorer** - Maintainability metrics, pattern adherence
  5. **Over-engineering Detector** - Identifies unnecessary abstractions
  6. **Finding Categorizer** - Must/Should/Could classification with evidence validation

### V2 Architecture Notes
The agent's procedural structure (9 numbered steps) maps well to a skill-based approach:
1. Steps 1-5 (analysis passes) → Parallel analysis skills
2. Step 6 (categorization) → Finding Categorizer skill
3. Step 7 (positive observations) → Could be inline in each analysis skill
4. Step 8 (style analysis) → Style Analyzer skill
5. Step 9 (artifact generation) → Template-based output

The heuristics section contains valuable decision logic that should stay in agent reasoning, not hardcoded in tools (per PAW philosophy).

## Lessons Learned

### 1. Largest Agent in Review Workflow
At 634 lines, this is the most comprehensive agent in the review workflow. It combines:
- 5 analysis domains (correctness, security, testing, maintainability, performance)
- Multiple detection heuristics (over-engineering, test quality, comment quality)
- Categorization logic with evidence requirements
- Positive feedback inclusion for mentoring value

**Implication**: V2 should consider splitting this into composable skills that can run in parallel.

### 2. Rich Heuristics Section
The agent contains detailed heuristics for:
- Coverage report parsing (JSON, LCOV formats)
- Categorization (Must/Should/Could indicators)
- Quality anti-patterns (over-engineering, comment quality, test quality)

**Implication**: These heuristics are valuable reasoning guides that should remain in agent prompts, not proceduralized into tools.

### 3. Evidence-Based Guardrails
Strong emphasis on evidence-based findings:
- Every finding must have file:line + concrete evidence
- Must findings require demonstrable impact
- "Don't inflate" philosophy prevents over-categorization

**Implication**: V2 should preserve this discipline - findings without evidence are filtered.

### 4. Positive Observations Pattern
Unique among review agents: explicitly identifies and documents what the developer did well before listing issues.

**Implication**: This is a "mentoring skill" that could be extracted and applied to other review contexts.

### 5. Batching Preview
Step 6 explicitly identifies related findings that share root causes, preparing for efficient batching in Phase 3.

**Implication**: Cross-stage awareness - this agent thinks ahead about downstream consumption.

### 6. Mode-Aware Handoff
- Semi-Auto mode: Pause for human review before feedback generation
- Auto mode: Immediately invoke handoff to PAW-R3A

**Implication**: The workflow mode system affects transition behavior, not just agent behavior.

### 7. Quality Checklist as Contract
The 16-item quality checklist serves as a self-validation contract before handoff.

**Implication**: V2 should consider making quality checklists machine-readable for automated validation.
