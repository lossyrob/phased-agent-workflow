# PAW-01A Specification Agent Annotation

This directory contains the annotated analysis of the PAW-01A Specification Agent prompt following the [Annotation Guide](../../skills/prompt-annotation/ANNOTATION_GUIDE.md).

## Files

| File | Description |
|------|-------------|
| [PAW-01A-Specification.annotated.md](PAW-01A-Specification.annotated.md) | Full prompt with XML-style annotations |
| [summary.md](summary.md) | Structural summary with counts and gap analysis |
| [mindmap.mmd](mindmap.mmd) | Mermaid mindmap showing topic hierarchy |
| [flow.mmd](flow.mmd) | Mermaid flowchart showing workflow with decision points |
| [constraint-map.mmd](constraint-map.mmd) | Mermaid diagram showing guardrail-to-workflow mappings |
| [reusable-skills.md](reusable-skills.md) | Catalog of extractable reusable skills |

## Quick Stats

- **Total Annotations**: 46
- **Guardrails**: 18
- **Workflow Steps**: 17
- **Reusable Content**: ~33%
- **Phase-Bound Content**: ~37%
- **Workflow-Controlling**: ~15%

## Key Findings

### Reusable Patterns Identified
1. Clarification resolution (block until resolved)
2. Assumption documentation (explicit with rationale)
3. No fabrication / no speculation rules
4. Implementation detail transformation (technical → behavioral)
5. Discrepancy resolution format
6. Incremental writing pattern
7. User autonomy respect
8. Unknown classification logic

### Phase-Specific Elements
- Specification template structure
- Research prompt format
- FR/SC/EC numbering scheme
- Quality checklist categories
- Research vs design distinction

### Workflow Elements
- Stage transition logic (01A ↔ 01B → 02A)
- Mode handling (full/minimal/custom)
- Pause points and blocking behavior
- Non-responsibility boundaries

## Visualization

To render the Mermaid diagrams:
- Use VS Code with Mermaid extension
- Use the [Mermaid Live Editor](https://mermaid.live)
- Include in MkDocs with mermaid plugin
