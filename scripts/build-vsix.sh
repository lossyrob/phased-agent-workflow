#!/bin/bash
# Build the PAW Workflow VS Code extension VSIX

set -e

# Parse command line arguments
INSTALL=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --install)
            INSTALL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--install]"
            exit 1
            ;;
    esac
done

# Change to the vscode-extension directory
cd "$(dirname "$0")/../vscode-extension"

echo "Building PAW Workflow VS Code extension..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Compile TypeScript
echo "Compiling TypeScript..."
npm run compile

# Package the extension
echo "Packaging extension..."
npm run package

VSIX_PATH="paw-workflow-0.0.1.vsix"

echo "✓ VSIX built successfully!"
echo "Package location: vscode-extension/$VSIX_PATH"

# Install if requested
if [ "$INSTALL" = true ]; then
    echo ""
    echo "Installing extension to VS Code..."
    code --install-extension "$VSIX_PATH" --force
    echo "✓ Extension installed successfully!"
fi
