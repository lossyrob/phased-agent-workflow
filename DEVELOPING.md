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

**Token Thresholds**:
- **Warning**: 3,500 tokens - Consider refactoring to reduce size
- **Error**: 6,500 tokens - Must be reduced before committing

The linter uses `@dqbd/tiktoken` with the `gpt-4o-mini` model to count tokens, which provides accurate token counts for OpenAI models.

**Best Practices**:
- Keep chatmode files focused and concise
- Break up large instructions into multiple sections
- Remove redundant or overly verbose explanations
- Run the linter before committing changes to chatmode files

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

## Project Structure

- `.github/chatmodes/` - Contains chatmode definitions for different agents
- `scripts/` - Development and utility scripts
- `vscode-extension/` - VS Code extension for PAW workflow automation
