# Code Research: Documenter Survey Docs Structure

---
date: 2025-12-13 22:03:40 EST
git_commit: b93dd77cbf3f17f0c47cae33a7137737c5cac638
branch: feature/144-documenter-survey-docs-structure
repository: phased-agent-workflow
topic: "Add documentation structure survey step to Documenter agent"
tags: [research, codebase, documenter, mkdocs, documentation-framework]
status: complete
last_updated: 2025-12-13
---

**Date**: 2025-12-13 22:03:40 EST
**Git Commit**: b93dd77cbf3f17f0c47cae33a7137737c5cac638
**Branch**: feature/144-documenter-survey-docs-structure
**Repository**: phased-agent-workflow

## Research Question

How should the Documenter agent be modified to survey project documentation structure before creating documentation, and what patterns exist in the codebase that inform this implementation?

## Summary

The PAW-04 Documenter agent is a 477-line agent file with 5 core process steps for initial documentation. A survey step should be inserted as a new **step 3** after "Analyze implementation" and before "Create comprehensive Docs.md" (current step 3). The agent currently has no documentation structure discovery capability—it relies on fixed file type lists and style-matching guidance during updates.

The PAW project itself provides an exemplary MkDocs structure with `mkdocs.yml` at the root, `docs/` directory with `guide/`, `reference/`, and `specification/` subdirectories, and a `nav` section defining the site navigation. This structure demonstrates what the survey step needs to detect and how guides integrate with navigation.

No existing PAW agents perform upfront structure surveys; however, the Code Researcher agent provides patterns for systematic file exploration that could inform the survey approach.

## Detailed Findings

### Documenter Agent Current Structure

The Documenter agent ([agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md)) contains:

**Lines 1-98**: Frontmatter and setup instructions
- Agent description and PAW context template
- Start/Initial Response block (lines 12-31)
- Branching logic for prs vs local strategy (lines 33-75)
- Documentation depth by mode guidance (lines 77-93)
- Work Title for PR naming (lines 95-98)

**Lines 99-212**: Process Steps for Initial Documentation
- Step 1: Validate prerequisites (lines 103-106)
- Step 2: Analyze implementation (lines 108-112)
- Step 3: Create comprehensive Docs.md (lines 114-127) ← **INSERT SURVEY BEFORE THIS**
- Step 4: Update project documentation (lines 129-147)
- Step 5: Determine review strategy and commit/push (lines 149-180)

**Lines 213-247**: Process Steps for Review Comment Follow-up
- 8 sub-steps for handling PR review comments

**Lines 249-288**: Inputs, Outputs, Scope Boundaries

**Lines 290-334**: Guardrails
- What NOT to include in Docs.md (lines 296-305)
- Focus Docs.md On guidance (lines 307-317)
- Project Documentation Style Matching (lines 319-334)

**Lines 336-413**: Docs.md Artifact Format template

**Lines 415-477**: Quality Standards, Checklist, and Handoff

### Survey Step Insertion Point

**Location**: Between current step 2 and step 3 (after line 112, before line 114)

The insertion point is logically correct because:
1. Step 2 completes implementation analysis—the agent understands WHAT was implemented
2. New step 3 (survey) discovers WHERE documentation should go based on project structure
3. Original step 3 (now step 4) creates Docs.md informed by survey findings
4. Original step 4 (now step 5) updates project documentation using survey discoveries

**Line references for modification**:
- [agents/PAW-04 Documenter.agent.md:112](agents/PAW-04%20Documenter.agent.md#L112): End of step 2
- [agents/PAW-04 Documenter.agent.md:114](agents/PAW-04%20Documenter.agent.md#L114): Start of step 3 (will become step 4)

### Current "Update project documentation" Step Analysis

Step 4 at [lines 129-147](agents/PAW-04%20Documenter.agent.md#L129-L147) currently provides:

```markdown
4. **Update project documentation**:
   - Update README for new features (summarized from Docs.md)
   - Add CHANGELOG entries
   - Refresh API documentation (based on Docs.md)
   - Update user guides or tutorials (derived from Docs.md)
   - Create migration guides if applicable
   - Follow project documentation standards
   - Note: Project docs may be less detailed than Docs.md
   
   **CRITICAL - Match Existing Project Documentation Style:**
   - **CHANGELOG**: Keep to a SINGLE entry for the work...
   - **README**: Be concise and match the verbosity level...
   - **Project docs**: Study existing documentation style...
```

**Gap identified**: No mechanism to discover:
- Whether a documentation framework exists (MkDocs, Docusaurus, etc.)
- Where guides/reference/tutorial directories are located
- What navigation structure is in use
- Whether new guide pages should be created

### MkDocs Structure Pattern (PAW Project Reference)

The PAW project itself demonstrates the documentation structure the survey must detect:

**Configuration file**: [mkdocs.yml](mkdocs.yml) at repository root (69 lines)
- Lines 1-9: Comments and build instructions
- Lines 11-16: Site metadata (`site_name`, `site_url`, etc.)
- Lines 18-21: Repository configuration
- Lines 23-44: Theme configuration (Material theme)
- Lines 46-47: Plugins (`search`)
- Lines 49-60: Markdown extensions
- **Lines 62-75**: Navigation (`nav`) section defining site structure

**Navigation structure** ([mkdocs.yml:62-75](mkdocs.yml#L62-L75)):
```yaml
nav:
  - Home: index.md
  - User Guide:
    - Getting Started: guide/index.md
    - VS Code Extension: guide/vscode-extension.md
    - Workflow Modes: guide/workflow-modes.md
    - Stage Transitions: guide/stage-transitions.md
    - Custom Instructions: guide/custom-instructions.md
    - Two Workflows: guide/two-workflows.md
  - Specification:
    - Overview: specification/index.md
    - Implementation Workflow: specification/implementation.md
    - Review Workflow: specification/review.md
  - Reference:
    - Agents: reference/agents.md
    - Artifacts: reference/artifacts.md
```

**Docs directory structure**:
```
docs/
├── index.md                    # Home page
├── guide/                      # User-facing guides
│   ├── index.md               # Getting Started
│   ├── custom-instructions.md # 215 lines
│   ├── stage-transitions.md
│   ├── two-workflows.md
│   ├── vscode-extension.md
│   └── workflow-modes.md      # 158 lines
├── reference/                  # Technical reference
│   ├── agents.md              # 222 lines
│   └── artifacts.md
└── specification/              # Detailed specifications
    ├── index.md
    ├── implementation.md
    └── review.md
```

### Documentation Framework Detection Patterns

**MkDocs detection**:
- Config file: `mkdocs.yml` or `mkdocs.yaml` at repo root
- Docs source: Usually `docs/` (or `docs_dir` in config)
- Nav structure: `nav` key in config YAML

**Other frameworks** (detection-only per spec scope):
- Docusaurus: `docusaurus.config.js` or `docusaurus.config.ts`
- VuePress: `.vuepress/config.js` or `docs/.vuepress/`
- Sphinx: `conf.py` with `docs/` or `source/`
- Jekyll: `_config.yml` with `docs/` or `_docs/`

### Guide Content Patterns

**Guide characteristics** (from [docs/guide/index.md](docs/guide/index.md)):
- User-facing tone ("This guide will help you...")
- Practical focus (prerequisites, quick install, workflow overview)
- Links to related guides
- Concise steps, not comprehensive technical detail
- 65 lines for Getting Started guide

**Reference characteristics** (from [docs/reference/agents.md](docs/reference/agents.md)):
- Technical inventory style
- Structured with consistent patterns per item
- 222 lines documenting all agents
- Cross-references between related items

**Implication for guide creation**: 
- New guides should follow the guide directory style: user-facing, practical, concise
- Technical detail lives in Docs.md, not in created guides
- Guide should link back to comprehensive documentation

### Related Agent Patterns

**Code Researcher** ([agents/PAW-02A Code Researcher.agent.md](agents/PAW-02A%20Code%20Researcher.agent.md)):
- Uses "Code Location" approach (lines 219-241): Find files by topic, categorize findings, return structured results
- Search strategy (lines 242-259): Broad search first, refine by language/framework
- No upfront survey pattern, but systematic exploration with structured output

**Pattern applicable to survey**: The survey can use similar systematic approach:
1. Check for known config files (framework detection)
2. Explore identified docs directories (structure discovery)
3. Return structured findings (inform later steps)

### Docs.md Integration Points

The survey findings should enhance two existing Docs.md sections:

**Current Docs.md template** ([lines 336-413](agents/PAW-04%20Documenter.agent.md#L336-L413)):
- No documentation structure section exists

**Proposed addition**: A "Documentation Structure" or "Survey Findings" section in Docs.md frontmatter or early content to document what was discovered (per FR-004).

### Step 5 Update Project Documentation Enhancement

The survey findings should inform [step 4 (current step 5)](agents/PAW-04%20Documenter.agent.md#L129-L147) to:
1. Check survey for discovered guide directory location
2. If structured docs exist, create user-facing guide in appropriate location
3. Update navigation configuration (mkdocs.yml nav section)
4. If no structure found, proceed with current behavior (README/CHANGELOG only)

## Code References

| File | Lines | Description |
|------|-------|-------------|
| [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md) | 1-477 | Complete Documenter agent file |
| [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md#L99-L180) | 99-180 | Process Steps for Initial Documentation |
| [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md#L112) | 112 | End of step 2 (survey insertion point) |
| [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md#L129-L147) | 129-147 | Step 4: Update project documentation |
| [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md#L336-L413) | 336-413 | Docs.md artifact template |
| [mkdocs.yml](mkdocs.yml) | 1-75 | MkDocs configuration (reference implementation) |
| [mkdocs.yml](mkdocs.yml#L62-L75) | 62-75 | Navigation structure pattern |
| [docs/guide/index.md](docs/guide/index.md) | 1-65 | Guide content pattern (Getting Started) |
| [docs/guide/workflow-modes.md](docs/guide/workflow-modes.md) | 1-158 | Guide content pattern (feature guide) |
| [docs/reference/agents.md](docs/reference/agents.md) | 1-222 | Reference content pattern |
| [agents/PAW-02A Code Researcher.agent.md](agents/PAW-02A%20Code%20Researcher.agent.md#L219-L241) | 219-241 | Code Location pattern for systematic exploration |

## Architecture Documentation

### Current Documenter Flow

```
1. Validate prerequisites → 2. Analyze implementation → 3. Create Docs.md → 4. Update project docs → 5. Commit/Push
```

### Proposed Documenter Flow

```
1. Validate prerequisites → 2. Analyze implementation → 3. SURVEY STRUCTURE → 4. Create Docs.md (with survey section) → 5. Update project docs (using survey) → 6. Commit/Push
```

### Survey Step Internal Logic

```
Survey Step:
├── Check for framework config files at repo root
│   ├── mkdocs.yml/mkdocs.yaml → MkDocs detected
│   ├── docusaurus.config.* → Docusaurus detected
│   ├── .vuepress/ or docs/.vuepress/ → VuePress detected
│   ├── conf.py with docs/ → Sphinx detected
│   └── _config.yml with docs/ → Jekyll detected
├── If framework detected:
│   ├── Read config to find docs source directory
│   ├── Explore docs structure (guide/, reference/, etc.)
│   └── Parse navigation config
├── Else:
│   └── Check for plain docs/ directory with .md files
├── Record survey findings for Docs.md inclusion
└── Pass findings to step 4 (Docs.md) and step 5 (project updates)
```

### Guide Creation Logic (Step 5 Enhancement)

```
IF survey found structured docs with guide directory:
  ├── Determine appropriate guide filename based on feature
  ├── Create user-facing guide in guide directory
  │   ├── User-appropriate content (derived from Docs.md)
  │   ├── Links to detailed documentation
  │   └── Follows existing guide patterns
  ├── Update navigation config:
  │   ├── For MkDocs: Add entry to nav section in mkdocs.yml
  │   └── For index-based: Add link to docs/guide/index.md
  └── Note verification guidance (build may need checking)
ELSE:
  └── Proceed with current behavior (README/CHANGELOG only)
```

## Open Questions

None identified. All research questions answered through codebase exploration.

## Implementation Recommendations Summary

Based on code research, implementation should:

1. **Insert new step 3** after line 112, before line 114 in [agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md)
2. **Renumber existing steps 3-5** to become steps 4-6
3. **Add survey findings section** to Docs.md template ([lines 336-413](agents/PAW-04%20Documenter.agent.md#L336-L413))
4. **Enhance step 5** (currently step 4, lines 129-147) to use survey findings for guide creation and nav updates
5. **Add MkDocs-specific guidance** since it's the highest priority framework (PAW uses it)
6. **Include edge case handling** for empty docs directories, no framework detected, etc.
