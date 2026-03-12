# WorkflowContext

Work Title: Scratch Ignore Markers Stay Local
Work ID: scratch-ignore-markers-local-only
Base Branch: main
Target Branch: fix/286-scratch-ignore-markers-local-only
Workflow Mode: custom
Review Strategy: local
Review Policy: final-pr-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: single-model
Final Review Interactive: false
Final Review Models: none
Plan Generation Mode: single-model
Plan Generation Models: none
Planning Docs Review: disabled
Planning Review Mode: none
Planning Review Interactive: none
Planning Review Models: none
Custom Workflow Instructions: PAW Lite bugfix flow: skip work shaping and spec; create a light plan; implement issue #286 directly; run a quick single-model review; then create the final PR.
Initial Prompt: Fix issue #286 so PAW scratch ignore markers remain local-only, are never intentionally committed, and are removed from the index before commit or PR creation if they become tracked.
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/286
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: none
