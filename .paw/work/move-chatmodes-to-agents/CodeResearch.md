---
date: 2025-11-13 12:10:54 EST
git_commit: ef12abe41a5894fa7091d47d97ac6ba6a26cc11c
branch: maintenance/chatmodes-to-agents
repository: phased-agent-workflow
topic: "Rename chatmodes to agents following VS Code 1.106 terminology change"
tags: [research, codebase, chatmode, agent, vscode, file-rename, api-update]
status: complete
last_updated: 2025-11-13
---

# Research: Rename chatmodes to agents following VS Code 1.106 terminology change

**Date**: 2025-11-13 12:10:54 EST
**Git Commit**: ef12abe41a5894fa7091d47d97ac6ba6a26cc11c
**Branch**: maintenance/chatmodes-to-agents
**Repository**: phased-agent-workflow

## Research Question

Identify all locations where "chatmode" terminology is used in the codebase and documentation, and understand how to rename them to "agents" following VS Code 1.106's terminology change (https://code.visualstudio.com/updates/v1_106#_chat-modes-renamed-to-custom-agents). This includes file extensions, directory names, code references, documentation, and prompt template frontmatter.

## Summary

The PAW project uses "chatmode" terminology extensively across file extensions (`.chatmode.md`), directory names (`.github/chatmodes/`), code comments and variables, documentation, and prompt template frontmatter (`mode:` field). The research identified five primary categories of changes needed:

1. **File Extensions**: 15 `.chatmode.md` files in `.github/chatmodes/` need renaming to `.agent.md`
2. **Directory Names**: The `.github/chatmodes/` directory should become `.github/agents/`
3. **Code References**: TypeScript code in `vscode-extension/` contains comments and variable names referencing "chatmode"
4. **Documentation**: Multiple markdown files (README.md, DEVELOPING.md, .github/copilot-instructions.md, specification files, and work artifacts) reference "chatmode"
5. **Prompt Template Frontmatter**: 108+ `.prompt.md` files use `mode:` frontmatter field which should become `agent:`
6. **Build Scripts**: `scripts/lint-chatmode.sh` and related npm scripts need renaming

The changes are straightforward renames with no API changes required - VS Code handles both old and new terminology during the transition period.

## Detailed Findings

### File Extensions and Directory Structure

**Location**: `.github/chatmodes/`

The project contains 15 chatmode definition files with `.chatmode.md` extension:

```
.github/chatmodes/
├── PAW-01A Spec Agent.chatmode.md
├── PAW-01B Spec Research Agent.chatmode.md
├── PAW-02A Code Researcher.chatmode.md
├── PAW-02B Impl Planner.chatmode.md
├── PAW-03A Implementer.chatmode.md
├── PAW-03B Impl Reviewer.chatmode.md
├── PAW-04 Documenter.chatmode.md
├── PAW-05 PR.chatmode.md
├── PAW-R1A Understanding Agent.chatmode.md
├── PAW-R1B Baseline Researcher Agent.chatmode.md
├── PAW-R2A Impact Analysis Agent.chatmode.md
├── PAW-R2B Gap Analysis Agent.chatmode.md
├── PAW-R3A Feedback Generation Agent.chatmode.md
├── PAW-R3B Feedback Critic.chatmode.md
└── PAW-X Status Update.chatmode.md
```

**Change Required**: 
- Rename all `.chatmode.md` files to `.agent.md`
- Rename directory from `.github/chatmodes/` to `.github/agents/`

### Code References in TypeScript

**Location**: `vscode-extension/src/tools/createPromptTemplates.ts`

Lines 78-93 contain comments and documentation references to "chatmode":

```typescript
/** The chatmode to invoke (e.g., "PAW-01A Spec Agent") */
mode: string;

/**
 * Template definition for a single prompt file.
 * ...
 * - mode: The chatmode to invoke (corresponds to .github/chatmodes/*.chatmode.md)
 * ...
 */

/**
 * Creates a markdown file with frontmatter specifying the chatmode and a body
 * ...
 * @param mode - The chatmode to invoke (e.g., "PAW-01A Spec Agent")
 */
```

**Change Required**: Update comments to reference "agent" instead of "chatmode" and update path references from `.github/chatmodes/*.chatmode.md` to `.github/agents/*.agent.md`

**Location**: `vscode-extension/src/test/suite/errorHandling.test.ts:86`

```typescript
test('Agent chatmode files validate workflow mode at runtime', () => {
```

**Change Required**: Update test name and potentially test implementation to reference "agent files" instead of "chatmode files"

### Build Scripts and npm Scripts

**Location**: `scripts/lint-chatmode.sh`

The entire script is dedicated to linting chatmode files:

```bash
#!/bin/bash
# Lint chatmode files for token size
# Usage: ./scripts/lint-chatmode.sh [file.chatmode.md]
#        If no file is provided, lints all chatmodes in .github/chatmodes/
```

Lines 63-75 contain directory and file pattern references:

```bash
echo "Linting all chatmode files in .github/chatmodes/"
local chatmode_dir=".github/chatmodes"
if [[ ! -d "$chatmode_dir" ]]; then
    echo -e "${RED}ERROR: Directory not found: $chatmode_dir${NC}"
    exit 1
fi
local files=("$chatmode_dir"/*.chatmode.md)
if [[ ! -e "${files[0]}" ]]; then
    echo -e "${YELLOW}WARNING: No chatmode files found in $chatmode_dir${NC}"
    exit 0
fi
```

**Change Required**: 
- Rename script to `lint-agent.sh`
- Update all references from `.github/chatmodes/` to `.github/agents/`
- Update file pattern from `*.chatmode.md` to `*.agent.md`
- Update error/info messages to reference "agent" instead of "chatmode"

**Location**: `package.json:7-8`

```json
"scripts": {
  "lint:chatmode": "./scripts/lint-chatmode.sh",
  "lint:chatmode:all": "./scripts/lint-chatmode.sh"
}
```

**Change Required**: Rename npm scripts to `lint:agent` and `lint:agent:all`, update path to new script name

### Documentation Files

**Location**: `README.md`

Line 77 contains installation instructions:

```markdown
- Copy the .github/chatmodes into your repository's `.github/chatmodes` folder. This will make them available in VS Code's Github Copilot chat.
  - *Make them apply to all projects by copying to VS Code's global configuration directory (e.g. on Windows `%APPDATA%\Code\User\prompts`).*
```

**Change Required**: Update references to `.github/agents/` directory and clarify new terminology

**Location**: `DEVELOPING.md`

Lines 22-47 contain the "Chatmode Linting" section:

```markdown
### Chatmode Linting

Chatmode files should be kept within reasonable token limits to ensure they work effectively with language models.

**Script**: `scripts/lint-chatmode.sh`

**Usage**:
```bash
# Lint all chatmode files in .github/chatmodes/
./scripts/lint-chatmode.sh

# Lint a specific chatmode file
./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A.chatmode.md
```
...
**Best Practices**:
- Keep chatmode files focused and concise
...
- Run the linter before committing changes to chatmode files
```

Lines 138-144 reference chatmode in project structure:

```markdown
- Chatmode file linting (token limits)
...
- `.github/chatmodes/` - Contains chatmode definitions for different agents
```

**Change Required**: Update section title to "Agent Linting", update all script references, file paths, and terminology from "chatmode" to "agent"

**Location**: `.github/copilot-instructions.md`

Lines 5-9 contain development instructions:

```markdown
## Chatmode Development

When creating or modifying chatmode files in `.github/chatmodes/`, ALWAYS run the chatmode linter script:

```bash
./scripts/lint-chatmode.sh .github/chatmodes/<filename>.chatmode.md
```
```

**Change Required**: Update section title, directory references, and script references to use "agent" terminology

### Specification and Work Artifact Documentation

**Location**: `paw-specification.md:170-179`

```markdown
/.github/chatmodes                       # chat-mode prompts (final outputs of this work)
  PAW-01A Spec Agent.chatmode.md
  PAW-01B Spec Research Agent.chatmode.md
  PAW-02A Code Research Agent.chatmode.md
  PAW-02B Impl Plan Agent.chatmode.md
  PAW-03A Impl Agent.chatmode.md
  PAW-03B Impl Review Agent.chatmode.md
  PAW-04 Documentation Agent.chatmode.md
  PAW-05 PR Agent.chatmode.md
  PAW-0X Status Agent.chatmode.md
```

Line 214:

```markdown
> The following "agents" are implemented as **Copilot Agent Mode chat modes** in `.github/chatmodes/` using the `PAW-XX` naming scheme.
```

Line 336:

```markdown
* **(Optional)** Create WorkflowContext.md to centralize parameters and eliminate repetition across stages. Refer to the minimal inline format provided in each chatmode instruction for the structure.
```

**Change Required**: Update directory path, file extensions, comment text, and all terminology references from "chatmode" to "agent"

**Location**: `paw-review-specification.md:266,279`

```markdown
- Target mode: "PAW-R1B Baseline Researcher Agent"
...
**Purpose:** Flexible guidance (not rigid template) to help baseline researcher identify critical questions about pre-change system. The PAW-R1B Baseline Researcher Agent chatmode defines its own output format, so the prompt does not include output format instructions.
```

**Change Required**: Update "mode" to "agent" in context and update terminology in description

**Location**: `.paw/work/spec-narrative-section/` (multiple files)

Multiple references in `Docs.md`, `CodeResearch.md`, prompts, and other work artifacts reference "chatmode" extensively. Example from `Docs.md:9`:

```markdown
This enhancement modifies only the Spec Agent chatmode file (`.github/chatmodes/PAW-01A Spec Agent.chatmode.md`), which serves as the single source of truth for the spec template.
```

**Change Required**: Update all references in work artifacts to use new terminology and paths (note: these are historical artifacts and may not require updates depending on project policy)

### Prompt Template Frontmatter

**Pattern**: All prompt template files (108+ instances) use YAML frontmatter with `mode:` field

Example from `.paw/work/spec-narrative-section/prompts/03C-pr-review.prompt.md:2`:

```yaml
---
mode: PAW-03A Implementer
---
```

Examples across the codebase:
- `.paw/work/move-chatmodes-to-agents/prompts/02A-code-research.prompt.md:2`
- `.paw/work/vscode-extension-init/prompts/02A-code-research.prompt.md:2`
- `.paw/work/simplified-workflow/prompts/03B-review.prompt.md:2`
- And 100+ more instances

**Change Required**: Update all `mode:` fields to `agent:` in prompt template frontmatter

### TypeScript Prompt Template Generation

**Location**: `vscode-extension/src/tools/createPromptTemplates.ts:231-244`

The `generatePromptTemplate` function generates prompt files with `mode:` frontmatter:

```typescript
function generatePromptTemplate(
  mode: string,
  instruction: string,
  featureSlug: string
): string {
  return `---\nmode: ${mode}\n---\n\n${instruction} .paw/work/${featureSlug}/WorkflowContext.md\n`;
}
```

**Change Required**: Update template generation to use `agent:` instead of `mode:` in frontmatter

**Location**: `vscode-extension/src/prompts/workItemInitPrompt.template.md:62,85,87,91,95,109,134`

References to "Workflow Mode" are distinct from "chatmode" - these refer to PAW's workflow modes (full/minimal/custom) and should NOT be changed:

```markdown
Workflow Mode: {{WORKFLOW_MODE}}
...
Determine which stages to include based on the workflow mode:

**Workflow Mode: full**
...
**Workflow Mode: minimal**
...
**Workflow Mode: custom**
```

**No Change Required**: "Workflow Mode" is different from "chatmode" and refers to PAW's internal workflow configuration

## Code References

### Primary File Locations

- `.github/chatmodes/*.chatmode.md` (15 files) - Agent definition files
- `vscode-extension/src/tools/createPromptTemplates.ts:78,93,231,234` - TypeScript code comments and template generation
- `vscode-extension/src/test/suite/errorHandling.test.ts:86` - Test name
- `scripts/lint-chatmode.sh` (entire file) - Linting script for agent files
- `package.json:7-8` - npm script definitions
- `README.md:77` - Installation instructions
- `DEVELOPING.md:22-47,138-144` - Development documentation
- `.github/copilot-instructions.md:5-9` - Copilot instructions
- `paw-specification.md:170-179,214,336` - Project specification
- `paw-review-specification.md:266,279` - Review workflow specification
- `**/*.prompt.md` (108+ files) - Prompt template frontmatter fields

### Grep Search Patterns Used

To find all references, these patterns were used:
- `chatmode` (case-insensitive) - Found references in markdown, TypeScript, bash scripts
- `\.chatmode\.md` - Found file extension references in code
- `mode:` in `.prompt.md` files - Found frontmatter field usage

## Architecture Documentation

### Current Implementation Pattern

The project uses a file-based agent definition system where:
1. Agent definitions are stored as markdown files in `.github/chatmodes/`
2. Each agent file has a `.chatmode.md` extension
3. VS Code's GitHub Copilot reads these files to provide custom agents
4. Prompt templates reference agents using `mode:` frontmatter field
5. The VS Code extension generates prompt templates programmatically
6. A linting script validates agent files for token count limits

### Extension Architecture

The `createPromptTemplates` function in `vscode-extension/src/tools/createPromptTemplates.ts` generates prompt files with frontmatter that references agents. The PROMPT_TEMPLATES array (lines 96-156) defines template metadata including the `mode` field which specifies which agent to invoke.

### Linting Architecture

The `scripts/lint-chatmode.sh` script uses Node.js with `@dqbd/tiktoken` to count tokens in agent files and enforce limits:
- Warning threshold: 3,500 tokens
- Error threshold: 6,500 tokens
- Uses `gpt-4o-mini` model for token counting

## Open Questions

1. **Backward Compatibility**: Should we maintain any references to old "chatmode" terminology for backward compatibility, or can we do a complete rename?
   - According to VS Code 1.106 release notes, both terminologies are supported during transition

2. **Historical Artifacts**: Should work artifacts in `.paw/work/*/` directories be updated, or should they remain as historical records?
   - These represent past research and may not need updates unless actively maintained

3. **User Documentation**: Do we need migration notes for users who have copied `.github/chatmodes/` to their repositories?
   - Yes, users should be informed about the rename and provided migration instructions

4. **Global Configuration**: The README mentions copying to VS Code's global configuration directory (`%APPDATA%\Code\User\prompts` on Windows) - does this path change with the new terminology?
   - This should be verified against VS Code 1.106 documentation
