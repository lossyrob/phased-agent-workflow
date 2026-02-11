# Research Questions — Artifact Lifecycle Management

**Target Branch**: feature/artifact-lifecycle-management
**Issue URL**: https://github.com/lossyrob/phased-agent-workflow/issues/220

## Agent Notes

This feature replaces the boolean `artifact_tracking` setting with a three-mode `artifact_lifecycle` setting. The researcher should focus on understanding current artifact tracking behavior across all touchpoints so the spec can enumerate what needs to change.

## Internal System Questions

1. How does `paw-init` currently handle the `artifact_tracking` parameter? What code paths differ between `enabled` and `disabled`? What does the WorkflowContext.md template look like for this field?

2. How does `paw-pr` (final PR creation) currently handle artifacts? Does it reference artifact tracking? What git operations does it perform related to `.paw/work/` files?

3. How does `paw-git-operations` handle artifact staging? What logic determines whether `.paw/` files are staged in commits?

4. How does the VS Code extension's "Stop Tracking Artifacts" command work? What exact git operations does it perform? (Look for stop-tracking related code in `src/` and `vscode-extension/`)

5. Where in the codebase is `artifact_tracking` referenced — agents, skills, tools, extension code? What is the full surface area of code that reads or acts on this setting?

6. How does `paw-transition` handle artifact tracking? The transition skill mentions `artifact_tracking` in its response — what does it communicate and how is it used?

7. How does `paw-impl-review` handle artifacts — does it stage/commit artifact changes as part of its flow?

8. What does the current `paw-specification.md` say about artifact tracking? How is it documented in the user-facing docs?
