# WorkflowContext

Work Title: Review Authorization Audit
Work ID: paw-backlog-2026-07-22a-312
Workflow Identity: paw-lite
Base Branch: main
Target Branch: feature/paw-backlog-2026-07-22a-312
Execution Mode: worktree
Repository Identity: github.com/lossyrob/phased-agent-workflow@87f5ac2f13a439d68b5c111fbee05d0d77e21ace
Execution Binding: worktree:paw-backlog-2026-07-22a-312:feature/paw-backlog-2026-07-22a-312
Workflow Mode: custom
Review Strategy: local
Review Policy: final-pr-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: society-of-thought
Final Review Interactive: false
Final Review Models: none
Final Review Specialists: adaptive:5
Final Review Interaction Mode: parallel
Final Review Specialist Models: claude-opus-4.8
Final Review Perspectives: auto
Final Review Perspective Cap: 2
Implementation Model: none
Plan Generation Mode: single-model
Plan Generation Models: none
Planning Docs Review: enabled
Planning Review Mode: society-of-thought
Planning Review Interactive: false
Planning Review Models: none
Planning Review Specialists: adaptive:5
Planning Review Interaction Mode: parallel
Planning Review Specialist Models: claude-opus-4.8
Planning Review Perspectives: auto
Planning Review Perspective Cap: 2
Custom Workflow Instructions: Audit PAW Review as a platform-neutral authorization policy. GitHub executable review submission is in scope. Add capability-aware Azure DevOps preflight and authorization semantics without implementing ADO APIs, which remain scoped to issues #313-#316. Do not modify issues #303 or #313-#321.
Initial Prompt: Implement GitHub issue #312, preserving pending-by-default review behavior while making explicit user-authorized submission executable after target and head verification.
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/312
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: Orchestrated backlog run paw-backlog-2026-07-22a; reviewer address review:paw-backlog-2026-07-22a:issue-312

## Control State

TODO Mirror: active-required-items
Reconciliation: not_run

### Required Workflow Items
- `init` | `resolved` | `activity`
- `planning` | `pending` | `activity`
- `planning-docs-review` | `pending` | `activity`
- `implementation` | `pending` | `activity`
- `final-review` | `pending` | `activity`
- `final-pr` | `pending` | `activity`

### Configured Procedure Items
- `procedure:planning-review` | `pending` | `procedure`
- `procedure:final-review` | `pending` | `procedure`
