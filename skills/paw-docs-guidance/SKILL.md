---
name: paw-docs-guidance
description: Documentation conventions for PAW implementation workflow. Provides Docs.md template structure, include/exclude guidelines, and project documentation update patterns.
---

# Documentation Guidance Utility Skill

Provides documentation conventions and templates for PAW implementation workflow. Load this skill when creating Docs.md or updating project documentation.

## Docs.md Purpose

`Docs.md` is the **authoritative technical reference** for implemented work. It serves as:

- The most comprehensive documentation of what was implemented
- A standalone technical reference for engineers
- The source of truth for understanding how the implementation works
- The basis for generating project-specific documentation
- Documentation that persists as the go-to reference

**Docs.md is NOT**: A list of documentation changes or a changelog.

## Docs.md Template

```markdown
# [Work Title]

## Overview

[Comprehensive description of what was implemented, its purpose, and the problem it solves]

## Architecture and Design

### High-Level Architecture
[Architectural overview, system components, data flow]

### Design Decisions
[Key design choices made during implementation and rationale]

### Integration Points
[How this implementation integrates with existing systems]

## User Guide

### Prerequisites
[What users need before using this implementation]

### Basic Usage
[Step-by-step guide for common use cases with examples]

### Advanced Usage
[Complex scenarios, customization options, power-user features]

## API Reference

### Key Components
[Document reusable components that other code will call]

### Configuration Options
[Available settings and their effects]

## Testing

### How to Test
[How to exercise the implementation as a human user]

### Edge Cases
[Known edge cases and how they're handled]

## Limitations and Future Work

[Known limitations, planned improvements, out-of-scope items]
```

## What to Include

Focus Docs.md on information not easily discovered from code:

| Include | Why |
|---------|-----|
| Design decisions and rationale | Not visible in code |
| Architecture and integration points | High-level view |
| User-facing behavior and usage patterns | User perspective |
| How to test/exercise as a human | Verification guidance |
| Migration paths and compatibility | Operational knowledge |
| Reusable components for other code | API surface |
| Edge cases and limitations | Gotchas users should know |

## What NOT to Include

Avoid duplicating information already in code or other artifacts:

| Exclude | Why |
|---------|-----|
| Code reproduction | Already in the code |
| Every function/class | Internal details |
| Exhaustive API docs | Over-documentation |
| Test coverage checklists | In PRs and tests |
| Acceptance criteria verification | In implementation artifacts |
| Project doc updates list | In PR description |
| Unnecessary code examples | Only when essential |

## Project Documentation Updates

When updating README, CHANGELOG, guides, or API docs, follow these principles:

### Style Matching (CRITICAL)

**STUDY FIRST**: Before updating any project documentation:
1. Read multiple existing entries/sections
2. Understand the style, length, and detail level
3. Match it precisely

### CHANGELOG Discipline

- Create **ONE entry** for the work, not multiple sub-entries
- Follow existing format exactly (bullet style, sentence case, etc.)
- Group related changes into a single coherent entry

**Example:**
```markdown
## [Unreleased]

### Added
- Skills-based architecture for implementation workflow (#164)
```

### README Discipline

- Match section length and detail level of surrounding sections
- Don't expand sections beyond the existing style
- Keep additions proportional to the significance of the change

### When Uncertain

Err on the side of **LESS detail** in project docs. Docs.md contains the comprehensive detail; users can ask for more if needed.

## Surgical Change Discipline

- ONLY modify documentation files required to describe the completed work
- DO NOT format or rewrite implementation code sections
- DO NOT introduce unrelated documentation updates or cleanups
- DO NOT remove historical context without explicit direction
- When unsure if a change is purely documentation, pause and ask

## Documentation Depth by Workflow Mode

| Mode | Docs.md Depth | Project Docs |
|------|---------------|--------------|
| full | Comprehensive with all sections | Full updates |
| minimal | Essential information only | Minimal updates |
| custom | Per Custom Workflow Instructions | As specified |

## Quality Checklist

Before completing documentation:

- [ ] Docs.md covers all sections relevant to the implementation
- [ ] Design decisions and rationale documented
- [ ] User-facing behavior explained with examples
- [ ] No code reproduction or over-documentation
- [ ] Project docs match existing style
- [ ] CHANGELOG has single coherent entry
- [ ] README changes proportional to significance
