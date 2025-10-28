---
mode: PAW-01A Spec Agent
---

Create spec for .paw/work/vscode-extension-init/WorkflowContext.md

## Implementation Architecture Constraint

**CRITICAL**: This extension follows an **agent-driven architecture**, NOT a procedural implementation approach.

**Extension Code Responsibilities (Minimal)**:
- Register the "PAW: Initialize Work Item" command in VS Code
- Collect user input parameters (target branch name, GitHub issue URL) via VS Code input boxes
- Optionally fetch GitHub issue title via API for Work Title generation
- Construct a comprehensive prompt containing all collected parameters and context
- Invoke GitHub Copilot agent mode via `vscode.commands.executeCommand("workbench.action.chat.open", { query: prompt, mode: "agent" })`
- Provide output channel logging for transparency

**Agent Mode Responsibilities (via Prompt)**:
- Feature slug normalization and validation (following PAW rules, see paw-specification.md)
- Workspace and git repository validation
- Conflict detection and resolution (directory conflicts, branch conflicts)
- Directory structure creation (`.paw/work/<slug>/` and `prompts/` subdirectory)
- WorkflowContext.md generation with all parameters
- All 9 prompt template files generation with correct frontmatter
- Git operations (branch creation, checkout, uncommitted changes detection)
- File opening (WorkflowContext.md in editor)
- User interaction for conflict resolution (via agent's quick-pick/dialog capabilities)

**Key Principle**: The extension's role is to **orchestrate** by gathering inputs and delegating the complex work to an AI agent via a well-crafted prompt. The spec should describe **observable behaviors and outcomes** from the user's perspective, not implementation details about whether extension code or agent code performs each action.
