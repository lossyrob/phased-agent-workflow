# PAW Workflow Extension

Automates Phased Agent Workflow (PAW) work item initialization in VS Code.

## Features

- **Initialize Work Item**: Create complete PAW work item structure with a single command
- **Automatic Directory Setup**: Creates `.paw/work/<feature-slug>/` with all required files
- **Git Integration**: Automatically creates and checks out target branch
- **GitHub Integration**: Optionally fetches issue metadata to populate Work Title

## Usage

1. Open a workspace with a git repository
2. Run command: `PAW: Initialize Work Item` from the command palette
3. Provide target branch name (e.g., `feature/my-feature`)
4. Optionally provide GitHub issue URL
5. Select git remote (if multiple configured)

The extension will create:
- `.paw/work/<feature-slug>/` directory
- `WorkflowContext.md` with workflow metadata
- `prompts/` subdirectory with 9 template files
- Empty `Spec.md` file
- Target git branch (created and checked out)

## Requirements

- VS Code 1.85.0 or higher
- Git installed and configured
- Workspace must be a git repository

## Extension Settings

This extension does not contribute any VS Code settings.

## Known Issues

None currently.

## Release Notes

### 0.1.0

Initial release with work item initialization command.
