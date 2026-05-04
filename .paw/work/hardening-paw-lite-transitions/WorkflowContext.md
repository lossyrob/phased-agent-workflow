# WorkflowContext

Work Title: Hardening PAW-Lite Transitions
Work ID: hardening-paw-lite-transitions
Workflow Identity: paw
Base Branch: main
Target Branch: feature/hardening-paw-lite-transitions
Execution Mode: worktree
Repository Identity: github.com/lossyrob/phased-agent-workflow@87f5ac2f13a439d68b5c111fbee05d0d77e21ace
Execution Binding: worktree:hardening-paw-lite-transitions:feature/hardening-paw-lite-transitions
Workflow Mode: full
Review Strategy: local
Review Policy: planning-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: multi-model
Final Review Interactive: smart
Final Review Models: claude-opus-4.7-xhigh, gpt-5.5
Final Review Specialists: all
Final Review Interaction Mode: parallel
Final Review Specialist Models: none
Final Review Perspectives: auto
Final Review Perspective Cap: 2
Implementation Model: none
Plan Generation Mode: multi-model
Plan Generation Models: claude-opus-4.7-xhigh, gpt-5.5
Planning Docs Review: enabled
Planning Review Mode: multi-model
Planning Review Interactive: smart
Planning Review Models: claude-opus-4.7-xhigh, gpt-5.5
Planning Review Specialists: all
Planning Review Interaction Mode: parallel
Planning Review Specialist Models: none
Planning Review Perspectives: auto
Planning Review Perspective Cap: 2
Custom Workflow Instructions: none
Initial Prompt: Work on GitHub issue #306, "Hardening PAW-Lite transitions and preset adherence without embedded control state."
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/306
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: none

## Control State

TODO Mirror: active-required-items
Reconciliation: current

### Required Workflow Items
- `init` | `resolved` | `activity`
- `spec` | `resolved` | `activity`
- `spec-review` | `resolved` | `activity`
- `code-research` | `resolved` | `activity`
- `planning` | `resolved` | `activity`
- `plan-review` | `resolved` | `activity`
- `planning-docs-review` | `resolved` | `activity`
- `phase:1:workflowcontext-configuration-guardrails` | `resolved` | `activity`
- `phase:2:paw-lite-boundary-checkpoint-todo-chain` | `resolved` | `activity`
- `phase:3:paw-lite-review-final-pr-boundaries` | `resolved` | `activity`
- `phase:4:standard-paw-transition-output-tightening` | `resolved` | `activity`
- `phase:5:integration-coverage-regression-consolidation` | `resolved` | `activity`
- `phase:6:documentation` | `resolved` | `activity`
- `final-review` | `pending` | `activity`
- `final-pr` | `pending` | `activity`

### Gate Items
- `transition:after-spec-review` | `resolved` | `transition`
- `transition:after-plan-review` | `resolved` | `transition`
- `transition:after-planning-docs-review` | `resolved` | `transition`
- `transition:after-phase:<n>` | `resolved` | `transition`
- `transition:after-final-review` | `pending` | `transition`

### Configured Procedure Items
- `procedure:planning-review` | `resolved` | `procedure`
- `procedure:final-review` | `pending` | `procedure`
