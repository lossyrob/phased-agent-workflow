# WorkflowContext

Work Title: Work Item Parsing
Feature Slug: work-item-parsing
Target Branch: fix/work-item-parsing
Workflow Mode: minimal
Review Strategy: local
Handoff Mode: auto
Initial Prompt: Bug where Azure DevOps work item URLs starting with "https://msdata.visualstudio.com/Database%20Systems" don't validate correctly. Consider removing procedural validation in favor of agent reasoning - let the agent try to fetch and handle errors gracefully rather than blocking on validation.
Issue URL: none
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
