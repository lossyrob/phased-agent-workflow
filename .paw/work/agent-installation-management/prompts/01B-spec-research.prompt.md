---
agent: PAW-01B Spec Researcher
---

# Spec Research Prompt: Agent Installation Management

Perform research to answer the following questions.

Target Branch: feature/agent-installation-management
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/36
Additional Inputs: none

## Questions

1. **VS Code Profile Folder Location**: What is the API to programmatically determine the current VS Code profile's folder path? What are the fallback behaviors if profile support is unavailable or the API changes?

2. **Extension Activation Events**: When exactly does the VS Code extension `activate()` function get called during initial installation vs during extension updates/upgrades? Is there a way to detect if activation is happening due to an upgrade vs first install?

3. **File System Error Handling**: What are the expected behaviors when the extension cannot write to the profile's `prompts/` directory (permissions issues, disk full, directory locked)? Should the extension fail silently, show warnings, or block activation?

4. **Atomic File Operations**: If the extension needs to write multiple agent files during activation, what happens if the process is interrupted (VS Code crash, system shutdown)? Should partial installations be detected and cleaned up on next activation?

5. **Agent File Discovery**: How does VS Code's GitHub Copilot discover and load agent definition files (`.agent.md`) from the profile's `prompts/` directory? Is there a refresh mechanism, or are files loaded only at VS Code startup?

6. **Migration and Cleanup**: If agent names or filenames change between PAW versions, what is the safest approach to remove outdated agent files while preserving any user customizations in separate instruction files?

7. **Version String Format**: The spec note shows version format as "PAW Planner – v0.4.0" in the YAML description field. Are there any VS Code or Copilot constraints on description field length or format that could affect version display?

### Optional External / Context

1. **VS Code Profile System**: What are the documented behaviors and limitations of VS Code's profile system regarding extension data storage and profile switching? (Documentation link: https://code.visualstudio.com/docs/editor/profiles)

2. **Custom Instructions Best Practices**: Are there community patterns or recommendations for structuring markdown-based instruction files that get composed/merged? (e.g., heading structure conventions, conflict resolution approaches)

3. **Extension Update Patterns**: What are common patterns used by other VS Code extensions for managing bundled content that needs to be "installed" into user-accessible locations during activation?
