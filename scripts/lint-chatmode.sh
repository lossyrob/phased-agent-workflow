#!/bin/bash
# Lint chatmode files for token size
# Usage: ./scripts/lint-chatmode.sh [file.chatmode.md]
#        If no file is provided, lints all chatmodes in .github/chatmodes/

set -euo pipefail

# Token thresholds
WARN_THRESHOLD=3500
ERROR_THRESHOLD=6500

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules/@dqbd/tiktoken" ]; then
    echo -e "${RED}ERROR: Dependencies are not installed${NC}"
    echo "Run: npm install"
    exit 1
fi

# Function to lint a single file
lint_file() {
    local file="$1"
    local filename=$(basename "$file")
    
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}ERROR: File not found: $file${NC}"
        return 1
    fi
    
    # Count tokens using Node.js script
    local token_count=$(node scripts/count-tokens.js "$file" 2>/dev/null || echo "0")
    
    # Check thresholds
    if (( token_count >= ERROR_THRESHOLD )); then
        echo -e "${RED}✗ ERROR${NC} $filename: ${RED}${token_count} tokens${NC} (exceeds ${ERROR_THRESHOLD} token limit)"
        return 1
    elif (( token_count >= WARN_THRESHOLD )); then
        echo -e "${YELLOW}⚠ WARN${NC}  $filename: ${YELLOW}${token_count} tokens${NC} (exceeds ${WARN_THRESHOLD} token warning threshold)"
        return 0
    else
        echo -e "${GREEN}✓ OK${NC}    $filename: ${token_count} tokens"
        return 0
    fi
}

# Main logic
main() {
    local exit_code=0
    
    if [[ $# -eq 0 ]]; then
        # No arguments: lint all chatmodes
        echo "Linting all chatmode files in .github/chatmodes/"
        echo ""
        
        local chatmode_dir=".github/chatmodes"
        if [[ ! -d "$chatmode_dir" ]]; then
            echo -e "${RED}ERROR: Directory not found: $chatmode_dir${NC}"
            exit 1
        fi
        
        local files=("$chatmode_dir"/*.chatmode.md)
        if [[ ! -e "${files[0]}" ]]; then
            echo -e "${YELLOW}WARNING: No chatmode files found in $chatmode_dir${NC}"
            exit 0
        fi
        
        for file in "${files[@]}"; do
            if ! lint_file "$file"; then
                exit_code=1
            fi
        done
    else
        # Lint specific file(s)
        for file in "$@"; do
            if ! lint_file "$file"; then
                exit_code=1
            fi
        done
    fi
    
    echo ""
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}All checks passed!${NC}"
    else
        echo -e "${RED}Some checks failed. Please reduce token count in chatmode files.${NC}"
    fi
    
    exit $exit_code
}

main "$@"
