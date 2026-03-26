# WorkflowContext

Work Title: Loosen CLI Worktree Contract
Work ID: issue-295-cli-worktree-contract
Base Branch: main
Target Branch: feature/295-loosen-cli-worktree-contract
Execution Mode: worktree
Repository Identity: github.com/lossyrob/phased-agent-workflow@87f5ac2f13a439d68b5c111fbee05d0d77e21ace
Execution Binding: worktree:issue-295-cli-worktree-contract:feature/295-loosen-cli-worktree-contract
Workflow Mode: custom
Review Strategy: local
Review Policy: final-pr-only
Session Policy: continuous
Final Agent Review: enabled
Final Review Mode: multi-model
Final Review Interactive: false
Final Review Models: claude-opus-4.6, gpt-5.4
Final Review Specialists: all
Final Review Interaction Mode: parallel
Final Review Specialist Models: none
Final Review Perspectives: none
Final Review Perspective Cap: 2
Implementation Model: none
Plan Generation Mode: single-model
Plan Generation Models: gpt-5.4
Planning Docs Review: enabled
Planning Review Mode: single-model
Planning Review Interactive: false
Planning Review Models: gpt-5.4
Planning Review Specialists: all
Planning Review Interaction Mode: parallel
Planning Review Specialist Models: none
Planning Review Perspectives: none
Planning Review Perspective Cap: 2
Custom Workflow Instructions: Use PAW-lite stages plan -> implement -> review -> PR to loosen the CLI dedicated-worktree contract so CLI may operate on a proven execution worktree without requiring the session cwd to be inside that worktree.
Initial Prompt: Implement issue #295 to loosen the CLI dedicated-worktree contract for Copilot CLI.
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/295
Remote: origin
Artifact Lifecycle: commit-and-clean
Artifact Paths: auto-derived
Additional Inputs: none
