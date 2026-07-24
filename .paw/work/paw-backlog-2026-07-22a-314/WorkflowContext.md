# WorkflowContext

Work Title: Azure DevOps Review Context
Work ID: paw-backlog-2026-07-22a-314
Workflow Identity: paw-lite
Base Branch: main
Target Branch: feature/paw-backlog-2026-07-22a-314
Execution Mode: worktree
Repository Identity: github.com-lossyrob/lossyrob/phased-agent-workflow@87f5ac2f13a439d68b5c111fbee05d0d77e21ace
Execution Binding: worktree:paw-backlog-2026-07-22a-314:feature/paw-backlog-2026-07-22a-314
Workflow Mode: custom
Review Strategy: local
Review Policy: final-pr-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: society-of-thought
Final Review Interactive: false
Final Review Models: ignored
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
Planning Review Models: ignored
Planning Review Specialists: adaptive:5
Planning Review Interaction Mode: parallel
Planning Review Specialist Models: claude-opus-4.8
Planning Review Perspectives: auto
Planning Review Perspective Cap: 2
Custom Workflow Instructions: Implement production PAW Review Azure DevOps authentication and read-context support without posting or voting.
Initial Prompt: Implement issue #314 using the verified capability report, live runtime validation, platform-neutral review context mapping, explicit evidence states, and actionable content-type-aware failures.
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/314
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: Canonical capability report at issue #313 comment 5071936021

## Control State

TODO Mirror: active-required-items
Reconciliation: current

### Required Workflow Items
- `init` | `resolved` | `activity`
- `planning` | `resolved` | `activity`
- `planning-docs-review` | `resolved` | `activity`
- `implementation` | `resolved` | `activity`
- `final-review` | `in_progress` | `activity`
- `final-pr` | `pending` | `activity`

### Configured Procedure Items
- `procedure:planning-review` | `resolved` | `procedure`
- `procedure:final-review` | `in_progress` | `procedure`
