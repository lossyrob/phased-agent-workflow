#!/usr/bin/env bash
#
# Export PAW skills and agents for CLI usage.
# Processes template conditionals: keeps {{#cli}}...{{/cli}} blocks, 
# removes {{#vscode}}...{{/vscode}} blocks.
#
# Usage:
#   ./scripts/export-for-cli.sh skill <skill-name> [output-dir]
#   ./scripts/export-for-cli.sh agent <agent-name> [output-dir]
#   ./scripts/export-for-cli.sh skills [output-dir]   # Export all skills
#   ./scripts/export-for-cli.sh agents [output-dir]   # Export all agents
#   ./scripts/export-for-cli.sh --target claude        # Export all to Claude CLI dirs
#
# Default output directories (GitHub Copilot CLI user-level locations):
#   Skills: ~/.copilot/skills/
#   Agents: ~/.copilot/agents/
#
# With --target claude:
#   Skills: ~/.claude/skills/
#   Agents: ~/.claude/agents/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$PROJECT_ROOT/skills"
AGENTS_DIR="$PROJECT_ROOT/agents"

# Default target
TARGET="copilot"

# Parse --target flag from any position in args
FILTERED_ARGS=()
for arg in "$@"; do
    if [[ "$arg" == "--target" ]]; then
        TARGET_NEXT=true
        continue
    fi
    if [[ "$TARGET_NEXT" == true ]]; then
        TARGET="$arg"
        TARGET_NEXT=false
        continue
    fi
    FILTERED_ARGS+=("$arg")
done
set -- "${FILTERED_ARGS[@]}"

# Set output directories based on target
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    HOME_BASE="$USERPROFILE"
else
    HOME_BASE="$HOME"
fi

if [[ "$TARGET" == "claude" ]]; then
    DEFAULT_SKILLS_OUT="$HOME_BASE/.claude/skills"
    DEFAULT_AGENTS_OUT="$HOME_BASE/.claude/agents"
elif [[ "$TARGET" == "copilot" ]]; then
    DEFAULT_SKILLS_OUT="$HOME_BASE/.copilot/skills"
    DEFAULT_AGENTS_OUT="$HOME_BASE/.copilot/agents"
else
    echo "Error: Unknown target '$TARGET'. Supported: copilot, claude" >&2
    exit 1
fi

# Process conditional blocks for CLI environment
# - Keeps content inside {{#cli}}...{{/cli}}
# - Removes content inside {{#vscode}}...{{/vscode}}
process_conditionals() {
    local content="$1"
    
    # Remove vscode blocks (including tags)
    # Using perl for reliable multi-line regex
    content=$(echo "$content" | perl -0777 -pe 's/\{\{#vscode\}\}.*?\{\{\/vscode\}\}//gs')
    
    # Keep cli block content, remove tags
    content=$(echo "$content" | perl -0777 -pe 's/\{\{#cli\}\}(.*?)\{\{\/cli\}\}/$1/gs')
    
    echo "$content"
}

# Export a single skill
export_skill() {
    local skill_name="$1"
    local output_dir="${2:-$DEFAULT_SKILLS_OUT}"
    local skill_path="$SKILLS_DIR/$skill_name/SKILL.md"
    
    if [[ ! -f "$skill_path" ]]; then
        echo "Error: Skill '$skill_name' not found at $skill_path" >&2
        return 1
    fi
    
    local output_skill_dir="$output_dir/$skill_name"
    mkdir -p "$output_skill_dir"
    
    local content
    content=$(cat "$skill_path")
    content=$(process_conditionals "$content")
    
    echo "$content" > "$output_skill_dir/SKILL.md"
    echo "Exported skill: $skill_name -> $output_skill_dir/SKILL.md"
}

# Export a single agent
export_agent() {
    local agent_name="$1"
    local output_dir="${2:-$DEFAULT_AGENTS_OUT}"
    
    # Handle spaces in agent names
    local agent_file="$AGENTS_DIR/$agent_name.agent.md"
    
    if [[ ! -f "$agent_file" ]]; then
        echo "Error: Agent '$agent_name' not found at $agent_file" >&2
        return 1
    fi
    
    mkdir -p "$output_dir"
    
    local content
    content=$(cat "$agent_file")
    content=$(process_conditionals "$content")
    
    # Sanitize filename for CLI (replace spaces with hyphens)
    local output_filename
    output_filename=$(echo "$agent_name" | tr ' ' '-')
    
    echo "$content" > "$output_dir/$output_filename.agent.md"
    echo "Exported agent: $agent_name -> $output_dir/$output_filename.agent.md"
}

# Export all skills
export_all_skills() {
    local output_dir="${1:-$DEFAULT_SKILLS_OUT}"
    
    echo "Exporting all skills to: $output_dir"
    
    for skill_dir in "$SKILLS_DIR"/*/; do
        if [[ -f "$skill_dir/SKILL.md" ]]; then
            local skill_name
            skill_name=$(basename "$skill_dir")
            export_skill "$skill_name" "$output_dir"
        fi
    done
    
    echo "Done. Exported all skills."
}

# Export all agents
export_all_agents() {
    local output_dir="${1:-$DEFAULT_AGENTS_OUT}"
    
    echo "Exporting all agents to: $output_dir"
    
    for agent_file in "$AGENTS_DIR"/*.agent.md; do
        if [[ -f "$agent_file" ]]; then
            local agent_name
            agent_name=$(basename "$agent_file" .agent.md)
            export_agent "$agent_name" "$output_dir"
        fi
    done
    
    echo "Done. Exported all agents."
}

# Main
case "${1:-}" in
    skill)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 skill <skill-name> [output-dir]" >&2
            exit 1
        fi
        export_skill "$2" "${3:-}"
        ;;
    agent)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 agent <agent-name> [output-dir]" >&2
            exit 1
        fi
        export_agent "$2" "${3:-}"
        ;;
    skills)
        export_all_skills "${2:-}"
        ;;
    agents)
        export_all_agents "${2:-}"
        ;;
    help|--help|-h)
        echo "PAW CLI Export Tool"
        echo ""
        echo "Usage:"
        echo "  $0                                  - Export all skills and agents"
        echo "  $0 skill <skill-name> [output-dir]  - Export single skill"
        echo "  $0 agent <agent-name> [output-dir]  - Export single agent"
        echo "  $0 skills [output-dir]              - Export all skills"
        echo "  $0 agents [output-dir]              - Export all agents"
        echo "  $0 --target claude                  - Export all to Claude CLI dirs"
        echo ""
        echo "Options:"
        echo "  --target <copilot|claude>  Set target CLI (default: copilot)"
        echo ""
        echo "Default output directories (target=$TARGET):"
        echo "  Skills: $DEFAULT_SKILLS_OUT"
        echo "  Agents: $DEFAULT_AGENTS_OUT"
        ;;
    *)
        export_all_skills
        export_all_agents
        ;;
esac
