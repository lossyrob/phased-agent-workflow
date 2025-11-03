# PAW Workflow Extension

Streamline your Phased Agent Workflow (PAW) development with automated work item initialization.

## Features

- **Initialize Work Item**: One command to create complete PAW directory structure
  - Creates `.paw/work/<feature-slug>/` with WorkflowContext.md
  - Generates all 9 prompt template files
  - Creates and checks out git branch
  - Opens WorkflowContext.md for immediate editing

## Usage

1. Open a git repository in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "PAW: Initialize Work Item"
4. Enter target branch name (e.g., `feature/my-feature`)
5. Optionally enter issue or work item URL (GitHub Issues or Azure DevOps Work Items supported)
6. Watch as your work item structure is created automatically

## Custom Instructions

You can tailor the initialization workflow for your project by providing optional custom instructions.

### Setup

1. Create the directory:
  ```bash
  mkdir -p .paw/instructions
  ```
2. Create the instructions file:
  ```bash
  touch .paw/instructions/init-instructions.md
  ```
3. Add your project-specific guidance using Markdown. Refer to `vscode-extension/examples/init-instructions.example.md` for a template.

### What You Can Customize

- Naming conventions for feature slugs and branches
- Required metadata that must appear in `WorkflowContext.md`
- Additional prompt templates beyond the standard nine
- Integration requirements (for example, mandatory issue or work item URLs)

When present, the extension injects the instructions into the agent prompt so the Copilot agent follows both the PAW defaults and your project rules. If the file is missing or empty, initialization proceeds with the standard behavior.

## Requirements

- Git repository
- GitHub Copilot extension installed and active

## Extension Settings

This extension contributes no settings in v0.0.1.

## Known Issues

None reported yet. Please file issues at: https://github.com/lossyrob/phased-agent-workflow/issues

## Release Notes

### 0.0.1

Initial release:
- PAW: Initialize Work Item command
- Automated directory structure creation
- Git branch creation and checkout
