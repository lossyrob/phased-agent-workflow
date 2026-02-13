<#
.SYNOPSIS
    Export PAW skills and agents for CLI usage.

.DESCRIPTION
    Processes template conditionals: keeps {{#cli}}...{{/cli}} blocks,
    removes {{#vscode}}...{{/vscode}} blocks.

.PARAMETER Command
    The command to run: skill, agent, skills, agents, or help

.PARAMETER Name
    The name of the skill or agent to export (for skill/agent commands)

.PARAMETER OutputDir
    Optional output directory override

.PARAMETER Target
    Target CLI: copilot (default) or claude

.EXAMPLE
    .\export-for-cli.ps1 skill paw-workflow
    .\export-for-cli.ps1 agent PAW
    .\export-for-cli.ps1 skills
    .\export-for-cli.ps1 agents
    .\export-for-cli.ps1 -Target claude
    .\export-for-cli.ps1  # Export all skills and agents
#>

param(
    [Parameter(Position = 0)]
    [string]$Command,
    
    [Parameter(Position = 1)]
    [string]$Name,
    
    [Parameter(Position = 2)]
    [string]$OutputDir,
    
    [ValidateSet("copilot", "claude")]
    [string]$Target = "copilot"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$SkillsDir = Join-Path $ProjectRoot "skills"
$AgentsDir = Join-Path $ProjectRoot "agents"

# Set output directories based on target
if ($Target -eq "claude") {
    $DefaultSkillsOut = Join-Path $env:USERPROFILE ".claude\skills"
    $DefaultAgentsOut = Join-Path $env:USERPROFILE ".claude\agents"
} else {
    $DefaultSkillsOut = Join-Path $env:USERPROFILE ".copilot\skills"
    $DefaultAgentsOut = Join-Path $env:USERPROFILE ".copilot\agents"
}

function Process-Conditionals {
    param([string]$Content)
    
    # Remove vscode blocks (including tags) - multiline regex
    $Content = [regex]::Replace($Content, '\{\{#vscode\}\}.*?\{\{/vscode\}\}', '', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    # Keep cli block content, remove tags
    $Content = [regex]::Replace($Content, '\{\{#cli\}\}(.*?)\{\{/cli\}\}', '$1', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    return $Content
}

function Export-Skill {
    param(
        [string]$SkillName,
        [string]$OutDir
    )
    
    if (-not $OutDir) { $OutDir = $DefaultSkillsOut }
    
    $SkillPath = Join-Path $SkillsDir "$SkillName\SKILL.md"
    
    if (-not (Test-Path $SkillPath)) {
        Write-Error "Error: Skill '$SkillName' not found at $SkillPath"
        return
    }
    
    $OutputSkillDir = Join-Path $OutDir $SkillName
    New-Item -ItemType Directory -Path $OutputSkillDir -Force | Out-Null
    
    $Content = Get-Content -Path $SkillPath -Raw
    $Content = Process-Conditionals $Content
    
    $OutputPath = Join-Path $OutputSkillDir "SKILL.md"
    Set-Content -Path $OutputPath -Value $Content -NoNewline
    Write-Host "Exported skill: $SkillName -> $OutputPath"
}

function Export-Agent {
    param(
        [string]$AgentName,
        [string]$OutDir
    )
    
    if (-not $OutDir) { $OutDir = $DefaultAgentsOut }
    
    $AgentFile = Join-Path $AgentsDir "$AgentName.agent.md"
    
    if (-not (Test-Path $AgentFile)) {
        Write-Error "Error: Agent '$AgentName' not found at $AgentFile"
        return
    }
    
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
    
    $Content = Get-Content -Path $AgentFile -Raw
    $Content = Process-Conditionals $Content
    
    # Sanitize filename for CLI (replace spaces with hyphens)
    $OutputFilename = $AgentName -replace ' ', '-'
    
    $OutputPath = Join-Path $OutDir "$OutputFilename.agent.md"
    Set-Content -Path $OutputPath -Value $Content -NoNewline
    Write-Host "Exported agent: $AgentName -> $OutputPath"
}

function Export-AllSkills {
    param([string]$OutDir)
    
    if (-not $OutDir) { $OutDir = $DefaultSkillsOut }
    
    Write-Host "Exporting all skills to: $OutDir"
    
    Get-ChildItem -Path $SkillsDir -Directory | ForEach-Object {
        $SkillMd = Join-Path $_.FullName "SKILL.md"
        if (Test-Path $SkillMd) {
            Export-Skill -SkillName $_.Name -OutDir $OutDir
        }
    }
    
    Write-Host "Done. Exported all skills."
}

function Export-AllAgents {
    param([string]$OutDir)
    
    if (-not $OutDir) { $OutDir = $DefaultAgentsOut }
    
    Write-Host "Exporting all agents to: $OutDir"
    
    Get-ChildItem -Path $AgentsDir -Filter "*.agent.md" | ForEach-Object {
        $AgentName = $_.BaseName -replace '\.agent$', ''
        Export-Agent -AgentName $AgentName -OutDir $OutDir
    }
    
    Write-Host "Done. Exported all agents."
}

function Show-Help {
    Write-Host "PAW CLI Export Tool"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\export-for-cli.ps1                              - Export all skills and agents"
    Write-Host "  .\export-for-cli.ps1 skill <skill-name> [output-dir]  - Export single skill"
    Write-Host "  .\export-for-cli.ps1 agent <agent-name> [output-dir]  - Export single agent"
    Write-Host "  .\export-for-cli.ps1 skills [output-dir]              - Export all skills"
    Write-Host "  .\export-for-cli.ps1 agents [output-dir]              - Export all agents"
    Write-Host "  .\export-for-cli.ps1 -Target claude                   - Export all to Claude CLI dirs"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Target <copilot|claude>  Set target CLI (default: copilot)"
    Write-Host ""
    Write-Host "Default output directories (Target=$Target):"
    Write-Host "  Skills: $DefaultSkillsOut"
    Write-Host "  Agents: $DefaultAgentsOut"
}

# Main
switch ($Command) {
    "skill" {
        if (-not $Name) {
            Write-Error "Usage: .\export-for-cli.ps1 skill <skill-name> [output-dir]"
            exit 1
        }
        Export-Skill -SkillName $Name -OutDir $OutputDir
    }
    "agent" {
        if (-not $Name) {
            Write-Error "Usage: .\export-for-cli.ps1 agent <agent-name> [output-dir]"
            exit 1
        }
        Export-Agent -AgentName $Name -OutDir $OutputDir
    }
    "skills" {
        Export-AllSkills -OutDir $Name  # $Name acts as optional output dir here
    }
    "agents" {
        Export-AllAgents -OutDir $Name  # $Name acts as optional output dir here
    }
    { $_ -in "help", "--help", "-h", "-?" } {
        Show-Help
    }
    default {
        if (-not $Command) {
            Export-AllSkills
            Export-AllAgents
        } else {
            Write-Error "Unknown command: $Command"
            Show-Help
            exit 1
        }
    }
}
