#!/bin/bash
# Lint agent and skill files for token size
# Usage: ./scripts/lint-agent.sh [file.agent.md | file/SKILL.md]
#        ./scripts/lint-agent.sh --skills     # Lint only skills
#        ./scripts/lint-agent.sh --all        # Lint both agents and skills
#        If no file is provided, lints all agents in agents/

set -euo pipefail

# Token thresholds for agents
WARN_THRESHOLD=5000
ERROR_THRESHOLD=7000

# Special threshold for Status Agent (needs more context to guide users)
STATUS_AGENT_WARN_THRESHOLD=5000
STATUS_AGENT_ERROR_THRESHOLD=8000

# Special threshold for Spec Agent (temporarily higher until token optimization)
SPEC_AGENT_WARN_THRESHOLD=5000
SPEC_AGENT_ERROR_THRESHOLD=10000

# Token thresholds for skills (higher since loaded on-demand)
SKILL_WARN_THRESHOLD=8000
SKILL_ERROR_THRESHOLD=12000

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
    
    # Use special thresholds for specific agents
    local warn_threshold=$WARN_THRESHOLD
    local error_threshold=$ERROR_THRESHOLD
    if [[ "$filename" == "PAW-X Status.agent.md" ]]; then
        warn_threshold=$STATUS_AGENT_WARN_THRESHOLD
        error_threshold=$STATUS_AGENT_ERROR_THRESHOLD
    elif [[ "$filename" == "PAW-01A Specification.agent.md" ]]; then
        warn_threshold=$SPEC_AGENT_WARN_THRESHOLD
        error_threshold=$SPEC_AGENT_ERROR_THRESHOLD
    fi
    
    # Check thresholds
    if (( token_count >= error_threshold )); then
        echo -e "${RED}✗ ERROR${NC} $filename: ${RED}${token_count} tokens${NC} (exceeds ${error_threshold} token limit)"
        return 1
    elif (( token_count >= warn_threshold )); then
        echo -e "${YELLOW}⚠ WARN${NC}  $filename: ${YELLOW}${token_count} tokens${NC} (exceeds ${warn_threshold} token warning threshold)"
        return 0
    else
        echo -e "${GREEN}✓ OK${NC}    $filename: ${token_count} tokens"
        return 0
    fi
}

# Function to lint a skill file
lint_skill() {
    local file="$1"
    local skill_name=$(basename "$(dirname "$file")")
    
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}ERROR: File not found: $file${NC}"
        return 1
    fi
    
    # Count tokens using Node.js script
    local token_count=$(node scripts/count-tokens.js "$file" 2>/dev/null || echo "0")
    
    # Check thresholds (skills have higher limits since loaded on-demand)
    if (( token_count >= SKILL_ERROR_THRESHOLD )); then
        echo -e "${RED}✗ ERROR${NC} ${skill_name}/SKILL.md: ${RED}${token_count} tokens${NC} (exceeds ${SKILL_ERROR_THRESHOLD} token limit)"
        return 1
    elif (( token_count >= SKILL_WARN_THRESHOLD )); then
        echo -e "${YELLOW}⚠ WARN${NC}  ${skill_name}/SKILL.md: ${YELLOW}${token_count} tokens${NC} (exceeds ${SKILL_WARN_THRESHOLD} token warning threshold)"
        return 0
    else
        echo -e "${GREEN}✓ OK${NC}    ${skill_name}/SKILL.md: ${token_count} tokens"
        return 0
    fi
}

# Function to lint all agents
lint_all_agents() {
    local exit_code=0
    local agent_dir="agents"
    
    if [[ ! -d "$agent_dir" ]]; then
        echo -e "${RED}ERROR: Directory not found: $agent_dir${NC}"
        return 1
    fi
    
    local files=("$agent_dir"/*.agent.md)
    if [[ ! -e "${files[0]}" ]]; then
        echo -e "${YELLOW}WARNING: No agent files found in $agent_dir${NC}"
        return 0
    fi
    
    for file in "${files[@]}"; do
        if ! lint_file "$file"; then
            exit_code=1
        fi
    done
    
    return $exit_code
}

# Function to lint all skills
lint_all_skills() {
    local exit_code=0
    local skill_dir="skills"
    
    if [[ ! -d "$skill_dir" ]]; then
        echo -e "${YELLOW}WARNING: Directory not found: $skill_dir${NC}"
        return 0
    fi
    
    # Find all SKILL.md files in skills subdirectories
    local skill_files=()
    while IFS= read -r -d '' file; do
        skill_files+=("$file")
    done < <(find "$skill_dir" -name "SKILL.md" -type f -print0 2>/dev/null)
    
    if [[ ${#skill_files[@]} -eq 0 ]]; then
        echo -e "${YELLOW}WARNING: No skill files found in $skill_dir${NC}"
        return 0
    fi
    
    for file in "${skill_files[@]}"; do
        if ! lint_skill "$file"; then
            exit_code=1
        fi
    done
    
    return $exit_code
}

# Main logic
main() {
    local exit_code=0
    local lint_agents=false
    local lint_skills=false
    local files_to_lint=()
    
    # Parse arguments
    if [[ $# -eq 0 ]]; then
        # No arguments: lint all agents (backward compatible)
        lint_agents=true
    else
        for arg in "$@"; do
            case "$arg" in
                --skills)
                    lint_skills=true
                    ;;
                --all)
                    lint_agents=true
                    lint_skills=true
                    ;;
                *)
                    files_to_lint+=("$arg")
                    ;;
            esac
        done
    fi
    
    # Lint specific files if provided
    if [[ ${#files_to_lint[@]} -gt 0 ]]; then
        for file in "${files_to_lint[@]}"; do
            # Determine if this is a skill or agent file
            if [[ "$file" == *"/SKILL.md" ]] || [[ "$file" == */skills/* ]]; then
                if ! lint_skill "$file"; then
                    exit_code=1
                fi
            else
                if ! lint_file "$file"; then
                    exit_code=1
                fi
            fi
        done
    else
        # Lint all agents if requested
        if [[ "$lint_agents" == true ]]; then
            echo "Linting all agent files in agents/"
            echo ""
            
            if ! lint_all_agents; then
                exit_code=1
            fi
        fi
        
        # Lint all skills if requested
        if [[ "$lint_skills" == true ]]; then
            if [[ "$lint_agents" == true ]]; then
                echo ""
            fi
            echo "Linting all skill files in skills/"
            echo ""
            
            if ! lint_all_skills; then
                exit_code=1
            fi
        fi
    fi
    
    echo ""
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}All checks passed!${NC}"
    else
        echo -e "${RED}Some checks failed. Please reduce token count in agent/skill files.${NC}"
    fi
    
    exit $exit_code
}

main "$@"
