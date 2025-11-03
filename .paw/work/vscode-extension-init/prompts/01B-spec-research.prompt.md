---
mode: 'PAW-01B Spec Research Agent'
---
# Spec Research Prompt: VS Code Extension - PAW Work Item Initializer

Perform research to answer the following questions. These are in addition to the questions that have already been answered in the prior research run, which produced SpecResearch.md. Update SpecResearch.md with any new findings.

Target Branch: feature/vscode-extension-init
GitHub Issue: https://github.com/lossyrob/phased-agent-workflow/issues/35
Additional Inputs: paw-specification.md

## Questions

1. **PAW Directory Structure**: What is the complete, exact directory structure and file list that should exist after work item initialization? (Refer to paw-specification.md for authoritative structure; document all required files with their purposes)

2. **Prompt Template Structure**: What is the exact frontmatter structure and content template for each of the 9 prompt template files? (List all 9 files with their file names, frontmatter requirements, and minimal content structure)

3. **WorkflowContext.md Format**: What is the exact format and required fields for WorkflowContext.md as specified in paw-specification.md? (Include field names, default values, optional vs required fields, and example content)

4. **Feature Slug Normalization Rules**: What are the complete, step-by-step normalization rules for converting arbitrary branch names or titles into valid feature slugs? (Document all transformation steps: case conversion, character replacement, trimming, length limits, reserved names)

5. **Feature Slug Validation Rules**: What are all the validation constraints that a feature slug must satisfy before being accepted? (Character set, length, format patterns, forbidden values, uniqueness requirements)

6. **Work Title Generation**: When a GitHub issue URL is provided, how should the Work Title be extracted from the issue title? When no issue is provided, how should Work Title be generated from the target branch name? (Document transformation rules and examples)

7. **Git Repository Detection**: What are the reliable methods to detect if the current VS Code workspace is a git repository? (File system checks, git commands, VS Code API capabilities)

8. **Uncommitted Changes Detection**: How should the extension or agent detect uncommitted changes in the git repository before branch operations? (Git commands, VS Code Git extension integration, expected output formats)

9. **Agent Mode Invocation**: What is the exact API signature and parameters for `vscode.commands.executeCommand("workbench.action.chat.open")` when invoking agent mode? (Required parameters, optional parameters, prompt structure, return value/behavior)

10. **Output Channel Logging**: What are the best practices for creating and writing to VS Code output channels for extension logging? (Creation API, write methods, log levels, timestamp formatting)

### Optional External / Context

1. **VS Code Extension Activation Events**: What activation events should be used for a command-only extension to ensure it activates when needed but doesn't impact startup performance?

2. **GitHub API Rate Limiting**: What are GitHub API rate limits for unauthenticated requests when fetching issue titles, and what are best practices for handling rate limit errors gracefully?

3. **Extension Packaging Requirements**: What are the minimal required fields in package.json for a VS Code extension that registers commands?

4. **Error Message Best Practices**: What are user experience best practices for displaying error messages in VS Code extensions (error dialog vs status bar vs output channel)?
