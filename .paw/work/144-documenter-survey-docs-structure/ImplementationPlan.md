# Documenter Survey Docs Structure Implementation Plan

## Overview

Add a documentation structure survey step to the PAW-04 Documenter agent that discovers project documentation frameworks, content organization patterns, and navigation structures before creating documentation. This enables the agent to create feature guides that integrate with existing documentation navigation rather than remaining isolated in Docs.md.

## Current State Analysis

The Documenter agent ([agents/PAW-04 Documenter.agent.md](agents/PAW-04%20Documenter.agent.md)) follows a 5-step process:
1. Validate prerequisites
2. Analyze implementation  
3. Create comprehensive Docs.md
4. Update project documentation (README, CHANGELOG, etc.)
5. Determine review strategy and commit/push

**Gap**: No mechanism to discover documentation structure before creating content. The agent updates fixed file types without knowing if MkDocs, Docusaurus, or other frameworks are in use.

## Desired End State

After implementation:
- Documenter runs a survey step after implementation analysis but before Docs.md creation
- Survey identifies documentation framework (MkDocs priority, others detection-only)
- Survey discovers docs directory structure (guide/, reference/, etc.)
- Survey findings documented in Docs.md "Documentation Structure" section
- When structured docs exist, agent creates feature guide in appropriate location
- Navigation configuration updated for new guides (MkDocs mkdocs.yml and index files)
- Projects without structured docs continue receiving same documentation as before

**Verification**: After documenting a feature in a MkDocs project, a new guide exists in `docs/guide/` and mkdocs.yml nav references it.

### Key Discoveries:
- Insertion point: After [line 112](agents/PAW-04%20Documenter.agent.md#L112), before current step 3
- MkDocs config: [mkdocs.yml](mkdocs.yml) with nav at lines 62-75
- Guide patterns: [docs/guide/](docs/guide/) for user-facing content
- No existing PAW agents perform upfront structure surveys

## What We're NOT Doing

- Full framework-specific support for Docusaurus, VuePress, Sphinx, Jekyll (detection-only)
- Retroactive documentation analysis for past features
- Modification of existing guide content (only creation of new guides)
- Complex navigation restructuring (only simple additions)
- Automatic migration between documentation frameworks

## Implementation Approach

Insert a new process step that surveys documentation structure, capture findings in Docs.md, and enhance the "Update project documentation" step to leverage survey findings for MkDocs guide creation and navigation updates.

## Phase Summary

1. **Phase 1: Survey Step Addition** - Add new step 3 that discovers documentation frameworks and directory structures
2. **Phase 2: Docs.md Enhancement** - Add survey findings section to Docs.md template and creation instructions
3. **Phase 3: Guide Creation Integration** - Enhance step 5 (formerly 4) to create guides and update navigation for MkDocs projects

---

## Phase 1: Survey Step Addition

### Overview
Insert a new process step 3 between "Analyze implementation" and "Create comprehensive Docs.md" that surveys the project's documentation structure to discover frameworks, organization patterns, and navigation configuration.

### Changes Required:

#### 1. Insert Survey Step After Step 2
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**: 
- Insert new step 3 "Survey documentation structure" after line 112 (end of step 2)
- Renumber existing steps 3→4, 4→5, 5→6
- Survey step instructs agent to:
  - Check for framework config files at repo root (mkdocs.yml, docusaurus.config.js, .vuepress/, conf.py, _config.yml)
  - If framework found, identify docs source directory and explore structure
  - Record framework type, docs directory, subdirectory organization (guide/, reference/, etc.)
  - Check for navigation configuration (nav section in mkdocs.yml, index.md files)
  - If no framework, check for plain docs/ directory with .md files
  - Note survey findings for use in subsequent steps

**Survey step content outline**:
```markdown
3. **Survey documentation structure**:
   - Check repo root for documentation framework config files:
     - `mkdocs.yml` or `mkdocs.yaml` → MkDocs
     - `docusaurus.config.js` or `docusaurus.config.ts` → Docusaurus
     - `.vuepress/` or `docs/.vuepress/` → VuePress
     - `conf.py` with `docs/` or `source/` → Sphinx
     - `_config.yml` with `docs/` → Jekyll
   - If framework detected:
     - Identify docs source directory (typically `docs/`)
     - Explore subdirectories for organization patterns (guide/, reference/, tutorial/)
     - Check navigation config (e.g., `nav` section in mkdocs.yml)
     - Note existing guides in guide directory
   - If no framework detected:
     - Check for plain `docs/` directory with .md files
     - Note if docs directory exists but is empty (treat as no structured docs)
   - Record survey findings:
     - Framework: [name or "none"]
     - Docs directory: [path or "none"]
     - Organization: [subdirectory patterns found]
     - Guide directory: [path if exists, e.g., docs/guide/]
     - Navigation config: [file and pattern, or "none"]
   - Survey findings inform step 4 (Docs.md) and step 5 (project updates)
```

**Tests**:
- Lint agent file with `./scripts/lint-agent.sh`
- Manual verification: Run Documenter on a project with mkdocs.yml and verify survey findings appear

### Success Criteria:

#### Automated Verification:
- [x] Agent file passes lint: `./scripts/lint-agent.sh agents/PAW-04\ Documenter.agent.md`
- [x] Documentation builds without errors: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] Survey step content is clear and actionable
- [ ] Step numbering is correct (steps 3-5 become 4-6)
- [ ] Survey findings capture all required information (framework, docs dir, guide dir, nav config)
- [ ] Edge case handling is present (no framework, empty docs dir)

### Phase 1 Completed

Survey step added as step 3, existing steps renumbered. Compressed survey step content to stay under 7000 token limit. Agent file passes lint at 6884 tokens, documentation builds successfully.

---

## Phase 2: Docs.md Enhancement

### Overview
Add a "Documentation Structure" section to the Docs.md template and enhance step 4 (formerly step 3) instructions to include survey findings when creating Docs.md.

### Changes Required:

#### 1. Add Documentation Structure Section to Docs.md Template
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**: 
- Add "Documentation Structure" section to Docs.md artifact template (after Overview, before Architecture)
- Section captures survey findings: framework, docs directory, organization, guide location, navigation config
- Section notes whether a feature guide was/will be created

**Section template**:
```markdown
## Documentation Structure

### Project Documentation Survey
- **Framework**: [MkDocs/Docusaurus/VuePress/Sphinx/Jekyll/None]
- **Docs Directory**: [path or N/A]
- **Organization**: [subdirectory structure, e.g., guide/, reference/, specification/]
- **Guide Directory**: [path if exists, or N/A]
- **Navigation Config**: [file and structure, or N/A]

### Feature Guide
[Statement about whether a feature guide was created, where, and why/why not]
```

**Tests**:
- Lint agent file
- Manual verification: Docs.md template section is properly formatted

#### 2. Update Step 4 Instructions to Include Survey Findings
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**: 
- Modify step 4 (formerly step 3) "Create comprehensive Docs.md" instructions
- Add bullet point: Include survey findings in Documentation Structure section
- Reference that survey findings inform later guide creation decision

### Success Criteria:

#### Automated Verification:
- [x] Agent file passes lint: `./scripts/lint-agent.sh agents/PAW-04\ Documenter.agent.md`
- [x] Documentation builds: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] Docs.md template includes Documentation Structure section
- [ ] Section captures all survey elements
- [ ] Step 4 references including survey findings
- [ ] Template section placement is logical (after Overview, before Architecture)

### Phase 2 Completed

Documentation Structure section added to Docs.md template (condensed format for token efficiency). Step 4 updated to include survey findings. Agent file at 6974 tokens.

---

## Phase 3: Guide Creation Integration

### Overview
Enhance step 5 (formerly step 4) "Update project documentation" to leverage survey findings for creating feature guides in MkDocs projects and updating navigation configuration.

### Changes Required:

#### 1. Enhance Update Project Documentation Step
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**: 
- Add conditional logic to step 5 based on survey findings
- For MkDocs projects with guide directory:
  - Create user-facing guide at `docs/guide/<feature-slug>.md`
  - Guide content derived from Docs.md but written for users (practical, concise, links to detail)
  - Update mkdocs.yml nav section to include new guide under "User Guide"
  - Update docs/guide/index.md if it contains navigation links
- Include guidance on guide content appropriate for user documentation vs technical reference
- Include judgment guidance: not all features warrant standalone guides

**Step 5 enhancement outline**:
```markdown
5. **Update project documentation** (using survey findings):
   
   **Standard updates** (all projects):
   - Update README for new features (summarized from Docs.md)
   - Add CHANGELOG entries
   - Refresh API documentation (based on Docs.md)
   - Follow project documentation standards
   
   **Framework-specific updates** (when survey found structured docs):
   
   *For MkDocs projects with guide directory:*
   - Evaluate if feature warrants a standalone guide (significant user-facing functionality)
   - If yes, create feature guide at `docs/guide/<feature-name>.md`:
     - User-facing tone and practical focus
     - Content derived from Docs.md but appropriate for user documentation
     - Include prerequisites, usage, examples, and links to detailed docs
     - Follow style of existing guides (review docs/guide/index.md patterns)
   - Update navigation:
     - Add entry to `nav` section in mkdocs.yml under "User Guide"
     - Update docs/guide/index.md if it contains guide links
   - Note: Guide creation is judgment-based—minor changes may not warrant standalone guides
   
   *For other detected frameworks:*
   - Note framework in Docs.md but do not create framework-specific guides (out of scope)
   
   **CRITICAL - Match Existing Project Documentation Style:**
   [existing guidance preserved]
```

**Tests**:
- Lint agent file
- Manual verification: Run Documenter on PAW itself and verify guide creation logic

#### 2. Add Guide Content Guidelines
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**: 
- Add guidance in Guardrails section about guide content vs Docs.md content
- Guides are user-facing (practical, concise), Docs.md is technical reference (comprehensive)
- Guide should link to Docs.md for implementation details

#### 3. Update Quality Checklist
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**: 
- Add checklist items for survey completion and guide creation:
  - Survey findings documented in Docs.md
  - Feature guide created if survey found structured docs with guide directory
  - Navigation updated for new guides
  - Guide follows existing project guide style

### Success Criteria:

#### Automated Verification:
- [x] Agent file passes lint: `./scripts/lint-agent.sh agents/PAW-04\ Documenter.agent.md`
- [x] Documentation builds: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] Step 5 includes conditional logic for survey findings
- [ ] MkDocs guide creation instructions are clear
- [ ] Navigation update instructions cover mkdocs.yml and index.md
- [ ] Judgment guidance present for when guides are warranted
- [ ] Quality checklist includes survey and guide items
- [ ] Guide content guidelines distinguish user-facing vs technical content

### Phase 3 Completed

Step 5 enhanced with MkDocs guide creation logic. Quality checklist updated with survey and guide creation items. Consolidated redundant checklist items to stay under token limit. Agent file at 6905 tokens.

---

## Cross-Phase Testing Strategy

### Integration Tests:
- Agent file lints cleanly after all phases
- PAW documentation site builds after all phases

### Manual Testing Steps:
1. Run Documenter on a project with MkDocs (e.g., PAW itself) and verify:
   - Survey identifies MkDocs framework and docs/guide/ directory
   - Docs.md includes Documentation Structure section with survey findings
   - Feature guide created in docs/guide/ with user-appropriate content
   - mkdocs.yml nav section updated with new guide entry
2. Run Documenter on a project without documentation framework and verify:
   - Survey notes "no framework detected"
   - No guide creation attempted
   - Docs.md, README, CHANGELOG updated as before
3. Test edge case: docs/ directory exists but is empty
   - Survey should note no structured documentation
   - Proceed with standard Docs.md + README + CHANGELOG

## Performance Considerations

Survey step adds minimal overhead:
- File existence checks for known config files (fast)
- Directory listing for docs structure (fast)
- No exhaustive filesystem exploration

## Migration Notes

No migration needed. Enhancement is additive:
- Projects without structured docs receive same documentation as before
- Existing Docs.md format compatibility maintained
- New section is informational

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/144
- Spec: `.paw/work/144-documenter-survey-docs-structure/Spec.md`
- Research: `.paw/work/144-documenter-survey-docs-structure/SpecResearch.md`, `.paw/work/144-documenter-survey-docs-structure/CodeResearch.md`
- MkDocs config reference: [mkdocs.yml](mkdocs.yml)
- Guide style reference: [docs/guide/index.md](docs/guide/index.md)
