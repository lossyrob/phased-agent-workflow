---
# Custom Instructions for Work Item Initialization
# Place this file at .paw/instructions/init-instructions.md in your workspace
---

# Project-Specific Initialization Rules

## Naming Conventions

For this project, all feature slugs should:
- Include the component prefix (e.g., "api-", "ui-", "db-")
- Use project-standard abbreviations (e.g., "auth" not "authentication")

## Required Metadata

Always include the following in WorkflowContext.md Additional Inputs field:
- Component: [api|ui|db|infra]
- Priority: [P0|P1|P2|P3]

## Branch Naming

Target branches must follow the pattern:
- feature/<component>-<slug>
- bugfix/<component>-<slug>
- hotfix/<component>-<slug>

## Custom Prompt Templates

This project uses additional prompt templates beyond the standard 9:
- 0Y-security-review.prompt.md - Security review checklist
- 0Z-performance-test.prompt.md - Performance testing plan

Create these additional templates alongside the standard set for every work item.

## Issue Tracking Integration

Always require an issue or work item URL for this project (GitHub Issues or Azure DevOps Work Items). The Work Title must match the issue/work item title exactly (no abbreviations or modifications).
