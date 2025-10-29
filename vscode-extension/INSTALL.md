# PAW Workflow Extension - Installation Guide

## Prerequisites

- Node.js 16.x or later
- npm 7.x or later
- VS Code 1.85.0 or later

## Setup for Development

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

## Installing the Packaged Extension

Use either the VS Code UI or the command line.

### Command Line

```bash
code --install-extension paw-workflow-0.0.1.vsix
```

### VS Code UI

1. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Open the overflow menu (`…`) and choose **Install from VSIX...**.
3. Select `paw-workflow-0.0.1.vsix` from the extension directory.
4. Reload VS Code when prompted.

## Development Workflow

- Launch the extension in an Extension Development Host by pressing `F5` in VS Code.
- Use `npm run watch` to recompile on TypeScript file changes.
- Reload the development host window (`Ctrl+R` / `Cmd+R`) after changes.

## Uninstalling

```bash
code --uninstall-extension paw-workflow.paw-workflow
```

Or uninstall from the Extensions view inside VS Code.
