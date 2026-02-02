#!/usr/bin/env bash
#
# Export PAW skills and agents for GitHub Copilot CLI usage.
# Processes template conditionals: keeps {{#cli}}...{{/cli}} blocks, 
# removes {{#vscode}}...{{/vscode}} blocks.
#
# Usage:
#   ./scripts/export-for-cli.sh skill <skill-name> [output-dir]
#   ./scripts/export-for-cli.sh agent <agent-name> [output-dir]
#   ./scripts/export-for-cli.sh skills [output-dir]   # Export all skills
#   ./scripts/export-for-cli.sh agents [output-dir]   # Export all agents
#
# Default output directories (GitHub Copilot CLI user-level locations):
#   Skills: ~/.copilot/skills/
#   Agents: ~/.copilot/agents/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$PROJECT_ROOT/skills"
AGENTS_DIR="$PROJECT_ROOT/agents"

# Default CLI config directories (matches GitHub CLI custom agents/skills locations)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    DEFAULT_SKILLS_OUT="$USERPROFILE/.copilot/skills"
    DEFAULT_AGENTS_OUT="$USERPROFILE/.copilot/agents"
else
    DEFAULT_SKILLS_OUT="$HOME/.copilot/skills"
    DEFAULT_AGENTS_OUT="$HOME/.copilot/agents"
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

# Generate skills catalog
generate_catalog() {
    local output_dir="${1:-$DEFAULT_SKILLS_OUT}"
    local catalog_file="$output_dir/CATALOG.md"
    
    mkdir -p "$output_dir"
    
    echo "# PAW Skills Catalog" > "$catalog_file"
    echo "" >> "$catalog_file"
    echo "Available skills for CLI usage:" >> "$catalog_file"
    echo "" >> "$catalog_file"
    
    for skill_dir in "$SKILLS_DIR"/*/; do
        if [[ -f "$skill_dir/SKILL.md" ]]; then
            local skill_name
            skill_name=$(basename "$skill_dir")
            
            # Extract description from frontmatter
            local description
            description=$(grep -A1 "^description:" "$skill_dir/SKILL.md" 2>/dev/null | tail -1 | sed 's/^description: *//' | tr -d "'\"")
            
            if [[ -z "$description" ]]; then
                description="(no description)"
            fi
            
            echo "- **$skill_name**: $description" >> "$catalog_file"
        fi
    done
    
    echo "" >> "$catalog_file"
    echo "To use a skill, read \`skills/<skill-name>/SKILL.md\`" >> "$catalog_file"
    
    echo "Generated catalog: $catalog_file"
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
        generate_catalog "${2:-}"
        ;;
    agents)
        export_all_agents "${2:-}"
        ;;
    catalog)
        generate_catalog "${2:-}"
        ;;
    *)
        echo "PAW CLI Export Tool"
        echo ""
        echo "Usage:"
        echo "  $0 skill <skill-name> [output-dir]  - Export single skill"
        echo "  $0 agent <agent-name> [output-dir]  - Export single agent"
        echo "  $0 skills [output-dir]              - Export all skills + catalog"
        echo "  $0 agents [output-dir]              - Export all agents"
        echo "  $0 catalog [output-dir]             - Generate skills catalog only"
        echo ""
        echo "Default output directories:"
        echo "  Skills: $DEFAULT_SKILLS_OUT"
        echo "  Agents: $DEFAULT_AGENTS_OUT"
        exit 1
        ;;
esac
