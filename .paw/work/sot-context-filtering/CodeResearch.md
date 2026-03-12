---
date: 2026-03-01T11:05:00Z
git_commit: 40105ef4ad48d3f93ea7fec5592127917d76bd69
branch: feature/sot-context-filtering
repository: erdemtuna/phased-agent-workflow
topic: "SoT context-based specialist filtering"
tags: [research, codebase, paw-sot, specialists, frontmatter]
status: complete
last_updated: 2026-03-01
---

# Research: SoT Context-Based Specialist Filtering

## Research Question

How does the paw-sot skill currently discover specialists, parse frontmatter, and where should context filtering be integrated?

## Summary

The paw-sot skill uses a 4-level precedence system for specialist discovery (workflow → project → user → built-in). Specialists are markdown files with YAML frontmatter. An existing `extractFrontmatterField()` utility supports case-insensitive field extraction. The filtering should occur after discovery and before adaptive selection. All 9 built-in specialists currently have no `context` field in frontmatter—they will need `context: implementation` added.

## Documentation System

- **Framework**: mkdocs (Material theme)
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml:1`
- **Style Conventions**: Technical reference style, code blocks with copy button
- **Build Command**: `mkdocs build` (or `mkdocs serve` for local dev)
- **Standard Files**: `README.md` (root), `CHANGELOG.md` (root), `docs/index.md`

## Verification Commands

- **Test Command**: `npm test`
- **Lint Command**: `npm run lint`
- **Build Command**: Not explicitly defined (VS Code extension, uses `vsce package`)
- **Type Check**: Implicit via `eslint` with TypeScript support

## Detailed Findings

### Review Context Input Contract

The review context contract is defined in SKILL.md lines 25-36. Current fields:

| Field | Required | Values |
|-------|----------|--------|
| `type` | yes | `diff` \| `artifacts` \| `freeform` |
| `coordinates` | yes | diff range, artifact paths, or content description |
| `output_dir` | yes | directory path |
| `specialists` | no | `all` (default) \| comma-separated names \| `adaptive:<N>` |
| `interaction_mode` | yes | `parallel` \| `debate` |
| `interactive` | yes | `true` \| `false` \| `smart` |
| `specialist_models` | no | `none` \| model pool \| pinned pairs \| mixed |
| `framing` | no | free text |
| `perspectives` | no | `none` \| `auto` (default) \| comma-separated names |
| `perspective_cap` | no | positive integer (default `2`) |

The `context` field will be added as a new optional field.

Location: `skills/paw-sot/SKILL.md:25-36`

### Specialist Discovery Flow

Discovery happens at 4 precedence levels (`SKILL.md:52-66`):

1. **Workflow**: Parse `specialists` from review context
2. **Project**: Scan `.paw/personas/<name>.md` files
3. **User**: Scan `~/.paw/personas/<name>.md` files
4. **Built-in**: Scan `references/specialists/<name>.md` files (excluding `_shared-rules.md`)

Resolution rules:
- `specialists: all` → include all discovered from all levels
- Fixed list → resolve each name, most-specific-wins
- `adaptive:<N>` → discover all, then select N most relevant

Context filtering should occur **after discovery** (all specialists loaded with their frontmatter parsed) and **before adaptive selection** (filtered pool becomes input to adaptive).

Location: `skills/paw-sot/SKILL.md:52-66`

### Adaptive Selection

Adaptive selection (`SKILL.md:68-85`) analyzes the review target to select N most relevant specialists. Key behaviors:

- If N ≥ available specialists → include all
- Trivial changes → report condition to caller
- Zero relevant specialists (interactive) → prompt user
- Zero relevant specialists (non-interactive) → report to caller

The context filtering zero-match handling should follow similar patterns.

Location: `skills/paw-sot/SKILL.md:68-85`

### Frontmatter Extraction Utility

The `extractFrontmatterField()` function in `src/utils/frontmatter.ts:19-52` provides:

- Case-insensitive field name matching (`fieldName.toLowerCase()`)
- Support for quoted and unquoted values
- Colons within values handled correctly
- Returns empty string if field not found or no frontmatter

This utility is already used for `shared_rules_included` and `model` fields. It will work directly for extracting `context` field.

Location: `src/utils/frontmatter.ts:19-52`

### Current Frontmatter Usage in SKILL.md

Two frontmatter fields are currently documented:

1. **`shared_rules_included`** (`SKILL.md:126`): If `true`, skip shared rules injection
2. **`model`** (`SKILL.md:149`): Pin specialist to a specific model

The `context` field will follow the same pattern.

### Built-in Specialist Files

9 specialist files exist at `skills/paw-sot/references/specialists/`:

1. `security.md`
2. `architecture.md`
3. `performance.md`
4. `testing.md`
5. `correctness.md`
6. `edge-cases.md`
7. `maintainability.md`
8. `release-manager.md`
9. `assumptions.md`

Plus `_shared-rules.md` (loaded once, not a specialist).

**Current frontmatter**: All specialist files have empty frontmatter (`---\n---` pattern, or no frontmatter at all). They start directly with `# [Specialist Name]`.

Each specialist file contains:
- Identity & Narrative Backstory
- Cognitive Strategy
- Domain Boundary / Behavioral Rules

### Context-Adaptive Preambles

Type-dependent preambles are injected during prompt composition (`SKILL.md:38-49`):

- `type: diff` → implementation review framing
- `type: artifacts` → design/planning review framing
- `type: freeform` → caller-provided framing or neutral default

These preambles are unaffected by context filtering—they serve a different purpose (prompt framing vs. specialist selection).

### Interactive Patterns

The skill has established patterns for interactive user prompts (`SKILL.md:82-83`):

- **Interactive mode** (`interactive: true`): Present options to user
- **Non-interactive mode** (`interactive: false`): Report to caller
- **Smart mode** (`interactive: smart`): Escalate on significant conditions

Zero-match context filtering should follow these same patterns.

## Code References

- `skills/paw-sot/SKILL.md:25-36` - Review context input contract
- `skills/paw-sot/SKILL.md:52-66` - Specialist discovery
- `skills/paw-sot/SKILL.md:68-85` - Adaptive selection
- `skills/paw-sot/SKILL.md:126` - `shared_rules_included` frontmatter usage
- `skills/paw-sot/SKILL.md:149` - `model` frontmatter usage
- `src/utils/frontmatter.ts:19-52` - `extractFrontmatterField()` utility
- `skills/paw-sot/references/specialists/*.md` - 9 built-in specialist files

## Architecture Documentation

### Flow Diagram

```
Review Context Input
        │
        ▼
┌───────────────────┐
│ Specialist        │  (4-level precedence)
│ Discovery         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Context Filtering │  ◄── NEW: Extract context from frontmatter, match against caller
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Adaptive Selection│  (if specialists: adaptive:N)
└─────────┬─────────┘
          │
          ▼
     Prompt Composition → Execution → Synthesis
```

### Integration Points

1. **Review Context Contract** - Add `context` field to table
2. **Specialist Discovery section** - Add context extraction step
3. **New "Context Filtering" section** - Document filtering behavior after discovery
4. **Adaptive Selection section** - Clarify filtering happens first
5. **Built-in specialist files** - Add `context: implementation` frontmatter

## Open Questions

None—all questions resolved during work shaping.
