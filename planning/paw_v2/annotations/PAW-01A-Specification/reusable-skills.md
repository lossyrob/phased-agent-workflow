# PAW-01A Specification Agent - Reusable Skills Catalog

This catalog extracts skills from the PAW-01A Specification Agent that are potentially reusable across other agents or contexts.

## Skills Identified

### 1. Clarification Resolution Pattern
**Scope**: `reusable`
**Location**: Core Principles #3, Drafting Workflow step 3

**Description**: Blocking pattern that prevents proceeding with unresolved critical questions.

**Behavior**:
- Identify questions that block progress
- Classify by impact (high-impact → block, low-impact → assumption)
- Never proceed with placeholder markers for critical unknowns
- Resolve via user dialogue before continuing

**Applicability**: Any agent that must make decisions based on user requirements.

---

### 2. Assumption Documentation Pattern
**Scope**: `reusable`  
**Location**: Core Principles #6, Unknown Classification

**Description**: Replace low-impact unknowns with explicit documented assumptions rather than clarification markers.

**Behavior**:
- Apply reasonable defaults from industry patterns
- Document assumption AND rationale
- Keep in dedicated Assumptions section
- Never silently embed in prose

**Applicability**: Any agent producing specifications or plans with uncertainty.

---

### 3. No Fabrication Guardrail
**Scope**: `reusable`
**Location**: Guardrails (Enforced)

**Description**: Never fabricate answers not supported by inputs.

**Behavior**:
- Only use information from: Issue, Research artifacts, User inputs
- When uncertain, acknowledge uncertainty
- Surface gaps rather than filling with guesses

**Applicability**: Universal to all agents.

---

### 4. No Speculation Guardrail  
**Scope**: `reusable`
**Location**: Core Principles #9

**Description**: Every feature must map to a defined story—no "future maybe" items.

**Behavior**:
- Reject scope creep
- Require explicit user stories for all features
- Do not add speculative functionality

**Applicability**: Planning, implementation, and documentation agents.

---

### 5. Implementation Detail Transformation
**Scope**: `reusable`
**Location**: Communication Patterns

**Description**: Transform technical discussions into behavioral descriptions.

**Behavior**:
- Use implementation insights to inform requirements
- Never embed code, file paths, technical design in output
- Transform: "`FlexDeploymentTracker` class" → "service that monitors deployment status"
- If user explicitly requests technical details, comply with guidance

**Applicability**: Specification, planning, documentation agents.

---

### 6. Discrepancy Resolution Pattern
**Scope**: `reusable`
**Location**: Error / Edge Handling

**Description**: Structured notification when sources conflict.

**Format**:
```
Discrepancy Detected:
Issue states: ...
Research shows: ...
Impact: ...
How should we reconcile?
```

**Behavior**:
- Detect conflicts between information sources
- Present both sides clearly
- State impact
- Ask for resolution

**Applicability**: Any agent integrating multiple information sources.

---

### 7. Incremental Writing Pattern
**Scope**: `reusable`
**Location**: Communication Patterns, Workflow step 6

**Description**: Build documents incrementally, write sections to disk as created.

**Behavior**:
- Write sections to file as they're completed
- Present only summaries or excerpts in chat
- Don't dump large content blocks in conversation

**Applicability**: Any agent producing substantial documents.

---

### 8. User Autonomy Respect
**Scope**: `reusable`
**Location**: Guardrails (Enforced)

**Description**: If user explicitly requests something outside guidelines, comply while offering guidance.

**Behavior**:
- Respect user decisions
- Comply with explicit requests
- Offer gentle guidance about typical practice
- Note what was done differently if overriding defaults

**Applicability**: Universal to all agents.

---

### 9. Minimal Diff Updates
**Scope**: `reusable`
**Location**: Guardrails (Enforced)

**Description**: When updating artifacts, modify only impacted sections.

**Behavior**:
- Identify specific sections needing change
- Preserve unchanged content
- Minimize diff footprint

**Applicability**: Any agent that edits existing files.

---

### 10. Issue/PR MCP Interaction Pattern
**Scope**: `reusable`
**Location**: Working with Issues and PRs

**Description**: Standard approach for interacting with work items.

**Behavior**:
- Use MCP tools (not CLI or direct fetch)
- Retrieve body AND all comments
- Platform-specific: github mcp, azuredevops mcp

**Applicability**: Any agent reading from or writing to work items.

---

### 11. Unknown Classification Logic
**Scope**: `reusable`
**Location**: Drafting Workflow step 3

**Description**: Framework for categorizing uncertainties.

**Categories**:
1. **Low-impact** → Document as assumption with rationale
2. **High-impact without defensible default** → Clarification question (block)
3. **Fact gap** → Research question
4. **Design decision** → Make directly, document choice

**Decision criteria**:
- Security/privacy → high-impact
- Compliance → high-impact  
- User experience (significant) → high-impact
- Scope definition → high-impact
- File names, structure, conventions → design decision (make it)

**Applicability**: Any agent doing analysis or planning with unknowns.

---

## Extraction Recommendations

| Skill | Priority | Effort | Notes |
|-------|----------|--------|-------|
| No Fabrication | High | Low | Universal, simple rule |
| Clarification Resolution | High | Medium | Pattern with blocking behavior |
| Assumption Documentation | High | Medium | Includes classification logic |
| Incremental Writing | Medium | Low | Simple behavioral pattern |
| Discrepancy Resolution | Medium | Low | Template-based |
| User Autonomy | Medium | Low | Behavioral guideline |
| Unknown Classification | Medium | High | Complex decision tree |
| Implementation Transformation | Low | Medium | Context-dependent |
| Minimal Diff Updates | Low | Low | Best practice |
| MCP Interaction | Low | Low | Platform-specific pattern |
