---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: PAW Context Tool for Custom Instructions

Perform research to answer the following questions.

Target Branch: feature/custom-agent-instructions
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/86
Additional Inputs: none

## Questions

1. What is the VS Code Language Model Tool API for registering and implementing custom tools that agents can call? What are the required methods, parameters, and return types?

2. How is the existing `paw_create_prompt_templates` tool implemented in the codebase? What patterns, interfaces, and conventions should be followed for consistency?

3. What is the expected structure and format for custom instruction files (`.paw/instructions/<agent>-instructions.md` and `~/.paw/instructions/<agent>-instructions.md`)? Are there existing examples or conventions?

4. What should the tool's response schema be? What fields should be included for workspace instructions, user instructions, and workspace metadata?

5. How do VS Code language model tools handle and report errors? What error response format should be used when files are missing or inaccessible?

6. What are the platform-specific user directory paths for Linux, macOS, and Windows? How should the tool resolve `~/.paw/instructions/` on each platform?

### Optional External / Context

1. Are there VS Code extension API best practices or examples for language model tools that we should reference?

2. Are there security considerations for reading custom instruction files (e.g., preventing path traversal, limiting file sizes)?
