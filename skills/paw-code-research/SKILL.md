---
name: paw-code-research
description: Code research activity skill for PAW workflow. Documents implementation details with file:line references, discovers documentation infrastructure, and creates CodeResearch.md artifact.
---

# Code Research

Document **where and how** code works with precise file:line references. Creates a technical map of the existing system for implementation planning.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Document implementation details with file:line references
- Discover documentation infrastructure (framework, config, conventions)
- Trace data flows and component interactions
- Find code patterns and integration points
- Generate GitHub permalinks when on pushed commits
- Conduct additional research on demand

## Scope: Implementation Documentation

**Document**:
- Exact file paths and line numbers for components
- Implementation details and technical architecture
- Code patterns and design decisions
- Integration points with specific references
- Test file locations and testing patterns
- Documentation system configuration

**Do NOT**:
- Suggest improvements or changes
- Critique implementation choices
- Recommend refactoring
- Identify bugs or problems
- Perform root cause analysis

**Relationship to SpecResearch.md**: This research assumes behavioral understanding from SpecResearch.md exists. CodeResearch.md adds implementation detail (where code lives, how it works) for planning.

## Research Methodology

### Code Location: Find WHERE

1. Search for files containing relevant keywords
2. Check common locations (src/, lib/, pkg/, etc.)
3. Categorize by purpose: implementation, tests, config, docs, types
4. Return full paths from repository root

### Code Analysis: Understand HOW

1. Read entry points (exports, public methods, handlers)
2. Follow code paths step by step
3. Document with file:line references
4. Note transformations, validations, side effects

**Guidelines**:
- Always include file:line references for claims
- Read files thoroughly before making statements
- Trace actual code paths—don't assume
- Focus on "how it works" not "how it should work"

### Pattern Finding: Discover CONVENTIONS

1. Find similar implementations as templates
2. Show code structure and patterns
3. Note conventions in use
4. Include file:line references

## Documentation System Discovery

Research documentation infrastructure as a standard component. Capture in CodeResearch.md:

| Aspect | What to Find |
|--------|--------------|
| Framework | mkdocs, docusaurus, sphinx, plain markdown, none |
| Docs Directory | Path to docs folder (e.g., `docs/`, `documentation/`) |
| Navigation Config | mkdocs.yml, sidebar.js, conf.py, etc. |
| Style Conventions | Verbosity level, heading patterns, code block usage |
| Build Command | Command to build/serve docs locally |
| Standard Files | README.md, CHANGELOG.md, CONTRIBUTING.md locations |

**Why**: Planning skill uses this to determine if documentation phases are warranted and how to structure them.

## CodeResearch.md Artifact

Save to: `.paw/work/<work-id>/CodeResearch.md`

### Template

```markdown
---
date: [ISO timestamp with timezone]
git_commit: [commit hash]
branch: [branch name]
repository: [repo name]
topic: "[Research topic]"
tags: [research, codebase, component-names]
status: complete
last_updated: [YYYY-MM-DD]
---

# Research: [Topic]

**Date**: [timestamp]
**Git Commit**: [hash]
**Branch**: [branch]
**Repository**: [repo]

## Research Question

[Original query or derived from Spec.md]

## Summary

[High-level findings answering the research question]

## Documentation System

- **Framework**: [mkdocs/docusaurus/sphinx/markdown/none]
- **Docs Directory**: [path or N/A]
- **Navigation Config**: [path or N/A]
- **Style Conventions**: [key observations]
- **Build Command**: [command or N/A]
- **Standard Files**: [README, CHANGELOG locations]

## Detailed Findings

### [Component/Area 1]

- Description (`file.ext:line`, include permalink if available)
- How it connects to other components
- Current implementation details

### [Component/Area 2]

...

## Code References

- `path/to/file.py:123` - Description
- `another/file.ts:45-67` - Description

## Architecture Documentation

[Patterns, conventions, and design implementations found]

## Open Questions

[Areas needing further investigation, if any]
```

### GitHub Permalinks

When on main branch or pushed commit, generate permalinks:

```
https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}
```

Use `gh repo view --json owner,name` to get repository info.

## Execution

### Desired End States

- All relevant components documented with file:line references
- Documentation infrastructure captured
- Findings organized logically by component or concern
- CodeResearch.md saved with valid YAML frontmatter

### Workflow Mode Adaptation

| Mode | Spec Artifact | Approach |
|------|---------------|----------|
| full | Spec.md exists | Read Spec.md for context, comprehensive research |
| minimal | Spec.md may not exist | Use Issue URL as requirements source |
| custom | Check Custom Workflow Instructions | Adapt based on instructions |

If Spec.md expected but missing, note it and use Issue URL as fallback.

### Follow-up Research

For additional questions after initial research:
- Append to existing CodeResearch.md
- Add `## Follow-up Research [timestamp]` section
- Update frontmatter: `last_updated`, add `last_updated_note`

## Quality Checklist

- [ ] All research objectives addressed with supporting evidence
- [ ] Every claim includes file:line references (or permalinks when available)
- [ ] Findings organized logically by component or concern
- [ ] Documentation System section completed
- [ ] GitHub permalinks added when on pushed commit
- [ ] Tone remains descriptive and neutral (no critiques or recommendations)
- [ ] CodeResearch.md saved with valid YAML frontmatter

## Completion Response

Report to PAW agent:
- Artifact path: `.paw/work/<work-id>/CodeResearch.md`
- Summary of key findings
- Any open questions requiring user input
