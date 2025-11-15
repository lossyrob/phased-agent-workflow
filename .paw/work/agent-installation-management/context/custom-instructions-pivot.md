# Custom Instructions Scope Pivot

## Context

During planning PR review for agent installation management (PR #85), it became clear that the custom instructions capability was incorrectly scoped as part of the agent installation feature.

## The Problem

The original plan included custom instructions composition logic where:
1. Agent files would be composed with workspace-level instructions (`.paw/instructions/`)
2. Agent files would be composed with user-level instructions (`~/.paw/instructions/`)
3. The composed content would be written to the user's prompts directory

**This approach is fundamentally flawed because:**

- Agent files in the user directory (`~/.config/Code/User/prompts/`) are **global** and shared across all workspaces
- Composing workspace-specific custom instructions into these global agent files means that **project-specific customizations would leak into unrelated workspaces**
- When a user opens a different project, they would see instructions from the previous project embedded in the agents
- The installation logic would need to re-compose agents every time the workspace changes, which is inefficient and error-prone

## The Correct Approach

Custom instructions should be handled **orthogonally** to agent installation through a PAW Context tool:

1. **Agents remain generic**: Agent files installed to the user directory contain only the base PAW instructions without any project-specific customizations
2. **PAW Context Tool**: A new language model tool (similar to `paw_create_prompt_templates`) that agents can call to retrieve context about the current workspace
3. **Runtime composition**: When an agent runs, it calls the PAW Context tool which returns:
   - Workspace-specific custom instructions (if any)
   - User-level custom instructions (if any)
   - Current workspace metadata
   - Any other relevant context
4. **Benefits**:
   - Agents remain workspace-agnostic
   - Custom instructions are loaded dynamically at runtime for the correct workspace
   - No need to reinstall or recompose agents when switching workspaces
   - Cleaner separation of concerns

## Implementation Strategy

This pivot requires two pieces of work:

1. **Remove custom instructions from agent installation management** (this work item #36):
   - Remove User Story P3 and all references to custom instructions
   - Remove composition logic from the implementation plan
   - Remove FR-006, FR-007, FR-008 requirements
   - Simplify installer to only write base agent templates
   - Remove `customInstructions.ts` module creation

2. **Create separate feature for PAW Context tool** (new work item):
   - Define specification for PAW Context tool
   - Design tool interface and response format
   - Implement workspace and user-level instruction loading
   - Update agent templates to document how to use the PAW Context tool
   - Add instructions to agent preambles on when/how to call the context tool

## Scope Impact

**Agent Installation Management (Issue #36) becomes simpler:**
- Phase 1: Platform detection, path resolution, agent bundling
- Phase 2: Installation logic, version tracking (no composition)
- Phase 3: Update and migration

**New Feature (Custom Instructions Tool):**
- Design PAW Context tool API
- Implement instruction discovery and loading
- Test workspace isolation
- Document usage patterns for agents

## Migration Path

Since this pivot happens during planning (before implementation), there is no code to migrate. We simply:

1. Update the planning artifacts to remove custom instructions
2. Create a new issue for the PAW Context tool
3. Proceed with simplified agent installation implementation
4. Implement PAW Context tool as follow-up work

## References

- Planning PR: #85
- Original Issue: #36
- Review Comment: "The custom instructions logic doesn't make sense here. The agent files in the user directory should not be overwritten with project-specific custom instructions."
