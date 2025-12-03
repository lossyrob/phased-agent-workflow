---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Workflow Init Improvements

Perform research to answer the following questions.

Target Branch: fix/new-paw-workflow-improvements
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/121
Additional Inputs: none

## Questions

### Internal (Codebase)

1. How does the workflow initialization prompt template currently instruct the agent to fetch issue titles? What mechanism is used (MCP tools, fetch, etc.)?

2. What validation is currently performed on branch names in `userInput.ts`? What characters are allowed?

3. How do downstream PAW agents access WorkflowContext.md fields? Do they parse the file directly or use a tool?

4. What is the current flow for deriving Work Title from branch names in `workItemInitPrompt.template.md`?

5. Are there any existing mechanisms for checking remote branch names or naming conventions?

### Optional External / Context

1. What are common branch naming conventions in open-source projects (prefixes like feature/, bugfix/, patterns)?

2. Are there any VS Code extension APIs for prompting users within the chat panel rather than input boxes?
