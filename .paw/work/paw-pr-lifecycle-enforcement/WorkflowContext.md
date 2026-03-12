# WorkflowContext

Work Title: PAW PR Lifecycle Enforcement
Work ID: paw-pr-lifecycle-enforcement
Base Branch: main
Target Branch: feature/paw-pr-lifecycle-enforcement
Workflow Mode: custom
Review Strategy: local
Review Policy: final-pr-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: multi-model
Final Review Interactive: smart
Final Review Models: claude-opus-4.6-1m, gpt-5.3-codex
Plan Generation Mode: single-model
Plan Generation Models: none
Planning Docs Review: disabled
Planning Review Mode: none
Planning Review Interactive: none
Planning Review Models: none
Custom Workflow Instructions: Ad-hoc PAW Lite workflow: skip work shaping; create a light plan; implement issue #284 directly; run only the final multi-model review; then create the final PR.
Initial Prompt: Fix issue #284 so commit-and-clean artifact lifecycle is enforced at the paw-pr boundary and not bypassed when creating the final PR.
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/284
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: none
