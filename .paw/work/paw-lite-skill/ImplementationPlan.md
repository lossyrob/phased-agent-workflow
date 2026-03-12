# Implementation Plan — PAW Lite Skill

## Approach

Create `skills/paw-lite/SKILL.md` — a single lightweight workflow skill that orchestrates:
1. **Work Shaping** (optional) — delegates to existing `paw-work-shaping` skill
2. **Planning** — agent creates a plan, saves as artifact, inserts SQL todos
3. **Implementation** — fleet-style parallel dispatch via task subagents
4. **Review** — configurable: single-model, multi-model, or SoT (delegates to `paw-sot`)
5. **PR** — branch cleanup, artifact lifecycle, PR creation

The skill embeds fleet-style coordination patterns (proven in POC) and references existing skills by name rather than duplicating their content. Git operations and artifact lifecycle follow existing PAW conventions.

## Todos

### Phase 1: Core Skill
- **skill-md**: Create `skills/paw-lite/SKILL.md` with frontmatter, workflow stages, fleet coordination patterns, review configuration, and PR mechanics
- **references**: Create `skills/paw-lite/references/` with any supplementary content (e.g., example WorkflowContext fields for paw-lite mode)

### Phase 2: Integration  
- **poc-cleanup**: Remove `.github/skills/poc-fleet-plan/` (no longer needed)
- **update-plugin-json**: Ensure `skills/paw-lite` is discoverable — check if plugin.json `skills` field auto-discovers or needs explicit listing

### Phase 3: Documentation
- **docs-update**: Update user guide or reference docs to mention PAW Lite as an available workflow mode

## Design Decisions

1. **Single skill, not an agent** — loaded on demand via `paw_get_skill` or `/skills`, works with any agent
2. **Reuses existing skills by reference** — work-shaping, sot, git-operations invoked by name
3. **Fleet pattern embedded** — SQL todos + parallel task subagents, no CLI mode dependency
4. **WorkflowContext.md compatible** — uses same `.paw/work/<id>/` structure, artifact lifecycle
5. **Local strategy only** — no intermediate PRs, simpler flow
6. **Plan artifact** — saved to `.paw/work/<id>/Plan.md`, committed per lifecycle
