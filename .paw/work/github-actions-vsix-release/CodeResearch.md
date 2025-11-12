---
date: 2025-11-11 13:22:16 EST
git_commit: c17f29c594fffc298c1cb3163cabec3789a69da8
branch: feature/github-actions-vsix-release
repository: phased-agent-workflow
topic: "GitHub Actions Workflow for Automated VSIX Release"
tags: [research, codebase, github-actions, vsix, release-automation, ci-cd, vscode-extension]
status: complete
last_updated: 2025-11-11
---

# Research: GitHub Actions Workflow for Automated VSIX Release

**Date**: 2025-11-11 13:22:16 EST
**Git Commit**: c17f29c594fffc298c1cb3163cabec3789a69da8
**Branch**: feature/github-actions-vsix-release
**Repository**: phased-agent-workflow

## Research Question

What is the current state of the VS Code extension build process, packaging configuration, and CI/CD infrastructure to inform the implementation of a GitHub Actions workflow that automatically builds and releases VSIX packages when version tags are pushed?

## Summary

The phased-agent-workflow repository contains a VS Code extension located in the `vscode-extension/` directory. The extension is already configured with build scripts and VSIX packaging capabilities using the `@vscode/vsce` tool. Currently, there are **no GitHub Actions workflows** in place, providing a clean slate for implementing the automated release workflow.

The extension uses TypeScript with a standard VS Code extension structure, compiles to the `out/` directory, and already has a `package` script that creates VSIX files. The build process is well-defined with npm scripts for compilation, testing, and packaging. All necessary tooling (`@vscode/vsce`) is already installed as a dev dependency.

## Detailed Findings

### Extension Configuration and Metadata

**Location**: `vscode-extension/package.json`

The extension manifest defines the following key metadata that will be used in the release workflow:

- **Name**: `paw-workflow` (internal name)
- **Display Name**: `PAW Workflow`
- **Description**: "Phased Agent Workflow tooling for VS Code - streamlines work item initialization"
- **Version**: `0.0.1` (current version)
- **Publisher**: `paw-workflow`
- **Repository**: 
  - Type: `git`
  - URL: `https://github.com/lossyrob/phased-agent-workflow`
- **License**: `MIT`
- **VS Code Engine**: `^1.85.0` (minimum supported version)

The package.json follows standard VS Code extension conventions with:
- `main` entry point at `./out/extension.js` (compiled TypeScript output)
- `activationEvents` is empty (lazy activation)
- Commands registered under `contributes.commands`
- Language model tools registered under `contributes.languageModelTools`

**Key insight**: The extension name in package.json is `paw-workflow`, so the generated VSIX filename will follow the pattern `paw-workflow-<version>.vsix` (e.g., `paw-workflow-0.0.1.vsix`).

### Build Scripts and Commands

**Location**: `vscode-extension/package.json:61-68`

The extension defines the following npm scripts:

```json
"scripts": {
  "vscode:prepublish": "npm run compile",
  "compile": "tsc -p ./",
  "watch": "tsc -watch -p ./",
  "pretest": "npm run compile",
  "test": "node ./out/test/runTest.js",
  "lint": "eslint src --ext ts",
  "package": "vsce package"
}
```

**Critical scripts for the workflow**:
- `compile`: Runs TypeScript compiler (`tsc -p ./`) to build the extension
- `package`: Runs `vsce package` to create the VSIX file
- `vscode:prepublish`: Automatically runs before packaging (ensures compilation)

**Build sequence for GitHub Actions**:
1. Install dependencies: `npm install` (in `vscode-extension/` directory)
2. Compile TypeScript: `npm run compile` (or rely on `vscode:prepublish`)
3. Package VSIX: `npm run package`

The output will be a `.vsix` file in the `vscode-extension/` directory.

### TypeScript Compilation Configuration

**Location**: `vscode-extension/tsconfig.json`

The TypeScript compiler is configured with:

```jsonc
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",          // Compiled output goes to out/
    "lib": ["ES2020"],
    "sourceMap": true,        // Generates .map files for debugging
    "rootDir": "src",         // Source files in src/
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", ".vscode-test", "out"]
}
```

**Key details**:
- Source files are in `src/` directory
- Compiled JavaScript output goes to `out/` directory
- Source maps are generated (useful for debugging but excluded from final VSIX)

### VSIX Packaging Tool

**Location**: `vscode-extension/package.json:78`

The `@vscode/vsce` package is installed as a dev dependency:

```json
"devDependencies": {
  "@vscode/vsce": "^2.22.0",
  // ... other dependencies
}
```

**Current installed version**: The `package-lock.json` shows `@vscode/vsce` version `2.32.0` is actually installed (via `vscode-extension/package-lock.json:678-711`).

The `vsce` command-line tool is available via npm scripts and will be used in the GitHub Actions workflow. The tool:
- Reads `package.json` for extension metadata
- Compiles if needed (via `vscode:prepublish` script)
- Bundles extension files according to `.vscodeignore` rules
- Creates a `.vsix` file (ZIP archive with VS Code extension structure)

### VSIX Content Filtering

**Location**: `vscode-extension/.vscodeignore`

The `.vscodeignore` file defines which files are **excluded** from the VSIX package:

```ignore
.vscode/**
.vscode-test/**
src/**                     # Source TypeScript files excluded
!src/prompts/workItemInitPrompt.template.md  # Exception: this template is included
.gitignore
.eslintrc.json
**/*.map                   # Source maps excluded
**/*.ts                    # TypeScript files excluded
**/tsconfig.json           # Config files excluded
node_modules/**            # Dependencies excluded (except @types/vscode)
!node_modules/@types/vscode/**
```

**What gets included in VSIX**:
- `package.json` (manifest)
- `README.md` (extension documentation)
- `LICENSE` (MIT license file)
- `out/` directory (compiled JavaScript)
- `src/prompts/workItemInitPrompt.template.md` (template file used at runtime)

The workflow does not need to modify `.vscodeignore` as it's already properly configured.

### Extension Source Structure

**Location**: `vscode-extension/src/`

The extension source code is organized as follows:

```
src/
├── extension.ts              # Entry point (activate/deactivate functions)
├── commands/
│   └── initializeWorkItem.ts # Main command implementation
├── git/
│   └── validation.ts         # Git repository validation
├── prompts/
│   ├── customInstructions.ts # Custom instruction loading logic
│   └── workItemInitPrompt.template.md  # Prompt template (included in VSIX)
├── test/
│   ├── runTest.ts           # Test runner
│   └── suite/               # Test suites
├── tools/
│   └── createPromptTemplates.ts  # Language model tool implementation
└── ui/
    └── userInput.ts         # User input handling
```

**Entry point**: `vscode-extension/src/extension.ts:20-42`

The `activate()` function is the extension's entry point:
- Creates an output channel for logging
- Registers the language model tool `paw_create_prompt_templates`
- Registers the command `paw.initializeWorkItem`

After compilation, the entry point becomes `out/extension.js` (referenced in `package.json:42` as `"main": "./out/extension.js"`).

### Current CI/CD Infrastructure

**Location**: `.github/` directory

Currently, the `.github/` directory contains:
- `chatmodes/` - Chatmode definition files
- `copilot-instructions.md` - Instructions for GitHub Copilot
- `prompts/` - Prompt templates

**Critical finding**: There are **no existing GitHub Actions workflows**. The `.github/workflows/` directory does not exist.

This means:
- No existing CI/CD automation
- No existing release workflows to conflict with
- Clean slate for implementing the release workflow
- No existing patterns to follow or constraints to work around

### Git Ignore Configuration

**Location**: `vscode-extension/.gitignore`

The extension's `.gitignore` excludes:

```ignore
out/           # Compiled JavaScript (generated during build)
node_modules/  # Dependencies (installed via npm)
.vscode-test/  # VS Code test environment
*.vsix         # VSIX packages (generated during packaging)
```

This confirms that VSIX files are not committed to the repository and must be built during the release workflow.

### Development and Build Documentation

**Location**: `DEVELOPING.md:55-128`

The project documentation describes the manual packaging process:

1. Navigate to extension directory: `cd vscode-extension`
2. Install dependencies: `npm install`
3. Compile TypeScript: `npm run compile`
4. Run tests (optional): `npm test`
5. Package extension: `npm run package`

The documentation states: "The compiled `.vsix` file will be created in the extension directory."

**Installation methods documented**:
- Command line: `code --install-extension paw-workflow-0.0.1.vsix`
- VS Code UI: Extensions view → Install from VSIX

This confirms the expected workflow and VSIX naming pattern.

### Root Package Configuration

**Location**: `package.json` (root)

The root `package.json` is minimal:
- Name: `phased-agent-workflow`
- Version: `0.1.0` (root project version, separate from extension version)
- Private: `true`
- Scripts: Only chatmode linting scripts
- Dev dependencies: Only `@dqbd/tiktoken` for token counting

The root package.json is not directly relevant to the extension release workflow, as the extension has its own package.json with its own versioning.

### Existing Automation Scripts

**Location**: `scripts/` directory

The project has two existing scripts:
- `count-tokens.js` - Token counting utility
- `lint-chatmode.sh` - Chatmode file linting

Neither script is related to building or releasing the extension. The GitHub Actions workflow will be the first CI/CD automation.

## Code References

- `vscode-extension/package.json:2` - Extension name: `"name": "paw-workflow"`
- `vscode-extension/package.json:4` - Extension version: `"version": "0.0.1"`
- `vscode-extension/package.json:5` - Publisher: `"publisher": "paw-workflow"`
- `vscode-extension/package.json:6-9` - Repository configuration (GitHub URL)
- `vscode-extension/package.json:42` - Entry point: `"main": "./out/extension.js"`
- `vscode-extension/package.json:62` - vscode:prepublish script (runs before packaging)
- `vscode-extension/package.json:63` - Compile script: `"compile": "tsc -p ./"`
- `vscode-extension/package.json:68` - Package script: `"package": "vsce package"`
- `vscode-extension/package.json:78` - VSCE dependency: `"@vscode/vsce": "^2.22.0"`
- `vscode-extension/tsconfig.json:4` - Output directory: `"outDir": "out"`
- `vscode-extension/tsconfig.json:6` - Source directory: `"rootDir": "src"`
- `vscode-extension/.vscodeignore:1-11` - VSIX content filtering rules
- `vscode-extension/src/extension.ts:20` - Extension activation function
- `DEVELOPING.md:55-128` - Manual build and packaging documentation

## Architecture Documentation

### Build Process Flow

The current build process (to be automated in GitHub Actions):

1. **Dependency Installation**: `npm install` in `vscode-extension/` directory
   - Installs all dependencies including `@vscode/vsce`
   - Creates `node_modules/` directory

2. **TypeScript Compilation**: `npm run compile` or automatic via `vscode:prepublish`
   - TypeScript compiler reads `tsconfig.json`
   - Compiles all `.ts` files in `src/` directory
   - Outputs `.js` and `.js.map` files to `out/` directory
   - Preserves directory structure from `src/` to `out/`

3. **VSIX Packaging**: `npm run package`
   - Triggers `vscode:prepublish` hook (ensures compilation)
   - `vsce` reads `package.json` for extension metadata
   - `vsce` applies `.vscodeignore` filters
   - `vsce` creates ZIP archive with VS Code extension structure
   - Output: `paw-workflow-<version>.vsix` in `vscode-extension/` directory

### Extension Naming and Versioning

**Current state**:
- Extension name (internal): `paw-workflow` (from `package.json:2`)
- Version: `0.0.1` (from `package.json:4`)
- VSIX filename pattern: `paw-workflow-<version>.vsix`

**For the GitHub Actions workflow**:
- Version will be extracted from git tags (e.g., `v0.2.0` → `0.2.0`)
- The workflow should **not** modify `package.json` version
- The workflow should use the version from the tag for release naming
- The VSIX filename will match the version in `package.json` at tag time

**Note**: Before creating a version tag, the `package.json` version should be updated to match the intended release version. This is a manual step that happens before tagging.

### Pre-release Detection Logic

**Specification requirement**: Odd minor versions are pre-releases (e.g., `v0.3.x`), even minor versions are stable releases (e.g., `v0.2.x`, `v0.4.x`).

**Implementation approach** (for GitHub Actions):
- Parse the tag name to extract semantic version components
- Check if minor version number is odd: `minor % 2 === 1`
- Set GitHub Release `prerelease` flag accordingly

**Examples**:
- `v0.1.0` → pre-release (minor = 1, odd)
- `v0.2.0` → stable release (minor = 2, even)
- `v0.3.5` → pre-release (minor = 3, odd)
- `v1.0.0` → stable release (minor = 0, even)

### Testing Infrastructure

**Location**: `vscode-extension/src/test/`

The extension has automated tests:
- Test runner: `src/test/runTest.ts`
- Test suites in `src/test/suite/`:
  - `extension.test.ts` - Extension activation tests
  - `customInstructions.test.ts` - Custom instructions tests
  - `userInput.test.ts` - User input tests
  - `index.ts` - Test suite index

**Running tests**: `npm test` (defined in `package.json:66`)

The GitHub Actions workflow could optionally run tests before packaging, but the specification does not require this (tests are assumed to run in separate CI). The workflow should focus on building and releasing when tags are pushed.

## Open Questions

1. **Version synchronization**: How should the workflow handle cases where the `package.json` version doesn't match the git tag version? Should the workflow fail, warn, or accept the discrepancy?

2. **Changelog tool selection**: The specification defers the choice of changelog generation tool to implementation. Popular options include:
   - `github-changelog-generator` (Ruby-based)
   - `conventional-changelog` (Node.js-based, good for conventional commits)
   - GitHub Actions marketplace actions (e.g., `mikepenz/release-changelog-builder-action`)

3. **Build artifacts retention**: Should the workflow upload build artifacts (compiled `out/` directory, build logs) for debugging purposes, or only the final VSIX?

4. **Test execution**: Should the workflow run `npm test` before packaging, or assume tests run in a separate CI workflow?

5. **VSIX naming with metadata**: Should the VSIX filename include additional metadata (e.g., commit SHA, build number) or just version?

6. **First release edge case**: When generating changelog for the first release (no previous tags), should the workflow include all commits from the beginning, or set a specific starting point?

7. **Release notes template**: Should the workflow use a specific template for release notes beyond the generated changelog (e.g., include installation instructions, breaking changes section)?
