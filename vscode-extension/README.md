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
5. Optionally enter GitHub issue URL
6. Watch as your work item structure is created automatically

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
