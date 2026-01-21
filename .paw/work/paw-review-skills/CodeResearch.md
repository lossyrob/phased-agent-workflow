---
date: 2026-01-15T22:03:40-05:00
git_commit: 5a4646969b34fe0dfbe87a6f878531d9f512d08e
branch: feature/paw-review-skills
repository: phased-agent-workflow
topic: "Implementation Research for PAW Review Skills Migration"
tags: [research, codebase, tools, skills, review-workflow, installer, prompt-annotation]
status: complete
last_updated: 2026-01-15
last_updated_note: "Added detailed fragmentation analysis from generated visualization summaries"
---

# Research: Implementation Research for PAW Review Skills Migration

**Date**: 2026-01-15 22:03:40 EST
**Git Commit**: 5a4646969b34fe0dfbe87a6f878531d9f512d08e
**Branch**: feature/paw-review-skills
**Repository**: phased-agent-workflow

## Research Question

Document the codebase implementation details needed to:
1. Implement `paw_get_skills` and `paw_get_skill` tools
2. Install prompt files alongside agent files
3. Bundle skills in the extension's `skills/` directory
4. Understand the current review agents and their consolidation path

## Summary

The PAW extension infrastructure provides clear patterns for implementing the skills-based review workflow. The existing tools (`paw_get_context`, `paw_call_agent`, `paw_generate_prompt`) in [src/tools/](src/tools/) demonstrate tool registration patterns with VS Code's Language Model API. The installer ([src/agents/installer.ts](src/agents/installer.ts)) handles agent file installation but requires extension for prompt file support. Current review agents (PAW-R1A through PAW-R3B) use component templates and follow structured handoff patterns. The `skills/` directory will parallel the existing `agents/` directory structure for bundling.

## Detailed Findings

### 1. Tool Implementation Patterns

#### Tool Registration

Tools are registered with VS Code's Language Model API in [src/extension.ts](src/extension.ts#L32-L62):

```typescript
// src/extension.ts:47-52
registerContextTool(context);
outputChannel.appendLine('[INFO] Registered language model tool: paw_get_context');

registerHandoffTool(context, outputChannel);
outputChannel.appendLine('[INFO] Registered language model tool: paw_call_agent');

registerPromptGenerationTool(context);
outputChannel.appendLine('[INFO] Registered language model tool: paw_generate_prompt');
```

Each tool follows the same pattern:
1. Export a `registerXxxTool(context: vscode.ExtensionContext, ...)` function
2. Call `vscode.lm.registerTool<TParams>(toolName, handler)` inside
3. Push registration to `context.subscriptions` for cleanup

#### Tool Handler Structure

Tools implement `prepareInvocation` and `invoke` methods. Example from [src/tools/contextTool.ts](src/tools/contextTool.ts#L443-L494):

```typescript
// src/tools/contextTool.ts:443-455
export function registerContextTool(context: vscode.ExtensionContext): void {
  const tool = vscode.lm.registerTool<ContextParams>(
    'paw_get_context',
    {
      async prepareInvocation(options, _token) {
        // Return confirmation message for user approval
      },
      async invoke(options, token) {
        // Actual tool logic; return LanguageModelToolResult
      }
    }
  );
  context.subscriptions.push(tool);
}
```

#### Tool Schema Declaration

Tool schemas are declared in [package.json](package.json#L52-L139). Key fields:
- `name`: Internal tool identifier (e.g., `paw_get_context`)
- `displayName`: Human-readable name
- `modelDescription`: Description for LLM tool selection
- `inputSchema`: JSON Schema for parameters

Example for `paw_get_skills` and `paw_get_skill`:
```json
// Would be added to package.json:languageModelTools array
{
  "name": "paw_get_skills",
  "displayName": "Get PAW Skills Catalog",
  "modelDescription": "...",
  "inputSchema": { "type": "object", "properties": {}, "required": [] }
},
{
  "name": "paw_get_skill",
  "displayName": "Get PAW Skill Content",
  "modelDescription": "...",
  "inputSchema": {
    "type": "object",
    "properties": { "skill_name": { "type": "string" } },
    "required": ["skill_name"]
  }
}
```

### 2. Extension Resource Loading

#### URI-Based Resource Access

Extension files are accessed using `vscode.Uri.joinPath(extensionUri, ...)`. Pattern from [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts#L27-38):

```typescript
// src/agents/agentTemplates.ts:27-38
function ensureAgentsDirectory(extensionUri: vscode.Uri): string {
  const agentsUri = vscode.Uri.joinPath(extensionUri, 'agents');
  const agentsPath = agentsUri.fsPath;

  if (!fs.existsSync(agentsPath)) {
    throw new Error(`Agents directory not found at ${agentsPath}`);
  }

  return agentsPath;
}
```

For skills, create analogous `ensureSkillsDirectory()`:
```typescript
function ensureSkillsDirectory(extensionUri: vscode.Uri): string {
  const skillsUri = vscode.Uri.joinPath(extensionUri, 'skills');
  const skillsPath = skillsUri.fsPath;
  // Similar validation...
  return skillsPath;
}
```

#### YAML Frontmatter Parsing

The codebase has a simple YAML frontmatter parser in [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts#L41-75):

```typescript
// src/agents/agentTemplates.ts:41-75
function extractFrontmatterDescription(content: string): string {
  if (!content.startsWith('---')) {
    return '';
  }

  const closingIndex = content.indexOf('\n---', 3);
  if (closingIndex === -1) {
    return '';
  }

  const frontmatter = content.substring(3, closingIndex).trim();
  const lines = frontmatter.split(/\r?\n/);
  for (const line of lines) {
    const [rawKey, ...rawValue] = line.split(':');
    // Parse key: value pairs...
  }
}
```

For skills, extend this to parse the Agent Skills specification fields:
- `name` (required)
- `description` (required)
- `metadata` (optional, including `type: workflow` or `type: activity`)
- `license`, `compatibility`, `allowed-tools` (optional)

### 3. Agent Installer Analysis

#### Current Installation Flow

The installer in [src/agents/installer.ts](src/agents/installer.ts#L252-355) performs these steps:

1. **Determine prompts directory** ([installer.ts:69-77](src/agents/installer.ts#L69-77)):
   - Check custom path from `paw.promptDirectory` config
   - Use platform detection for default path

2. **Check if installation needed** ([installer.ts:93-124](src/agents/installer.ts#L93-124)):
   - Compare versions (development always reinstalls)
   - Verify all expected files exist

3. **Cleanup previous installation** ([installer.ts:185-241](src/agents/installer.ts#L185-241)):
   - Delete previously installed files tracked in state
   - Handle version changes gracefully

4. **Load and install templates** ([installer.ts:321-354](src/agents/installer.ts#L321-354)):
   - Load from `agents/` directory
   - Process component expansions
   - Write to prompts directory

#### File Loading Pattern

Agent templates loaded via [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts#L119-166):

```typescript
// src/agents/agentTemplates.ts:119-166
export function loadAgentTemplates(extensionUri: vscode.Uri): AgentTemplate[] {
  const agentsPath = ensureAgentsDirectory(extensionUri);
  const agentFiles = fs.readdirSync(agentsPath);
  const componentsDir = vscode.Uri.joinPath(extensionUri, 'agents', 'components').fsPath;
  const components = loadComponentTemplatesFromDirectory(componentsDir);
  
  for (const file of agentFiles) {
    if (!file.toLowerCase().endsWith('.agent.md')) {
      continue;  // Only process .agent.md files
    }
    // Load, parse frontmatter, process components...
  }
}
```

#### Extending for Prompt Files

To add prompt file installation, add a parallel loader:

```typescript
// Proposed: src/agents/promptTemplates.ts
export interface PromptTemplate {
  filename: string;      // e.g., 'paw-review.prompt.md'
  mode: string;          // Agent to invoke
  content: string;       // Full file content
}

export function loadPromptTemplates(extensionUri: vscode.Uri): PromptTemplate[] {
  // Load from 'prompts/' directory in extension
  // Parse frontmatter for 'agent' field
  // Return array of templates for installation
}
```

Modify installer to call both `loadAgentTemplates()` and `loadPromptTemplates()`, install both to prompts directory.

#### InstallationState Structure

Installation state tracked in [src/agents/installer.ts](src/agents/installer.ts#L26-41):

```typescript
// src/agents/installer.ts:26-41
export interface InstallationState {
  version: string;
  filesInstalled: string[];  // Would include both agents and prompts
  installedAt: string;
  success: boolean;
  previousVersion?: string;
  filesDeleted?: number;
}
```

No changes needed to state structure - `filesInstalled` array can track both agent and prompt files.

### 4. Review Agents Structure

#### Current Review Agents

Six review agents exist in [agents/](agents/):
- `PAW-R1A Understanding.agent.md` (623 lines) - Creates ReviewContext.md, DerivedSpec.md
- `PAW-R1B Baseline Researcher.agent.md` - Creates CodeResearch.md
- `PAW-R2A Impact Analyzer.agent.md` - Creates ImpactAnalysis.md
- `PAW-R2B Gap Analyzer.agent.md` - Creates GapAnalysis.md
- `PAW-R3A Feedback Generator.agent.md` (445 lines) - Creates ReviewComments.md, GitHub pending review
- `PAW-R3B Feedback Critic.agent.md` - Adds assessment sections to ReviewComments.md

#### Review Workflow Sequence

From [paw-review-specification.md](paw-review-specification.md#L1-50):

```
R1A → R1B → R1A (resume) → R2A → R2B → R3A → R3B
```

Key pattern: R1A pauses for R1B baseline research, then resumes to create DerivedSpec.md.

#### Artifact Flow

Artifacts stored in `.paw/reviews/<identifier>/`:

| Stage | Agent | Artifact Created |
|-------|-------|------------------|
| Understanding | R1A | ReviewContext.md, prompts/01B-code-research.prompt.md |
| Baseline Research | R1B | CodeResearch.md |
| Understanding (resume) | R1A | DerivedSpec.md |
| Impact Analysis | R2A | ImpactAnalysis.md |
| Gap Analysis | R2B | GapAnalysis.md |
| Feedback Generation | R3A | ReviewComments.md + GitHub pending review |
| Feedback Critique | R3B | Assessment sections added to ReviewComments.md |

#### GitHub Integration in R3A

The Feedback Generator uses GitHub MCP tools for pending review creation. From [agents/PAW-R3A Feedback Generator.agent.md](agents/PAW-R3A%20Feedback%20Generator.agent.md#L130-150):

```markdown
**Steps:**
1. Use `mcp_github_pull_request_review_write` with method `create` and event omitted (creates pending review)
2. For **EVERY** comment, use `mcp_github_add_comment_to_pending_review` with:
   - File path
   - Line number (or start_line/end_line for multi-line)
   - Comment text (description + suggestion ONLY)
   - Side: RIGHT (for new code)
```

This logic will be preserved in the `paw-review-feedback` activity skill.

### 5. Component Template System

#### Component Loading

Components loaded from [agents/components/](agents/components/) directory. From [src/agents/agentTemplateRenderer.ts](src/agents/agentTemplateRenderer.ts#L8-32):

```typescript
// src/agents/agentTemplateRenderer.ts:8-32
export function loadComponentTemplatesFromDirectory(
  componentsDir: string
): Map<string, string> {
  const components = new Map<string, string>();
  
  const componentFiles = fs.readdirSync(componentsDir);
  for (const file of componentFiles) {
    if (!file.toLowerCase().endsWith('.component.md')) {
      continue;
    }
    
    const componentName = file
      .replace(/\.component\.md$/i, '')
      .replace(/-/g, '_')
      .toUpperCase();  // e.g., handoff-instructions.component.md → HANDOFF_INSTRUCTIONS
    
    components.set(componentName, fs.readFileSync(componentPath, 'utf-8'));
  }
}
```

#### Variable Substitution

Components support `{{VARIABLE}}` substitution. From [src/agents/agentTemplateRenderer.ts](src/agents/agentTemplateRenderer.ts#L37-47):

```typescript
// src/agents/agentTemplateRenderer.ts:37-47
function substituteVariables(content: string, variables: Map<string, string>): string {
  let result = content;
  for (const [key, value] of variables.entries()) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }
  return result;
}
```

Currently only `{{AGENT_NAME}}` is used. Skills may not need component system initially (each SKILL.md is self-contained).

#### Existing Components

Three components in [agents/components/](agents/components/):
- `paw-context.component.md` - Context retrieval instructions
- `handoff-instructions.component.md` - Implementation workflow handoff
- `review-handoff-instructions.component.md` - Review workflow handoff

### 6. Skills Directory Structure

#### Proposed Location

Skills will be stored at repository root in `skills/` directory, parallel to `agents/`:

```
skills/
├── paw-review-workflow/
│   └── SKILL.md
├── paw-review-understanding/
│   └── SKILL.md
├── paw-review-baseline/
│   └── SKILL.md
├── paw-review-impact/
│   └── SKILL.md
├── paw-review-gap/
│   └── SKILL.md
├── paw-review-feedback/
│   └── SKILL.md
└── paw-review-critic/
    └── SKILL.md
```

#### Extension Bundling

Following the existing `agents/` pattern, add to `package.json` files array (if present) or rely on default VSIX bundling. Currently no explicit `files` field exists - bundling includes all non-gitignored files.

#### Skill Metadata Schema

Per Agent Skills specification and SpecResearch.md:

```yaml
---
name: paw-review-workflow
description: Orchestrates the PAW Review workflow, running activity skills as subagents
metadata:
  type: workflow
  version: "1.0"
---
```

Required fields: `name`, `description`
Optional fields: `license`, `compatibility`, `metadata`, `allowed-tools`

### 7. Prompt File Installation

#### Entry Point Pattern

The user entry point will be a prompt file `paw-review.prompt.md` (or `paw-review-pr.prompt.md`). Following prompt file conventions:

```markdown
---
agent: PAW Review
---

Review the specified pull request.

PR: $ARGUMENTS
```

#### Installation Location

Prompt files install to same directory as agents (platform prompts directory from [src/agents/platformDetection.ts](src/agents/platformDetection.ts)):

| Platform | Path |
|----------|------|
| Linux | `~/.vscode/prompts/` |
| macOS | `~/Library/Application Support/Code/User/prompts/` |
| Windows | `%APPDATA%/Code/User/prompts/` |

Override via `paw.promptDirectory` config.

### 8. PAW Review Agent Design

#### Single Agent Approach

The single PAW Review agent replaces 6 PAW-R* agents. Key responsibilities:
1. Load workflow skill via `paw_get_skill('paw-review-workflow')`
2. Follow workflow skill instructions for orchestration
3. Execute activity skills via `runSubagent`
4. Handle cross-repo detection and skill selection

#### Subagent Contract

From SpecResearch.md and planning documents:
- Subagents write artifacts directly
- Parent receives file path confirmation
- Response format: artifact path + summary + status

Expected subagent response:
```
Activity complete.
Artifact saved: .paw/reviews/PR-123/ImpactAnalysis.md
Status: Success
```

#### Workflow Skill Orchestration

The workflow skill will instruct the PAW Review agent on sequencing:

```markdown
## Workflow Steps

1. Load paw-review-understanding skill
2. Run as subagent: "Execute understanding phase"
3. Wait for ReviewContext.md and CodeResearch prompt
4. Load paw-review-baseline skill  
5. Run as subagent: "Execute baseline research"
6. Resume understanding (R1A pattern)
7. [Continue through all phases...]
```

## Code References

### Tool Infrastructure
- [src/extension.ts](src/extension.ts#L32-62) - Tool registration in activation
- [src/tools/contextTool.ts](src/tools/contextTool.ts#L1-494) - Complete context tool implementation
- [src/tools/handoffTool.ts](src/tools/handoffTool.ts#L1-163) - Agent handoff tool
- [src/tools/promptGenerationTool.ts](src/tools/promptGenerationTool.ts#L1-200) - Prompt generation tool
- [package.json](package.json#L52-139) - Tool schema declarations

### Agent System
- [src/agents/installer.ts](src/agents/installer.ts#L1-467) - Agent installation logic
- [src/agents/agentTemplates.ts](src/agents/agentTemplates.ts#L1-166) - Template loading
- [src/agents/agentTemplateRenderer.ts](src/agents/agentTemplateRenderer.ts#L1-73) - Component expansion
- [src/agents/platformDetection.ts](src/agents/platformDetection.ts) - Prompts directory resolution

### Review Agents
- [agents/PAW-R1A Understanding.agent.md](agents/PAW-R1A%20Understanding.agent.md#L1-623) - Understanding agent
- [agents/PAW-R3A Feedback Generator.agent.md](agents/PAW-R3A%20Feedback%20Generator.agent.md#L1-445) - Feedback generation
- [agents/components/review-handoff-instructions.component.md](agents/components/review-handoff-instructions.component.md#L1-100) - Review handoff component

### Specification
- [paw-review-specification.md](paw-review-specification.md#L1-150) - Review workflow spec
- [Spec.md](.paw/work/paw-review-skills/Spec.md) - Feature specification
- [SpecResearch.md](.paw/work/paw-review-skills/SpecResearch.md) - Specification research

## Architecture Documentation

### Existing Patterns to Follow

1. **Tool Registration**: Use `vscode.lm.registerTool<TParams>()` with `prepareInvocation` and `invoke` handlers
2. **Resource Access**: Use `vscode.Uri.joinPath(extensionUri, 'skills')` for extension-bundled skills
3. **Schema Declaration**: Add tool schemas to `package.json` `languageModelTools` array
4. **Installation Tracking**: Reuse existing `InstallationState` structure for tracking installed files
5. **Frontmatter Parsing**: Extend existing YAML parser for skill-specific fields

### New Patterns to Establish

1. **Skill Catalog**: `paw_get_skills` returns lightweight metadata (~100 tokens per skill)
2. **Skill Content**: `paw_get_skill` returns full SKILL.md content on demand
3. **Prompt File Installation**: Extend installer to handle `.prompt.md` files from new `prompts/` directory
4. **Single Review Agent**: PAW Review agent loads skills dynamically rather than hardcoding logic

### Integration Points

1. **Extension Activation**: Register `paw_get_skills` and `paw_get_skill` in [src/extension.ts](src/extension.ts#L32)
2. **Installer Extension**: Add prompt file loading to [src/agents/installer.ts](src/agents/installer.ts#L252)
3. **Package.json**: Add new tool schemas and potentially update `files` for VSIX bundling
4. **Agent Files**: Create single `PAW Review.agent.md` that uses skill tools; remove PAW-R* agents

## Prompt Annotation Analysis

A comprehensive structural analysis of all 6 PAW-R* review agents was performed using the prompt-annotation skill taxonomy. 

**Generated Artifacts:**
- Annotated agents: [context/annotations/](context/annotations/) (PAW-R1A through R3B annotated.md files)
- Visualization directories: `R1A-viz/` through `R3B-viz/` (each contains mindmap, markmap, flow diagram, summary YAML)
- Analysis summary: [context/agent-annotations.md](context/agent-annotations.md)

### Scope Classification Summary (from Visualization Summaries)

| Scope | Elements | % of Content | Description |
|-------|----------|--------------|-------------|
| **Reusable** | ~52 | ~35% | Can be extracted to shared skills or patterns |
| **Phase-bound** | ~49 | ~50% | Specific to each activity skill |
| **Workflow** | ~11 | ~15% | Orchestration, handoffs, stage gates |

### High-Value Reusable Content

The following patterns appear across multiple agents and should be extracted for reuse:

1. **Evidence-Based Review Principles** (~500 tokens)
   - File:line reference requirement (R1A, R1B, R2B, R3A)
   - No fabrication guardrail (R1A, R1B)
   - Evidence before claims pattern

2. **Must/Should/Could Categorization Framework** (~800 tokens)
   - Full classification logic from [PAW-R2B Gap Analyzer.agent.md](agents/PAW-R2B%20Gap%20Analyzer.agent.md#L300-400)
   - Categorization rules with concrete impact requirements
   - Non-inflation guidelines

3. **Rationale Structure Template** (~300 tokens)
   - Four-component pattern: Evidence → Baseline Pattern → Impact → Best Practice
   - From [PAW-R3A Feedback Generator.agent.md](agents/PAW-R3A%20Feedback%20Generator.agent.md#L90-130)

4. **Usefulness Assessment Framework** (~600 tokens)
   - High/Medium/Low calibration from [PAW-R3B Feedback Critic.agent.md](agents/PAW-R3B%20Feedback%20Critic.agent.md#L80-150)
   - Accuracy validation checklist
   - Trade-off analysis pattern

### Structural Elements by Agent (from Generated Summaries)

| Agent | Lines | Guardrails | Workflow Steps | Decision Frameworks | Quality Gates | Reusable | Phase-Bound | Workflow |
|-------|-------|------------|----------------|---------------------|---------------|----------|-------------|----------|
| PAW-R1A | 623 | 13 | 4 | 3 | 4 | 10 | 14 | 4 |
| PAW-R1B | 357 | 8 | 10 | 1 | 0 | 5 | 3 | 1 |
| PAW-R2A | 477 | 5 | 9 | 7 | 1 | 8 | varies | 2 |
| PAW-R2B | 634 | 4 | 9 | 3 | 1 | 9 | 9 | 2 |
| PAW-R3A | 445 | 8 | 6 | 2 | 1 | 7 | varies | 1 |
| PAW-R3B | 400 | 7 | 3 | 8 | 1 | 13 | varies | 1 |

### Fragmentation Analysis (from YAML Summaries)

**Per-Agent Fragmentation Detected:**

| Agent | Fragmented Tags | Sections Affected |
|-------|-----------------|-------------------|
| R1A | `<guardrail>` | Core Principles, Non-Responsibilities, Enforced Guardrails, Handoff (4 sections) |
| R1A | `<communication-pattern>` | 4 sections |
| R1B | `<guardrail>` | CRITICAL, Core Principles, COMPREHENSIVE RESEARCH (3 sections) |
| R2B | `<guardrail>` | Core Responsibilities, Process Steps, Guardrails (3 sections) |
| R2B | `<decision-framework>` | Process Steps, Heuristics (2 sections) |
| R3B | `<decision-framework>` | Process Steps, Assessment Guidelines (2 sections) |
| R3B | `<guardrail>` | Process Steps, Guardrails (2 sections) |

**Cross-Agent Fragmentation (same guardrails appearing in multiple agents):**
- "Evidence-based" / "file:line references" - R1A, R1B, R2B, R3A
- "No fabrication" - R1A, R1B
- "Document don't critique" (early stages) - R1A, R1B
- "Human control" - R3A, R3B

**Recommendation:** Extract common guardrails to a shared "Core Review Principles" section in the workflow skill, reducing duplication by ~1,200 tokens.

### Structural Gaps Found (from Gap Detection)

| Gap | Agent | Impact | Source |
|-----|-------|--------|--------|
| No explicit `<quality-gate>` section | R1B | Quality criteria embedded in workflow steps | R1B-viz/summary.yaml |
| No explicit `<guardrail>` section | R2A | 5 guardrails scattered within heuristics | R2A-viz/summary.yaml |
| Duplicate workflow step | R1B | Step 4 listed twice (lines 133-160) | Manual review |
| `<decision-framework>` fragmentation | R2B | 3 frameworks split across Process Steps and Heuristics | R2B-viz/summary.yaml |

### Artifact Responsibility Matrix

Each agent has clear, non-overlapping artifact responsibilities:

| Agent | Creates | Updates | Reads |
|-------|---------|---------|-------|
| R1A | ReviewContext.md, DerivedSpec.md, research prompt | - | PR metadata |
| R1B | CodeResearch.md | ReviewContext.md | ReviewContext.md, research prompt |
| R2A | ImpactAnalysis.md | - | ReviewContext.md, CodeResearch.md, DerivedSpec.md |
| R2B | GapAnalysis.md | - | All prior artifacts |
| R3A | ReviewComments.md | GitHub pending review | All prior artifacts |
| R3B | - | ReviewComments.md (assessment sections) | All artifacts |

This clean separation supports direct skill isolation—each activity skill owns specific artifacts.

### Token Estimates for Skills

Based on annotation analysis and deduplication opportunities:

| Skill | Estimated Tokens | Source Content |
|-------|-----------------|----------------|
| paw-review-workflow | ~2,500 | Orchestration from all agents' handoff sections |
| paw-review-understanding | ~3,500 | R1A core minus orchestration |
| paw-review-baseline | ~2,000 | R1B (simpler, focused agent) |
| paw-review-impact | ~3,000 | R2A analysis patterns |
| paw-review-gap | ~4,000 | R2B categorization + heuristics |
| paw-review-feedback | ~2,500 | R3A comment generation |
| paw-review-critic | ~2,000 | R3B assessment |

**Total: ~19,500 tokens** (down from ~60,000 tokens in current agents due to deduplication and orchestration extraction)

### Workflow Skill Orchestration Complexity

The workflow skill must handle R1A's unique pause-and-resume pattern:

```
1. Run paw-review-understanding subagent
   → Creates ReviewContext.md, research prompt
   → Returns: "research needed"

2. Run paw-review-baseline subagent
   → Creates CodeResearch.md
   → Returns: "baseline complete"

3. Resume paw-review-understanding subagent (or run fresh)
   → Detects CodeResearch.md exists
   → Creates DerivedSpec.md
   → Returns: "understanding complete"

4. Continue linear flow: impact → gap → feedback → critic
```

This is more complex than a simple linear sequence and must be explicitly encoded in the workflow skill's orchestration logic.

### Content Migration Recommendations

**To workflow skill:**
- All `<handoff-instruction>` content
- Stage gate conditions (artifact existence checks)
- Resumption detection logic
- Human control principles
- Subagent invocation patterns

**To shared review principles (inline in workflow or separate skill):**
- Evidence-based documentation guardrails
- Must/Should/Could categorization (referenced by gap + feedback skills)
- Rationale template structure

**To individual activity skills:**
- Artifact templates (each skill owns its template)
- Phase-specific heuristics
- Tool integrations (GitHub MCP only in feedback skill)

## Open Questions

None remaining - implementation path is clear from this research.

## External References

- Agent Skills Specification: https://agentskills.io/specification
- VS Code Skills Documentation: https://code.visualstudio.com/docs/copilot/customization/agent-skills
- Planning branch: https://raw.githubusercontent.com/lossyrob/phased-agent-workflow/refs/heads/planning/paw_v2/
