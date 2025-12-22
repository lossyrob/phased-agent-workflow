# PAW v2 Agent Analysis Summary

This document summarizes the analysis of all 15 PAW agents, categorizing them into Core Workflow vs Specialized Roles and extracting cross-cutting insights for v2 migration.

## Agent Categorization Matrix

| Agent | Category | V2 Home | Subagent Candidate | Key Skills to Extract |
|-------|----------|---------|-------------------|----------------------|
| **Implementation Workflow** |
| PAW-01A Specification | Core Workflow | Workflow Skill | No | User Story Derivation, Unknown Classification, Quality Validation |
| PAW-01B Spec Researcher | Specialized Role | Capability Skill | **Yes** | Question-Answer Loop, Open Unknown Classification, Behavioral Research |
| PAW-02A Code Researcher | Core Workflow* | Capability Skill | **Yes** | Code Location, Code Analysis, Pattern Finder |

*PAW-02A is positioned as a pipeline stage but functions as a pure research capability—strong candidate for reuse as subagent.
| PAW-02B Impl Planner | Core Workflow | Workflow Skill | No | PR Review Response, Plan Template, Design Options |
| PAW-03A Implementer | Core Workflow | Workflow Skill | No | Phase Branch Manager, PR Comment Processor, Verification Runner |
| PAW-03B Impl Reviewer | Specialized Role | Capability Skill | **Yes** | PR Creation, Code Quality Review, Test Verification |
| PAW-04 Documenter | Core Workflow | Workflow Skill | Partial | Documentation Writer, Project Docs Updater, Style Matcher |
| PAW-05 PR | Core Workflow | Workflow Skill | No | PR Description Generator, Completion Validator, Open Questions Tracer |
| **Review Workflow** |
| PAW-R1A Understanding | Core Workflow | Workflow Skill | No | PR Metadata Gatherer, Resumption Detector, Research Question Generator |
| PAW-R1B Baseline Researcher | Specialized Role | Capability Skill | **Yes** | Git Timetravel Research, Pattern Recognition, Behavior Documentation |
| PAW-R2A Impact Analyzer | Core Workflow | Workflow Skill | No | Integration Graph Builder, Breaking Change Detector, Security Analyzer |
| PAW-R2B Gap Analyzer | Core Workflow | Workflow Skill | No | Correctness Analyzer, Security Scanner, Test Coverage Analyzer, Finding Categorizer |
| PAW-R3A Feedback Generator | Core Workflow | Workflow Skill | No | Comment Batching, Rationale Generation, GitHub Pending Review |
| PAW-R3B Feedback Critic | Specialized Role | Capability Skill | **Yes** | Usefulness Evaluation, Evidence Validation, Trade-off Analysis |
| **Cross-Cutting** |
| PAW-X Status | Specialized Role | Prompt Command + Skills | No | Workflow State, Next-Step Advisor, Work Item Lister |

## Category Distribution

### Core Workflow (10 agents)
Pipeline stages that drive stage-to-stage transitions and produce artifacts the workflow depends on:
- **Implementation**: 01A, 02A, 02B, 03A, 04, 05
- **Review**: R1A, R2A, R2B, R3A

### Specialized Roles (5 agents)
Supporting capabilities that can be invoked by workflows or as subagents:
- **Implementation**: 01B, 03B
- **Review**: R1B, R3B
- **Cross-cutting**: X

## Subagent Candidates (5 agents)

These agents have clear input/output contracts and perform bounded, delegated work:

1. **PAW-01B Spec Researcher** - Research questions in, SpecResearch.md out
2. **PAW-02A Code Researcher** - Research query in, CodeResearch.md out
3. **PAW-03B Impl Reviewer** - Implemented code in, reviewed/pushed PR out
4. **PAW-R1B Baseline Researcher** - Research questions + base commit in, CodeResearch.md out
5. **PAW-R3B Feedback Critic** - ReviewComments.md in, annotated ReviewComments.md out

## Cross-Cutting Patterns Identified

### 1. Mode/Strategy Polymorphism
Nearly all workflow agents adapt behavior based on:
- **Workflow Mode**: `full` / `minimal` / `custom`
- **Review Strategy**: `prs` / `local`

**V2 Recommendation**: Centralize mode handling as workflow-level configuration, not duplicated agent logic.

### 2. PR Comment Handling
The "read comments → create TODOs → address → reply with commit hash" pattern appears in:
- PAW-02B Impl Planner
- PAW-03A Implementer
- PAW-04 Documenter

**V2 Recommendation**: Extract as shared `pr-review-response` capability skill.

### 3. Quality Gate Pattern
Validation checklists before handoff appear in all workflow stages:
- Pre-flight validation (PAW-05)
- Phase completion (PAW-03A)
- Artifact validation (PAW-01A, PAW-04)

**V2 Recommendation**: Standardize as reusable `workflow-completion-validator` skill.

### 4. Artifact Discovery Pattern
Checking which artifacts exist and adapting behavior:
- PAW-05 PR checks for optional artifacts
- PAW-X Status scans all artifacts
- PAW-01A checks for SpecResearch.md

**V2 Recommendation**: Infrastructure concern—provide standard artifact discovery to all skills.

### 5. Evidence-Based Guardrails
NEVER/ALWAYS rules preventing scope creep:
- Research agents: "Document, don't evaluate"
- Review agents: "Evidence required for every finding"
- Implementation agents: "Block, don't guess"

**V2 Recommendation**: Preserve these boundaries via skill-level guardrails.

### 6. Subagent Handoff Pattern
Agents generate prompts for subagents:
- PAW-01A → generates research prompt → PAW-01B consumes
- PAW-R1A → generates research prompt → PAW-R1B consumes

**V2 Recommendation**: Formalize via subagent invocation with inline instructions.

### 7. Platform-Specific Branching
GitHub vs non-GitHub logic in:
- PAW-R1A Understanding
- PAW-R3A Feedback Generator
- PAW-05 PR

**V2 Recommendation**: Factor into platform capability variants.

## Token Cost Observations

| Agent | Lines | Complexity Drivers |
|-------|-------|-------------------|
| PAW-R2B Gap Analyzer | 634 | 5 analysis domains, extensive heuristics |
| PAW-02B Impl Planner | 458 | Dual modes, extensive checklists |
| PAW-R3B Feedback Critic | 378 | Evaluation framework embedded |
| PAW-03A Implementer | ~350 | Mode polymorphism, multiple conditional paths |

**V2 Recommendation**: Decompose large agents; extract heuristics to shared resources.

## V2 Skill Taxonomy (Proposed)

### Workflow Skills (Stage Orchestrators)
- `paw-spec-workflow` ← PAW-01A
- `paw-planning-workflow` ← PAW-02B
- `paw-implementation-workflow` ← PAW-03A
- `paw-documentation-workflow` ← PAW-04
- `paw-pr-workflow` ← PAW-05
- `paw-review-understanding-workflow` ← PAW-R1A
- `paw-review-evaluation-workflow` ← PAW-R2A + R2B
- `paw-review-feedback-workflow` ← PAW-R3A

### Capability Skills (Reusable by Workflows or as Subagents)
- `behavioral-research` ← PAW-01B
- `code-research` ← PAW-02A
- `impl-review` ← PAW-03B
- `baseline-research` ← PAW-R1B
- `feedback-critic` ← PAW-R3B
- `pr-review-response` ← cross-cutting
- `style-matcher` ← PAW-04
- `workflow-state` ← PAW-X

### Prompt Commands (User Entry Points)
- `paw-spec` → spec workflow + optional subagent research
- `paw-plan` → code research subagent + planning workflow
- `paw-implement` → implementation workflow
- `paw-docs` → documentation workflow
- `paw-pr` → final PR workflow
- `paw-review` → full review pipeline
- `paw-status` → workflow state + guidance

## Consolidated Lessons Learned

1. **Research ≠ Workflow Stage**: Research agents (01B, 02A, R1B) should become subagent invocations, not standalone stages that require manual transitions.

2. **Guardrails Define Identity**: The "document, don't evaluate" and "block, don't guess" constraints are what make agents valuable—preserve in v2.

3. **Quality Gates Are Atomic**: Test verification, PR comment formatting, and pre-flight checks appear across agents—extract as shared skills.

4. **Templates Are Token-Expensive**: Large inline templates (artifact schemas, PR descriptions) should become external files.

5. **Routing Logic Centralizes**: PAW-X Status contains full workflow knowledge—this should become the v2 orchestrator's core skill.

6. **Dual Output Modes**: Agents interfacing with external systems (GitHub) need separate "posted" vs "local" content streams.

7. **Iteration Loops Are Hidden**: R3A↔R3B and Impl↔Review cycles should be explicit in v2 workflow definitions.

---

*Analysis Date: 2025-12-21*
*Agents Analyzed: 15/15*
