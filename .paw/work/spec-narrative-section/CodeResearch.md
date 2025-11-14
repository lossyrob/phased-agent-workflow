---
date: 2025-11-13 01:41:27 EST
git_commit: 73de920ea981cdcbcaaafab325350a7ceb2566d1
branch: feature/spec-contains-narrative
repository: phased-agent-workflow
topic: "Implementation locations for adding Overview and Objectives sections to PAW spec template"
tags: [research, codebase, spec-agent, chatmode, template]
status: complete
last_updated: 2025-11-13
---

# Research: Implementation locations for adding Overview and Objectives sections to PAW spec template

**Date**: 2025-11-13 01:41:27 EST
**Git Commit**: 73de920ea981cdcbcaaafab325350a7ceb2566d1
**Branch**: feature/spec-contains-narrative
**Repository**: phased-agent-workflow

## Research Question

Where and how should the PAW spec template be modified to add Overview and Objectives narrative sections? What are the current template structure, section ordering, and guidance mechanisms that need to be updated?

## Summary

The PAW spec template exists in a single authoritative location: the Spec Agent chatmode file at `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`. This file contains an inline specification template (lines 415-478) that defines the exact structure all generated specs must follow. To add Overview and Objectives sections, modifications are needed only in this chatmode file - specifically updating the template structure to insert the new sections after the header and before "User Scenarios & Testing", and adding guidance in the chatmode instructions about generating narrative content.

The current template follows a rigid structure without any narrative sections, jumping directly from header metadata into User Scenarios & Testing. Evidence from existing specs shows that when users needed narrative context, they manually added Overview and Objectives sections (as seen in the spec-narrative-section/Spec.md itself), demonstrating the pattern is already naturally emerging. No programmatic validation of spec structure exists - the chatmode linter only checks token count, not content structure. The VS Code extension's prompt template tool generates references to chatmodes but does not enforce or validate spec content structure.

## Detailed Findings

### Primary Implementation Location: Spec Agent Chatmode

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

This is the single source of truth for the spec template. The chatmode file serves multiple purposes:
- Defines the agent's responsibilities and workflow (lines 1-150)
- Contains the inline specification template (lines 415-478)
- Provides quality checklist criteria (lines 480-520)
- Specifies communication patterns and guardrails (lines 540-600)

**Current Template Structure** (lines 415-478):

The template is embedded within the chatmode as a markdown code block. Current section order:
1. Header with metadata (branch, created date, status, input brief)
2. User Scenarios & Testing (line 420)
3. Requirements (line 442)
4. Success Criteria (line 452)
5. Assumptions (line 456)
6. Scope (line 459)
7. Dependencies (line 464)
8. Risks & Mitigations (line 467)
9. References (line 471)
10. Glossary (optional) (line 475)

**Where to Insert Narrative Sections**:

The template modification point is immediately after the header metadata line (line 419) and before "## User Scenarios & Testing" (line 420). The new structure should be:

```markdown
# Feature Specification: <FEATURE NAME>

**Branch**: <feature-branch>  |  **Created**: <YYYY-MM-DD>  |  **Status**: Draft
**Input Brief**: <one-line distilled intent>

## Overview
<2-4 paragraphs of narrative>

## Objectives
<bulleted behavioral goals>

## User Scenarios & Testing
...
```

This position aligns with the Spec.md requirements (FR-001, FR-004, FR-009) that specify Overview and Objectives must appear "immediately after header metadata and before User Scenarios & Testing".

### Agent Guidance for Narrative Content

**Location**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

The chatmode contains several sections that provide guidance to the Spec Agent about generating content. To support narrative sections, new guidance is needed in:

**1. Drafting Workflow Section** (lines 215-265):

Currently describes the step-by-step process for creating the spec. Step 7 "Specification Assembly" (line 256) is where template guidance is referenced. This section should be enhanced to include instructions about generating Overview and Objectives sections before assembling structured requirements.

**2. Inline Specification Template Comments** (lines 415-478):

The template itself should include inline comments/guidance about what belongs in Overview and Objectives sections. For example:

```markdown
## Overview
<Narrative describing WHAT the feature does and WHY it matters from user perspective.
2-4 paragraphs. Focus on user journey and value. Avoid implementation details.>

## Objectives
<Bulleted list of key behavioral goals.
Focus on observable outcomes the feature achieves.
Keep bullets concise - WHAT the feature accomplishes, not HOW.>
```

**3. Guardrails Section** (lines 542-570):

The guardrails already prohibit code snippets and technical design in specs (lines 557-561). These same guardrails should explicitly apply to Overview and Objectives sections to ensure narrative sections maintain behavioral focus.

**4. Quality Checklist** (lines 480-520):

The existing checklist includes checks for avoiding implementation details (line 485-489). New checklist items should validate:
- [ ] Overview section exists with 2-4 paragraphs
- [ ] Overview focuses on WHAT/WHY from user perspective
- [ ] Objectives section exists with bulleted goals
- [ ] Objectives are behavioral, not technical
- [ ] Narrative sections don't duplicate User Stories or Requirements

### Evidence of User Pattern: Existing Specs

**Analysis of Existing Specs**:

Searched all Spec.md files in the repository to identify patterns. Found 18 total spec files across various feature branches:

- `.paw/work/github-actions-vsix-release/Spec.md`
- `.paw/work/azure-devops/Spec.md`
- `.paw/work/vscode-extension-init/Spec.md`
- `.paw/work/paw-directory/Spec.md`
- `.paw/work/simplified-workflow/Spec.md`
- `.paw/work/spec-narrative-section/Spec.md`
- `docs/agents/feature/finalize-initial-chatmodes/Spec.md`
- `docs/agents/feature/param-doc/Spec.md`
- `.paw/work/paw-review/Spec.md`

**Key Finding**: Only the spec for THIS feature (spec-narrative-section/Spec.md) currently has Overview and Objectives sections (lines 6 and 14). This demonstrates:

1. The current template does NOT include these sections
2. When users needed narrative context, they manually added it
3. The pattern is already emerging organically, validating the need

**Example Specs Without Narrative** (representative samples reviewed):

- `paw-review/Spec.md`: 533 lines, jumps directly from header to "User Scenarios & Testing" - no overview or objectives
- `simplified-workflow/Spec.md`: 409 lines, same structure - header then immediately into user stories
- `param-doc/Spec.md`: 304 lines, follows standard template without narrative sections

This confirms all existing specs (except the one explicitly testing this feature) lack narrative sections, making the template update necessary for consistent adoption.

### Related Code: Template Generation and Validation

**Prompt Template Tool**: `vscode-extension/src/tools/createPromptTemplates.ts`

This TypeScript file (lines 1-359) implements the `paw_create_prompt_templates` tool that generates prompt files for PAW workflows. 

**Key Finding**: This tool does NOT validate or enforce spec structure. It only:
- Generates prompt files that reference chatmodes (lines 264-284)
- Determines which prompt files to create based on workflow mode (lines 174-229)
- Creates minimal prompt files with frontmatter and reference to WorkflowContext.md (lines 231-239)

The generated prompt files simply invoke chatmodes (e.g., "mode: PAW-01A Spec Agent" at line 234). The actual spec structure comes entirely from the chatmode instructions, not from this tool.

**Implication**: No changes needed to createPromptTemplates.ts. All template structure changes happen in the chatmode file only.

**Chatmode Linter**: `scripts/lint-chatmode.sh`

This bash script (lines 1-99) validates chatmode files for token count only:
- Warning threshold: 3500 tokens (line 7)
- Error threshold: 6500 tokens (line 8)
- Uses Node.js script to count tokens (line 30)
- No content structure validation whatsoever

**Implication**: Adding template sections to the chatmode will increase token count. The current PAW-01A chatmode size should be checked before adding narrative guidance to ensure it stays under limits.

**Custom Instructions**: `vscode-extension/src/prompts/customInstructions.ts`

This file (lines 1-56) provides a mechanism for loading optional custom instructions from workspace files. It's used to augment agent prompts but doesn't affect the base template.

**Implication**: No changes needed. Custom instructions are additive to chatmode base instructions.

### Template Structure Patterns from Research

**External Research Document**: `.paw/work/spec-narrative-section/context/spec-research.md`

This comprehensive research document (14,000+ words) analyzed spec formats and best practices. Key insights relevant to implementation:

**Best Practice Confirmation** (from research):
- "Begin with a Narrative Overview" - confirms Overview section should come first
- "Start the spec with a section (e.g. ## Narrative or ## Overview)" - validates section naming
- "Should be written in normal prose paragraphs" - confirms paragraph format for Overview
- "This section gives context. Reviewers can read this to get an 'end-to-end' understanding" - confirms purpose

**Format Guidance** (from research):
- Overview should be "detailed enough to paint the big picture (not just one sentence)"
- Should be "3-5 sentences each, for readability" - suggests 2-4 paragraphs total
- Objectives should be a "list of conditions that will be used to validate the feature's success"
- "Using bullet points or numbered lists for enumerations" - confirms bullet format for objectives

**Guardrails** (from research):
- "Keep It Focused on Behavior, Not Design" - applies to narrative sections
- "The spec should not include actual code snippets, data structure definitions, or UX design mockups"
- "Describes what the system should do, not how to code it"

This research validates the spec requirements and provides concrete guidance for chatmode instruction language.

### Current Chatmode Instruction Patterns

**Communication Patterns** (lines 522-541):

The chatmode already includes guidance about how to present spec content. Key pattern at lines 528-529:

> "**Write spec sections to `Spec.md` incrementally**—only present summaries or specific excerpts in chat when explaining changes or seeking feedback"

This pattern should be preserved for Overview and Objectives - the agent should write these sections to the file as it creates them, not dump large blocks in chat.

**Working with Implementation Details** (lines 530-540):

Extensive guidance exists about handling implementation discussions:
- "Implementation discussions are valuable context"
- "Use implementation insights to inform behavioral requirements without embedding code"
- "Transform technical discussions into behavioral descriptions"
- Example transformation: "service that monitors deployment status" instead of "FlexDeploymentTracker class"

This same pattern should apply to Overview and Objectives generation - agents should transform any technical insights from issues into behavioral narrative language.

**Section-Specific Guardrails Pattern** (lines 557-561):

Current prohibitions on code and technical details:
- "NEVER: proactively generate code snippets... in specifications without explicit user request"
- "NEVER: proactively specify file paths, directory structure... without explicit user request"
- "NEVER: proactively create 'Technical Design', 'Implementation Details'... sections"

This pattern should extend to Overview and Objectives with explicit statements like:
- "Overview SHALL focus on user perspective and feature behavior, avoiding technical architecture"
- "Objectives SHALL describe observable outcomes, not implementation approaches"

## Code References

- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:415-478` - Current inline specification template structure
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:420` - Current "User Scenarios & Testing" section position (where Overview/Objectives should be inserted before)
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:256` - "Specification Assembly" step in drafting workflow
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:480-520` - Quality checklist section
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:542-570` - Guardrails section with implementation detail prohibitions
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:528-540` - Communication patterns for spec generation
- `vscode-extension/src/tools/createPromptTemplates.ts:231-239` - Prompt template generation (no changes needed)
- `scripts/lint-chatmode.sh:7-8` - Token thresholds for chatmode validation
- `.paw/work/spec-narrative-section/Spec.md:6` - Example Overview section (only current instance)
- `.paw/work/spec-narrative-section/Spec.md:14` - Example Objectives section (only current instance)
- `.paw/work/paw-review/Spec.md:1-533` - Representative spec without narrative sections
- `.paw/work/spec-narrative-section/context/spec-research.md` - Research supporting narrative section best practices

## Architecture Documentation

**Single Source of Truth Pattern**:

PAW uses a centralized chatmode-driven architecture where:
1. Each agent's behavior is defined entirely in its `.github/chatmodes/*.chatmode.md` file
2. The chatmode contains both instructions AND inline templates for artifacts
3. The VS Code extension generates simple prompt files that reference chatmodes
4. No separate template files exist - everything is in the chatmode

**Benefit**: Single point of modification for template changes. Updating `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` immediately affects all new spec generations.

**Constraint**: Chatmode files must stay under token limits (6500 error threshold). Adding narrative section guidance will increase token count, requiring careful wording.

**Template Evolution Pattern**:

The inline template in the chatmode follows this structure:
- Markdown code block (lines 415-478) showing exact format
- Placeholder syntax: `<DESCRIPTION>` for variable content
- Inline comments: `<!-- explanatory note -->`  for guidance
- Section headers with precise names that agents must use exactly

To add sections, the pattern is:
1. Insert section headers in the template at the correct position
2. Add placeholder content showing expected format
3. Optionally add inline comment with brief guidance
4. Add detailed guidance in the chatmode instructions sections
5. Update quality checklist to validate new sections

**No Programmatic Enforcement**:

Unlike some systems that parse and validate spec structure programmatically, PAW relies entirely on:
- LLM interpretation of chatmode instructions
- Human review during spec refinement
- Optional manual validation (no automated tooling)

This means template changes are "soft" constraints - the agent follows the template because the chatmode instructs it to, not because code enforces the structure. This makes iteration easy but requires clear, unambiguous guidance in the chatmode.

## Open Questions

None - all necessary implementation locations have been identified and documented.

