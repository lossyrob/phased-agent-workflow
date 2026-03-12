# WorkflowContext

Work Title: Plan Deliverables Must Exist
Work ID: plan-deliverable-verification
Base Branch: main
Target Branch: fix/282-plan-deliverables-review-gaps
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
Custom Workflow Instructions: PAW Lite bugfix flow: skip work shaping and spec; create a light plan; implement issue #282 directly; run a quick single-model review; then create the final PR.
Initial Prompt: Fix issue #282 so paw-implement, paw-impl-review, and paw-final-review treat ImplementationPlan deliverables as a contract and catch missing planned outputs before PR creation.
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/282
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: none
