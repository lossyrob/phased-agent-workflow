# PAW-01B Spec Researcher Agent Annotation

This directory contains the annotated analysis of the PAW-01B Spec Researcher Agent prompt following the [Prompt Annotation Skill](../../../../.github/skills/prompt-annotation/SKILL.md).

## Files

| File | Description |
|------|-------------|
| [PAW-01B-Spec-Researcher.annotated.md](PAW-01B-Spec-Researcher.annotated.md) | Full prompt with XML-style annotations |
| [summary.md](summary.md) | Structural summary with counts and gap analysis |
| [mindmap.mmd](mindmap.mmd) | Mermaid mindmap showing topic hierarchy |
| [mindmap.mm.md](mindmap.mm.md) | Markmap format (interactive, collapsible) |
| [flow.mmd](flow.mmd) | Mermaid flowchart showing workflow with decision points |
| [constraint-map.mmd](constraint-map.mmd) | Mermaid diagram showing guardrail-to-workflow mappings |
| [reusable-skills.md](reusable-skills.md) | Catalog of extractable reusable skills |

## Quick Stats

- **Total Annotations**: 30
- **Guardrails**: 10
- **Workflow Steps**: 5
- **Reusable Content**: ~37%
- **Phase-Bound Content**: ~40%
- **Workflow-Controlling**: ~13%

## Key Findings

### Reusable Patterns Identified
1. **Anti-Evaluation Directive** - Strong "describe only" constraint preventing recommendations
2. **Idempotent Artifact Updates** - Minimal diff, preserve accurate content
3. **Conciseness Directive** - Direct factual answers, avoid context bloat
4. **No Speculation Rule** - State only what exists
5. **No Proposals Rule** - No "shoulds" or refactors
6. **Read Files Fully** - No partial reads that could mislead
7. **Incremental Building Pattern** - Section-by-section artifact construction
8. **MCP Tool Preference** - Platform tools over CLI for GitHub ops

### Phase-Specific Elements
- SpecResearch.md document format (Summary, Findings, Unknowns, External Knowledge)
- Question-Answer-Evidence-Implications structure
- Behavioral vs Implementation distinction (SpecResearch vs CodeResearch)
- Canonical output path
- Quality checklist items

### Workflow Elements
- Circular handoff (returns to PAW-01A, not forward to 02A)
- No commit/post restrictions
- PAW Context injection point

## Agent Characteristics

This agent is notably **constrained** compared to other PAW agents:

1. **Single output**: Only produces SpecResearch.md
2. **No design authority**: Cannot suggest, only document
3. **Behavioral-only scope**: Implementation details delegated to Code Research
4. **Circular workflow**: Returns to parent agent rather than advancing

## Comparison with PAW-01A Specification

| Aspect | PAW-01A | PAW-01B |
|--------|---------|---------|
| Mission | Design specification | Document existing behavior |
| Design authority | Yes | No |
| Artifact | Spec.md | SpecResearch.md |
| Handoff | Forward to 02A | Back to 01A |
| Quality gate | Comprehensive | Minimal |

## Visualization

To render the Mermaid diagrams:
- Use VS Code with Mermaid extension
- Use the [Mermaid Live Editor](https://mermaid.live)
- Include in MkDocs with mermaid plugin

To view Markmap (interactive):
- Install `markmap.markmap-vscode` extension
- Open `mindmap.mm.md` file
- Or use CLI: `npx markmap-cli mindmap.mm.md -o mindmap.html`
