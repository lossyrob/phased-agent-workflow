#!/bin/bash
# Helper script to build VSIX packages with a temporary version for migration testing.
# Usage: ./scripts/test-migration.sh <version>

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $0 <version>" >&2
    echo "Example: $0 0.2.0" >&2
    exit 1
fi

TARGET_VERSION="$1"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

ORIGINAL_VERSION=$(node -p "require('./package.json').version")

cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAW Migration Test Helper
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

echo "Target version:   ${TARGET_VERSION}"
echo "Original version: ${ORIGINAL_VERSION}"
echo

echo "→ Updating package.json version to ${TARGET_VERSION}..."
npm version "${TARGET_VERSION}" --no-git-tag-version --allow-same-version >/dev/null

echo "→ Building VSIX..."
./scripts/build-vsix.sh

VSIX_FILE="paw-workflow-${TARGET_VERSION}.vsix"
if [ -f "${VSIX_FILE}" ]; then
    echo "✓ Built: ${VSIX_FILE}"
else
    echo "⚠️  Warning: Expected ${VSIX_FILE} was not found. Check build output." >&2
fi

echo "→ Restoring package.json version to ${ORIGINAL_VERSION}..."
npm version "${ORIGINAL_VERSION}" --no-git-tag-version --allow-same-version >/dev/null

cat <<'EOF'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Helper complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

echo "Next steps:"
echo "  1. Install: code --install-extension paw-workflow-${TARGET_VERSION}.vsix"
echo "  2. Reload VS Code"
echo "  3. Open the 'PAW Workflow' output channel to inspect migration logs"
echo "  4. Verify agents inside GitHub Copilot Chat"
