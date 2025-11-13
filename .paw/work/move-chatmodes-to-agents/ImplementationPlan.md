# Move Chatmodes to Agents Implementation Plan

## Overview

Rename all "chatmode" terminology to "agents" following VS Code 1.106's terminology change. This includes file extensions (`.chatmode.md` → `.agent.md`), directory names (`.github/chatmodes/` → `.github/agents/`), code references, documentation, prompt template frontmatter (`mode:` → `agent:`), and build scripts.

## Current State Analysis

The PAW project currently uses "chatmode" terminology extensively:
- **Agent Definition Files**: 15 `.chatmode.md` files in `.github/chatmodes/` directory
- **Code References**: TypeScript code in `vscode-extension/src/tools/createPromptTemplates.ts` contains comments and variable names referencing "chatmode"
- **Build Scripts**: `scripts/lint-chatmode.sh` and npm scripts in `package.json`
- **Documentation**: Multiple markdown files reference old terminology
- **Prompt Templates**: 108+ `.prompt.md` files use `mode:` frontmatter field
- **VS Code Support**: According to the 1.106 release notes, both terminologies are supported during transition

### Key Discoveries:
- File renames follow a consistent pattern: `.chatmode.md` → `.agent.md`
- Directory rename is straightforward: `.github/chatmodes/` → `.github/agents/`
- Code template generation at `vscode-extension/src/tools/createPromptTemplates.ts:243`
- Linting script references at `scripts/lint-chatmode.sh:63-75`
- npm scripts at `package.json:7-8`
- "Workflow Mode" is distinct from "chatmode" and should NOT be changed

## Desired End State

After completion:
- All agent definition files use `.agent.md` extension in `.github/agents/` directory
- All code references use "agent" terminology
- Build script renamed to `lint-agent.sh` with updated paths
- Documentation updated to reference new terminology and paths
- All prompt templates use `agent:` frontmatter field instead of `mode:`
- VS Code extension generates prompt templates with `agent:` field
- All tests pass and linter validates agent files correctly

### Verification:
- [ ] Directory `.github/agents/` exists with 15 `.agent.md` files
- [ ] No `.chatmode.md` files remain in the repository
- [ ] No references to `.github/chatmodes/` in code or documentation
- [ ] All prompt templates use `agent:` frontmatter
- [ ] Linter script works with new paths and file extensions
- [ ] VS Code recognizes the agent files
- [ ] All automated tests pass

## What We're NOT Doing

- NOT changing "Workflow Mode" terminology (this refers to PAW's full/minimal/custom modes, not chatmodes)
- NOT updating historical work artifacts in `.paw/work/*/` unless they are actively maintained documentation
- NOT modifying the core functionality or behavior of agents
- NOT changing any API signatures or interfaces
- NOT creating migration tools for external users (this is internal maintenance)

## Implementation Approach

Perform a systematic rename in stages:
1. File system changes (directory and file renames)
2. Code reference updates (TypeScript and tests)
3. Build script updates (rename and update paths)
4. Documentation updates (user-facing docs)
5. Prompt template updates (all `.prompt.md` frontmatter)
6. Final verification (tests and manual checks)

This approach ensures each type of change is completed atomically and can be verified independently.

---

## Phase 1: File System Reorganization

### Overview
Rename the agent definition directory and all agent definition files. This is the foundational change that all other updates depend on.

### Changes Required:

#### 1. Directory Rename
**Directory**: `.github/chatmodes/`
**Changes**: Rename to `.github/agents/`

```bash
git mv .github/chatmodes .github/agents
```

#### 2. Agent Definition Files
**Files**: All 15 `.chatmode.md` files in `.github/agents/`
**Changes**: Rename each file from `.chatmode.md` to `.agent.md`

```bash
# Rename all agent definition files
cd .github/agents
git mv "PAW-01A Spec Agent.chatmode.md" "PAW-01A Spec Agent.agent.md"
git mv "PAW-01B Spec Research Agent.chatmode.md" "PAW-01B Spec Research Agent.agent.md"
git mv "PAW-02A Code Researcher.chatmode.md" "PAW-02A Code Researcher.agent.md"
git mv "PAW-02B Impl Planner.chatmode.md" "PAW-02B Impl Planner.agent.md"
git mv "PAW-03A Implementer.chatmode.md" "PAW-03A Implementer.agent.md"
git mv "PAW-03B Impl Reviewer.chatmode.md" "PAW-03B Impl Reviewer.agent.md"
git mv "PAW-04 Documenter.chatmode.md" "PAW-04 Documenter.agent.md"
git mv "PAW-05 PR.chatmode.md" "PAW-05 PR.agent.md"
git mv "PAW-R1A Understanding Agent.chatmode.md" "PAW-R1A Understanding Agent.agent.md"
git mv "PAW-R1B Baseline Researcher Agent.chatmode.md" "PAW-R1B Baseline Researcher Agent.agent.md"
git mv "PAW-R2A Impact Analysis Agent.chatmode.md" "PAW-R2A Impact Analysis Agent.agent.md"
git mv "PAW-R2B Gap Analysis Agent.chatmode.md" "PAW-R2B Gap Analysis Agent.agent.md"
git mv "PAW-R3A Feedback Generation Agent.chatmode.md" "PAW-R3A Feedback Generation Agent.agent.md"
git mv "PAW-R3B Feedback Critic.chatmode.md" "PAW-R3B Feedback Critic.agent.md"
git mv "PAW-X Status Update.chatmode.md" "PAW-X Status Update.agent.md"
cd ../..
```

### Success Criteria:

#### Automated Verification:
- [ ] Directory exists: `test -d .github/agents`
- [ ] No old directory: `test ! -d .github/chatmodes`
- [ ] Correct file count: `[ $(ls -1 .github/agents/*.agent.md | wc -l) -eq 15 ]`
- [ ] No old extensions: `[ $(find .github/agents -name "*.chatmode.md" | wc -l) -eq 0 ]`
- [ ] Git status shows renames: `git status --short | grep "^R"`

#### Manual Verification:
- [ ] All 15 agent files are present in `.github/agents/`
- [ ] File names match expected pattern: `PAW-*.agent.md`
- [ ] No `.chatmode.md` files remain anywhere in the repository

---

## Phase 2: Code Reference Updates

### Overview
Update TypeScript code to reference "agent" instead of "chatmode" and update path references to `.github/agents/`.

### Changes Required:

#### 1. Type Definition and Comments
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**: Update comments and documentation

**Line 78**: Change comment from "The chatmode to invoke" to "The agent to invoke"

```typescript
/** The agent to invoke (e.g., "PAW-01A Spec Agent") */
mode: string;
```

**Lines 87-93**: Update JSDoc comments to reference agents

```typescript
/**
 * Template definition for a single prompt file.
 * 
 * Each template includes:
 * - filename: The exact filename to use
 * - mode: The agent to invoke (corresponds to .github/agents/*.agent.md)
 * - instruction: The action the agent should perform
 * - stage: The workflow stage this template belongs to
 */
```

**Lines 231-237**: Update function JSDoc

```typescript
/**
 * Generate content for a single prompt template file.
 * 
 * Creates a markdown file with frontmatter specifying the agent and a body
 * that references the WorkflowContext.md file for the feature.
 * 
 * @param mode - The agent to invoke (e.g., "PAW-01A Spec Agent")
 * @param instruction - The instruction for the agent (e.g., "Create spec from")
 * @param featureSlug - The feature slug to reference in the template body
 * @returns The complete file content with frontmatter and body
 */
```

**Line 243**: Update template generation to use `agent:` frontmatter

```typescript
return `---\nagent: ${mode}\n---\n\n${instruction} .paw/work/${featureSlug}/WorkflowContext.md\n`;
```

#### 2. Test Code Updates
**File**: `vscode-extension/src/test/suite/errorHandling.test.ts`
**Changes**: Update test name

**Line 86**: Change test name

```typescript
test('Agent files validate workflow mode at runtime', () => {
```

### Success Criteria:

#### Automated Verification:
- [ ] No references to "chatmode" in TypeScript: `! grep -r "chatmode" vscode-extension/src/*.ts`
- [ ] No references to `.github/chatmodes/`: `! grep -r "\.github/chatmodes" vscode-extension/src/`
- [ ] Template generates `agent:`: `grep "agent:" vscode-extension/src/tools/createPromptTemplates.ts`
- [ ] TypeScript compiles: `cd vscode-extension && npm run compile`
- [ ] Unit tests pass: `cd vscode-extension && npm test`

#### Manual Verification:
- [ ] All comments in TypeScript reference "agent" not "chatmode"
- [ ] JSDoc documentation is clear and accurate
- [ ] Test names reflect new terminology

---

## Phase 3: Build Script Updates

### Overview
Rename the linting script and update its internal references, then update npm scripts to use the new script name.

### Changes Required:

#### 1. Script File Rename
**File**: `scripts/lint-chatmode.sh`
**Changes**: Rename to `scripts/lint-agent.sh`

```bash
git mv scripts/lint-chatmode.sh scripts/lint-agent.sh
```

#### 2. Script Content Updates
**File**: `scripts/lint-agent.sh`
**Changes**: Update all internal references

**Lines 2-4**: Update header comment

```bash
#!/bin/bash
# Lint agent files for token size
# Usage: ./scripts/lint-agent.sh [file.agent.md]
#        If no file is provided, lints all agents in .github/agents/
```

**Lines 64-77**: Update directory references and messages

```bash
if [[ $# -eq 0 ]]; then
    # No arguments: lint all agents
    echo "Linting all agent files in .github/agents/"
    echo ""
    
    local agent_dir=".github/agents"
    if [[ ! -d "$agent_dir" ]]; then
        echo -e "${RED}ERROR: Directory not found: $agent_dir${NC}"
        exit 1
    fi
    
    local files=("$agent_dir"/*.agent.md)
    if [[ ! -e "${files[0]}" ]]; then
        echo -e "${YELLOW}WARNING: No agent files found in $agent_dir${NC}"
        exit 0
    fi
```

#### 3. npm Scripts
**File**: `package.json`
**Changes**: Update script names and paths

**Lines 7-8**: Rename scripts and update paths

```json
"scripts": {
  "lint:agent": "./scripts/lint-agent.sh",
  "lint:agent:all": "./scripts/lint-agent.sh"
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Script exists: `test -f scripts/lint-agent.sh`
- [ ] Old script removed: `test ! -f scripts/lint-chatmode.sh`
- [ ] Script is executable: `test -x scripts/lint-agent.sh`
- [ ] Script runs successfully: `npm run lint:agent`
- [ ] All agents pass linting: `./scripts/lint-agent.sh`
- [ ] npm scripts are valid: `npm run lint:agent:all`

#### Manual Verification:
- [ ] Script output messages reference "agent" not "chatmode"
- [ ] Error messages reference correct paths
- [ ] Linter correctly validates all 15 agent files

---

## Phase 4: Documentation Updates

### Overview
Update all user-facing documentation to reference the new terminology and paths.

### Changes Required:

#### 1. Main README
**File**: `README.md`
**Changes**: Update installation instructions

**Line 77**: Update directory reference

```markdown
- Copy the .github/agents into your repository's `.github/agents` folder. This will make them available in VS Code's Github Copilot chat as custom agents.
  - *Make them apply to all projects by copying to VS Code's global configuration directory (e.g. on Windows `%APPDATA%\Code\User\prompts`).*
```

#### 2. Development Guide
**File**: `DEVELOPING.md`
**Changes**: Update section title, script references, and paths

**Lines 22-47**: Update "Chatmode Linting" section to "Agent Linting"

```markdown
### Agent Linting

Agent files should be kept within reasonable token limits to ensure they work effectively with language models.

**Script**: `scripts/lint-agent.sh`

**Usage**:
```bash
# Lint all agent files in .github/agents/
./scripts/lint-agent.sh

# Lint a specific agent file
./scripts/lint-agent.sh .github/agents/PAW-01A.agent.md
```

**npm Scripts**:
```bash
# Lint all agents
npm run lint:agent:all

# Or just
npm run lint:agent
```

**Token Limits**:
- **Warning threshold**: 3,500 tokens
- **Error threshold**: 6,500 tokens

**Best Practices**:
- Keep agent files focused and concise
- Run the linter before committing changes to agent files
```

**Lines 138-144**: Update project structure reference

```markdown
- Agent file linting (token limits)
...
- `.github/agents/` - Contains agent definitions for different PAW agents
```

#### 3. Copilot Instructions
**File**: `.github/copilot-instructions.md`
**Changes**: Update section title and script path

**Lines 5-13**: Update section

```markdown
## Agent Development

When creating or modifying agent files in `.github/agents/`, ALWAYS run the agent linter script:

```bash
./scripts/lint-agent.sh .github/agents/<filename>.agent.md
```
```

#### 4. PAW Specification
**File**: `paw-specification.md`
**Changes**: Update directory structure, file extensions, and terminology

**Lines 170-179**: Update directory structure

```markdown
/.github/agents                          # custom agent prompts (final outputs of this work)
  PAW-01A Spec Agent.agent.md
  PAW-01B Spec Research Agent.agent.md
  PAW-02A Code Research Agent.agent.md
  PAW-02B Impl Plan Agent.agent.md
  PAW-03A Impl Agent.agent.md
  PAW-03B Impl Review Agent.agent.md
  PAW-04 Documentation Agent.agent.md
  PAW-05 PR Agent.agent.md
  PAW-0X Status Agent.agent.md
```

**Line 214**: Update terminology

```markdown
> The following "agents" are implemented as **Copilot custom agents** in `.github/agents/` using the `PAW-XX` naming scheme.
```

**Line 336**: Update reference

```markdown
* **(Optional)** Create WorkflowContext.md to centralize parameters and eliminate repetition across stages. Refer to the minimal inline format provided in each agent instruction for the structure.
```

#### 5. PAW Review Specification
**File**: `paw-review-specification.md`
**Changes**: Update field name and terminology

**Line 266**: Update field name

```markdown
- Target agent: "PAW-R1B Baseline Researcher Agent"
```

**Line 279**: Update terminology

```markdown
**Purpose:** Flexible guidance (not rigid template) to help baseline researcher identify critical questions about pre-change system. The PAW-R1B Baseline Researcher Agent defines its own output format, so the prompt does not include output format instructions.
```

### Success Criteria:

#### Automated Verification:
- [ ] No "chatmode" references in docs: `! grep -i "chatmode" README.md DEVELOPING.md .github/copilot-instructions.md`
- [ ] No old directory refs: `! grep "\.github/chatmodes" *.md`
- [ ] Correct new paths: `grep "\.github/agents" README.md`
- [ ] Markdown links valid: `npx markdown-link-check README.md` (if available)

#### Manual Verification:
- [ ] Installation instructions are clear and accurate
- [ ] Development guide script examples work correctly
- [ ] Specification diagrams and structure are consistent
- [ ] All terminology is updated throughout documentation

---

## Phase 5: Prompt Template Updates

### Overview
Update all 108+ prompt template files to use `agent:` frontmatter field instead of `mode:`.

### Changes Required:

#### 1. Find All Prompt Templates
**Pattern**: All `.prompt.md` files in `.paw/work/*/prompts/`
**Changes**: Replace `mode:` with `agent:` in YAML frontmatter

```bash
# Find all prompt template files and update frontmatter
find .paw/work -name "*.prompt.md" -type f -exec sed -i 's/^mode:/agent:/' {} \;
```

#### 2. Verify Common Patterns
**Examples of files to update**:
- `.paw/work/move-chatmodes-to-agents/prompts/02A-code-research.prompt.md`
- `.paw/work/move-chatmodes-to-agents/prompts/02B-impl-plan.prompt.md`
- All other `.prompt.md` files in `.paw/work/*/prompts/` directories

**Before**:
```yaml
---
mode: PAW-02A Code Researcher
---
```

**After**:
```yaml
---
agent: PAW-02A Code Researcher
---
```

### Success Criteria:

#### Automated Verification:
- [ ] No `mode:` in prompt files: `! grep -r "^mode:" .paw/work/*/prompts/*.prompt.md`
- [ ] All use `agent:`: `grep -r "^agent:" .paw/work/*/prompts/*.prompt.md | wc -l` equals total count
- [ ] YAML frontmatter is valid: Check random samples parse correctly
- [ ] Pattern matches expectation: `find .paw/work -name "*.prompt.md" | wc -l` equals 108+

#### Manual Verification:
- [ ] Sample 5-10 prompt files and verify frontmatter is correct
- [ ] Frontmatter format is consistent across all files
- [ ] No other frontmatter fields were accidentally modified

---

## Phase 6: Final Verification and Validation

### Overview
Comprehensive testing to ensure all changes work correctly and nothing was missed.

### Changes Required:

#### 1. Run All Automated Tests
**Commands**: Execute full test suite

```bash
# TypeScript compilation
cd vscode-extension
npm run compile

# Run all tests
npm test

# Return to root
cd ..

# Lint all agents
npm run lint:agent:all
```

#### 2. Search for Remaining References
**Commands**: Verify no old terminology remains

```bash
# Search for "chatmode" in all files (excluding git history and node_modules)
! grep -r "chatmode" --exclude-dir=node_modules --exclude-dir=.git .

# Search for old directory path
! grep -r "\.github/chatmodes" --exclude-dir=node_modules --exclude-dir=.git .

# Search for old file extension
! find . -name "*.chatmode.md" -type f

# Verify new patterns exist
grep -r "\.github/agents" README.md
find .github/agents -name "*.agent.md" | wc -l  # Should be 15
```

#### 3. Manual VS Code Verification
**Steps**: Test in actual VS Code environment

1. Open the repository in VS Code
2. Open GitHub Copilot Chat
3. Verify custom agents are available in agent selector
4. Test invoking one of the agents
5. Verify agent responds correctly

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `cd vscode-extension && npm run compile`
- [ ] All unit tests pass: `cd vscode-extension && npm test`
- [ ] All agents pass linting: `npm run lint:agent:all`
- [ ] No "chatmode" references: `! grep -r "chatmode" --exclude-dir=node_modules --exclude-dir=.git .`
- [ ] No old directory refs: `! grep -r "\.github/chatmodes" --exclude-dir=node_modules --exclude-dir=.git .`
- [ ] No old file extensions: `! find . -name "*.chatmode.md"`
- [ ] New directory exists: `test -d .github/agents`
- [ ] Correct agent count: `[ $(ls -1 .github/agents/*.agent.md | wc -l) -eq 15 ]`
- [ ] All prompt templates updated: `! grep -r "^mode:" .paw/work/*/prompts/*.prompt.md`

#### Manual Verification:
- [ ] VS Code recognizes the custom agents in Copilot Chat
- [ ] Agent selector shows all 15 PAW agents
- [ ] Agents can be invoked and respond correctly
- [ ] No console errors when loading agents
- [ ] Documentation reads clearly with new terminology
- [ ] Installation instructions work for fresh setup

---

## Testing Strategy

### Unit Tests:
- Existing TypeScript unit tests in `vscode-extension/src/test/suite/`
- Test prompt template generation with new `agent:` frontmatter
- Verify error handling test still validates workflow mode correctly

### Integration Tests:
- End-to-end test of agent linting script
- Test VS Code extension loading and recognizing agents
- Verify prompt template generation creates correct files

### Manual Testing Steps:
1. Clone the repository fresh to a new location
2. Follow installation instructions from README.md
3. Verify agents appear in VS Code Copilot Chat
4. Invoke each agent and verify functionality
5. Run linting script on all agents
6. Generate prompt templates using VS Code extension command
7. Verify generated templates use `agent:` frontmatter

## Performance Considerations

This is a pure rename operation with no performance implications. The changes are:
- File system operations (renames) - one-time cost
- Text replacements in code and documentation - no runtime impact
- Build script execution remains the same speed
- VS Code agent loading should be identical to before

## Migration Notes

**For Users Who Have Copied `.github/chatmodes/`:**

If you have previously copied the `.github/chatmodes/` directory to your repository or VS Code global configuration:

1. Rename your directory from `.github/chatmodes/` to `.github/agents/`
2. Rename all `.chatmode.md` files to `.agent.md`
3. Update any custom prompt templates to use `agent:` instead of `mode:` in frontmatter
4. If using the linting script, update to the new `lint-agent.sh` name

VS Code 1.106+ supports both old and new terminology during the transition period, so existing setups will continue to work, but updating is recommended.

## Phase 7: Remove Redundant "Agent" Suffixes from Names

**Status**: Complete

### Overview

Now that files are explicitly `.agent.md`, the word "Agent" in agent names is redundant. Remove "Agent" suffix from 7 agent names for clarity and conciseness.

### Files to Rename

**Agent Definition Files (7 renames):**
1. `PAW-01A Spec Agent.agent.md` → `PAW-01A Specification.agent.md`
2. `PAW-01B Spec Research Agent.agent.md` → `PAW-01B Spec Researcher.agent.md`
3. `PAW-R1A Understanding Agent.agent.md` → `PAW-R1A Understanding.agent.md`
4. `PAW-R1B Baseline Researcher Agent.agent.md` → `PAW-R1B Baseline Researcher.agent.md`
5. `PAW-R2A Impact Analysis Agent.agent.md` → `PAW-R2A Impact Analyzer.agent.md`
6. `PAW-R2B Gap Analysis Agent.agent.md` → `PAW-R2B Gap Analyzer.agent.md`
7. `PAW-R3A Feedback Generation Agent.agent.md` → `PAW-R3A Feedback Generator.agent.md`

**Already correct (no changes needed):**
- PAW-02A Code Researcher
- PAW-02B Impl Planner
- PAW-03A Implementer
- PAW-03B Impl Reviewer
- PAW-04 Documenter
- PAW-05 PR
- PAW-R3B Feedback Critic
- PAW-X Status Update

### References to Update

**Documentation Files:**
1. `paw-specification.md` - Update agent names in directory structure and agent descriptions
2. `paw-review-specification.md` - Update review agent names throughout
3. `README.md` - Update any agent name references
4. `DEVELOPING.md` - Update any agent name references

**TypeScript Code:**
- `vscode-extension/src/tools/createPromptTemplates.ts` - Update `mode` field values in PROMPT_TEMPLATES array

**Prompt Templates (excluding .paw/work/):**
- No prompt templates exist outside of `.paw/work/` - skip this step

**Test Files:**
- `vscode-extension/src/test/suite/createPromptTemplates.test.ts` - Update test assertions to use new agent names

### Implementation Steps

1. **Rename Agent Files** (7 files)
   ```bash
   cd .github/agents
   git mv "PAW-01A Spec Agent.agent.md" "PAW-01A Specification.agent.md"
   git mv "PAW-01B Spec Research Agent.agent.md" "PAW-01B Spec Researcher.agent.md"
   git mv "PAW-R1A Understanding Agent.agent.md" "PAW-R1A Understanding.agent.md"
   git mv "PAW-R1B Baseline Researcher Agent.agent.md" "PAW-R1B Baseline Researcher.agent.md"
   git mv "PAW-R2A Impact Analysis Agent.agent.md" "PAW-R2A Impact Analyzer.agent.md"
   git mv "PAW-R2B Gap Analysis Agent.agent.md" "PAW-R2B Gap Analyzer.agent.md"
   git mv "PAW-R3A Feedback Generation Agent.agent.md" "PAW-R3A Feedback Generator.agent.md"
   ```

2. **Update TypeScript Code**
   - Update `vscode-extension/src/tools/createPromptTemplates.ts` PROMPT_TEMPLATES array
   - Update test assertions in test files

3. **Update Documentation**
   - Update `paw-specification.md` with new names
   - Update `paw-review-specification.md` with new review agent names
   - Update README.md and DEVELOPING.md if they reference specific agent names

4. **Verify Changes**
   - Run linter on all agents
   - Run all TypeScript tests
   - Verify agent files are recognized in VS Code
   - Search for any remaining old names

### Verification Checklist

- [x] All 7 agent files renamed successfully
- [x] TypeScript code uses new agent names
- [x] All documentation updated
- [x] All tests pass
- [x] Linter works with new names
- [x] No references to old names remain (excluding `.paw/work/`)

### Notes

- Skip updating `.paw/work/` directory - these are historical work artifacts
- The `.agent.md` extension makes the role clear without needing "Agent" in the name
- Consistency: Most agents already use active role names (Implementer, Documenter, Reviewer)

### Phase 7 Implementation Complete

**Date**: 2025-11-13

Successfully renamed 7 agent files to remove redundant "Agent" suffix:
- PAW-01A Specification
- PAW-01B Spec Researcher  
- PAW-R1A Understanding
- PAW-R1B Baseline Researcher (already correct, no change)
- PAW-R2A Impact Analyzer
- PAW-R2B Gap Analyzer
- PAW-R3A Feedback Generator

Updated all TypeScript code references in:
- `vscode-extension/src/tools/createPromptTemplates.ts` (PROMPT_TEMPLATES array and JSDoc comments)
- `vscode-extension/src/test/suite/createPromptTemplates.test.ts` (test assertions)

Updated documentation in:
- `paw-specification.md` (agent names in directory structure)
- `paw-review-specification.md` (all review agent references)
- `.github/agents/PAW-R2A Impact Analyzer.agent.md` (cross-reference to PAW-R2B)

**Verification Results:**
- ✅ All 31 tests pass
- ✅ TypeScript compiles without errors
- ✅ All 15 agents pass linting
- ✅ No old agent name references remain in active codebase (historical artifacts in `docs/` and `.paw/work/` intentionally preserved)

**Review Notes:**
The new names are clearer and more concise. The `.agent.md` extension already indicates these are agents, so removing the redundant "Agent" suffix improves readability while maintaining consistency with agents that already use active role names.

---

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/83
- VS Code 1.106 Release Notes: https://code.visualstudio.com/updates/v1_106#_chat-modes-renamed-to-custom-agents
- Research: `.paw/work/move-chatmodes-to-agents/CodeResearch.md`
- WorkflowContext: `.paw/work/move-chatmodes-to-agents/WorkflowContext.md`

---

## Implementation Complete

**Date**: 2025-11-13
**Commit**: 9b9dd7c

### Summary

All phases successfully completed in a single implementation session:

1. ✅ **Phase 1: File System Reorganization** - Renamed directory and all 15 agent files
2. ✅ **Phase 2: Code Reference Updates** - Updated TypeScript code and tests
3. ✅ **Phase 3: Build Script Updates** - Renamed linter script and npm scripts
4. ✅ **Phase 4: Documentation Updates** - Updated all documentation files
5. ✅ **Phase 5: Prompt Template Updates** - Updated 92 prompt templates
6. ✅ **Phase 6: Final Verification** - All tests passing, no old references remain

### Verification Results

**Automated Verification:**
- ✅ Directory `.github/agents/` exists with 15 `.agent.md` files
- ✅ No `.chatmode.md` files remain in the repository
- ✅ No references to `.github/chatmodes/` in code or documentation
- ✅ All 92 prompt templates use `agent:` frontmatter
- ✅ Linter script works with new paths and file extensions
- ✅ All 31 automated tests pass
- ✅ TypeScript compiles without errors
- ✅ All agents pass linting (8 warnings for token count, but within acceptable limits)

### Manual Verification

- ✅ All 15 agent files present in `.github/agents/`
- ✅ File names match expected pattern: `PAW-*.agent.md`
- ✅ No `chatmode` references in source files (excluding VS Code test installation)
- ✅ Script output messages reference "agent" not "chatmode"
- ✅ npm scripts work correctly

### Notes for Future Phases

No additional phases required. The implementation is complete and ready for review.

**Review Tasks:**
- Verify that the changes align with VS Code 1.106 terminology standards
- Confirm that all agent files are recognized by VS Code as custom agents
- Check that the updated documentation is clear for users migrating from old terminology
