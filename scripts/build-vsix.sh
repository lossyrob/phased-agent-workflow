#!/bin/bash
# Build the PAW Workflow VS Code extension VSIX

set -e

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
npm run package

echo "✓ VSIX built successfully!"
echo "Package location: paw-workflow-0.0.1.vsix"
