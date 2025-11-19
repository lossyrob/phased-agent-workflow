# Implementation Planner Improvements

## Overview

This enhancement improves the Implementation Planner agent (PAW-02B) to shift its focus from code-level detail to strategic architectural thinking, providing clearer phase summaries for quick understanding, establishing transparent agent identification in PRs, and preventing documentation phases from appearing in implementation plans. These changes address systematic issues identified in Issue #58 where implementation plans contained excessive code detail that obscured strategic thinking and made plans feel like coding tutorials rather than architectural blueprints.

The improvements transform how the Implementation Planner approaches its core responsibility: translating specifications into actionable implementation strategies. Instead of diving immediately into code-level details, the planner now operates at the C4 container/component abstraction level, describing system structure, component responsibilities, interfaces, and data flows. This strategic approach preserves the architectural perspective needed for sound design decisions while delegating detailed implementation to the Implementation Agent where it belongs.

## Architecture and Design

### High-Level Architecture

The Implementation Planner agent is a 651-line agent definition file (`agents/PAW-02B Impl Planner.agent.md`) that operates within VS Code's GitHub Copilot Agent Mode. The agent reads specification and research artifacts, interacts with developers through an iterative planning process, and produces structured implementation plans that guide downstream implementation work.

The improvements modify the agent's behavior through five complementary changes:
1. **Strategic Focus Guidance** - New instructions establishing architectural thinking principles
2. **Enhanced Plan Template** - Updated template demonstrating strategic descriptions over code detail
3. **Documentation Phase Prevention** - Explicit guidance separating implementation and documentation concerns
4. **Agent Identification** - Clear attribution in Planning PRs and review comments
5. **Quality Verification** - Enhanced checklist ensuring compliance with new standards

### Design Decisions

**Decision: Prompt Engineering Over Code Changes**

We chose to modify agent behavior through enhanced instructions and examples rather than implementing code-level enforcement (e.g., token counting, syntax validation).

**Rationale:**
- Claude Sonnet 4.5 responds effectively to well-structured prompt engineering with clear examples and anti-patterns
- Enforcement through code would be brittle and difficult to maintain across diverse project types
- Flexible guidance allows the agent to adapt to legitimate cases where brief code examples add architectural clarity
- Faster iteration: testing guidance changes doesn't require code deployment cycles

**Consequences:**
- Effectiveness depends on LLM model quality and continued prompt responsiveness
- Requires manual verification of agent behavior through test generation
- Allows for edge cases where brief illustrative code remains appropriate

**Decision: C4 Container/Component Abstraction Level**

We established the C4 model's container/component level as the target abstraction for implementation plans, explicitly avoiding system context (too high) and code-level detail (too low).

**Rationale:**
- C4 provides widely understood vocabulary for describing software architecture at appropriate granularity
- Container/component level naturally describes "what needs to exist" (components, interfaces, responsibilities) without prescribing "how to implement it" (algorithms, functions, detailed logic)
- Aligns with the PAW workflow stage separation: planning describes architecture, implementation writes code
- Maps well to the types of decisions that matter during planning: component boundaries, integration points, interface contracts

**Consequences:**
- Plans focus on component responsibilities and interactions rather than function implementations
- Developers reviewing plans can evaluate architectural soundness without getting lost in code details
- Implementation Agent retains flexibility to make tactical coding decisions within the strategic framework
- May require learning curve for teams unfamiliar with C4 terminology

**Decision: Phase Summary Section as Mandatory Template Element**

We added a Phase Summary section to every implementation plan, positioned after "Implementation Approach" and before detailed phase descriptions, listing each phase with its objective.

**Rationale:**
- Enables quick comprehension of plan scope and structure without reading hundreds of lines
- Provides machine-readable structure for Status Agent automation (future enhancement)
- Mirrors best practices from project management where executive summaries precede details
- Addresses feedback that large plans were difficult to navigate and understand at a glance

**Consequences:**
- Every plan includes high-level roadmap before detailed breakdowns
- Status Agent can parse phase count and names for automated status reporting
- Small additional overhead for simple single-phase plans (but improves consistency)
- Developers returning to a plan after context switching can quickly reorient

**Decision: Explicit Documentation Phase Prevention**

We added guidance explicitly preventing "Documentation" phases within implementation plans, clarifying that documentation is the Documenter agent's responsibility.

**Rationale:**
- Maintains clean separation of concerns across PAW workflow stages
- Prevents confusion about when documentation artifacts should be created
- Documentation quality improves when handled by specialized agent after implementation completes
- Aligns with workflow sequence: Specification → Planning → Implementation → Documentation

**Consequences:**
- Implementation plans focus exclusively on functional code changes
- Documenter agent has complete implementation to document rather than documenting in parallel
- Success criteria may still mention inline code comments/docstrings as code quality measures
- Clearer workflow progression for developers

**Decision: Agent Identification Pattern Using Emoji Prefix**

We adopted the `**🐾 Implementation Planner 🤖:**` identification pattern at the beginning of Planning PR descriptions and review comments, matching patterns established by Implementation Reviewer (PAW-03B) and Documenter (PAW-04) agents.

**Rationale:**
- Visual consistency across PAW agents improves workflow transparency
- Emoji provides quick visual scan differentiation in PR listings
- Clear attribution helps developers understand workflow state at a glance
- Complements (doesn't replace) the PAW project footer signature

**Consequences:**
- All Planning PRs clearly identify their source agent
- Developers can distinguish planner comments from other agents or humans
- Maintains consistency with established PAW patterns
- Requires similar identification for other agents to maximize benefit (already present in PAW-03B, PAW-04)

### Integration Points

**With Other PAW Agents:**
- **Specification Agent (PAW-01A)**: Consumes `Spec.md` as primary requirements input
- **Spec Research Agent (PAW-01B)**: Consumes `SpecResearch.md` for system behavior facts
- **Code Research Agent (PAW-02A)**: Consumes `CodeResearch.md` for codebase mapping; may request additional research iterations
- **Implementation Agent (PAW-03A)**: Downstream consumer of `ImplementationPlan.md` for executing phases
- **Documenter Agent (PAW-04)**: References the pattern of strategic thinking (guideline alignment)
- **Status Agent (PAW-X)**: Future integration point for parsing Phase Summary sections

**With Git/GitHub:**
- Creates Planning PRs with `<target_branch>_plan` → `<target_branch>` when using `prs` review strategy
- Commits planning artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md) to planning branch
- Posts review comments with agent identification when addressing Planning PR feedback

**With VS Code Extension:**
- Agent definition file automatically installed to VS Code prompts directory
- Appears in GitHub Copilot Chat as selectable agent
- Invoked through chat interface with planning prompt files

## Technical Reference

### Key Changes

**1. Guideline 9: Think Strategically, Not Tactically**

Added comprehensive strategic planning guidance at lines 468-501 in `PAW-02B Impl Planner.agent.md`:

- Operates at C4 container/component abstraction level
- Limits code snippets to 3-10 lines for critical architectural concepts only
- Focuses on WHAT needs to be built (component purposes, interfaces, behaviors) rather than HOW to implement it
- Requires 2-3 options with trade-offs for significant architectural decisions
- Applies YAGNI principles to avoid premature optimization
- Optionally uses ADR format for complex architectural decisions
- Describes success criteria via observable outcomes (SLIs/SLOs, acceptance tests)

Includes anti-patterns section identifying behaviors to avoid:
- Complete function implementations or algorithms in Changes Required sections
- Pseudo-code walkthroughs of logic flow
- Library/framework choices without trade-off analysis
- Premature optimization before functional requirements are proven
- Tutorial-style code examples

Includes good examples demonstrating appropriate abstraction:
- Repository pattern implementations with file path references
- Middleware integration descriptions
- Database migration specifications following existing conventions
- Brief interface definitions (3-5 lines)

**2. Guideline 10: Separate Implementation from Documentation**

Added documentation phase prevention guidance at lines 503-511 in `PAW-02B Impl Planner.agent.md`:

- Explicitly prohibits "Documentation" phases in implementation plans
- References Documenter agent (PAW-04) as owner of documentation work
- Clarifies implementation plans focus on functional code
- Distinguishes inline code comments (acceptable in success criteria) from documentation artifacts (out of scope)
- References PAW workflow sequence to reinforce stage separation

**3. Plan Template Updates**

Modified template at lines 250-363 in `PAW-02B Impl Planner.agent.md`:

- Added Phase Summary section after "Implementation Approach" with format:
  ```markdown
  ## Phase Summary
  
  1. **Phase 1: [Descriptive Name]** - [One-sentence objective]
  2. **Phase 2: [Descriptive Name]** - [One-sentence objective]
  ```

- Replaced code block placeholder with architectural description example:
  ```markdown
  **Changes**: 
  - Implement `ComponentName` following [pattern/interface] established in `path/to/reference.ext`
  - Add methods/properties: `methodName()`, `propertyName`
  - Integrate with existing `DependencyName` at `path/to/dependency.ext`
  
  **Brief Example** (if architecturally significant):
  [3-10 lines of illustrative code for critical concepts]
  ```

- Updated Step 4 instruction to reference Guideline 9 explicitly

**4. Agent Identification in PRs**

Updated Planning PR creation at lines 365-372 and review comment replies at lines 133-139:

- Planning PR body format:
  ```markdown
  **🐾 Implementation Planner 🤖:**
  
  [Summary of deliverables, links to artifacts]
  
  ---
  🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)
  ```

- PR review comment format:
  ```markdown
  **🐾 Implementation Planner 🤖:**
  
  [What was changed and commit hash reference]
  ```

**5. Enhanced Quality Checklist**

Added 7 new verification items at lines 520-527 in `PAW-02B Impl Planner.agent.md`:

- Phase Summary section exists in correct position
- Phase Summary includes all phases with proper format (numbered list, bold names, one-sentence objectives)
- Code blocks absent or limited to <10 lines illustrating architectural concepts
- Changes Required sections focus on components/interfaces/patterns rather than implementation code
- Significant architectural decisions present options with trade-offs and justification
- No phases titled "Documentation" or with documentation artifact creation as primary objective
- Documentation work limited to inline code comments in success criteria

### Behavior Changes

**Before Improvements:**
- Plans included extensive code snippets showing detailed implementations
- Template demonstrated code blocks as default approach for describing changes
- No high-level phase overview; readers had to scan entire plan to understand scope
- Planning PRs used generic PAW footer without agent-specific identification
- No explicit guidance preventing documentation phases

**After Improvements:**
- Plans describe component responsibilities, interfaces, and integration patterns
- Brief code examples (3-10 lines) appear only when architecturally significant
- Phase Summary provides immediate understanding of plan structure and scope
- Planning PRs clearly identify `**🐾 Implementation Planner 🤖:**` as source
- Explicit prohibition against including documentation phases in implementation plans
- Quality checklist enforces strategic focus and phase summary requirements

### Error Handling

**Guidance Violations:**

The agent includes quality checklist items that serve as self-verification before completing planning work. If the agent attempts to produce a plan that violates the new guidelines (e.g., includes extensive code, omits Phase Summary, includes documentation phase), the checklist prompts correction before hand-off.

**Edge Cases:**

- **Simple single-phase plans**: Phase Summary still required for consistency, even if it lists only one phase
- **Complex architectural decisions**: When decisions have broad impact, agent may use optional ADR format (Context, Decision, Consequences) for clarity
- **Architecturally significant code**: Brief illustrative examples (3-10 lines) remain acceptable when they clarify critical interfaces, contracts, or integration patterns that cannot be adequately described in prose

## Testing Guide

### How to Test These Improvements

The Implementation Planner improvements can be verified through actual usage of the updated agent. The following tests demonstrate that the changes achieve the intended objectives.

**Test 1: Strategic Focus Verification**

1. Create a new PAW workflow for a feature requiring database changes (e.g., "Add user authentication system")
2. Invoke the Implementation Planner agent with the specification
3. Review the generated `ImplementationPlan.md`
4. Verify:
   - Code blocks are absent or limited to <10 lines per phase
   - "Changes Required" sections describe component responsibilities and interfaces
   - Architectural decisions present options with trade-offs
   - Focus is on WHAT needs to exist, not HOW to implement it
5. Expected: Plan reads like an architectural blueprint, not a coding tutorial

**Test 2: Phase Summary Existence**

1. Use the updated Implementation Planner to generate any multi-phase plan
2. Open `.paw/work/<feature-slug>/ImplementationPlan.md`
3. Locate the "Phase Summary" section
4. Verify:
   - Section appears after "Implementation Approach" and before first detailed phase
   - Format is numbered list with bold phase names
   - Each entry includes one-sentence objective
   - Count of phases in summary matches detailed phase sections
5. Expected: Phase Summary provides instant understanding of plan scope and structure

**Test 3: Documentation Phase Absence**

1. Generate implementation plans for various feature types:
   - New feature (e.g., "Add reporting dashboard")
   - Enhancement (e.g., "Improve search performance")
   - Bug fix (e.g., "Fix memory leak in background worker")
   - Refactor (e.g., "Extract authentication logic into service")
2. Search each plan for "Documentation" in phase titles
3. Check success criteria for documentation artifact creation tasks
4. Verify:
   - No phases titled "Documentation" or similar
   - No "create Docs.md" or equivalent documentation artifact tasks
   - Inline code comments may appear in success criteria (acceptable)
5. Expected: Zero documentation phases across all plan types

**Test 4: Agent Identification in PRs**

1. Use the Implementation Planner with `prs` review strategy
2. Allow the agent to create a Planning PR
3. View the PR on GitHub
4. Verify:
   - PR description begins with `**🐾 Implementation Planner 🤖:**`
   - PAW footer signature also present at bottom
   - Identification clearly distinguishes this from other agent PRs
5. If review comments exist and agent addresses them:
   - Verify comment replies include `**🐾 Implementation Planner 🤖:**` identification
6. Expected: Clear agent attribution throughout Planning PR lifecycle

**Test 5: Architectural Decision Trade-offs**

1. Use the Implementation Planner for a feature with architectural choices (e.g., "Implement caching layer" - could use Redis, in-memory, database-backed)
2. Review the "Implementation Approach" section or phase descriptions
3. Verify:
   - At least one significant decision presents 2-3 options
   - Trade-offs discussed against quality attributes (performance, maintainability, etc.)
   - Selected approach includes justification
4. Expected: Plan demonstrates strategic thinking by exploring alternatives before committing

**Test 6: Quality Checklist Self-Verification**

1. Review the updated `agents/PAW-02B Impl Planner.agent.md` quality checklist (lines 520-527)
2. Invoke the planner to generate a plan
3. Before the agent hands off, observe whether it references the quality checklist
4. Verify the agent checks for:
   - Phase Summary existence
   - Code detail limits
   - Absence of documentation phases
5. Expected: Agent self-validates against new quality criteria before completion

### Automated Verification

**Agent Linting:**
```bash
./scripts/lint-agent.sh agents/PAW-02B\ Impl\ Planner.agent.md
```

Expected output:
- Token count: 5884 tokens (within acceptable range)
- No syntax errors
- Valid markdown structure

**Extension Tests:**

Run the full test suite to verify no regressions:
```bash
npm test
```

All 60 tests should pass, confirming the agent file changes don't break extension functionality.

## Edge Cases and Limitations

**When Brief Code Examples Are Appropriate:**

The 3-10 line code limit is a guideline, not a strict rule. Brief illustrative code remains acceptable when:
- Clarifying a critical interface contract that's difficult to describe in prose
- Showing a key type signature or data structure
- Demonstrating an integration pattern that benefits from concrete syntax
- Illustrating error handling or validation logic that's central to the architecture

**When More Detail May Be Needed:**

Certain project types or team contexts may benefit from slightly more implementation detail:
- Teams new to a technology stack may need additional context
- Projects with unusual architectural constraints may require more explanation
- Complex state machines or algorithms that are central to requirements may warrant expanded description

In these cases, the Implementation Planner can adapt while still maintaining strategic focus. The guidance emphasizes "strategic thinking" as the goal rather than enforcing rigid line counts.

**Limitations:**

- **Model Dependency**: Effectiveness depends on Claude Sonnet 4.5's responsiveness to prompt engineering. Future models may interpret guidance differently.
- **No Automated Enforcement**: There's no code-level validation preventing the agent from generating code-heavy plans. Compliance depends on the LLM following instructions.
- **Subjectivity**: "Architecturally significant" remains somewhat subjective. Different reviewers may have different thresholds for when code examples add value.
- **Learning Curve**: Teams unfamiliar with C4 model terminology may need to learn the vocabulary (container, component, system context).

**Workarounds:**

- If a plan still contains too much code detail, provide feedback in Planning PR review requesting more strategic focus
- Reference specific guideline numbers (Guideline 9) when providing feedback to help agent calibrate
- For particularly complex features, consider splitting into smaller work items with simpler plans

## Migration and Compatibility

**For Existing Work in Progress:**

No action required for work items already in planning or implementation phases:
- Existing `ImplementationPlan.md` files remain valid and usable
- Implementation Agent continues to work with plans created before these improvements
- No requirement to retroactively update existing plans to match new format

**For New Planning Work:**

After merging this enhancement:
- All new implementation plans will use the updated agent behavior automatically
- Plans will include Phase Summary sections and maintain strategic focus
- Planning PRs will include agent identification

**Agent File Updates:**

The changes are additive and backward-compatible:
- New guidelines added (9 and 10) without removing existing guidelines
- Template enhanced with Phase Summary without breaking existing structure
- Quality checklist expanded with new items alongside existing checks
- No functional changes to git operations, file handling, or workflow transitions

**Testing After Merge:**

1. Invoke the linter on the updated agent file:
   ```bash
   ./scripts/lint-agent.sh agents/PAW-02B\ Impl\ Planner.agent.md
   ```

2. Test with a simple feature (e.g., "Add a utility function") to verify basic behavior

3. Test with a complex feature (e.g., "Implement authentication system") to verify Phase Summary, strategic focus, and documentation phase absence

4. Verify Planning PR creation includes agent identification

**No Breaking Changes:**

- WorkflowContext.md format unchanged
- Artifact file paths unchanged
- Git branch naming conventions unchanged
- Review strategy options (prs/local) unchanged
- Integration with other PAW agents unchanged

## References

- **Original Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/58
- **Specification**: `.paw/work/implementation-planner-improvements/Spec.md`
- **Research Documents**:
  - `.paw/work/implementation-planner-improvements/SpecResearch.md`
  - `.paw/work/implementation-planner-improvements/CodeResearch.md`
- **Implementation Plan**: `.paw/work/implementation-planner-improvements/ImplementationPlan.md`
- **Modified Agent File**: `agents/PAW-02B Impl Planner.agent.md`
- **Reference Agent Patterns**:
  - Implementation Reviewer (PAW-03B): `agents/PAW-03B Impl Reviewer.agent.md:212-234` (agent identification)
  - Documenter (PAW-04): `agents/PAW-04 Documenter.agent.md` (avoiding code reproduction)
- **Example PR with Excessive Code**: https://github.com/lossyrob/phased-agent-workflow/pull/85 (reduced from 1,387 to 557 lines)
- **External References**:
  - C4 Model: https://c4model.com (architectural abstraction levels)
  - YAGNI Principle: Referenced for avoiding premature optimization
  - Architecture Decision Records (ADRs): Format for documenting complex decisions
