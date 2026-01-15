# PAW-01A Specification Agent - Structure Summary

## Agent Identity
- **Name**: PAW-01A Specification Agent
- **Mission**: Convert rough Issue/feature brief → structured specification + research prompt
- **Phase**: Stage 01 (Specification)
- **Operating Principle**: Behavioral clarity first, research second, specification last

## Annotation Counts

| Category | Count |
|----------|-------|
| Guardrails | 18 |
| Workflow Steps | 17 |
| Decision Frameworks | 5 |
| Classification Logic | 4 |
| Artifact Formats | 4 |
| Quality Gates | 2 |
| Handoff Instructions | 3 |
| Communication Patterns | 1 |
| Examples | 4 |
| Context Requirements | 2 |

## Scope Breakdown

| Scope | Count | Percentage |
|-------|-------|------------|
| `reusable` | 15 | ~33% |
| `phase-bound` | 17 | ~37% |
| `workflow` | 7 | ~15% |
| (unspecified) | 7 | ~15% |

## Structural Analysis

### Reusable Content (Extractable Skills)
- **Clarification handling**: Resolve questions before proceeding
- **Assumption documentation**: Replace low-impact unknowns with explicit assumptions
- **No speculation rule**: Every feature maps to a defined story
- **No fabrication rule**: Only use supported inputs
- **User autonomy**: Respect user decisions while offering guidance
- **Incremental writing**: Write sections as you go, summaries in chat
- **Discrepancy resolution pattern**: Structured conflict notification
- **Implementation detail transformation**: Technical → behavioral language
- **Minimal diff updates**: Modify only impacted sections
- **Issue/PR interaction pattern**: Use MCP tools, fetch body + comments

### Phase-Bound Content (Spec-Specific)
- **User value focus guardrail**: WHAT/WHY, no implementation details
- **Testable stories requirement**: Priority, acceptance scenarios, independent test
- **Enumerated traceability**: FR/SC/EC numbering scheme
- **Research vs design distinction**: Research = existing behavior, design = new decisions
- **Measurable tech-agnostic criteria**: No technology references in success criteria
- **Scope/risk enumeration**: In/Out boundaries, risks with mitigations
- **Spec template structure**: Full specification format
- **Research prompt format**: Minimal header format
- **Quality checklist**: Content, narrative, requirement, ambiguity checks

### Workflow-Controlling Content
- **Stage transitions**: Research → Spec, Spec → Code Research
- **Mode handling**: full/minimal/custom workflow modes
- **Pause points**: After research prompt, before spec assembly
- **Handoff logic**: Conditional based on artifact existence
- **Non-responsibilities**: No git ops, no PR creation, no status posting

## Potential Gaps

- ⚠️ No explicit rollback/recovery guidance if quality gate fails repeatedly
- ⚠️ No explicit guidance for handling very large specifications (chunking)
- ✓ Quality gates present and comprehensive
- ✓ Handoff instructions clear with examples
- ✓ Working modes well-defined

## Key Workflow Paths

```
Path 1: Standard Flow (Research Needed)
  Intake → Stories → Classify Unknowns → Research Prompt → PAUSE
  → Research → Integrate → Assemble Spec → Quality Check → Handoff

Path 2: Research Exists
  Intake → Detect SpecResearch.md → Integrate → Assemble Spec 
  → Quality Check → Handoff

Path 3: Skip Research
  Intake → Stories → Classify Unknowns → Document Assumptions 
  → Assemble Spec (with risk note) → Quality Check → Handoff
```

## Artifact Dependencies

### Inputs
- Issue/feature brief (required)
- `SpecResearch.md` (optional, if exists skips research)
- Hard constraints from user (optional)

### Outputs
- `Spec.md` at `.paw/work/<feature-slug>/Spec.md`
- `prompts/01B-spec-research.prompt.md` (if research needed)

### Downstream Consumers
- PAW-01B Spec Researcher (receives research prompt)
- PAW-02A Code Researcher (receives completed Spec.md)
