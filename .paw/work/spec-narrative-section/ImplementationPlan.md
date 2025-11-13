# Spec Narrative Section Implementation Plan

## Overview

This plan implements the addition of Overview and Objectives narrative sections to the PAW spec template. The spec template currently jumps directly from header metadata into "User Scenarios & Testing", making it difficult for reviewers to grasp the big picture. This change adds two new sections immediately after the header: an "Overview" section providing 2-4 paragraphs of narrative description from the user perspective, and an "Objectives" section listing key behavioral goals in bullet form.

The implementation modifies only one file: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`. This chatmode file is the single source of truth for the spec template - it contains both the inline template structure and the agent guidance for generating specs. By updating this file, all future specs will automatically include the narrative sections without any changes to the VS Code extension, prompt generation tools, or other PAW components.

## Current State Analysis

The PAW spec template exists entirely within the Spec Agent chatmode at `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:415-478`. The current template structure is:

1. Header with metadata (branch, created date, status, input brief)
2. User Scenarios & Testing
3. Requirements
4. Success Criteria
5. Assumptions
6. Scope
7. Dependencies
8. Risks & Mitigations
9. References
10. Glossary (optional)

**Key Constraint**: The chatmode linter checks token count (warning at 3500, error at 6500 tokens). Adding narrative section guidance will increase token count, requiring careful wording to stay under limits.

**Evidence of Need**: Analysis of 18 existing specs shows only the spec for THIS feature (spec-narrative-section/Spec.md) has Overview and Objectives sections. Users manually added these sections when needed, demonstrating organic demand for this pattern.

## Desired End State

After implementation:

1. All newly generated specs include Overview and Objectives sections between header metadata and User Scenarios & Testing
2. The Spec Agent chatmode provides clear guidance on generating narrative content that focuses on user perspective and behavioral goals
3. The Quality Checklist validates that narrative sections exist and follow guidelines
4. The chatmode file remains under the 6500 token error threshold
5. Specs are more reviewable with clear big-picture context before detailed requirements

### Verification:
- Generate a new spec using the updated chatmode and verify Overview and Objectives sections appear in correct position
- Review the generated narrative content to ensure it focuses on WHAT/WHY without implementation details
- Run chatmode linter to confirm token count stays within limits
- Human review confirms narrative sections improve spec readability

## What We're NOT Doing

- Retrofitting existing specs with narrative sections (mentioned in issue as possible future work, but out of scope)
- Changing structure of User Scenarios & Testing, Requirements, or other existing sections
- Modifying the VS Code extension's createPromptTemplates tool
- Adding automated validation that narrative content is appropriate
- Changing the chatmode linter to validate spec structure
- Modifying research prompt template or other PAW stage templates
- Creating separate template files (chatmode remains single source of truth)

## Implementation Approach

Single-file modification strategy: Update `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` in three places:

1. **Template Structure** (lines 415-478): Insert Overview and Objectives sections with inline guidance
2. **Drafting Workflow** (lines 215-265): Add instructions for generating narrative sections during "Specification Assembly" step
3. **Quality Checklist** (lines 480-520): Add validation items for narrative sections

This approach preserves the chatmode-driven architecture where all template changes happen in one location and immediately affect all new spec generations.

## Phase 1: Update Inline Specification Template

### Overview
Modify the inline template structure in the chatmode to include Overview and Objectives sections with clear inline guidance about content expectations.

### Changes Required:

#### 1. Inline Specification Template Section
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
**Lines**: 415-478 (current template block)
**Changes**: Insert new sections after line 419 (header metadata) and before line 420 (User Scenarios & Testing)

**Specific code to add** (after the `**Input Brief**: <one-line distilled intent>` line):

```markdown
## Overview
<2-4 paragraphs describing WHAT the feature does and WHY it matters from the user perspective.
Focus on user journey and value. Paint the big picture before diving into detailed requirements.
Avoid implementation details, technical architecture, file paths, or code structure.
Transform any technical insights into behavioral descriptions of what users will experience.>

## Objectives
<Bulleted list of key behavioral goals the feature achieves.
Focus on observable outcomes - WHAT the feature accomplishes, not HOW it's implemented.
Keep bullets concise and technology-agnostic. Each bullet should describe a user-facing capability or system behavior.>
```

**Rationale**: Inline guidance within the template helps the Spec Agent understand content expectations without requiring extensive prose in other chatmode sections. This keeps token count lower while providing clear direction at the point of use.

### Success Criteria:

#### Automated Verification:
- [ ] Template structure in chatmode includes `## Overview` section between header and User Scenarios
- [ ] Template structure in chatmode includes `## Objectives` section between Overview and User Scenarios
- [ ] Inline comments provide clear content guidance for both sections
- [ ] Modified chatmode file has valid YAML frontmatter and markdown structure

#### Manual Verification:
- [ ] Generated specs place Overview and Objectives in correct position
- [ ] Inline guidance is clear enough for Spec Agent to generate appropriate content
- [ ] Template structure remains readable and easy to understand

---

## Phase 2: Add Drafting Workflow Guidance

### Overview
Enhance the "Drafting Workflow" section to include explicit instructions for generating Overview and Objectives sections during the spec assembly process.

### Changes Required:

#### 1. Specification Assembly Step
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
**Lines**: Around line 256 (Step 7 "Specification Assembly")
**Changes**: Add narrative section generation guidance before FR/SC enumeration

**Current text** (line 256):
```markdown
7. **Specification Assembly**: Iteratively build the full spec with section order below. Introduce requirement IDs such as FR-001 and success criteria IDs such as SC-001, link user stories to their supporting requirements, and keep numbering sequential.
```

**Updated text**:
```markdown
7. **Specification Assembly**: Iteratively build the full spec with section order below. Start with narrative sections (Overview and Objectives) to establish context, then enumerate detailed requirements.
   - **Overview**: Write 2-4 paragraphs (3-5 sentences each) describing the feature as a cohesive user journey. Create a vivid, realistic scenario showing how users will experience the feature from start to finish. Structure the narrative to flow logically: describe the user's problem or need, walk through their interaction with the feature step-by-step, and explain the value delivered. Focus on behavioral outcomes and user experience, not technical implementation. Use insights from issue, research, and clarifications to paint a coherent picture. Write in flowing prose that tells a story - avoid bullet fragments or disjointed statements. The narrative should set the stage for the structured sections that follow.
   - **Objectives**: List key behavioral goals as bullets - observable outcomes the feature achieves. Keep technology-agnostic and focused on WHAT, not HOW. Each objective may optionally include a brief rationale to explain why this goal matters: "(Rationale: this allows users to...)". Understanding the why helps both reviewers and AI implementers make better decisions.
   - **Requirements & Criteria**: Introduce requirement IDs such as FR-001 and success criteria IDs such as SC-001, link user stories to their supporting requirements, and keep numbering sequential.
```

**Rationale**: This guidance appears at the exact step where the agent constructs the spec, providing context-specific instructions about narrative generation. It reinforces the template structure and emphasizes behavioral focus.

### Success Criteria:

#### Automated Verification:
- [ ] Updated workflow text mentions Overview and Objectives generation
- [ ] Guidance emphasizes user perspective and behavioral focus
- [ ] Section remains under reasonable token count (verify in Phase 4)

#### Manual Verification:
- [ ] Spec Agent follows guidance when generating specs
- [ ] Generated Overview sections are narrative prose (3-5 sentence paragraphs), not bullet points
- [ ] Generated Overview tells a coherent user journey story from start to finish
- [ ] Generated Objectives sections are bulleted behavioral goals
- [ ] Objectives optionally include rationale notes where helpful
- [ ] Narrative sections appear before detailed requirements in generation order

---

## Phase 3: Update Quality Checklist

### Overview
Add checklist items to validate that narrative sections exist, contain appropriate content, and follow the guidelines for user-focused behavioral descriptions.

### Changes Required:

#### 1. Quality Checklist Section
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
**Lines**: 480-520 (Spec Quality Checklist)
**Changes**: Add narrative section validation items

**Insert after the "Content Quality" subsection** (around line 489):

```markdown
### Narrative Quality
- [ ] Overview section exists with 2-4 paragraphs of narrative prose
- [ ] Overview focuses on WHAT the feature does and WHY it matters from user perspective
- [ ] Overview avoids implementation details (no file paths, architecture, code references)
- [ ] Overview uses specific, measurable language (not vague terms like "fast" or "user-friendly" without quantification)
- [ ] Overview maintains clear, flowing prose that tells a coherent story (not bullet fragments)
- [ ] Overview does not mix in formal specifications, schemas, or code-like elements
- [ ] Objectives section exists with bulleted list of behavioral goals
- [ ] Objectives describe observable outcomes, not technical approaches
- [ ] Objectives are technology-agnostic and focus on WHAT, not HOW
- [ ] Objectives may include optional rationale notes explaining the why behind each goal
- [ ] Non-functional requirements (if any) are quantified with specific metrics or thresholds
- [ ] Narrative sections do not duplicate User Stories, FRs, or Success Criteria content
- [ ] Overview narrative logically connects to and sets up the User Stories section that follows
```

**Rationale**: The quality checklist is used during spec validation to ensure all requirements are met. Adding narrative-specific items ensures the agent validates these sections against the same standards applied to other spec content.

### Success Criteria:

#### Automated Verification:
- [ ] Checklist includes 13 new items under "Narrative Quality" subsection
- [ ] Each item is measurable and actionable
- [ ] Checklist items align with requirements from Spec.md (FR-002, FR-003, FR-005, FR-008)

#### Manual Verification:
- [ ] Spec Agent uses checklist during validation step
- [ ] Failed checklist items are surfaced for iterative refinement
- [ ] Checklist helps catch narrative sections with implementation details
- [ ] Checklist validates narrative sections don't duplicate structured sections
- [ ] Checklist validates vague language is avoided or quantified
- [ ] Checklist ensures Overview narrative connects to User Stories

---

## Phase 4: Token Count Verification and Optimization

### Overview
Verify that the chatmode modifications stay within the 6500 token error threshold. If necessary, optimize wording to reduce token count while preserving clarity.

### Changes Required:

#### 1. Token Count Check
**Command**: `./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
**Expected Output**: Token count below 6500 (warning threshold is 3500)

**If token count exceeds threshold**:
- Identify verbose sections in added content
- Reduce inline template comments to essential guidance only
- Condense workflow guidance without losing meaning
- Consider moving some details from inline comments to workflow step descriptions

**Token Budget Analysis**:
- Phase 1 additions: ~150 tokens (inline template guidance)
- Phase 2 additions: ~200 tokens (enhanced workflow guidance with narrative writing instructions and rationale)
- Phase 3 additions: ~150 tokens (expanded checklist items with anti-patterns)
- Total estimated increase: ~500 tokens

Given that the current chatmode is likely well under 6500 tokens, this addition should be safe. However, verification is required.

### Success Criteria:

#### Automated Verification:
- [ ] Chatmode linter runs successfully: `./scripts/lint-chatmode.sh`
- [ ] Token count reported below 6500 error threshold
- [ ] Token count preferably below 3500 warning threshold
- [ ] No syntax errors in modified chatmode file

#### Manual Verification:
- [ ] If over 3500 tokens, review for optimization opportunities
- [ ] All guidance remains clear and unambiguous after any optimization
- [ ] No critical instructions lost during token reduction

---

## Phase 5: Integration Testing and Validation

### Overview
Test the modified chatmode by generating a spec and verifying that Overview and Objectives sections appear correctly with appropriate content.

### Changes Required:

#### 1. Generate Test Spec
**Process**:
1. Create a test issue or feature brief
2. Invoke PAW-01A Spec Agent with the modified chatmode
3. Generate a complete spec through the full workflow
4. Verify section positioning, content quality, and behavioral focus

**Validation Points**:
- Overview appears immediately after header metadata
- Overview contains 2-4 paragraphs of narrative prose
- Overview describes user experience and feature value
- Overview avoids technical implementation details
- Objectives appears immediately after Overview
- Objectives contains bulleted list of behavioral goals
- Objectives focus on WHAT, not HOW
- User Scenarios & Testing follows Objectives
- Quality checklist validates narrative sections

#### 2. Regression Testing
**Verify existing behavior preserved**:
- User Stories still generate correctly
- Functional Requirements enumeration unchanged
- Success Criteria linking to FRs unchanged
- Assumptions, Scope, Dependencies sections unchanged
- Research prompt generation unchanged
- Template traceability (stories ↔ FRs ↔ SCs) maintained

### Success Criteria:

#### Automated Verification:
- [ ] Generated spec file is valid Markdown
- [ ] Section headers appear in correct order
- [ ] All existing sections still generate correctly
- [ ] No broken references or malformed content

#### Manual Verification:
- [ ] Overview section improves spec readability and provides clear context
- [ ] Objectives section provides useful summary of behavioral goals
- [ ] Narrative sections don't duplicate detailed requirements
- [ ] Reviewers can grasp feature purpose within 2 minutes (SC-007 from Spec.md)
- [ ] No regression in existing spec generation quality

---

## Testing Strategy

### Unit Tests:
Not applicable - this is a template/documentation change without programmatic validation. The chatmode linter only checks token count, not content structure.

### Integration Tests:
1. **Full Spec Generation**: Generate a complete spec from issue → research → final spec to verify end-to-end workflow
2. **Section Positioning**: Verify Overview and Objectives appear in correct location (after header, before User Scenarios)
3. **Content Quality**: Verify narrative sections focus on user perspective and avoid implementation details
4. **Regression**: Verify all existing sections still generate correctly

### Manual Testing Steps:
1. Create a test feature brief: "Add user profile editing capability allowing users to update their name, email, and avatar"
2. Run Spec Agent with modified chatmode
3. Verify Overview section appears after header with 2-4 paragraphs (3-5 sentences each) describing user profile editing as a coherent user journey
4. Verify Overview tells a vivid, realistic scenario walking through the user experience step-by-step
5. Verify Overview avoids vague language (e.g., uses specific descriptions, not just "fast" or "easy")
6. Verify Overview maintains flowing prose without bullet fragments
7. Verify Objectives section appears after Overview with bulleted goals like "Enable users to maintain accurate profile information" and "Provide intuitive interface for profile updates"
8. Verify Objectives optionally include rationale notes where they add clarity
9. Verify User Scenarios & Testing section follows Objectives
10. Review Overview content to ensure no file paths, class names, or technical architecture
11. Review Objectives content to ensure focus on observable outcomes
12. Verify Overview narrative logically connects to and sets up the User Stories
13. Verify quality checklist includes all narrative validation items (anti-patterns, linkage, quantification)
14. Run chatmode linter to confirm token count within limits
15. Compare generated spec to existing specs (without narrative sections) to verify improved readability

## Performance Considerations

Token count is the primary performance consideration. The chatmode file must stay under 6500 tokens to avoid linter errors. The additions in this plan are estimated at ~330 tokens, which should be well within budget.

No runtime performance impact - the chatmode is loaded once per agent invocation, and the template modifications don't add complexity to the generation process.

## Migration Notes

No migration of existing specs is required or planned. This change affects only newly generated specs going forward.

**For existing specs**: Users may manually add Overview and Objectives sections if desired, following the template structure. This is mentioned as possible future work in issue #80 but is out of scope for this implementation.

**Backward compatibility**: Existing specs without narrative sections remain valid. The template change is additive - it doesn't invalidate or require updates to specs already created.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/80
- Spec: `.paw/work/spec-narrative-section/Spec.md`
- Research: `.paw/work/spec-narrative-section/context/spec-research.md`
- Code Research: `.paw/work/spec-narrative-section/CodeResearch.md`
- Similar implementation: None (first instance of template modification in PAW)
- External research: Joel Spolsky's "Painless Functional Specifications" on narrative-driven specs
- External research: GitHub Spec Kit documentation on spec structure
