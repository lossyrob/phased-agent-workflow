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

# Change to the repository root directory
cd "$(dirname "$0")/.."

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
PACKAGE_OUTPUT=$(npm run package 2>&1)
echo "$PACKAGE_OUTPUT"

# Extract the VSIX filename from the package output
# The output contains a line like: "Packaged: /path/to/paw-workflow-X.Y.Z.vsix (N files, SIZE)"
# Use sed for cross-platform compatibility (macOS grep doesn't support -P)
VSIX_PATH=$(echo "$PACKAGE_OUTPUT" | grep "Packaged:" | sed 's/.*Packaged: //' | sed 's/ .*//')

if [ -z "$VSIX_PATH" ]; then
    echo "Error: Could not determine VSIX filename from package output"
    exit 1
fi

echo "✓ VSIX built successfully!"
echo "Package location: $VSIX_PATH"

# Install if requested
if [ "$INSTALL" = true ]; then
    echo ""
    echo "Installing extension to VS Code..."
    code --install-extension "$VSIX_PATH" --force
    echo "✓ Extension installed successfully!"
fi
