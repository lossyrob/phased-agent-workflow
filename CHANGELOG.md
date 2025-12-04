# Changelog

All notable changes to the PAW Workflow project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automatic agent installation management system that installs PAW agents to VS Code prompts directory on extension activation, handles version upgrades and downgrades bidirectionally with automatic cleanup of obsolete files, supports development builds with force-reinstallation for local testing, and removes agents during extension uninstall - transforms PAW into a fully integrated VS Code development companion with zero manual configuration
- PAW Context Tool (`paw_get_context`) enabling agents to dynamically retrieve workspace-specific custom instructions from `.paw/instructions/`, user-level custom instructions from `~/.paw/instructions/`, and workflow metadata at runtime - allows project-specific and personal agent customizations without modifying globally-installed agent files

### Changed
- Implementation Planner agent now emphasizes strategic architectural thinking over code-level detail, adds Phase Summary sections to all plans for quick understanding, prevents documentation phases from appearing in implementation plans, and includes clear agent identification in Planning PRs
- Workflow initialization now collects issue URL first (enabling context-aware branch prompts), makes branch name optional with auto-derivation from issue title or freeform work description, and stores user descriptions as "Initial Prompt" in WorkflowContext.md for downstream agent context

