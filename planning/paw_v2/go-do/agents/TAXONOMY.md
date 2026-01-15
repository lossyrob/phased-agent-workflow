# Discovered Label Taxonomy

> Generated from sequential annotation of all PAW agents (2025-12-23)

## Label Categories

Labels are grouped by functional category. Count shows how many distinct agents used each label.

### Identity & Mission

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<agent-identity>` | 15 | Agent name and mission; establishes who this agent is |
| `<mission-statement>` | 15 | One-sentence description of what the agent does |
| `<role-definition>` | 2 | Defines the agent's specific focus area |

### Context & Injection

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<context-injection>` | 6 | Placeholder for dynamic template variables (e.g., `{{PAW_CONTEXT}}`) |
| `<context-detection>` | 3 | Logic for detecting what context/inputs exist |
| `<dependency-statement>` | 8 | Declares reliance on another artifact |
| `<artifact-directory-structure>` | 1 | Rules for where artifacts are stored and naming conventions |

### Principles & Guardrails

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<core-principles>` | 3 | Container for foundational values that guide decisions |
| `<guardrail>` | 14 | Hard constraints that MUST be followed; violation = failure |
| `<scope-boundary>` | 9 | Explicit statement of what's in/out of agent responsibility |
| `<anti-pattern>` | 6 | Explicitly prohibited behaviors |
| `<blocking-condition>` | 7 | Condition that halts workflow progression until resolved |

### Responsibilities

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<responsibility-list>` | 10 | Enumerated responsibilities (type="positive" or "negative") |
| `<responsibility-detail>` | 1 | Detailed explanation of what a specific responsibility represents |

### Workflow Structure

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<initial-behavior>` | 10 | Actions taken at conversation start |
| `<workflow-sequence>` | 12 | Container for ordered workflow steps |
| `<workflow-step>` | 13 | Individual step in a workflow sequence |
| `<workflow-adaptation>` | 7 | Container for mode-specific behavior changes |
| `<mode-definition>` | 8 | Definition of a specific operating mode |
| `<verification-step>` | 5 | Actions to confirm correctness before proceeding |
| `<pre-action-gate>` | 1 | Decision gate before making edits |

### Decision Making

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<decision-framework>` | 6 | Criteria/logic for making choices |
| `<classification-logic>` | 3 | Rules for categorizing items |
| `<default-behavior>` | 4 | What to do when configuration is missing |
| `<recommendation-criteria>` | 1 | Criteria for Include/Modify/Skip decisions |

### Artifacts

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<artifact-format>` | 11 | Schema/template for output artifacts |
| `<artifact-constraint>` | 6 | Specific rules about artifact content |
| `<artifact-metadata>` | 5 | Fields within YAML frontmatter templates |
| `<artifact-field-preservation>` | 1 | Instructions for preserving specific field formats |
| `<artifact-principles>` | 1 | High-level guiding principles for artifact creation |

### Quality & Validation

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<quality-gate>` | 11 | Major checklist/criteria that must pass |
| `<quality-gate-section>` | 4 | Subsections within a quality gate |
| `<quality-criterion>` | 11 | Individual pass/fail items in a quality checklist |
| `<quality-standards>` | 1 | Overall quality requirements for outputs |
| `<prerequisite-check>` | 1 | Conditions that must be met before proceeding |
| `<recommended-conditions>` | 1 | Soft prerequisites for best results |

### Handoff & Transitions

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<handoff-instruction>` | 12 | Instructions for transitioning to next stage/agent |
| `<handoff-checklist>` | 5 | Items to verify before handoff |
| `<handoff-message-template>` | 2 | Template for handoff messages |
| `<handoff-mode-behavior>` | 3 | How handoff varies by mode setting |
| `<pause-signal>` | 1 | Signal to pause workflow and wait for another agent |
| `<terminal-state>` | 2 | Marker for workflow completion condition |
| `<completion-definition>` | 1 | Definition of what "complete" means for this agent |

### Communication

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<communication-pattern>` | 9 | How to communicate with user in specific situations |
| `<input-collection-prompt>` | 2 | Template for collecting required inputs from user |
| `<parameter-confirmation>` | 1 | Template for confirming parameters with user |
| `<example>` | 9 | Illustrative examples (good/bad, handoff messages) |
| `<closing-directive>` | 2 | Final operating principle/motto |

### Methodology & Approach

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<methodology>` | 8 | Container describing how the agent approaches its work |
| `<behavioral-directive>` | 7 | Specific instruction about agent behavior |
| `<research-methodology>` | 3 | Container for comprehensive research approach |
| `<search-strategy>` | 2 | Specific search tactics within a methodology |
| `<investigation-protocol>` | 1 | Rules for investigating and verifying information |

### Error & Recovery

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<error-handling>` | 5 | How to handle errors, conflicts, or edge cases |
| `<graceful-degradation>` | 1 | Warn and continue pattern |
| `<resumption-protocol>` | 2 | How to resume interrupted work |

### Git & Branching

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<branching-strategy>` | 4 | Rules for git branching based on review strategy |
| `<commit-protocol>` | 3 | Rules for staging, committing, and pushing changes |
| `<git-state-management>` | 1 | Git branch/checkout operations |

### PR Management

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<pr-template>` | 3 | Template for pull request title/body content |
| `<pr-type-detection>` | 1 | Logic for determining Phase PR vs Final PR |
| `<pr-creation-instruction>` | 1 | Specific guidance for creating PRs |
| `<pr-review-workflow>` | 2 | Protocol for handling PR review comments as workflow |
| `<review-comment-protocol>` | 3 | Rules for handling PR review comments |
| `<review-comment-flow>` | 1 | Routing instructions for handling PR review comments |

### Implementation-Specific

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<implementation-strategy>` | 1 | Mode-specific implementation approaches |
| `<phase-completion-protocol>` | 1 | Steps for completing a phase and handing off |
| `<plan-section-template>` | 1 | Template for a section within implementation plan |
| `<success-criteria-format>` | 1 | Format specification for success criteria |
| `<strategic-abstraction>` | 1 | Guidelines for appropriate level of detail |
| `<refactor-scope>` | 1 | Rules about small vs large refactors |

### Documentation-Specific

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<documentation-depth>` | 1 | Rules for documentation depth by workflow mode |
| `<content-exclusion-list>` | 1 | Explicit list of what should NOT be included |
| `<content-focus-list>` | 1 | Explicit list of what should be focused on |
| `<style-matching-guidance>` | 1 | Rules for matching existing documentation patterns |
| `<surgical-edit-discipline>` | 1 | Rules for making minimal, targeted edits only |

### Research & Analysis (Review Workflow)

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<analysis-domain>` | 2 | Specific area of analysis focus (type attribute) |
| `<heuristic-list>` | 2 | Detection patterns/rules for finding issues |
| `<detection-criteria>` | 3 | Specific issue detection patterns |
| `<evidence-requirement>` | 3 | Rules about proof/file:line references |
| `<risk-assessment-framework>` | 1 | Structure for evaluating overall risk levels |
| `<coverage-analysis>` | 1 | Test coverage methodology |
| `<categorization-rubric>` | 2 | Severity-based classification rules (Must/Should/Could) |
| `<positive-recognition>` | 1 | Identifying developer strengths |

### Feedback Generation (Review Workflow)

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<rationale-structure>` | 1 | Components of justification (Evidence, Baseline, Impact, Best Practice) |
| `<comment-structure>` | 1 | Schema for comment objects |
| `<batching-rules>` | 1 | Rules for grouping related findings |
| `<tone-guidance>` | 1 | Communication style adjustment parameters |
| `<posting-rules>` | 3 | What content to post to GitHub vs keep local |
| `<qa-protocol>` | 1 | How to handle Q&A interactions |

### Feedback Critique (Review Workflow)

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<calibration-guidance>` | 1 | Instructions for avoiding bias/systematic errors |
| `<verification-protocol>` | 1 | Explicit steps to validate accuracy of evidence |
| `<perspective-framing>` | 1 | How to consider alternative viewpoints fairly |

### Status Agent-Specific

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<stage-reference>` | 1 | Documentation of a workflow stage |
| `<two-agent-pattern>` | 1 | Description of paired agent responsibilities |
| `<handoff-mode-definition>` | 1 | Automation level definitions (manual/semi-auto/auto) |
| `<user-scenario>` | 1 | Common user situation with procedural guidance |
| `<artifact-dependency-graph>` | 1 | Visualization of artifact dependencies |
| `<status-dashboard-structure>` | 1 | Structure for status report output |
| `<discovery-procedure>` | 1 | Steps for detecting workflow state |
| `<help-mode>` | 1 | Reference/education mode behavior |
| `<multi-work-management>` | 1 | Handling multiple work items |

### Agent Relationships

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<agent-relationship>` | 1 | Container describing relationship to another agent |
| `<workflow-boundary>` | 1 | Specific boundary between this agent and another |
| `<differentiation-example>` | 1 | Example showing distinction between agents |

### Miscellaneous

| Label | Agent Count | Description |
|-------|-------------|-------------|
| `<tool-guidance>` | 4 | Instructions for using specific tools |
| `<important-notes>` | 2 | Critical reminders/emphasis section |
| `<idempotency-rule>` | 2 | Rules ensuring consistent/reproducible outputs |
| `<work-title-usage>` | 1 | How work title is derived and used |
| `<discovery-pattern>` | 2 | Pseudocode for finding artifacts conditionally |
| `<finding-presentation>` | 1 | Template for presenting research findings |
| `<output-specification>` | 1 | What each step produces |
| `<github-vs-local-handling>` | 1 | Mode differences for GitHub vs local contexts |
| `<prompt-template-guidance>` | 1 | Guidance for creating prompts for other agents |
| `<research-question-areas>` | 1 | Categories of questions to investigate |

---

## Summary Statistics

- **Total unique labels**: ~110
- **Core labels (used by 8+ agents)**: 15
- **Specialized labels (used by 1-2 agents)**: ~60
- **Review-workflow specific**: ~20
- **Implementation-workflow specific**: ~10

## High-Reuse Labels (8+ agents)

These labels appear across most agents and represent foundational prompt structure:

1. `<agent-identity>` (15)
2. `<mission-statement>` (15)
3. `<guardrail>` (14)
4. `<workflow-step>` (13)
5. `<workflow-sequence>` (12)
6. `<handoff-instruction>` (12)
7. `<quality-gate>` (11)
8. `<quality-criterion>` (11)
9. `<artifact-format>` (11)
10. `<initial-behavior>` (10)
11. `<responsibility-list>` (10)
12. `<scope-boundary>` (9)
13. `<communication-pattern>` (9)
14. `<example>` (9)
15. `<mode-definition>` (8)
16. `<methodology>` (8)

## Consolidation Opportunities

Labels that could potentially be merged:

1. **Decision-related**: `<decision-framework>`, `<classification-logic>`, `<recommendation-criteria>` → consider single `<decision-logic>` with type attribute

2. **Verification-related**: `<verification-step>`, `<verification-protocol>`, `<prerequisite-check>`, `<pre-action-gate>` → consider `<verification>` with type attribute

3. **Handoff-related**: `<handoff-instruction>`, `<handoff-checklist>`, `<handoff-message-template>`, `<handoff-mode-behavior>` → could nest under parent `<handoff>`

4. **Quality-related**: `<quality-gate>`, `<quality-criterion>`, `<quality-standards>`, `<quality-gate-section>` → already follows consistent pattern

5. **Content filtering**: `<content-exclusion-list>`, `<content-focus-list>`, `<anti-pattern>` → could be `<content-filter type="include|exclude|prohibit">`
