# Label Usage by Agent

This table shows which labels from TAXONOMY.md are used in each annotated agent prompt.

## Legend

- ✓ = Label is used in this agent
- Blank = Label not used

## Implementation Workflow Agents

| Label | 01A Spec | 01B Spec Researcher | 02A Code Researcher | 02B Impl Planner | 03A Implementer | 03B Impl Reviewer | 04 Documenter | 05 PR |
|-------|:--------:|:------------------:|:-------------------:|:----------------:|:---------------:|:-----------------:|:-------------:|:-----:|
| **Identity & Mission** |
| `<agent-identity>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<mission-statement>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<role-definition>` | | | | | | ✓ | | |
| **Context & Injection** |
| `<context-injection>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<context-detection>` | | | | | | | | |
| `<dependency-statement>` | | | ✓ | | ✓ | | | |
| `<artifact-directory-structure>` | | | | | | | | |
| **Principles & Guardrails** |
| `<core-principles>` | ✓ | | ✓ | ✓ | | | | |
| `<guardrail>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<scope-boundary>` | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | |
| `<anti-pattern>` | | ✓ | ✓ | ✓ | ✓ | | | |
| `<blocking-condition>` | | | | | | | | |
| **Responsibilities** |
| `<responsibility-list>` | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ |
| `<responsibility-detail>` | | | | | | | ✓ | |
| **Workflow Structure** |
| `<initial-behavior>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<workflow-sequence>` | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<workflow-step>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<workflow-adaptation>` | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<mode-definition>` | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<verification-step>` | | | | ✓ | ✓ | ✓ | ✓ | |
| `<pre-action-gate>` | | | | | | ✓ | | |
| **Decision Making** |
| `<decision-framework>` | ✓ | | | ✓ | ✓ | ✓ | | ✓ |
| `<classification-logic>` | ✓ | | | | | ✓ | | |
| `<default-behavior>` | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<recommendation-criteria>` | | | | | | | | |
| **Artifacts** |
| `<artifact-format>` | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ |
| `<artifact-constraint>` | ✓ | ✓ | | ✓ | ✓ | | ✓ | |
| `<artifact-metadata>` | | | ✓ | | | | | |
| `<artifact-field-preservation>` | | | | | | | ✓ | ✓ |
| `<artifact-principles>` | | | | | | | ✓ | |
| **Quality & Validation** |
| `<quality-gate>` | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<quality-gate-section>` | ✓ | | | ✓ | ✓ | ✓ | ✓ | |
| `<quality-criterion>` | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<quality-standards>` | | | | | | | ✓ | |
| `<prerequisite-check>` | | | | | | | ✓ | |
| `<recommended-conditions>` | | | | | | | | ✓ |
| **Handoff & Transitions** |
| `<handoff-instruction>` | ✓ | ✓ | | | ✓ | ✓ | ✓ | ✓ |
| `<handoff-checklist>` | ✓ | | | | ✓ | | | |
| `<handoff-message-template>` | | | | | | ✓ | | |
| `<handoff-mode-behavior>` | | | | | | ✓ | ✓ | |
| `<pause-signal>` | | | | | | | | |
| `<terminal-state>` | | | | | | | | ✓ |
| `<completion-definition>` | | | | | | | | |
| **Communication** |
| `<communication-pattern>` | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<input-collection-prompt>` | | | | | | | ✓ | ✓ |
| `<parameter-confirmation>` | | | | | | | | |
| `<example>` | ✓ | ✓ | ✓ | ✓ | | ✓ | | ✓ |
| `<closing-directive>` | | | | | ✓ | | | |
| **Methodology & Approach** |
| `<methodology>` | | ✓ | ✓ | | ✓ | | | |
| `<behavioral-directive>` | | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| `<research-methodology>` | | | ✓ | ✓ | | | | |
| `<search-strategy>` | | | ✓ | | | | | |
| `<investigation-protocol>` | | | | ✓ | | | | |
| **Error & Recovery** |
| `<error-handling>` | ✓ | | | | ✓ | | | |
| `<graceful-degradation>` | | | | | | | | |
| `<resumption-protocol>` | | | | | ✓ | | | |
| **Git & Branching** |
| `<branching-strategy>` | | | | ✓ | ✓ | ✓ | ✓ | |
| `<commit-protocol>` | | | | ✓ | ✓ | ✓ | ✓ | |
| `<git-state-management>` | | | | | | | | |
| **PR Management** |
| `<pr-template>` | | | | ✓ | | ✓ | | ✓ |
| `<pr-type-detection>` | | | | | | ✓ | | |
| `<pr-creation-instruction>` | | | | | | | | ✓ |
| `<pr-review-workflow>` | | | | ✓ | ✓ | ✓ | | |
| `<review-comment-protocol>` | | | | ✓ | ✓ | | ✓ | |
| `<review-comment-flow>` | | | | | | | | ✓ |
| **Implementation-Specific** |
| `<implementation-strategy>` | | | | | ✓ | | | |
| `<phase-completion-protocol>` | | | | | ✓ | | | |
| `<plan-section-template>` | | | | ✓ | | | | |
| `<success-criteria-format>` | | | | ✓ | | | | |
| `<strategic-abstraction>` | | | | ✓ | | | | |
| `<refactor-scope>` | | | | | | ✓ | | |
| **Documentation-Specific** |
| `<documentation-depth>` | | | | | | | ✓ | |
| `<content-exclusion-list>` | | | | | | | ✓ | |
| `<content-focus-list>` | | | | | | | ✓ | |
| `<style-matching-guidance>` | | | | | | | ✓ | |
| `<surgical-edit-discipline>` | | | | | | | ✓ | |
| **Miscellaneous** |
| `<tool-guidance>` | | | ✓ | | | | | |
| `<important-notes>` | | | ✓ | | | | | |
| `<idempotency-rule>` | | ✓ | | | ✓ | | | |
| `<work-title-usage>` | | | | | | | ✓ | ✓ |
| `<discovery-pattern>` | | | ✓ | | | | | ✓ |
| `<finding-presentation>` | | | | ✓ | | | | |
| `<output-specification>` | | | | | | | | |
| `<differentiation-example>` | | ✓ | | | | | | |
| **Agent Relationships** |
| `<agent-relationship>` | | | | | | ✓ | | |
| `<workflow-boundary>` | | | | | | ✓ | | |

---

## Review Workflow Agents

| Label | R1A Understanding | R1B Baseline | R2A Impact | R2B Gap | R3A Feedback Gen | R3B Feedback Critic |
|-------|:-----------------:|:------------:|:----------:|:-------:|:----------------:|:-------------------:|
| **Identity & Mission** |
| `<agent-identity>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<mission-statement>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Context & Injection** |
| `<context-detection>` | ✓ | ✓ | | | | |
| `<dependency-statement>` | | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<artifact-directory-structure>` | ✓ | | | | | |
| **Principles & Guardrails** |
| `<core-principles>` | ✓ | ✓ | | | | |
| `<guardrail>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<scope-boundary>` | ✓ | ✓ | | | ✓ | ✓ |
| `<anti-pattern>` | ✓ | ✓ | | ✓ | ✓ | |
| `<blocking-condition>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Responsibilities** |
| `<responsibility-list>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Workflow Structure** |
| `<initial-behavior>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<workflow-sequence>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<workflow-step>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<workflow-adaptation>` | | | ✓ | ✓ | | |
| `<mode-definition>` | | | ✓ | ✓ | ✓ | |
| `<verification-step>` | ✓ | ✓ | | | | |
| **Decision Making** |
| `<decision-framework>` | ✓ | ✓ | | | ✓ | ✓ |
| `<classification-logic>` | | | | ✓ | ✓ | ✓ |
| `<default-behavior>` | | ✓ | | | | |
| `<recommendation-criteria>` | | | | | | ✓ |
| **Artifacts** |
| `<artifact-format>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<artifact-constraint>` | ✓ | ✓ | | | ✓ | |
| `<artifact-metadata>` | ✓ | ✓ | | ✓ | | |
| **Quality & Validation** |
| `<quality-gate>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<quality-gate-section>` | ✓ | | | | | |
| `<quality-criterion>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Handoff & Transitions** |
| `<handoff-instruction>` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<handoff-checklist>` | ✓ | ✓ | | | ✓ | ✓ |
| `<handoff-mode-behavior>` | ✓ | | | | | |
| `<pause-signal>` | ✓ | | | | | |
| `<terminal-state>` | | | | | | ✓ |
| `<completion-definition>` | ✓ | | | | | |
| **Communication** |
| `<communication-pattern>` | ✓ | ✓ | ✓ | | ✓ | ✓ |
| `<parameter-confirmation>` | ✓ | | | | | |
| `<example>` | | | | | ✓ | ✓ |
| **Methodology & Approach** |
| `<methodology>` | | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<behavioral-directive>` | ✓ | ✓ | | | ✓ | |
| `<research-methodology>` | | ✓ | | | | |
| `<search-strategy>` | | ✓ | | | | |
| **Error & Recovery** |
| `<error-handling>` | ✓ | | | | | |
| `<graceful-degradation>` | | ✓ | | | | |
| `<resumption-protocol>` | ✓ | | | | | |
| **Git & Branching** |
| `<git-state-management>` | | ✓ | | | | |
| **Research & Analysis** |
| `<analysis-domain>` | | | ✓ | ✓ | | |
| `<heuristic-list>` | | | ✓ | ✓ | | |
| `<detection-criteria>` | | | | ✓ | | ✓ |
| `<evidence-requirement>` | | | | ✓ | ✓ | |
| `<risk-assessment-framework>` | | | ✓ | | | |
| `<coverage-analysis>` | | | | ✓ | | |
| `<categorization-rubric>` | | | | ✓ | | ✓ |
| `<positive-recognition>` | | | | ✓ | | |
| **Feedback Generation** |
| `<rationale-structure>` | | | | | ✓ | |
| `<comment-structure>` | | | | | ✓ | |
| `<batching-rules>` | | | | | ✓ | |
| `<tone-guidance>` | | | | | ✓ | |
| `<posting-rules>` | | | | | ✓ | ✓ |
| `<qa-protocol>` | | | | | ✓ | |
| **Feedback Critique** |
| `<calibration-guidance>` | | | | | | ✓ |
| `<verification-protocol>` | | | | | | ✓ |
| `<perspective-framing>` | | | | | | ✓ |
| **Miscellaneous** |
| `<tool-guidance>` | | ✓ | | | ✓ | |
| `<important-notes>` | | ✓ | | | | |
| `<output-specification>` | | | ✓ | ✓ | | |
| `<github-vs-local-handling>` | ✓ | | | | | |
| `<prompt-template-guidance>` | ✓ | | | | | |
| `<research-question-areas>` | ✓ | | | | | |

---

## Status Agent (PAW-X)

| Label | X Status |
|-------|:--------:|
| **Identity & Mission** |
| `<agent-identity>` | ✓ |
| `<mission-statement>` | ✓ |
| **Context & Injection** |
| `<context-injection>` | ✓ |
| `<context-detection>` | ✓ |
| **Principles & Guardrails** |
| `<guardrail>` | ✓ |
| `<scope-boundary>` | ✓ |
| `<blocking-condition>` | ✓ |
| **Responsibilities** |
| `<responsibility-list>` | ✓ |
| **Workflow Structure** |
| `<workflow-sequence>` | ✓ |
| `<workflow-step>` | ✓ |
| `<workflow-adaptation>` | ✓ |
| `<mode-definition>` | ✓ |
| **Decision Making** |
| `<decision-framework>` | ✓ |
| `<detection-criteria>` | ✓ |
| **Handoff & Transitions** |
| `<handoff-instruction>` | ✓ |
| `<terminal-state>` | ✓ |
| **Communication** |
| `<communication-pattern>` | ✓ |
| `<example>` | ✓ |
| **Methodology & Approach** |
| `<methodology>` | ✓ |
| `<behavioral-directive>` | ✓ |
| **Error & Recovery** |
| `<error-handling>` | ✓ |
| **Miscellaneous** |
| `<tool-guidance>` | ✓ |
| `<posting-rules>` | ✓ |
| **Status Agent-Specific** |
| `<stage-reference>` | ✓ |
| `<two-agent-pattern>` | ✓ |
| `<handoff-mode-definition>` | ✓ |
| `<user-scenario>` | ✓ |
| `<artifact-dependency-graph>` | ✓ |
| `<status-dashboard-structure>` | ✓ |
| `<discovery-procedure>` | ✓ |
| `<help-mode>` | ✓ |
| `<multi-work-management>` | ✓ |
| `<branching-strategy>` | ✓ |

---

## Summary Statistics

### Most Used Labels (8+ agents)

| Label | Count |
|-------|-------|
| `<agent-identity>` | 15 |
| `<mission-statement>` | 15 |
| `<guardrail>` | 15 |
| `<workflow-step>` | 15 |
| `<workflow-sequence>` | 14 |
| `<initial-behavior>` | 14 |
| `<responsibility-list>` | 14 |
| `<quality-gate>` | 13 |
| `<quality-criterion>` | 13 |
| `<handoff-instruction>` | 13 |
| `<artifact-format>` | 12 |
| `<workflow-adaptation>` | 10 |
| `<mode-definition>` | 10 |
| `<decision-framework>` | 9 |
| `<communication-pattern>` | 9 |
| `<scope-boundary>` | 9 |
| `<example>` | 9 |
| `<methodology>` | 8 |

### Agent Label Counts

| Agent | Labels Used |
|-------|-------------|
| PAW-01A Specification | 27 |
| PAW-01B Spec Researcher | 18 |
| PAW-02A Code Researcher | 23 |
| PAW-02B Impl Planner | 28 |
| PAW-03A Implementer | 28 |
| PAW-03B Impl Reviewer | 30 |
| PAW-04 Documenter | 30 |
| PAW-05 PR | 20 |
| PAW-R1A Understanding | 27 |
| PAW-R1B Baseline Researcher | 22 |
| PAW-R2A Impact Analyzer | 18 |
| PAW-R2B Gap Analyzer | 24 |
| PAW-R3A Feedback Generator | 24 |
| PAW-R3B Feedback Critic | 19 |
| PAW-X Status | 28 |

### Labels by Category

| Category | Label Count | Most Common Labels |
|----------|-------------|-------------------|
| Identity & Mission | 3 | agent-identity, mission-statement |
| Context & Injection | 4 | context-injection, dependency-statement |
| Principles & Guardrails | 5 | guardrail, scope-boundary |
| Responsibilities | 2 | responsibility-list |
| Workflow Structure | 7 | workflow-step, workflow-sequence, initial-behavior |
| Decision Making | 4 | decision-framework, classification-logic |
| Artifacts | 5 | artifact-format, artifact-constraint |
| Quality & Validation | 6 | quality-gate, quality-criterion |
| Handoff & Transitions | 7 | handoff-instruction, handoff-checklist |
| Communication | 5 | communication-pattern, example |
| Methodology & Approach | 5 | methodology, behavioral-directive |
| Error & Recovery | 3 | error-handling |
| Git & Branching | 3 | branching-strategy, commit-protocol |
| PR Management | 6 | pr-template, review-comment-protocol |
| Research & Analysis | 8 | analysis-domain, heuristic-list |
| Feedback (Review) | 6 | posting-rules, rationale-structure |
| Status-Specific | 9 | stage-reference, user-scenario |
