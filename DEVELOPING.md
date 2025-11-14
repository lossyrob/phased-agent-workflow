# Developing PAW (Phased Agent Workflow)

This document contains information for developers working on the Phased Agent Workflow project.

## Development Setup

### Prerequisites

- **Node.js** (v16 or higher) - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)

### Install Dependencies

Install all required development dependencies:

```bash
npm install
```

## Development Scripts

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

**Token Thresholds**:
- **Warning**: 3,500 tokens - Consider refactoring to reduce size
- **Error**: 6,500 tokens - Must be reduced before committing

The linter uses `@dqbd/tiktoken` with the `gpt-4o-mini` model to count tokens, which provides accurate token counts for OpenAI models.

**Best Practices**:
- Keep agent files focused and concise
- Break up large instructions into multiple sections
- Remove redundant or overly verbose explanations
- Run the linter before committing changes to agent files

## VS Code Extension Development

The PAW Workflow extension provides a single command - "PAW: Initialize Work Item" - to streamline the creation of PAW work item directory structures.

### Prerequisites

- Node.js 16.x or later
- npm 7.x or later
- VS Code 1.85.0 or later

### Setup for Development

1. **Navigate to the extension directory:**
   ```bash
   cd vscode-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile TypeScript sources:**
   ```bash
   npm run compile
   ```

4. **Run automated tests (optional but recommended):**
   ```bash
   npm test
   ```

5. **Package the extension:**
   ```bash
   npm run package
   ```
   The compiled `.vsix` file will be created in the extension directory.

### Installing the Packaged Extension

Use either the VS Code UI or the command line.

#### Command Line

```bash
code --install-extension paw-workflow-0.0.1.vsix
```

#### VS Code UI

1. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Open the overflow menu (`…`) and choose **Install from VSIX...**.
3. Select `paw-workflow-0.0.1.vsix` from the extension directory.
4. Reload VS Code when prompted.

### Development Workflow

- Launch the extension in an Extension Development Host by pressing `F5` in VS Code.
- Use `npm run watch` to recompile on TypeScript file changes.
- Reload the development host window (`Ctrl+R` / `Cmd+R`) after changes.

### Uninstalling

```bash
code --uninstall-extension paw-workflow.paw-workflow
```

Or uninstall from the Extensions view inside VS Code.

## GitHub Actions Workflows

PAW includes two automated workflows for the VS Code extension:

### Release Workflow

Automatically creates GitHub Releases with VSIX files when version tags are pushed.

**Usage**:
1. Tag: `git tag v0.2.0`
2. Push: `git push origin <branch> && git push origin v0.2.0`

The workflow builds the extension, packages it as VSIX, generates a changelog, and creates a GitHub Release. The tag version automatically becomes the VSIX version (no manual `package.json` updates needed). Odd minor versions (`0.1.x`, `0.3.x`) are marked as pre-releases; even versions (`0.2.x`, `0.4.x`) are stable releases.

### PR Gate Workflow

Runs automated quality checks on pull requests before merging.

**Checks**:
- Extension unit tests
- Agent file linting (token limits)

The workflow triggers automatically on PRs to `main` or `feature/**` branches when relevant files change. Failed checks prevent merge when branch protection is enabled.

## Project Structure

- `.github/agents/` - Contains agent definitions for different PAW agents
- `.github/workflows/` - GitHub Actions workflows for releases and PR checks
- `scripts/` - Development and utility scripts
- `vscode-extension/` - VS Code extension for PAW workflow automation
