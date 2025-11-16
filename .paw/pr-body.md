# [Agent Installation Management] Phase 1: Codebase Refactoring

## Overview

This PR implements Phase 1 of the Agent Installation Management feature: refactoring the PAW codebase to use a flat, extension-centric directory structure. This establishes the foundation for the agent installation system by consolidating agent files and eliminating duplicate agents during PAW development.

## Changes Made

### Directory Structure Refactoring
- **Moved agent files**: `.github/agents/*.agent.md` → `agents/*.agent.md` (15 agent files)
- **Flattened extension structure**: Moved all `vscode-extension/` contents to repository root
- **Consolidated configuration**: Merged `vscode-extension/package.json` into root `package.json`
- **Updated documentation**: Integrated extension README into main README.md

### File Updates
- **Source code**: Moved `vscode-extension/src/` → `src/` (all TypeScript files)
- **Scripts**: Updated `build-vsix.sh` and `lint-agent.sh` for new structure
- **VS Code configs**: Updated `.vscode/launch.json` and `.vscode/tasks.json`
- **Build configs**: Updated paths in `tsconfig.json`, `.eslintrc.json`, `.vscodeignore`
- **GitHub workflows**: Updated `pr-checks.yml` to reference new paths
- **Cleanup**: Removed redundant `README_vscode.md`, added `.vscode-test/` to `.gitignore`

## Benefits Achieved

✅ **Single source of truth** for agent templates (bundled in extension)  
✅ **Eliminates duplicate agents** when developing PAW with PAW  
✅ **Standard VS Code extension structure** (repository IS the extension)  
✅ **Simplified build process** (no copying agents between directories)

## Verification

### Automated Tests ✓
- TypeScript compilation: `npm run compile` ✓
- Unit tests: `npm test` - **31 passing** ✓
- VSIX packaging: `npm run package` ✓

### Code Quality ✓
- No references to old paths (`vscode-extension/`, `.github/agents/`) in source code
- All agent files present in `agents/` directory
- Clean git history with clear commit messages

## Implementation Plan Reference

This PR implements Phase 1 as specified in `.paw/work/agent-installation-management/ImplementationPlan.md`.

**Key accomplishments:**
- [x] Moved agent files from `.github/agents/` to `agents/`
- [x] Flattened `vscode-extension/` directory to root
- [x] Merged package.json files
- [x] Updated all file paths in source, scripts, and configs
- [x] Consolidated documentation
- [x] All automated verification passed

## Testing Notes

To test this PR:
1. Checkout the branch: `git checkout feature/agent-installation-management_phase1-v2`
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build VSIX: `npm run package`
5. Install VSIX in VS Code and verify extension loads without errors

## Next Steps

After this PR is merged, Phase 2 will implement:
- Platform detection module (OS/variant detection)
- Agent template loader (load from bundled `agents/` directory)
- Prompts directory path resolution

---

🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)

## Related

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/36
- Implementation Plan: `.paw/work/agent-installation-management/ImplementationPlan.md`
