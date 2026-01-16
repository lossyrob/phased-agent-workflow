# PAW Review Agent Annotations Analysis

This document contains structural annotations for all 6 PAW-R* review agents using the prompt-annotation skill taxonomy. The purpose is to identify:
- Reusable content that can become generic activity skills
- Phase-bound content specific to each workflow stage
- Workflow-controlling content for orchestration
- Fragmentation and consolidation opportunities

## Annotation Summary by Agent

### PAW-R1A Understanding Agent (623 lines)

**Structural Elements Identified:**

| Tag | Count | Scope | Content Summary |
|-----|-------|-------|-----------------|
| `<agent-identity>` | 1 | phase-bound | "You analyze pull request changes to create comprehensive understanding artifacts" |
| `<guardrail>` | 14 | mixed | 8 reusable (evidence-based, no fabrication), 6 phase-bound (specific to understanding stage) |
| `<workflow-step>` | 4 | phase-bound | Context gathering, research prompt generation, pause for research, derive specification |
| `<artifact-format>` | 3 | phase-bound | ReviewContext.md, DerivedSpec.md, research prompt template |
| `<quality-gate>` | 3 | phase-bound | Validation checklists for each artifact |
| `<handoff-instruction>` | 2 | workflow | Conditional handoff to R1B or R2A |
| `<decision-framework>` | 2 | mixed | Context type detection (reusable pattern), resumption logic (phase-bound) |
| `<classification-logic>` | 1 | phase-bound | GitHub vs non-GitHub context handling |
| `<communication-pattern>` | 2 | reusable | Progress confirmation format, blocking for clarification |
| `<context-requirement>` | 2 | phase-bound | PR metadata, CodeResearch.md for resumption |

**Reusable Content (extract to skills):**
- Evidence-based documentation principles
- Distinguishing explicit vs inferred goals pattern
- Discrepancy flagging and blocking pattern
- File:line reference requirement
- Progress confirmation communication pattern

**Phase-Bound Content (keep in activity skill):**
- ReviewContext.md template and creation logic
- DerivedSpec.md template and derivation process
- Research prompt generation
- Specific artifact validation criteria

**Workflow Content (move to workflow skill):**
- Resumption detection logic (check for existing artifacts)
- Conditional handoff to R1B or R2A
- Stage gate (block if open questions remain)

---

### PAW-R1B Baseline Researcher Agent (357 lines)

**Structural Elements Identified:**

| Tag | Count | Scope | Content Summary |
|-----|-------|-------|-----------------|
| `<agent-identity>` | 1 | phase-bound | "You analyze the codebase at the base commit" |
| `<guardrail>` | 5 | mixed | 3 reusable (document don't critique, no fabrication), 2 phase-bound (base commit only) |
| `<workflow-step>` | 9 | phase-bound | Sync remote, checkout, analyze, synthesize, generate artifact, restore |
| `<artifact-format>` | 1 | phase-bound | CodeResearch.md template |
| `<quality-gate>` | 0 | - | No explicit quality gate section |
| `<handoff-instruction>` | 1 | workflow | Return to R1A after completion |
| `<decision-framework>` | 1 | phase-bound | Remote fetch fallback logic |
| `<context-requirement>` | 3 | phase-bound | ReviewContext.md, base commit SHA, research prompt |

**Reusable Content:**
- Behavioral documentation vs implementation details principle
- Pattern recognition focus
- Integration mapping approach
- "Document don't critique" guardrail
- Git checkout and restore pattern

**Phase-Bound Content:**
- Base commit analysis focus
- CodeResearch.md template
- Research prompt interpretation

**Workflow Content:**
- Return to R1A handoff

---

### PAW-R2A Impact Analyzer Agent (477 lines)

**Structural Elements Identified:**

| Tag | Count | Scope | Content Summary |
|-----|-------|-------|-----------------|
| `<agent-identity>` | 1 | phase-bound | "You analyze the system-wide impact of PR changes" |
| `<guardrail>` | 0 | - | No explicit guardrails section |
| `<workflow-step>` | 9 | phase-bound | Integration graph, breaking changes, performance, security, design, user impact, code health, deployment, generate artifact |
| `<artifact-format>` | 1 | phase-bound | ImpactAnalysis.md template |
| `<quality-gate>` | 0 | - | No explicit quality gate section |
| `<handoff-instruction>` | 1 | workflow | Proceed to R2B |
| `<decision-framework>` | 6 | mixed | Heuristics for each analysis dimension |
| `<classification-logic>` | 8 | reusable | Breaking change detection, performance patterns, security patterns, etc. |
| `<context-requirement>` | 3 | phase-bound | ReviewContext.md, CodeResearch.md, DerivedSpec.md |

**Reusable Content (HIGH VALUE for generic review skill):**
- Integration graph building heuristics
- Breaking change detection classification
- Performance assessment patterns
- Security review checklist
- Design & architecture assessment framework
- User impact evaluation framework
- Code health trend assessment

**Phase-Bound Content:**
- ImpactAnalysis.md template structure
- Prerequisite artifact validation

**Workflow Content:**
- Handoff to R2B

---

### PAW-R2B Gap Analyzer Agent (634 lines)

**Structural Elements Identified:**

| Tag | Count | Scope | Content Summary |
|-----|-------|-------|-----------------|
| `<agent-identity>` | 1 | phase-bound | "You systematically identify gaps and issues" |
| `<guardrail>` | 4 | mixed | Evidence-based categorization (reusable), not inflated (reusable), informed by baseline (phase-bound), coverage context (phase-bound) |
| `<workflow-step>` | 9 | phase-bound | Correctness, safety, testing, maintainability, performance, categorize, positive observations, style, generate artifact |
| `<artifact-format>` | 1 | phase-bound | GapAnalysis.md template |
| `<quality-gate>` | 1 | reusable | Comprehensive quality checklist |
| `<handoff-instruction>` | 1 | workflow | Proceed to R3A |
| `<decision-framework>` | 5 | reusable | Over-engineering detection, comment quality, documentation assessment |
| `<classification-logic>` | 3 | reusable | Must/Should/Could categorization rules |
| `<context-requirement>` | 4 | phase-bound | All prior artifacts |

**Reusable Content (HIGH VALUE):**
- Must/Should/Could categorization framework (entire classification logic)
- Test coverage assessment (quantitative + qualitative)
- Correctness analysis heuristics
- Safety & security analysis checklist
- Maintainability analysis patterns
- Over-engineering detection framework
- Comment quality assessment (WHY vs WHAT)
- Positive observation recognition pattern
- Style vs preference distinction

**Phase-Bound Content:**
- GapAnalysis.md template
- Batching preview for Phase 3

**Workflow Content:**
- Handoff to R3A

---

### PAW-R3A Feedback Generator Agent (445 lines)

**Structural Elements Identified:**

| Tag | Count | Scope | Content Summary |
|-----|-------|-------|-----------------|
| `<agent-identity>` | 1 | phase-bound | "You transform gap analysis findings into structured review comments" |
| `<guardrail>` | 6 | mixed | No PAW artifact references (phase-bound), no auto-submission (workflow), rationale required (phase-bound), evidence-based (reusable), human control (workflow), comprehensive coverage (phase-bound) |
| `<workflow-step>` | 5 | phase-bound | Batch findings, build comments, generate rationale, create artifact, post to GitHub |
| `<artifact-format>` | 1 | phase-bound | ReviewComments.md template |
| `<quality-gate>` | 1 | phase-bound | Quality checklist for comments |
| `<handoff-instruction>` | 1 | workflow | Proceed to R3B |
| `<decision-framework>` | 2 | reusable | Inline vs thread determination, batching criteria |
| `<classification-logic>` | 1 | reusable | One Issue One Comment principle |
| `<communication-pattern>` | 2 | reusable | Tone adjustment, Q&A support |
| `<context-requirement>` | 5 | phase-bound | All prior artifacts |

**Reusable Content:**
- Rationale structure (Evidence, Baseline Pattern, Impact, Best Practice)
- One Issue One Comment principle
- Inline vs Thread determination logic
- Batching criteria for related findings
- Tone adjustment framework
- Q&A support pattern

**Phase-Bound Content:**
- ReviewComments.md template
- GitHub MCP tool integration
- Posted status tracking

**Workflow Content:**
- Handoff to R3B
- Human control guardrail

---

### PAW-R3B Feedback Critic Agent (400 lines)

**Structural Elements Identified:**

| Tag | Count | Scope | Content Summary |
|-----|-------|-------|-----------------|
| `<agent-identity>` | 1 | phase-bound | "You critically assess generated review comments" |
| `<guardrail>` | 5 | mixed | Advisory only (workflow), critical thinking (reusable), local only (phase-bound), respectful tone (reusable), context-aware (reusable) |
| `<workflow-step>` | 3 | phase-bound | Read comments, critical assessment, add assessment sections |
| `<artifact-format>` | 1 | phase-bound | Assessment section template |
| `<quality-gate>` | 1 | phase-bound | Assessment quality checklist |
| `<handoff-instruction>` | 1 | workflow | Terminal stage, return to R3A for revisions |
| `<decision-framework>` | 4 | reusable | Usefulness calibration, accuracy rigor, alternative perspective, trade-off realism |
| `<classification-logic>` | 1 | reusable | Include/Modify/Skip recommendation |
| `<context-requirement>` | 6 | phase-bound | All artifacts including ReviewComments.md |

**Reusable Content (HIGH VALUE):**
- Usefulness evaluation framework (High/Medium/Low)
- Accuracy validation checklist
- Alternative perspective exploration pattern
- Trade-off analysis framework
- Include/Modify/Skip recommendation logic
- Usefulness calibration guidance
- "Advisory only" principle

**Phase-Bound Content:**
- Assessment section template
- Integration with ReviewComments.md

**Workflow Content:**
- Terminal stage behavior
- Return to R3A for revisions

---

## Cross-Agent Analysis

### Fragmentation Analysis

**Guardrails appearing in multiple agents:**

| Guardrail | Agents | Consolidation Opportunity |
|-----------|--------|--------------------------|
| "Evidence-based" / "file:line references" | R1A, R1B, R2B, R3A | Extract to shared review principle |
| "No fabrication" | R1A, R1B | Extract to shared review principle |
| "Document don't critique" (early stages) | R1A, R1B | Extract to shared review principle |
| "Human control" | R3A, R3B | Extract to workflow skill |

**Decision frameworks appearing in multiple agents:**

| Framework | Agents | Notes |
|-----------|--------|-------|
| Context requirement validation | All 6 | Each agent checks for prerequisite artifacts |
| Heuristics patterns | R2A, R2B | Similar structure for different domains |

### Structural Gaps Identified

| Gap | Agent(s) | Impact |
|-----|----------|--------|
| No explicit quality-gate | R1B, R2A | Quality criteria embedded in workflow steps |
| No explicit guardrails section | R2A | Constraints scattered in heuristics |
| Duplicate workflow step (step 4 listed twice) | R1B | Minor documentation issue |

### Scope Breakdown Summary

| Scope | Total Elements | % of Content |
|-------|----------------|--------------|
| Reusable | ~45 elements | ~35% |
| Phase-bound | ~60 elements | ~50% |
| Workflow | ~15 elements | ~15% |

### Content Migration Map

**To Workflow Skill (paw-review-workflow):**
- All handoff instructions
- Stage gate conditions
- Resumption detection logic
- Human control principles
- Subagent invocation instructions

**To Activity Skills (generic, reusable across activities):**
- Evidence-based documentation principles
- Must/Should/Could categorization
- Rationale structure (Evidence, Baseline, Impact, Best Practice)
- Usefulness evaluation framework
- Breaking change detection patterns
- Security review checklist
- Test coverage assessment patterns

**To Activity Skills (phase-specific):**
- Each agent's artifact template
- Specific validation criteria per artifact
- Phase-specific heuristics
- Tool integrations (GitHub MCP)

---

## Key Insights for Skills Migration

### 1. High-Reuse Patterns (extract to shared skill or inline in workflow)

The following patterns appear across multiple agents and should be extracted:

1. **Evidence-Based Review Principles** (~500 tokens)
   - File:line reference requirement
   - No fabrication guardrail
   - Evidence before claims

2. **Must/Should/Could Categorization** (~800 tokens)
   - Full classification logic from R2B
   - Categorization rules
   - Non-inflation guidelines

3. **Rationale Structure** (~300 tokens)
   - Four-component template
   - Evidence → Baseline → Impact → Best Practice

4. **Assessment Framework** (~600 tokens)
   - Usefulness calibration
   - Accuracy validation
   - Trade-off analysis

### 2. Clean Phase Boundaries

Each agent has clear artifact responsibilities:
- R1A: ReviewContext.md, DerivedSpec.md
- R1B: CodeResearch.md
- R2A: ImpactAnalysis.md
- R2B: GapAnalysis.md
- R3A: ReviewComments.md + GitHub pending review
- R3B: Assessment sections in ReviewComments.md

This clean separation supports skill isolation.

### 3. Workflow Orchestration Complexity

The R1A agent has unique complexity:
- Pause-and-resume pattern
- Conditional branching (research needed vs skip)
- State detection from artifacts

This logic must be encoded in the workflow skill.

### 4. Token Estimates for Skills

| Skill | Estimated Tokens | Notes |
|-------|-----------------|-------|
| paw-review-workflow | ~2,500 | Orchestration, handoffs, state management |
| paw-review-understanding | ~3,500 | R1A core + templates (minus orchestration) |
| paw-review-baseline | ~2,000 | R1B core (simpler agent) |
| paw-review-impact | ~3,000 | R2A analysis patterns |
| paw-review-gap | ~4,000 | R2B categorization + all heuristics |
| paw-review-feedback | ~2,500 | R3A comment generation |
| paw-review-critic | ~2,000 | R3B assessment |

Total: ~19,500 tokens (down from ~2,936 lines ≈ ~60,000 tokens due to deduplication)

### 5. Shared Content Candidates

Content that could be factored out or referenced:

1. **Core Review Principles** - Shared across all activity skills
2. **Artifact Prerequisite Checking** - Workflow skill handles
3. **Handoff Message Format** - Workflow skill handles
4. **GitHub MCP Integration** - Only R3A needs (localized)
