# WorkflowContext

Work Title: Azure DevOps PR Capabilities
Work ID: paw-backlog-2026-07-22a-313
Workflow Identity: paw-lite
Base Branch: main
Target Branch: feature/issue-313-ado-capability-matrix
Execution Mode: worktree
Repository Identity: github.com-lossyrob/lossyrob/phased-agent-workflow@87f5ac2f13a439d68b5c111fbee05d0d77e21ace
Execution Binding: worktree:paw-backlog-2026-07-22a-313:feature/issue-313-ado-capability-matrix
Workflow Mode: custom
Review Strategy: local
Review Policy: final-pr-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: society-of-thought
Final Review Interactive: false
Final Review Models: claude-opus-4.8
Final Review Specialists: adaptive:5
Final Review Interaction Mode: parallel
Final Review Specialist Models: claude-opus-4.8
Final Review Perspectives: auto
Final Review Perspective Cap: 2
Implementation Model: none
Plan Generation Mode: single-model
Plan Generation Models: gpt-5.6-sol
Planning Docs Review: enabled
Planning Review Mode: society-of-thought
Planning Review Interactive: false
Planning Review Models: claude-opus-4.8
Planning Review Specialists: adaptive:5
Planning Review Interaction Mode: parallel
Planning Review Specialist Models: claude-opus-4.8
Planning Review Perspectives: auto
Planning Review Perspective Cap: 2
Custom Workflow Instructions: Establish a verified Azure DevOps PR capability and permission matrix with durable evidence and recommendations for issues #314-#316. Production PAW Review Azure DevOps integration is out of scope.
Initial Prompt: Verify non-interactive authentication plus PR metadata, diff, iteration, thread, comment, vote, build-status, identity, permission, API-version, and failure behavior using only msdata/Database Systems/devtools-test-repo for mutations.
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/313
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: GitHub issues #314, #315, and #316; orchestrator operating prompt

## Control State

TODO Mirror: active-required-items
Reconciliation: current

### Required Workflow Items
- `init` | `resolved` | `activity`
- `planning` | `resolved` | `activity`
- `planning-docs-review` | `resolved` | `activity`
- `implementation` | `resolved` | `activity`
- `final-review` | `resolved` | `activity`
- `final-pr` | `pending` | `activity`

### Configured Procedure Items
- `procedure:planning-review` | `resolved` | `procedure`
- `procedure:final-review` | `resolved` | `procedure`
