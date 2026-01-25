---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Exclude PAW Artifacts

Perform research to answer the following questions.

Target Branch: feature/130-exclude-paw-artifacts
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/130
Additional Inputs: none

## Agent Notes

The feature introduces artifact tracking control at two points:
1. During workflow initialization (new Quick Pick prompt)
2. Mid-workflow via a new command ("PAW: Stop Tracking Artifacts")

The Issue provides clear design direction:
- Use `.paw/work/<work-id>/.gitignore` with content `*` as the mechanism
- Prompt placement: after handoff mode selection in the initialization sequence
- Command implementation: `git rm --cached -r` followed by `.gitignore` creation

Key implementation files identified:
- `src/ui/userInput.ts` - User input collection including workflow initialization prompts
- `src/prompts/workflowInitPrompt.ts` - Constructs the agent prompt from collected inputs
- `src/commands/` - Contains existing VS Code command implementations

The specification needs to understand which agents commit artifacts so we can determine the scope of agent instruction updates needed.

## Questions

1. Which PAW agents (in `agents/` directory) contain instructions to commit, stage, or push workflow artifacts (files in `.paw/work/<work-id>/`)? List each agent and the relevant instruction text.

2. How do existing VS Code commands in `src/commands/` detect and validate the current workflow context? What patterns are used to identify the active work ID?

3. Does the workflow initialization prompt template (`src/prompts/workflowInitPrompt.template.md`) have a structure that would accommodate a new template variable for artifact tracking preference? What other conditional sections already exist?

4. Are there any existing patterns in the codebase for agents checking filesystem markers (like `.gitignore` or other indicator files) to modify behavior?

5. How is the workflow directory path (`.paw/work/<work-id>/`) computed or accessed in the extension code? Is there a utility function that resolves this path?

### Optional External / Context

1. Are there any best practices or conventions for using `.gitignore` within subdirectories to exclude only that subdirectory's contents?
