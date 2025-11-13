---
date: 2025-11-12 20:46:51 EST
git_commit: 3144a9ab15d459c249af6c6699595a974ee97b76
branch: feature/prevent-spec-implementation
repository: phased-agent-workflow
topic: "Preventing Implementation Details in Spec Agent"
tags: [research, codebase, spec-agent, chatmode, guardrails, implementation-prevention]
status: complete
last_updated: 2025-11-12
---

# Research: Preventing Implementation Details in Spec Agent

**Date**: 2025-11-12 20:46:51 EST
**Git Commit**: 3144a9ab15d459c249af6c6699595a974ee97b76
**Branch**: feature/prevent-spec-implementation
**Repository**: phased-agent-workflow

## Research Question

How does the Spec Agent currently behave regarding implementation details? What guardrails exist to prevent code snippets and technical design from being added to specs, especially during iteration?

## Summary

The Spec Agent is defined in `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` and has multiple layers of guidance to avoid implementation details:
- Core principle #1 (line 9): "Focus on user value (WHAT & WHY), not implementation"
- Template prohibitions (line 285): "Prohibited: tech stack specifics, file paths, library names, API signatures"
- Quality checklist items (lines 316, 349) checking for implementation details

**Critical Gap**: While these principles exist, there are NO explicit guardrails in the "Guardrails (Enforced)" section (lines 363-382) using strong directive language (NEVER/DO NOT/CRITICAL) that prevent code snippets or technical design during iteration.

**Real-world evidence**: The problematic spec example (`.paw/work/prevent-spec-implementation/context/problematic-spec-example.md`) created through iteration with the Spec Agent contains TypeScript interfaces, file paths, API calls, and entire "Technical Design" sections - demonstrating that the current guidance is insufficient to prevent implementation detail creep during refinement.

## Detailed Findings

### Current Spec Agent Location and Structure

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

The Spec Agent chatmode is a 408-line file containing:
- Core principles (lines 8-20)
- WorkflowContext.md handling (lines 62-93)
- Workflow mode handling (lines 94-130)
- Responsibilities and workflow steps (lines 132-204)
- Inline specification template (lines 218-285)
- Quality checklist (lines 289-340)
- Hand-off instructions (lines 398-408)

### Current Guidance on Implementation Details

**Lines 8-20: Core Specification Principles**

The agent has 10 core principles, with principle #1 explicitly stating:
```
1. Focus on user value (WHAT & WHY), not implementation (no tech stack, file paths, library names).
```

**Line 143: Explicit Non-Responsibilities**

Under "Explicit Non‑Responsibilities":
```
- No implementation detail exploration beyond what's required to phrase **behavioral requirements**.
```

**Line 285: Template Prohibitions**

At the end of the inline template:
```
Prohibited: tech stack specifics, file paths, library names, API signatures (those belong to planning / implementation phases).
```

**Line 316: Quality Checklist Content Quality**

Quality validation includes:
```
- [ ] Focuses on WHAT & WHY (no implementation details)
```

**Line 349: Quality Bar for Final Spec**

Final quality criteria includes:
```
- Language free of implementation detail (no stack, frameworks, DB brands, file paths).
```

### Gap: No Explicit Iteration Guardrails

**Observation**: While the chatmode has strong guidance against implementation details during initial spec creation, there are no explicit guardrails that say:
- "NEVER add code snippets during spec refinement"
- "DO NOT include technical design decisions when iterating"
- "CRITICAL: Even during iteration, maintain focus on behavior not implementation"

The guardrails section (lines 363-382) focuses on other aspects:
- Not fabricating answers
- Not assuming external standards
- Not proceeding with unanswered critical questions
- Always differentiating requirements from acceptance criteria

But there is no explicit "NEVER include code/implementation during iteration" directive.

### Current Spec Template Structure

**Lines 218-285: Inline Specification Template**

The current template structure is:

```markdown
# Feature Specification: <FEATURE NAME>

**Branch**: <feature-branch>  |  **Created**: <YYYY-MM-DD>  |  **Status**: Draft
**Input Brief**: <one-line distilled intent>

## User Scenarios & Testing
### User Story P1 – <Title>
### User Story P2 – <Title>
### Additional Stories (P3+ as needed)
### Edge Cases

## Requirements
### Functional Requirements
### Key Entities (omit if none)
### Cross-Cutting / Non-Functional (omit if all in Success Criteria)

## Success Criteria

## Assumptions

## Scope
In Scope:
Out of Scope:

## Dependencies

## Risks & Mitigations

## References

## Glossary (omit if not needed)
```

**Key Observation**: The template starts directly with "User Scenarios & Testing" after the header metadata. There is no narrative/overview section before diving into user stories.

### Example Spec Documents Analysis

**Files Analyzed**:
- `docs/agents/feature/finalize-initial-chatmodes/Spec.md`
- `docs/agents/feature/param-doc/Spec.md`

**Finding**: Both example specs follow the current template and are purely behavioral:
- No code snippets or implementation details
- Describe WHAT the system should do without HOW to implement it
- Successfully maintain separation between behavioral requirements and implementation

These demonstrate that the current template CAN produce good behavioral specs when the agent follows the existing guidance.

## Code References

- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:9` - Core principle prohibiting implementation details
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:143` - Explicit non-responsibilities 
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:218-285` - Inline specification template
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:285` - Template prohibitions statement
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:316` - Quality checklist content quality item
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:349` - Final quality bar criteria
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:363-382` - Guardrails section
- `docs/agents/feature/finalize-initial-chatmodes/Spec.md` - Example spec following template
- `docs/agents/feature/param-doc/Spec.md` - Example spec following template

## Architecture Documentation

### Spec Agent Workflow

The Spec Agent follows this documented workflow (lines 156-204):

1. **Intake & Decomposition**: Read issue/brief + constraints
2. **User Story Drafting**: Derive prioritized user stories with acceptance scenarios
3. **Unknown Classification**: Apply defaults, create clarification questions, or generate research questions
4. **Research Prompt Generation**: Create research prompt file
5. **Pause & Instruct**: Wait for research results
6. **Integrate Research**: Map research answers to spec
7. **Specification Assembly**: Build full spec incrementally
8. **Quality Checklist Pass**: Validate against checklist
9. **Finalize & Hand-Off**: Present readiness checklist

### Current Anti-Implementation Mechanisms

The agent has multiple layers preventing implementation details:

1. **Principles Layer** (line 9): Core principle statement
2. **Responsibilities Layer** (line 143): Explicit exclusion from responsibilities
3. **Template Layer** (line 285): Prohibition list in template
4. **Quality Validation Layer** (line 316, 349): Checklist items checking for implementation details
5. **Hand-off Requirements** (line 398-408): Quality checklist must pass before hand-off

**Missing Layer**: No explicit guardrails in the "Guardrails (Enforced)" section (lines 363-382) that use strong directive language like "NEVER include code snippets" or "DO NOT add technical design during iteration".

## Code References

**File**: `.paw/work/prevent-spec-implementation/context/problematic-spec-example.md`

This spec was created through multiple iterations with the Spec Agent and demonstrates exactly the implementation detail creep mentioned in issue #57.

### Implementation Details Found

**1. TypeScript Code Snippets (lines 47-73)**

The spec includes a complete TypeScript interface definition:

```typescript
interface StagedFlexProfile {
    stagingId: string;
    deploymentName: string;
    connectionProfile: Partial<IConnectionDialogProfile>;
    status: 'pending' | 'deploying' | 'succeeded' | 'failed';
    // ... full interface with 15+ properties
}
```

**Violation**: This is implementation code that belongs in planning/implementation phases, not a behavioral specification.

**2. Another TypeScript Interface (lines 129-146)**

```typescript
interface IFlexDeploymentTracker {
    startPolling(): void;
    stopPolling(): void;
    checkDeploymentStatus(stagingId: string): Promise<void>;
    getStagedProfiles(): Promise<StagedFlexProfile[]>;
}
```

**Violation**: Service interfaces and method signatures are technical design, not behavioral requirements.

**3. File Paths and Module Names (lines 324-344)**

The "Technical Design" section includes:
- `src/services/flexDeployment/flexDeploymentTracker.ts`
- `src/sharedInterfaces/flexDeployment.ts`
- `src/services/flexDeployment/azureCredentialProvider.ts`
- `src/controllers/mainController.ts`
- `src/controllers/flexCreateWebviewController.ts`

**Violation**: File paths and directory structure are implementation decisions, prohibited by line 285 of the Spec Agent chatmode.

**4. API/Class Names and Method Calls (throughout)**

Examples:
- Line 32: `CreateServerRequest.subscriptionId` (API structure)
- Line 115: `ResourceManagementClient.deployments.get(resourceGroupName, deploymentName)` (API call)
- Line 186: `globalState` (VS Code API)
- Line 188: `connectionStore.saveProfile()` (method call)
- Line 228: `connectionStore.saveProfilePasswordIfNeeded()` (method call)
- Line 245: `ReactWebviewPanelController.showRestorePromptAfterClose` (class property)
- Line 289: `vscode.commands.executeCommand('pgsql.showServerDashboard', treeNodeInfo)` (API call)

**Violation**: These are all implementation-level API references that belong in code documentation, not behavioral specs.

**5. Implementation Data Structures (lines 29-42)**

Detailed field mappings with implementation property names:
- `server: {serverName}.postgres.database.azure.com`
- `profileName: Server name from form`
- `authenticationType: Derived from authentication mode`
- `azureResourceId: Placeholder, populated after deployment`

**Violation**: While describing WHAT data is needed is appropriate, specifying exact property names and data structure shapes is implementation detail.

**6. Technical Design Section (lines 322-351)**

An entire "Technical Design" section listing:
- "New Components" with file paths
- "Modified Components" with file paths
- Component responsibilities at code level

**Violation**: This entire section is implementation planning, not behavioral specification. Should be in the Implementation Plan, not the Spec.

**7. Detailed Data Flow Diagrams (lines 353-421)**

Step-by-step technical flows with numbered implementation steps:
- "FlexCreateWebviewController stages profile in globalState"
- "FlexCreateWebviewController calls FlexServerProvisioner.create()"
- "Update staged profile status to 'deploying'"

**Violation**: These are implementation sequences, not user-facing behavioral flows.

### What Should Have Been Behavioral

Examples of how these requirements could have been expressed behaviorally:

**Instead of**:
```typescript
interface StagedFlexProfile {
    status: 'pending' | 'deploying' | 'succeeded' | 'failed';
}
```

**Should be**:
"The system must track deployment state through the following stages: pending (initiated but not yet started), deploying (in progress), succeeded (completed successfully), and failed (encountered error)."

**Instead of**:
"Call `connectionStore.saveProfile()` with complete profile data"

**Should be**:
"The system must persist the connection profile with all required metadata for future use."

**Instead of**:
"File: `src/services/flexDeployment/flexDeploymentTracker.ts`"

**Should be**:
"A background service must monitor deployment status and update state accordingly."

### Pattern of Implementation Creep

The spec shows a clear progression from behavioral (early sections) to implementation-focused (later sections):

1. **Overview section**: Mostly behavioral ✓
2. **Objectives section**: Behavioral ✓
3. **Requirements 1-5**: Mix of behavioral and implementation details ⚠️
4. **Requirements 6-10**: Heavy implementation detail ✗
5. **Technical Design section**: Pure implementation ✗
6. **Data Flow section**: Pure implementation ✗

This suggests the implementation detail crept in during iteration as the developer and agent refined the spec together, with the agent increasingly providing technical guidance that belongs in planning/implementation phases.

## Recommendations for Implementation

Based on the research findings, the following changes are recommended for issue #57:

### 1. Add Strong Guardrails to Guardrails Section

Insert new guardrails in `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` lines 363-382:

**Guardrails to add**:
- NEVER include code snippets, interfaces, class definitions, or type definitions in specs (not even as examples)
- DO NOT specify file paths, directory structure, or module organization
- DO NOT reference API methods, class names, framework-specific calls, or library names
- CRITICAL: During iteration and refinement, maintain focus on WHAT the system does and WHY, never HOW to implement it
- DO NOT create "Technical Design", "Implementation Details", or technical "Data Flow" sections in specs
- ALWAYS describe behavior and requirements in natural language, avoiding all code and technical jargon
- IF the user asks for implementation details, redirect them: "Implementation details belong in the Implementation Plan (Stage 02). The spec focuses on behavioral requirements."

### 2. Strengthen Quality Checklist

Add to the quality checklist (around line 316):
- [ ] No code snippets or interface definitions (TypeScript, Python, etc.)
- [ ] No file paths or module structure references
- [ ] No API/method call examples or technical references
- [ ] No "Technical Design" or implementation-focused sections

### 3. Add Warning to Communication Patterns

In the "Communication Patterns" section (around line 356), add:
- When user requests implementation details during iteration, respond: "That level of detail belongs in the Implementation Plan. Let's keep the spec focused on what the system should do from a user perspective."

## Related Work

- **Issue #80**: Addresses adding narrative/overview section to spec template (separate from this implementation detail prevention work)
- **Note**: The narrative section work was split out because it requires more research and design work around template structure
