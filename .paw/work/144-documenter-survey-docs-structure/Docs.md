# Documenter Survey Docs Structure - Documentation

## Overview

This enhancement adds a documentation structure survey step to the PAW-04 Documenter agent, enabling it to understand a project's documentation framework and organization before creating documentation. When projects have structured documentation (particularly MkDocs), the Documenter can now create user-facing feature guides in the appropriate location and update navigation configuration—ensuring new documentation is discoverable through the project's existing navigation patterns rather than remaining isolated in `Docs.md`.

**Problem Solved**: Previously, the Documenter created excellent technical documentation in `Docs.md` and updated high-visibility files like README, but lacked awareness of where feature-specific guides should live within a project's broader documentation architecture. Users browsing documentation sites might never discover new feature documentation because it wasn't integrated into the navigation structure.

**Solution**: The Documenter now surveys the project's documentation landscape before creating content, identifies frameworks and organization patterns, and leverages this knowledge to create properly-integrated guide pages when appropriate.

## Documentation Structure

- **Framework**: MkDocs (detected via `mkdocs.yml`)
- **Docs Directory**: `docs/` | **Guide Directory**: `docs/guide/`
- **Navigation Config**: `mkdocs.yml` nav section (lines 58-75), plus `docs/guide/index.md` for guide index
- **Feature Guide**: Created at `docs/guide/documenter-survey.md` - significant user-facing enhancement warranting standalone guide

## Architecture and Design

### Process Flow Changes

The Documenter's 5-step process becomes a 6-step process:

1. **Validate prerequisites** (unchanged)
2. **Analyze implementation** (unchanged)
3. **Survey documentation structure** ← **NEW STEP**
4. **Create comprehensive Docs.md** (formerly step 3, now includes Documentation Structure section)
5. **Update project documentation** (formerly step 4, now leverages survey findings)
6. **Determine review strategy and commit/push** (formerly step 5, renumbered)

### Survey Step Design

The survey step executes efficient checks for known patterns rather than exhaustive filesystem exploration:

1. **Framework Detection**: Check repo root for configuration files:
   - `mkdocs.yml` or `mkdocs.yaml` → MkDocs (fully supported)
   - `docusaurus.config.js` or `docusaurus.config.ts` → Docusaurus (detection only)
   - `.vuepress/` or `docs/.vuepress/` → VuePress (detection only)
   - `conf.py` with `docs/` or `source/` → Sphinx (detection only)
   - `_config.yml` with `docs/` → Jekyll (detection only)

2. **Structure Discovery** (when framework found):
   - Identify docs source directory (typically `docs/`)
   - Explore subdirectories for organization patterns (guide/, reference/, tutorial/)
   - Check navigation configuration (nav section in mkdocs.yml)
   - Note existing guides for style reference

3. **Fallback Path** (no framework):
   - Check for plain `docs/` directory with .md files
   - Empty docs directory = no structured docs (proceed normally)

4. **Record Findings** for use in subsequent steps:
   - Framework name or "none"
   - Docs directory path or "none"
   - Subdirectory organization
   - Guide directory if present
   - Navigation config file and pattern

### Design Decisions

**MkDocs Prioritization**: Full guide creation and navigation updates are implemented only for MkDocs. Other frameworks are detected but receive documentation-only treatment (noted in Docs.md). This decision reflects:
- PAW itself uses MkDocs
- Most projects using structured docs frameworks follow similar patterns
- Other frameworks can be fully supported in future enhancements

**Judgment-Based Guide Creation**: Not all features warrant standalone guides. The agent exercises judgment based on:
- Significance of user-facing functionality
- Whether content would be duplicative of existing docs
- Complexity warranting standalone treatment vs. inline README update

**Condensed Survey Findings Format**: Survey findings in Docs.md use a condensed single-line format to minimize token usage while preserving information.

### Integration Points

**Docs.md Template**: Enhanced with a "Documentation Structure" section immediately after Overview:
```markdown
## Documentation Structure

- **Framework**: [MkDocs/Docusaurus/VuePress/Sphinx/Jekyll/None]
- **Docs Directory**: [path or N/A] | **Guide Directory**: [path or N/A]
- **Navigation Config**: [file/pattern or N/A]
- **Feature Guide**: [Created at path / Not created - reason]
```

**Step 5 Project Documentation Updates**: Now includes conditional logic:
- **MkDocs with guide directory**: Create feature guide, update mkdocs.yml nav, update guide index
- **Other frameworks**: Note in Docs.md, skip framework-specific guide creation
- **No framework**: Standard README/CHANGELOG updates only

**Quality Checklist**: Updated with survey-specific items:
- Documentation Structure section reflects survey findings
- Feature guide created if survey found structured docs (MkDocs), nav updated

## User Guide

### Understanding the Survey Step

When the Documenter agent runs, it now automatically surveys your project's documentation structure before creating documentation. You don't need to configure anything—the agent detects frameworks and organization patterns automatically.

### What the Survey Discovers

The survey identifies:

| Element | Description | Example |
|---------|-------------|---------|
| **Framework** | Documentation site generator | MkDocs, Docusaurus, Sphinx |
| **Docs Directory** | Source folder for documentation | `docs/`, `documentation/` |
| **Guide Directory** | Location for user-facing guides | `docs/guide/`, `docs/tutorials/` |
| **Navigation Config** | How documentation navigation is defined | `mkdocs.yml` nav section |

### What Happens with Survey Findings

**For MkDocs Projects with Guide Directory**:
1. Agent creates a user-facing guide at `docs/guide/<feature-name>.md`
2. Guide content is derived from Docs.md but written for users (practical, concise)
3. `mkdocs.yml` nav section is updated to include the new guide
4. `docs/guide/index.md` is updated if it contains guide links

**For Other Detected Frameworks**:
- Framework is noted in Docs.md
- No framework-specific guides created (future enhancement potential)

**For Projects Without Structured Docs**:
- Standard behavior: Docs.md + README + CHANGELOG updates
- No guide creation attempted

### Viewing Survey Findings

Survey findings are documented in every `Docs.md` under the "Documentation Structure" section:

```markdown
## Documentation Structure

- **Framework**: MkDocs
- **Docs Directory**: docs/ | **Guide Directory**: docs/guide/
- **Navigation Config**: mkdocs.yml nav section
- **Feature Guide**: Created at docs/guide/my-feature.md
```

## Technical Reference

### Agent File Changes

**File**: `agents/PAW-04 Documenter.agent.md`

**Step 3 (New)**: Survey documentation structure
- Framework config detection via file existence checks
- Directory structure exploration for organization patterns
- Navigation configuration analysis

**Step 4 (Renumbered)**: Create comprehensive Docs.md
- Now includes survey findings in Documentation Structure section

**Step 5 (Renumbered)**: Update project documentation
- Conditional logic based on survey findings
- MkDocs-specific guide creation and nav updates

**Step 6 (Renumbered)**: Determine review strategy and commit/push (unchanged logic)

### Docs.md Template Enhancement

The template now includes a Documentation Structure section with condensed survey findings format for token efficiency.

### Quality Checklist Updates

New items added:
- `[ ] Documentation Structure section reflects survey findings`
- `[ ] Feature guide created if survey found structured docs (MkDocs), nav updated`

## Usage Examples

### Example 1: MkDocs Project with Guide Directory

Given a project with this structure:
```
mkdocs.yml
docs/
  index.md
  guide/
    index.md
    existing-feature.md
```

Survey findings:
```markdown
- **Framework**: MkDocs
- **Docs Directory**: docs/ | **Guide Directory**: docs/guide/
- **Navigation Config**: mkdocs.yml nav section
- **Feature Guide**: Created at docs/guide/new-feature.md
```

Results:
- `Docs.md` created with Documentation Structure section
- `docs/guide/new-feature.md` created with user-facing content
- `mkdocs.yml` nav updated under "User Guide"
- `docs/guide/index.md` updated with link to new guide

### Example 2: Project Without Documentation Framework

Given a project with only:
```
README.md
src/
```

Survey findings:
```markdown
- **Framework**: None
- **Docs Directory**: N/A | **Guide Directory**: N/A
- **Navigation Config**: N/A
- **Feature Guide**: Not created - no structured documentation
```

Results:
- `Docs.md` created with Documentation Structure section
- `README.md` updated with feature mention
- No guide creation attempted

## Edge Cases and Limitations

### Current Limitations

1. **MkDocs-Only Guide Support**: Other documentation frameworks (Docusaurus, VuePress, Sphinx, Jekyll) are detected but receive no framework-specific guide creation or navigation updates. They can be added in future enhancements.

2. **Judgment Required**: The agent exercises judgment on whether features warrant standalone guides. This may occasionally produce different decisions than users expect.

3. **Simple Navigation Updates Only**: Complex navigation restructuring (moving sections, reorganizing hierarchies) is not attempted—only simple additions to existing nav structure.

4. **No Retroactive Analysis**: This enhancement applies to new documentation creation only. Existing features don't receive guides automatically.

### Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Multiple frameworks detected | Uses first detected framework, notes finding |
| Malformed navigation file | Adds guide, notes manual verification needed |
| Empty `docs/` directory | Treats as no structured documentation |
| Feature doesn't warrant guide | Survey runs, but no guide created (noted in Docs.md) |

## Testing Guide

### How to Test This Enhancement

1. **Run Documenter on a MkDocs Project** (e.g., PAW itself):
   - Start a PAW workflow through to documentation stage
   - Verify survey identifies MkDocs framework and `docs/guide/` directory
   - Check `Docs.md` includes Documentation Structure section with survey findings
   - Verify feature guide created in `docs/guide/` with user-appropriate content
   - Confirm `mkdocs.yml` nav section updated with new guide entry
   - Run `mkdocs build --strict` to verify documentation builds

2. **Test on Project Without Framework**:
   - Run Documenter on a project with only README.md
   - Survey should note "no framework detected"
   - No guide creation should be attempted
   - `Docs.md`, README updated as before

3. **Test Edge Case - Empty docs Directory**:
   - Create empty `docs/` directory
   - Survey should note no structured documentation
   - Standard Docs.md + README updates only

4. **Verify Agent Lint**:
   ```bash
   ./scripts/lint-agent.sh "agents/PAW-04 Documenter.agent.md"
   ```
   Should pass with token count under 7000.

## Migration and Compatibility

### For Existing PAW Users

This enhancement is **additive** with no breaking changes:

- Projects without structured documentation receive the same documentation as before
- Existing `Docs.md` format remains compatible
- New Documentation Structure section is informational

### Behavioral Changes

- Documenter now performs survey step (adds minimal time/tokens)
- `Docs.md` includes new Documentation Structure section
- MkDocs projects may receive feature guides (new behavior)

### No Action Required

Existing workflows continue working. The enhancement activates automatically when appropriate project structure is detected.

## References

- **Issue**: [#144 - Add documentation structure survey step to Documenter](https://github.com/lossyrob/phased-agent-workflow/issues/144)
- **Specification**: `.paw/work/144-documenter-survey-docs-structure/Spec.md`
- **Implementation Plan**: `.paw/work/144-documenter-survey-docs-structure/ImplementationPlan.md`
- **MkDocs Documentation**: [mkdocs.org](https://www.mkdocs.org/)
