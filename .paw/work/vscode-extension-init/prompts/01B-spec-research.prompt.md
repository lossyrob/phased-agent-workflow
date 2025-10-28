---
mode: 'PAW-01B Spec Research Agent'
---
# Spec Research Prompt: VS Code Extension Init

Perform research to answer the following questions.

Target Branch: feature/vscode-extension-init
GitHub Issue: 35
Additional Inputs: none

## Questions

1. What are the exact template files and their content that should be generated during PAW work item initialization? Examine existing `.paw/work/` directories and prompt files.

2. What is the current directory structure convention for PAW work items? Document the expected folder hierarchy under `.paw/work/<work-item-name>/`.

3. What are the specific fields, format, and validation rules for WorkflowContext.md? Include required vs optional fields and their data types.

4. How should PAW agents detect and parse workflow context? What is the expected file parsing logic and error handling for missing or malformed context files?

5. What are the different PAW workflow stages and phases? How should the extension determine current stage/phase from the file system state?

6. What branch naming conventions and Git workflow patterns are expected for PAW work items?

### Optional External / Context

1. VS Code Language Model Tool API best practices for custom tools
2. VS Code extension security considerations for Git operations and file system access
3. TypeScript/JavaScript project structure conventions for VS Code extensions