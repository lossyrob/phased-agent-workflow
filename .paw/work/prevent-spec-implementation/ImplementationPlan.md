# Prevent Spec Implementation Details - Implementation Plan

## Overview

Add explicit guardrails to the Spec Agent chatmode to prevent implementation details (code snippets, file paths, technical design) from appearing in specifications, especially during iterative refinement sessions.

## Current State Analysis

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

### Existing Anti-Implementation Guidance (Insufficient)

The chatmode has multiple layers discouraging implementation details:
- Line 9: Core principle #1 "Focus on user value (WHAT & WHY), not implementation"
- Line 143: Explicit non-responsibilities excluding implementation detail exploration
- Line 285: Template prohibitions listing "tech stack specifics, file paths, library names, API signatures"
- Line 316: Quality checklist item checking for implementation details
- Line 349: Final quality bar requiring "language free of implementation detail"

### Critical Gap

**Lines 363-382: Guardrails Section** lacks explicit directives using strong language (NEVER/DO NOT/CRITICAL) that prevent code snippets or technical design during iteration.

Current guardrails focus on:
- Not fabricating answers
- Not assuming external standards
- Not proceeding with unanswered questions
- Differentiating requirements from acceptance criteria

**Missing**: Explicit "NEVER include code/implementation during iteration" directives.

### Real-World Evidence

The problematic spec example (`.paw/work/prevent-spec-implementation/context/problematic-spec-example.md`) demonstrates the failure mode:
- TypeScript interface definitions (lines 47-73, 129-146)
- File paths and module structure (lines 324-344)
- API calls and method signatures throughout
- Entire "Technical Design" section (lines 322-351)
- Implementation-level data flow diagrams (lines 353-421)

This spec was created through iteration with the Spec Agent, proving current guidance is insufficient.

### Key Discoveries

**Discovery 1**: Guardrails section has no anti-implementation directives
- **File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:363-382`
- **Finding**: All existing guardrails address other concerns, creating a gap for implementation detail prevention

**Discovery 2**: Quality checklist items exist but are too weak
- **File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:316`
- **Finding**: Single checklist item "Focuses on WHAT & WHY (no implementation details)" lacks specificity about what constitutes implementation details

**Discovery 3**: No communication pattern for redirecting implementation requests
- **File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:356`
- **Finding**: Communication Patterns section doesn't address how to handle users requesting technical details during iteration

## Desired End State

After this implementation:

1. **Guardrails section** establishes strong defaults against proactive implementation details while preserving user autonomy:
   - Agent never generates code snippets, file paths, or technical design on its own initiative
   - Agent transforms technical discussions into behavioral language by default
   - User can explicitly request implementation detail inclusion (with gentle guidance)
   - Focuses on preventing accidental implementation detail creep, not blocking intentional choices

2. **Quality checklist** includes 4+ specific items checking for:
   - No code snippets in any language
   - No file paths or module references
   - No API/method call examples
   - No technical design sections

3. **Communication patterns** guide handling of implementation details:
   - Use technical discussions as context to inform behavioral requirements
   - Transform technical details to behavioral language by default
   - Respect user override when explicitly requested

4. **Verification**: Running the Spec Agent with identical inputs to the problematic spec should transform implementation discussions into behavioral descriptions unless user explicitly requests implementation detail inclusion

## What We're NOT Doing

- NOT adding narrative/overview section to spec template (Issue #80)
- NOT changing the spec template structure itself
- NOT modifying other chatmode files
- NOT adding new validation scripts or linters
- NOT changing the research workflow or SpecResearch.md format

## Implementation Approach

Single-phase changes to `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`:
1. Add strong guardrails to Guardrails section (lines 363-382)
2. Add specific quality checklist items (around line 316)
3. Add communication pattern for redirecting implementation requests (around line 356)

Changes are localized to three sections of one file, minimizing disruption.

---

## Phase 1: Add Strong Guardrails

### Overview

Insert 7 new NEVER/DO NOT/CRITICAL guardrails into the Guardrails section to explicitly prevent implementation details from entering specs.

### Changes Required

#### 1. Guardrails Section Enhancement

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: Lines 363-382 (Guardrails (Enforced) section)

**Changes**: Add new guardrails after the existing list, before "## Hand-off Checklist"

```markdown
## Guardrails (Enforced)
- NEVER: fabricate answers not supported by Issue, SpecResearch, or user-provided inputs.
- NEVER: silently assume critical external standards; if needed list as optional external/context question + assumption.
- NEVER: produce a spec-research prompt that reintroduces removed sections (Purpose, Output) unless user explicitly requests legacy format.
- NEVER: proceed to final spec if unanswered **critical** internal clarification questions remain (optional external/context questions do not block).
- NEVER: proactively generate code snippets, interface definitions, class definitions, or type definitions in specifications without explicit user request.
- NEVER: proactively specify file paths, directory structure, module organization, or component locations in specifications without explicit user request.
- NEVER: proactively reference specific API methods, class names, framework-specific calls, library names, or package imports in specifications without explicit user request.
- NEVER: proactively create "Technical Design", "Implementation Details", "Architecture", or technical "Data Flow" sections in specifications without explicit user request.
- ALWAYS: differentiate *requirements* (what) from *acceptance criteria* (verification of what).
- ALWAYS: pause after writing the research prompt until research results (or explicit skips) are provided.
- ALWAYS: surface if external research was skipped and note potential risk areas.
- ALWAYS: ensure minimal format header lines are present and correctly ordered.
- ALWAYS: describe system behavior in natural language focusing on observable outcomes, not internal mechanisms or code structures, unless user explicitly requests implementation detail inclusion.
- ALWAYS: use implementation discussions as context to inform behavioral requirements, transforming technical details into behavioral language by default.
- ALWAYS: respect user autonomy—if user explicitly requests including implementation details in the spec, comply while offering gentle guidance about typical spec focus (WHAT/WHY vs HOW).
- When updating previously drafted artifacts (spec, research prompt), modify only the sections impacted by new information so that re-running with unchanged inputs produces minimal diffs.
```

**Rationale**: The new guardrails establish strong defaults against implementation details while preserving user autonomy:
- Use "proactively" to indicate agent shouldn't generate implementation details on its own initiative
- Add "without explicit user request" to allow user override
- Add ALWAYS items that encourage transforming technical discussions into behavioral language
- Maintain user control while guiding toward best practices
- Focus on preventing accidental implementation detail creep, not blocking intentional user choices

### Success Criteria

#### Automated Verification

- [ ] Chatmode file exists: `test -f .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
- [ ] File contains proactive prevention guardrail: `grep -q "NEVER: proactively generate code snippets" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
- [ ] File contains user autonomy guidance: `grep -q "respect user autonomy" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
- [ ] Chatmode linter passes: `./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`

#### Manual Verification

- [ ] Guardrails use "proactively" and "without explicit user request" qualifiers
- [ ] Guardrails preserve user autonomy (allow override)
- [ ] New ALWAYS items encourage transformation of technical to behavioral language
- [ ] Guardrails balance strong defaults with user control
- [ ] New guardrails don't conflict with existing ones

---

## Phase 2: Strengthen Quality Checklist

### Overview

Add 4 specific quality checklist items that detect implementation details during spec validation.

### Changes Required

#### 1. Quality Checklist Enhancement

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: Lines 289-340 (Spec Quality Checklist section)

**Changes**: Add new checklist items to the "Content Quality" subsection (around line 316)

**Current Content Quality subsection**:
```markdown
### Content Quality
- [ ] Focuses on WHAT & WHY (no implementation details)
- [ ] Story priorities clear (P1 highest, descending)
- [ ] Each user story independently testable
- [ ] Each story has ≥1 acceptance scenario
- [ ] Edge cases enumerated
```

**Updated Content Quality subsection**:
```markdown
### Content Quality
- [ ] Focuses on WHAT & WHY (no implementation details)
- [ ] No code snippets or interface definitions in any language (TypeScript, Python, JavaScript, etc.)
- [ ] No file paths, directory structure, or module organization references
- [ ] No API methods, class names, library imports, or framework-specific calls
- [ ] No "Technical Design", "Implementation Details", or technical "Data Flow" sections
- [ ] Story priorities clear (P1 highest, descending)
- [ ] Each user story independently testable
- [ ] Each story has ≥1 acceptance scenario
- [ ] Edge cases enumerated
```

**Rationale**: The new items (lines 2-5) provide specific, testable criteria for detecting the exact types of implementation details found in the problematic spec. They expand the vague "no implementation details" into concrete checks.

### Success Criteria

#### Automated Verification

- [ ] Quality checklist section updated: `grep -A 20 "### Content Quality" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md | grep -q "No code snippets"`
- [ ] All 4 new items present: `grep -c "No file paths\|No code snippets\|No API methods\|No \"Technical Design\"" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md` returns 4
- [ ] Chatmode linter passes: `./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`

#### Manual Verification

- [ ] New items appear after "Focuses on WHAT & WHY" but before "Story priorities clear"
- [ ] New items use consistent checkbox format `- [ ]`
- [ ] New items cover all implementation detail types from problematic spec
- [ ] Checklist remains logically organized (content quality items grouped together)

---

## Phase 3: Add Communication Patterns

### Overview

Add guidance to the Communication Patterns section for handling implementation details during spec creation, balancing user autonomy with behavioral focus.

### Changes Required

#### 1. Communication Patterns Enhancement

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: Lines 356-361 (Communication Patterns section)

**Current section**:
```markdown
## Communication Patterns
- When pausing for research, clearly enumerate pending research question IDs
- Prefix critical warnings with: `IMPORTANT:` or `CRITICAL:`
- **Write spec sections to `Spec.md` incrementally**—only present summaries or specific excerpts in chat when explaining changes or seeking feedback
```

**Updated section**:
```markdown
## Communication Patterns
- When pausing for research, clearly enumerate pending research question IDs
- Prefix critical warnings with: `IMPORTANT:` or `CRITICAL:`
- **Write spec sections to `Spec.md` incrementally**—only present summaries or specific excerpts in chat when explaining changes or seeking feedback
- **When implementation details arise in conversation**:
  - Implementation discussions are valuable context for understanding requirements
  - Use implementation insights to inform behavioral requirements without embedding code, file paths, or technical design in the spec itself
  - Transform technical discussions into behavioral descriptions (e.g., "service that monitors deployment status" instead of "`FlexDeploymentTracker` class")
  - If user explicitly requests including implementation details in the spec, respect their decision and follow user instructions, while offering gentle guidance about typical spec focus (WHAT/WHY vs HOW)
  - Default behavior: Never proactively generate code snippets, file paths, API signatures, or technical architecture sections unless explicitly requested by the user
```

**Rationale**: Strikes a balance between preventing accidental implementation detail creep and respecting user autonomy. The agent:
1. Uses implementation discussions as context to inform better behavioral requirements
2. Transforms technical details into behavioral language by default
3. Allows user override when explicitly requested (with gentle guidance)
4. Never proactively generates implementation details without being asked

This approach preserves PAW's value of user control while establishing a strong default toward behavioral specifications.

### Success Criteria

#### Automated Verification

- [ ] Communication pattern added: `grep -A 10 "## Communication Patterns" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md | grep -q "When implementation details arise"`
- [ ] Chatmode linter passes: `./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`

#### Manual Verification

- [ ] New pattern appears in Communication Patterns section
- [ ] Pattern distinguishes between discussion context and spec content
- [ ] Pattern allows user override with gentle guidance (not refusal)
- [ ] Pattern emphasizes transformation of technical details to behavioral language
- [ ] References Implementation Plan stage appropriately

---

## Testing Strategy

### Unit-Level Verification

**File integrity checks**:
- Verify chatmode file syntax is valid
- Run chatmode linter to detect formatting issues
- Check that all new guardrails/checklist items are present

**Commands**:
```bash
# Verify file exists and is readable
test -f .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md && echo "File exists"

# Count new guardrails (should be at least 7 new lines)
grep -c "NEVER: include code snippets\|NEVER: specify file paths\|NEVER: reference specific API\|NEVER: create \"Technical Design\"\|DO NOT: include implementation-level\|DO NOT: specify data structure implementations\|CRITICAL: During iteration" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md

# Verify quality checklist additions
grep -A 20 "### Content Quality" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md | grep "No code snippets"

# Run linter
./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md
```

### Integration Testing

Test the Spec Agent's behavior with the updated guardrails:

1. **Test Case: Implementation details discussed in conversation (default behavior)**
   - **Setup**: Start Spec Agent with a feature request
   - **Action**: Discuss TypeScript interfaces and file structure during spec creation
   - **Expected**: Agent uses discussion as context, transforms to behavioral language
   - **Verify**: No code or file paths appear in Spec.md (behavioral descriptions only)

2. **Test Case: User explicitly requests code snippet**
   - **Setup**: Draft a spec for a new feature
   - **Action**: Explicitly say "Please include a TypeScript interface in the spec"
   - **Expected**: Agent offers guidance, asks for confirmation, respects user decision if confirmed
   - **Verify**: User control preserved with appropriate guidance

3. **Test Case: Transformation of technical discussion**
   - **Setup**: Iterate on existing spec while discussing API design
   - **Action**: Talk about `FlexDeploymentTracker` service and polling intervals
   - **Expected**: Agent describes "background service that monitors status every 15 seconds"
   - **Verify**: Behavioral language in spec, technical details not embedded

4. **Test Case: Quality checklist validation**
   - **Setup**: Create spec with implementation details manually inserted
   - **Action**: Run quality checklist validation
   - **Expected**: New checklist items flag the violations
   - **Verify**: Agent identifies specific implementation detail issues

### Manual Testing Scenarios

**Scenario 1: Recreate problematic spec conditions (default behavior)**
1. Use the same issue/brief that created the problematic spec example
2. Invoke Spec Agent with updated guardrails
3. During iteration, discuss technical implementation details in conversation
4. **Success**: Agent uses technical discussion to inform behavioral requirements
5. **Success**: Final spec contains behavioral descriptions, not implementation code

**Scenario 2: User explicitly requests implementation details**
1. Start spec creation for a feature
2. Explicitly request "Include a TypeScript interface showing the data structure in the spec"
3. **Success**: Agent offers gentle guidance about spec focus (WHAT/WHY vs HOW)
4. **Success**: Agent asks for confirmation before proceeding
5. **Success**: If user confirms, agent includes the requested details
6. **Success**: Agent documents the user override decision

**Scenario 3: Verify transformation of technical discussion**
1. Create spec while discussing file locations and API names
2. Agent participates in technical discussion for context
3. **Success**: Agent transforms technical details into behavioral language
4. **Success**: Spec describes "a background service monitors deployment" not "`FlexDeploymentTracker` class in `src/services/`"
5. **Success**: Behavioral requirements accurately reflect the technical context

**Scenario 4: Verify no regression in normal spec creation**
1. Create spec for simple feature without discussing implementation
2. Follow standard workflow: research → integration → spec drafting
3. **Success**: Process works normally
4. **Success**: Quality checklist passes
5. **Success**: No false positives from new checklist items

**Scenario 5: Verify behavioral descriptions still allowed**
1. Draft spec describing system behavior using natural language
2. Use conceptual terms (e.g., "profile contains name and email fields")
3. **Success**: Agent allows conceptual entity descriptions
4. **Success**: Agent only suggests transformation when descriptions become too implementation-specific
5. **Success**: User retains final control over level of detail

## Performance Considerations

No performance impact expected:
- Changes are documentation/guidance only
- No new processing or validation code
- Agent behavior changes are purely conversational
- File size increase is minimal (~30 lines total)

## Migration Notes

**Backward Compatibility**: Fully compatible. Existing specs remain valid.

**Existing Work**: In-progress specs may have implementation details from before this change. Recommend:
1. Review existing draft specs in `.paw/work/*/Spec.md`
2. Identify implementation details using new quality checklist
3. Refactor to behavioral requirements or move to ImplementationPlan.md

**Commands for finding existing specs**:
```bash
# Find all Spec.md files
find .paw/work -name "Spec.md"

# Check for common implementation detail patterns
grep -r "interface\|class\|function\|src/\|lib/" .paw/work/*/Spec.md
```

## Risks & Mitigations

### Risk 1: Agent too restrictive, blocks valid behavioral descriptions

**Impact**: Medium - Could prevent legitimate use of technical terms when describing behavior

**Mitigation**: 
- Guardrails focus on specific implementation artifacts (code, files, APIs)
- Natural language descriptions of behavior remain allowed
- Agent can rephrase requests as behavioral requirements
- Manual testing scenarios verify edge cases

### Risk 2: Users circumvent by manually editing Spec.md files

**Impact**: Low - Users can still add implementation details by editing files directly

**Mitigation**:
- Quality checklist catches issues during validation
- Implementation Plan Agent may flag inconsistencies
- Out of scope: File-level validation or linting (not part of this issue)

### Risk 3: Chatmode linter rejects new format

**Impact**: Low - Linter might have strict format requirements

**Mitigation**:
- Test linter immediately after changes
- Follow existing guardrail format patterns exactly
- Adjust wording if needed while preserving meaning

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/57
- Spec: `.paw/work/prevent-spec-implementation/Spec.md` (not created - minimal mode)
- Research: 
  - `.paw/work/prevent-spec-implementation/CodeResearch.md`
- Problematic Spec Example: `.paw/work/prevent-spec-implementation/context/problematic-spec-example.md`
- Spec Agent Chatmode: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
- Related Issue (out of scope): #80 - Add narrative/overview section to spec template
