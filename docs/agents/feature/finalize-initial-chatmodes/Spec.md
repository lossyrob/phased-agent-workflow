# Finalize Initial Agent Chatmodes - Specification

## Problem & Goals

The Phased Agent Workflow (PAW) process depends on well-defined agent chatmodes to execute each stage of the workflow. Currently, the chatmode files are in an inconsistent state: some are first-pass outputs from coding agents, others are adapted from Human Layer claude commands with proven patterns, and some are incomplete or empty.

**Success**: All PAW agent chatmodes are complete, consistent, aligned with the PAW specification, and leverage proven guidance patterns from the Human Layer-derived chatmodes. This provides a solid foundation for using and iterating on the PAW process effectively.

## Scope

### In-scope:
- Review and update all 9 agent chatmode files (PAW-01A through PAW-X)
- Ensure each chatmode fully implements its role as defined in the PAW specification
- Propagate proven patterns and guidance from Human Layer-derived chatmodes (Code Researcher, Implementer) to all agents
- Split Spec Research and Code Research into distinct phases with clear differentiation
- Finalize the Implementation Agent and Implementation Review Agent split to leverage model-specific strengths
- Ensure consistent formatting, structure, and conventions across all chatmodes
- Remove burdensome requirements (e.g., specific code line locations in Spec Research)
- Preserve all valuable guidance from Human Layer testing (strong language, important notes, step-by-step processes)
- Align all chatmodes with the current PAW workflow as documented in `paw-specification.md`

### Out-of-scope:
- Implementing new PAW stages or agents not already defined in the specification
- Testing the chatmodes in production (this will be done iteratively after finalization)
- Updating the PAW specification itself (chatmodes implement the existing spec)
- Creating example artifacts or sample workflows
- Performance optimization of agent prompts
- Multi-model orchestration logic (handled by users choosing which model per agent)

## Stakeholders & Interfaces

**Interfaces:**
- **Input**: GitHub Issue #1, existing chatmode files, `paw-specification.md`
- **Output**: Updated `.github/chatmodes/PAW-*.chatmode.md` files
- **Format**: Markdown files with YAML frontmatter following the `.chatmode.md` convention
- **Users**: Developers using the PAW process via GitHub Copilot chat modes

**Key Integration Points:**
- Chatmodes must align with the PAW specification's defined stages and artifacts
- Chatmodes must use consistent file paths and naming conventions (e.g., `docs/agents/<target_branch>/`)
- Chatmodes must properly hand off work between agents via defined artifacts

## Functional Requirements

### FR-1: Chatmode Completeness
**As a** PAW user,  
**When** I invoke any PAW agent chatmode,  
**Then** the chatmode must contain complete instructions for its role as defined in the PAW specification, including:
- Clear initial response/prompt for starting work
- Step-by-step process to follow
- Input requirements and output specifications
- Artifact paths and naming conventions
- Integration points with other agents
- Error handling and edge case guidance

### FR-2: Proven Patterns Propagation
**As a** PAW user,  
**When** using any PAW agent,  
**Then** the chatmode must incorporate proven guidance patterns from Human Layer-derived agents, including:
- Strong directive language about what NOT to do (with reasons)
- Important notes sections highlighting common pitfalls
- Specific instructions for file reading (read fully without limit/offset)
- Clear ordering requirements (read before research, complete research before synthesis)
- Communication patterns (status updates, response formats, coordinator hooks)
- Critical warnings and guardrails

### FR-3: Spec Research vs Code Research Differentiation
**As a** developer,  
**When** working through the Specification and Planning stages,  
**Then** Spec Research and Code Research must be clearly differentiated:
- **Spec Research (PAW-01B)**: Focuses on behavioral and architectural understanding for specification writing (what the system does, how it behaves)
- **Code Research (PAW-02A)**: Focuses on implementation details for planning (where code lives, specific file:line references, code patterns)
- Spec Research does NOT require specific code line locations
- Code Research DOES provide exact file paths and line numbers for implementation planning

### FR-4: Implementation Agent Split
**As a** developer,  
**When** implementing a phase,  
**Then** the work must be properly split between two agents:
- **Implementation Agent (PAW-03A)**: Makes code changes, runs automated checks, addresses review comments
- **Implementation Review Agent (PAW-03B)**: Reviews changes, suggests improvements, generates docstrings, pushes code and opens/updates PRs, responds to PR review comments
- Both agents handle initial implementation AND review comment response scenarios
- The split enables using different models for their strengths (e.g., GPT for coding, Claude for documentation)

### FR-5: Consistent Structure and Formatting
**As a** PAW maintainer,  
**When** reviewing or updating chatmodes,  
**Then** all chatmodes must follow consistent conventions:
- YAML frontmatter with `description` field
- Clear section headings and hierarchy
- Consistent use of code blocks and examples
- Standard terminology (e.g., "target branch", "planning branch", "phase branch")
- Consistent artifact paths (`docs/agents/<target_branch>/`)
- Similar structure patterns (Start/Initial Response, Process Steps, Important Guidelines)

### FR-6: PAW Specification Alignment
**As a** PAW user,  
**When** following the PAW workflow,  
**Then** each chatmode must align exactly with its stage definition in `paw-specification.md`:
- Inputs/outputs match specification
- Workflow steps match specification
- Artifact names and paths match specification
- Human interaction points match specification
- Success criteria match specification

### FR-7: Agent Interaction and Handoffs
**As a** developer,  
**When** transitioning between PAW stages,  
**Then** chatmodes must clearly document how to hand off work:
- What artifacts the agent consumes
- What artifacts the agent produces
- When to invoke other agents (e.g., Spec Agent requesting Spec Research)
- How to communicate status (Issue comments, coordinator hooks)
- What to do when blocked or encountering errors

### FR-8: File Reading Best Practices
**As a** PAW agent,  
**When** reading files referenced in the user's request,  
**Then** the chatmode must specify:
- Read files FULLY without limit/offset parameters first
- Read in main context before spawning sub-tasks
- Read ALL files identified by research or planning documents completely
- Never use placeholder values or partial reads
- Verify understanding before proceeding with work

### FR-9: Research Process Clarity
**As a** Research Agent (Spec or Code),  
**When** conducting research,  
**Then** the chatmode must provide:
- Clear research methodology (Code Location, Code Analysis, Code Pattern Finder)
- Specific search strategies and tools to use
- Document format with YAML frontmatter
- Metadata gathering steps (using `scripts/copilot/spec-metadata.sh` where available)
- GitHub permalink generation when applicable
- Factual, non-evaluative documentation requirements

## Non-Functional Requirements

### Performance
- Chatmode instructions should be concise enough to not exceed context limits when combined with repository code
- Guidance should be specific to avoid requiring excessive clarification rounds
- Research methodologies should be efficient (broad search first, then targeted analysis)

### Usability
- Instructions must be clear and actionable for both AI agents and human readers
- Examples should be concrete and relevant
- Terminology must be consistent across all chatmodes
- Error messages and failure modes must be clearly explained

### Maintainability
- Chatmodes should be structured for easy updates as PAW evolves
- Common patterns should be documented once and referenced
- Changes to PAW specification should require minimal chatmode updates
- Proven patterns should be preserved with clear rationale

### Consistency
- All chatmodes must use the same artifact path conventions
- All chatmodes must use the same branching conventions
- All chatmodes must use the same metadata and frontmatter formats
- All chatmodes must follow the same communication patterns (status updates, coordinator hooks)

## Data/Schema & Compatibility

### Chatmode File Format
Each chatmode file follows this structure:

```markdown
````chatmode
---
description: 'Brief description of the agent role'
---
# Agent Name

[Opening explanation and purpose]

## Start / Initial Response
[What the agent says/does when first invoked]

## [Core Sections - Process Steps, Responsibilities, etc.]
[Detailed instructions organized logically]

## Important Guidelines / Notes
[Critical warnings, best practices, guardrails]

## [Additional Sections as Needed]
[Format specifications, examples, edge cases]
````
```

### Artifact Path Conventions
- Planning artifacts: `/docs/agents/<target_branch>/`
- Research prompts: `/docs/agents/<target_branch>/prompts/`
- All agents must use consistent paths for artifact discovery

### Branch Naming Conventions
- Target branch: User-defined (e.g., `feature/my-feature`)
- Planning branch: `<target_branch>_plan`
- Phase branches: `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>`

### Metadata Requirements
Research and planning documents include YAML frontmatter with:
- `date`: ISO format with timezone
- `git_commit`: Current commit hash
- `branch`: Current branch name
- `repository`: Repository name
- `topic`: Brief description
- `tags`: Relevant keywords
- `status`: Document status
- `last_updated`: Update timestamp

## Acceptance Criteria

### AC-1: All Chatmodes Complete and Aligned
- [ ] All 9 chatmode files contain complete instructions matching PAW specification requirements
- [ ] Each chatmode includes all required sections (Start, Process, Guidelines)
- [ ] Empty chatmodes (PAW-03B, PAW-04, PAW-05) are fully populated
- [ ] All chatmodes reference correct artifact paths and naming conventions
- [ ] All chatmodes align with their stage definition in `paw-specification.md`

### AC-2: Proven Patterns Incorporated
- [ ] All chatmodes include "Important Notes" or "Important Guidelines" sections with critical warnings
- [ ] All chatmodes that read files include explicit instructions to read fully without limit/offset
- [ ] All chatmodes that perform research include step ordering requirements (read → research → synthesize)
- [ ] All chatmodes include strong "DO NOT" guidance where appropriate (based on Human Layer patterns)
- [ ] Research-oriented chatmodes include comprehensive research methodology sections

### AC-3: Spec Research vs Code Research Properly Differentiated
- [ ] Spec Research Agent (PAW-01B) chatmode focuses on behavioral/architectural understanding
- [ ] Spec Research Agent explicitly does NOT require specific code line locations
- [ ] Code Research Agent (PAW-02A) chatmode focuses on implementation details with file:line references
- [ ] Both chatmodes explain their distinct purposes and when to use each
- [ ] SpecResearch.prompt.md and CodeResearch.prompt.md templates differ appropriately

### AC-4: Implementation Agent Split Properly Defined
- [ ] Implementation Agent (PAW-03A) chatmode covers code changes and automated verification
- [ ] Implementation Review Agent (PAW-03B) chatmode covers review, documentation, PR management
- [ ] Both agents handle initial implementation AND review comment response scenarios
- [ ] Handoff between Implementation Agent and Implementation Review Agent is clear
- [ ] Rationale for the split (model-specific strengths) is documented

### AC-5: Consistent Structure Across All Chatmodes
- [ ] All chatmodes use consistent YAML frontmatter format
- [ ] All chatmodes follow similar section organization patterns
- [ ] All chatmodes use consistent terminology for branches, artifacts, and processes
- [ ] All chatmodes use consistent markdown formatting (headers, code blocks, lists)
- [ ] Section naming conventions are similar across chatmodes (e.g., "Important Guidelines")

### AC-6: Clear Agent Handoffs and Interactions
- [ ] Each chatmode documents which artifacts it consumes (with expected paths)
- [ ] Each chatmode documents which artifacts it produces (with naming conventions)
- [ ] Chatmodes specify when to invoke other agents (e.g., Spec Agent → Spec Research Agent)
- [ ] Chatmodes include "Coordinator hooks" or status update requirements
- [ ] Chatmodes explain what to do when blocked or encountering errors

### AC-7: File Reading Best Practices Documented
- [ ] All research and planning chatmodes explicitly require reading files fully first
- [ ] Chatmodes specify to read in main context before sub-tasks
- [ ] Chatmodes prohibit placeholder values in outputs
- [ ] Chatmodes require verification of understanding before proceeding
- [ ] Specific guidance about NOT using limit/offset parameters is included

### AC-8: Research Methodology Detailed
- [ ] Both research agents include Code Location, Code Analysis, and Code Pattern Finder sections
- [ ] Research agents include search strategy guidance
- [ ] Research agents specify document format requirements with YAML frontmatter
- [ ] Research agents include metadata gathering steps
- [ ] Research agents specify when/how to generate GitHub permalinks

### AC-9: No Regressions from Proven Chatmodes
- [ ] All guidance from Code Researcher chatmode is preserved or improved
- [ ] All guidance from Implementer chatmode is preserved or improved
- [ ] Strong directive language about what NOT to do is maintained
- [ ] Important notes about common pitfalls are maintained
- [ ] Step-by-step processes are maintained or enhanced

### AC-10: Human Layer Learnings Preserved
- [ ] Specific guidance about file reading patterns is retained
- [ ] Strong language about agent limitations is retained
- [ ] Instructions about focusing on documentation vs evaluation are retained
- [ ] Communication patterns (status updates, response formats) are retained
- [ ] Guardrails against scope creep and assumption-making are retained

## Risks & Constraints

### Risks
1. **Over-specification**: Chatmode instructions could become too verbose and exceed context limits
2. **Under-specification**: Missing edge case guidance could lead to inconsistent agent behavior
3. **Pattern Dilution**: Propagating patterns incorrectly could lose their effectiveness
4. **Inconsistency Introduction**: Updates could inadvertently create inconsistencies between chatmodes
5. **Lost Guidance**: Valuable Human Layer learnings could be accidentally removed during updates

### Constraints
1. **Existing PAW Specification**: Chatmodes must implement the current PAW spec without changing it
2. **Chatmode Format**: Must follow VS Code/GitHub Copilot `.chatmode.md` format conventions
3. **Backward Compatibility**: Updated chatmodes should work with existing PAW artifacts where possible
4. **Proven Patterns**: Must preserve all valuable guidance from Human Layer-derived chatmodes
5. **No Testing in This Phase**: Validation happens through iterative use after finalization

### Mitigation Strategies
- Use consistent templates and patterns across chatmodes
- Document rationale for key guidance to preserve intent
- Review each chatmode against PAW specification requirements checklist
- Preserve existing proven language verbatim where appropriate
- Use diff review to verify no valuable guidance is lost

## References

- **GitHub Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/1
- **PAW Specification**: `/home/rob/proj/paw/phased-agent-workflow/paw-specification.md`
- **Current Chatmodes**: `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/`
- **Target Branch**: `feature/finalize-initial-chatmodes`
- **Human Layer Origins**: References to Human Layer commands and subagents mentioned in Issue #1
