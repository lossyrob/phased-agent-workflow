# Spec Narrative Section - Feature Enhancement

## Overview

The PAW spec template enhancement adds Overview and Objectives narrative sections to every generated specification, addressing a fundamental readability gap that made specs difficult to review. Previously, specs jumped directly from header metadata into detailed "User Scenarios & Testing," forcing reviewers to piece together the big picture from granular requirements. This created friction during spec review—reviewers needed high-level context before diving into acceptance scenarios, but the template provided no standardized way to deliver it.

Real-world usage revealed this need organically: when working on complex features, developers naturally added "Overview" and "Objectives" sections to their specs even though the template didn't include them. This pattern demonstrated that narrative context isn't optional—it's a fundamental requirement for making specs reviewable by humans and interpretable by AI agents. Research into specification best practices confirms this: the most effective requirements documents combine narrative overviews (providing coherent context and user perspective) with structured requirements (ensuring no details are missed). The hybrid approach serves both human reviewers who need the big picture quickly and AI agents who benefit from understanding intent before processing detailed requirements.

This enhancement modifies only the Spec Agent chatmode file (`.github/chatmodes/PAW-01A Spec Agent.chatmode.md`), which serves as the single source of truth for the spec template. By updating this one file, all future specs automatically include narrative sections without requiring changes to the VS Code extension, prompt generation tools, or other PAW components. The implementation adds two sections immediately after the header metadata: Overview (2-4 paragraphs describing what the feature does and why from the user perspective) and Objectives (bulleted list of key behavioral goals). These sections appear before User Scenarios & Testing, providing essential context that helps reviewers orient themselves, validate scope, and confirm that detailed requirements align with intended user experience.

The narrative approach is carefully designed to complement—not duplicate—the structured requirements that follow. Overview tells the feature's story as a cohesive user journey, while User Stories formalize the specific pieces. Objectives list behavioral goals at a high level, while Success Criteria provide measurable validation. This separation maintains PAW's principle of testability while improving human readability and AI comprehension.

## Architecture and Design

### High-Level Architecture

The spec template exists entirely within the Spec Agent chatmode at `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`. This chatmode-driven architecture means the template isn't a separate file that agents load—instead, the template structure is defined inline within the agent's instructions. When the Spec Agent generates a specification, it follows the template structure embedded in its chatmode instructions.

This architectural decision has important implications for how the narrative sections are implemented:

1. **Single source of truth**: All template changes happen in one location and immediately affect all new spec generations
2. **No build step**: Changes to the chatmode don't require rebuilding the VS Code extension or regenerating prompt templates
3. **Token budget constraints**: The chatmode has a token limit (6500 tokens error threshold, 3500 tokens warning threshold) enforced by the chatmode linter
4. **Inline guidance**: Template guidance appears at the point of use rather than in separate documentation

### Design Decisions

**Decision 1: Inline Template Guidance Over Separate Instructions**

The Overview and Objectives sections include guidance directly within the template structure using placeholder text (e.g., `<2-4 paragraphs (3-5 sentences each)...>`). This differs from an alternative approach where guidance would appear separately in the drafting workflow section.

Rationale: Inline guidance keeps instruction close to the point of use, reducing the cognitive load on the Spec Agent. When the agent constructs the spec, it sees exactly what content is expected for each section without having to reference instructions from elsewhere in the chatmode. This approach also reduces token count compared to repeating the same guidance in multiple locations.

Trade-off: Inline guidance makes the template itself longer and includes meta-instructions that aren't part of the final spec output. However, since the Spec Agent removes placeholder text during generation, this isn't visible in the final artifact.

**Decision 2: Enhanced Workflow Guidance for Narrative Writing**

The Specification Assembly step (Step 7) in the drafting workflow includes comprehensive guidance on generating narrative sections, including specific instructions about paragraph structure (3-5 sentences each), narrative flow, and optional rationale notes for objectives.

Rationale: While inline template guidance provides immediate context, the workflow guidance gives the Spec Agent deeper understanding of how to craft effective narrative prose. The workflow guidance emphasizes creating a "cohesive user journey" and "vivid, realistic scenario" rather than just filling in a template section. This additional context helps the agent generate narrative that truly serves its purpose—telling the feature's story—rather than producing formulaic placeholder text.

The enhanced guidance explicitly addresses anti-patterns observed in early testing: bullet fragments instead of flowing prose, vague language without quantification, and technical design details in narrative sections. By calling out these issues in the workflow guidance, we reduce the likelihood they'll appear in generated specs.

**Decision 3: Comprehensive Quality Checklist with Anti-Patterns**

The Quality Checklist includes 13 specific validation items under a new "Narrative Quality" subsection. These items go beyond simple existence checks ("Overview section exists") to validate content quality ("Overview uses specific, measurable language") and structural integrity ("Overview narrative logically connects to User Stories").

Rationale: The quality checklist is the Spec Agent's final validation step before presenting a spec to the user. By making narrative validation explicit and comprehensive, we ensure the agent doesn't skip narrative quality in favor of checking only the structured sections. The anti-pattern checks (avoiding bullet fragments, avoiding vague language, avoiding implementation details) reinforce the guardrails from the workflow guidance.

Trade-off: More checklist items mean more tokens and potentially more iteration cycles during spec generation. However, this upfront validation prevents downstream issues where specs lack meaningful narrative context or include inappropriate technical details.

**Decision 4: Token Budget Management via Concise Phrasing**

All added text (inline template, workflow guidance, quality checklist) uses concise phrasing to minimize token count increase. For example, "Focus on observable outcomes - WHAT the feature accomplishes, not HOW it's implemented" rather than longer explanatory paragraphs.

Rationale: The chatmode had headroom in the token budget (starting well under 6500 tokens), but good practice dictates minimizing token growth to preserve future flexibility. The final token count (5967) remains comfortably under the error threshold while staying above the warning threshold—an acceptable trade-off for essential guidance.

Alternative considered: Moving some guidance to external documentation and referencing it. Rejected because the Spec Agent doesn't have reliable access to external docs during execution, and inline guidance is more effective.

### Integration Points

The narrative sections integrate with existing spec template components:

1. **Header Metadata → Overview**: The Overview appears immediately after the header (branch, created date, status, input brief) and provides narrative expansion of what the input brief describes tersely.

2. **Overview → Objectives**: The Objectives build on the Overview by distilling the narrative into bulleted behavioral goals. This creates a natural progression from story to structure.

3. **Objectives → User Scenarios & Testing**: The Objectives set up the User Stories section by establishing high-level behavioral goals. User Stories then detail specific user journeys that achieve those objectives.

4. **Narrative Sections → Requirements**: The narrative sections provide context that makes Functional Requirements more understandable. Reviewers who read the Overview and Objectives first will better grasp why each FR exists.

5. **Objectives → Success Criteria**: Success Criteria provide measurable validation of the behavioral goals listed in Objectives. The Objectives answer "what should this feature accomplish?" while Success Criteria answer "how do we know it accomplished it?"

## User Guide

### Prerequisites

This feature is automatically available to anyone using the PAW workflow with GitHub Copilot. No additional setup or configuration is required beyond the standard PAW requirements:

- VS Code with GitHub Copilot
- PAW chatmodes copied to `.github/chatmodes/` in your repository
- GitHub or Azure DevOps integration configured

### Basic Usage

When generating a new specification using the Spec Agent (PAW-01A):

1. **Invoke the Spec Agent** with your issue link/ID or feature brief
2. **Provide context** as prompted (target branch, feature slug, constraints)
3. **Review the generated spec**: You'll now see Overview and Objectives sections immediately after the header
4. **Validate narrative sections** during spec iteration:
   - Check that Overview tells a coherent user story in 2-4 paragraphs
   - Verify Overview focuses on WHAT and WHY from user perspective
   - Confirm Overview avoids implementation details (no file paths, architecture, code)
   - Check that Objectives list behavioral goals as bullets
   - Verify Objectives are technology-agnostic and describe outcomes

The Spec Agent will automatically include these sections following the enhanced template structure. No additional commands or flags are needed.

### Configuration

The narrative sections follow default guidelines (2-4 paragraphs for Overview, bulleted list for Objectives), but you can provide additional context during spec generation:

**For features with minimal scope**: Let the agent know the feature is small. The Overview may be 1-2 paragraphs instead of 3-4.

**For complex multi-faceted features**: Indicate the feature has multiple aspects. The Overview may need the full 4 paragraphs to cover different dimensions.

**For research-heavy features**: Mention that research findings should inform the narrative. The Overview should incorporate insights about user needs and context.

These aren't configuration settings—they're contextual guidance you provide during the interactive spec refinement process.

## Technical Reference

### Modified Components

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Changes**:

1. **Inline Specification Template** (lines 230-242): Added Overview and Objectives section templates with inline guidance about content expectations.

2. **Specification Assembly Workflow** (line 170): Enhanced Step 7 with detailed instructions for generating narrative sections:
   - Overview guidance emphasizes writing 2-4 paragraphs (3-5 sentences each) as a cohesive user journey
   - Objectives guidance explains how to list behavioral goals with optional rationale notes
   - Guidance appears before FR/SC enumeration to establish proper generation order

3. **Spec Quality Checklist** (lines 325-337): Added "Narrative Quality" subsection with 13 validation items:
   - Existence checks for both sections
   - Content quality checks (user perspective, behavioral focus, specific language)
   - Anti-pattern checks (no implementation details, no bullet fragments, no vague language)
   - Integration checks (narrative connects to User Stories)

### Behavior and Algorithms

When the Spec Agent generates a specification:

1. **Template Population**: The agent follows the inline specification template structure, filling in each section in order:
   - Header metadata (branch, created date, status, input brief)
   - **Overview** - generates 2-4 narrative paragraphs describing the feature as a user journey
   - **Objectives** - generates bulleted list of behavioral goals with optional rationale
   - User Scenarios & Testing - generates user stories with acceptance scenarios
   - Requirements - enumerates FRs with IDs
   - Success Criteria - links measurable outcomes to FRs
   - (remaining sections)

2. **Narrative Generation**: During Overview generation, the agent:
   - Synthesizes information from issue, research, and clarifications
   - Structures content as 2-4 paragraphs with 3-5 sentences each
   - Focuses on user perspective (what users experience, not how it's implemented)
   - Creates flowing prose that tells a coherent story
   - Avoids implementation details, file paths, architecture

3. **Objectives Distillation**: During Objectives generation, the agent:
   - Extracts key behavioral goals from the narrative
   - Lists each goal as a concise bullet point
   - Keeps language technology-agnostic
   - Optionally includes rationale notes: "Enable X (Rationale: this allows users to...)"

4. **Quality Validation**: After generating the complete spec, the agent:
   - Checks all 13 Narrative Quality checklist items
   - Validates that narrative sections don't duplicate structured sections
   - Ensures Overview connects logically to User Stories
   - Flags any failed items for iteration

### Error Handling

**Token Budget Exceeded**: If chatmode modifications exceed the 6500 token error threshold, the chatmode linter will fail. This is caught during development via `./scripts/lint-chatmode.sh`. The current implementation stays under the limit at 5967 tokens.

**Missing Narrative Sections**: If a generated spec is missing Overview or Objectives sections, the Quality Checklist will catch this during the validation step. The agent will iterate to add the missing sections.

**Inappropriate Content**: If narrative sections include implementation details (file paths, architecture, code), the Quality Checklist items will flag this:
- "Overview avoids implementation details (no file paths, architecture, code references)"
- "Objectives describe observable outcomes, not technical approaches"

The agent will iterate to remove technical details and refocus on user perspective.

**Vague Language**: If the Overview uses vague terms like "fast" or "user-friendly" without quantification, the checklist item "Overview uses specific, measurable language" will fail. The agent will iterate to make language more concrete.

## Edge Cases and Limitations

### Small Features with Minimal Scope

For very small features, strict adherence to "2-4 paragraphs" may feel forced. The guidance allows flexibility: the Overview may be 1-2 paragraphs instead of 3-4, and Objectives may be 2-3 bullets instead of a longer list.

**How to handle**: During spec iteration, inform the Spec Agent that the feature has minimal scope. The agent will adjust narrative length appropriately while still providing meaningful context.

### Complex Multi-Faceted Features

Large features may need more than 4 paragraphs to adequately describe all aspects, or the Objectives list may become long enough to lose focus.

**How to handle**: Consider whether the feature should be split into multiple specs. If the feature truly needs comprehensive coverage, the Overview can extend to 4 full paragraphs, and the Objectives list can be longer—but maintain focus on the most critical behavioral goals.

### Features with Heavy Technical Components

Some features (e.g., API refactors, infrastructure changes) may be challenging to describe from a pure "user perspective" if the users are developers or the changes are internal.

**How to handle**: Reframe "user perspective" to mean "consumer perspective." For an API refactor, the consumers are developers using the API. Describe what they'll experience (cleaner interfaces, better error messages, improved performance) rather than how the refactor is implemented (file restructuring, class hierarchies).

### Iterative Refinement and Narrative Drift

During spec iteration, detailed requirements may evolve in ways that make the Overview or Objectives outdated. The narrative sections might no longer reflect the current scope.

**How to handle**: The Quality Checklist includes "Overview narrative logically connects to and sets up the User Stories section that follows." This check ensures narrative-requirement alignment is validated during each iteration. If requirements change significantly, the agent should update the narrative sections to maintain coherence.

### Retrofitting Existing Specs

The enhancement affects only newly generated specs. Existing specs in `.paw/work/*/Spec.md` don't automatically gain narrative sections.

**Current limitation**: No automated migration tool exists to add Overview and Objectives to existing specs. Users can manually add these sections if desired, following the template structure. This is mentioned as possible future work in the original issue but is out of scope for this implementation.

## Testing Guide

### How to Test This Work

**Test 1: Generate a New Spec**

1. Create a new feature branch for a test feature (e.g., "test-narrative-sections")
2. Open GitHub Copilot chat in VS Code
3. Select the "PAW-01A Spec Agent" chatmode
4. Provide a feature brief: "Add user notification preferences allowing users to control email and push notification settings"
5. Let the Spec Agent generate a complete specification
6. **Verify**:
   - Spec includes Overview section immediately after header
   - Overview contains 2-4 paragraphs (3-5 sentences each)
   - Overview describes the feature from user perspective (what users can do, why it matters)
   - Overview tells a coherent story (flowing prose, not bullet fragments)
   - Overview avoids implementation details (no mentions of files, classes, architecture)
   - Spec includes Objectives section immediately after Overview
   - Objectives contain bulleted list of behavioral goals
   - Objectives focus on WHAT, not HOW
   - User Scenarios & Testing section follows Objectives
   - All other sections appear in correct order

**Test 2: Verify Quality Checklist Enforcement**

1. During spec generation (from Test 1), ask the Spec Agent to show you the quality checklist validation
2. **Verify**:
   - Checklist includes "Narrative Quality" subsection
   - 13 narrative-specific items are present
   - Agent validates all items before finalizing spec
   - If any item fails, agent iterates to fix the issue

**Test 3: Check Token Budget**

1. Run the chatmode linter: `./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
2. **Verify**:
   - Token count is below 6500 (error threshold)
   - No syntax errors reported
   - Linter completes successfully

**Test 4: Verify No Regression in Existing Functionality**

1. Generate a spec for a different test feature following the same process as Test 1
2. **Verify**:
   - User Stories still generate correctly with acceptance scenarios
   - Functional Requirements are properly enumerated (FR-001, FR-002, ...)
   - Success Criteria link to FRs correctly
   - Assumptions, Scope, Dependencies sections appear unchanged
   - Glossary (if applicable) generates correctly
   - No broken references or malformed content

**Test 5: Validate Anti-Pattern Prevention**

1. During spec generation, observe whether the agent avoids common issues:
2. **Verify**:
   - Overview is not written as bullet points (should be paragraphs)
   - Overview doesn't include file paths (e.g., `src/components/notifications.ts`)
   - Overview doesn't describe architecture (e.g., "using a NotificationService class")
   - Overview doesn't use vague language without quantification (e.g., just saying "fast" without defining how fast)
   - Objectives don't describe technical approaches (e.g., "Implement caching layer")
   - Objectives focus on outcomes (e.g., "Enable users to customize notification frequency")

**Test 6: Verify Narrative-Requirement Linkage**

1. Review the generated spec from Test 1
2. **Verify**:
   - Objectives mentioned in the Objectives section are reflected in User Stories
   - Overview narrative sets up expectations that User Stories fulfill
   - Success Criteria provide measurable validation of Objectives
   - No major disconnect between narrative and structured sections

## Migration and Compatibility

### Forward Compatibility

All future specs generated with the updated PAW-01A Spec Agent chatmode will automatically include Overview and Objectives narrative sections. No user action required.

### Backward Compatibility

Existing specs without narrative sections remain valid and functional. The template change is purely additive—it doesn't invalidate specs created before this enhancement.

**For specs currently in progress**: If you're mid-workflow on a feature (e.g., already created Spec.md but haven't started implementation), you can optionally regenerate the spec to include narrative sections, or manually add them following the template structure shown in the chatmode.

### Manual Addition of Narrative Sections

If you want to add Overview and Objectives to an existing spec:

1. Open the existing `Spec.md` file
2. Insert the following immediately after the header metadata (branch, created date, status, input brief):

```markdown
## Overview

[2-4 paragraphs describing what the feature does and why it matters from the user perspective. Focus on user journey and value. Avoid implementation details.]

## Objectives

- [Behavioral goal 1]
- [Behavioral goal 2]
- [Behavioral goal 3]
```

3. Fill in the narrative content based on your understanding of the feature
4. Ensure the Overview focuses on user perspective and the Objectives list observable outcomes

### No Breaking Changes

This enhancement introduces no breaking changes to:
- The PAW workflow process
- Artifact file locations or naming
- VS Code extension functionality
- Prompt template generation
- Other PAW chatmodes or agents

The change is isolated to the Spec Agent's template structure and affects only newly generated specs.

## References

- **Original Issue**: [#80 - Add Narrative/Overview Section to Spec Template](https://github.com/lossyrob/phased-agent-workflow/issues/80)
- **Specification**: `.paw/work/spec-narrative-section/Spec.md`
- **Implementation Plan**: `.paw/work/spec-narrative-section/ImplementationPlan.md`
- **Spec Research**: `.paw/work/spec-narrative-section/SpecResearch.md` (research on specification best practices)
- **Code Research**: `.paw/work/spec-narrative-section/CodeResearch.md` (analysis of existing spec template structure)
- **Modified File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
- **Commits**:
  - [6cb0465](https://github.com/lossyrob/phased-agent-workflow/commit/6cb0465) - Add Overview and Objectives narrative sections to PAW spec template
  - [369ee5b](https://github.com/lossyrob/phased-agent-workflow/commit/369ee5b) - Clarify Overview and Objectives inline template guidance

### External References

- **Joel Spolsky's "Painless Functional Specifications"** - Influential series on writing effective specs that balance narrative context with detailed requirements
- **GitHub Spec Kit** - Documentation on specification structure used in GitHub's internal development process
- **Research Paper**: "The Role of Specifications and Choosing the Right Format" - Academic research on narrative vs. structured requirements (referenced in SpecResearch.md)

### Related Work

- **Issue #57**: Preventing code/technical design in specs - The guardrails added in this enhancement (avoiding file paths, architecture, code references in narrative sections) align with the broader effort to keep specs focused on WHAT, not HOW.
