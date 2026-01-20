# PAW Review Skills - Feature Documentation

## Overview

This implementation transforms the PAW Review workflow from a six-agent sequential architecture to a single-agent skills-based architecture. Previously, users invoked separate agents (PAW-R1A, PAW-R1B, PAW-R2A, PAW-R2B, PAW-R3A, PAW-R3B) with manual handoffs between each stage. The new architecture provides a unified entry point (`/paw-review`) where a single PAW Review agent dynamically loads and executes skill definitions to orchestrate the complete review workflow automatically.

The migration preserves all existing review capabilities and artifacts while significantly improving the user experience—complete reviews now execute without manual intervention between stages. The skills-based approach also improves maintainability by consolidating shared logic into a workflow skill and separating stage-specific logic into focused activity skills.

## Architecture and Design

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        User Invocation                           │
│              /paw-review <PR-number-or-URL>                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                       PAW Review Agent                            │
│  - Loads workflow skill via paw_get_skill                        │
│  - Detects PR context                                             │
│  - Executes stages via subagents                                  │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   paw-review-workflow Skill                       │
│  - Core Review Principles (shared guardrails)                    │
│  - Subagent Contract (response format)                            │
│  - Stage orchestration (Understanding → Evaluation → Output)     │
└───────────────────────────┬──────────────────────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│Understanding│      │ Evaluation  │      │   Output    │
│    Stage    │      │    Stage    │      │    Stage    │
└─────┬───────┘      └─────┬───────┘      └─────┬───────┘
      │                    │                    │
      ▼                    ▼                    ▼
┌─────────────────┐ ┌───────────────┐   ┌───────────────┐
│paw-review-      │ │paw-review-    │   │paw-review-    │
│understanding    │ │impact         │   │feedback       │
├─────────────────┤ ├───────────────┤   ├───────────────┤
│paw-review-      │ │paw-review-gap │   │paw-review-    │
│baseline         │ │               │   │critic         │
└─────────────────┘ └───────────────┘   └───────────────┘
```

### Component Summary

| Component | Type | Purpose |
|-----------|------|---------|
| PAW Review Agent | Agent | Entry point; orchestrates workflow via skill loading |
| paw-review-workflow | Workflow Skill | Defines orchestration sequence, shared principles |
| paw-review-understanding | Activity Skill | PR analysis, context building, spec derivation |
| paw-review-baseline | Activity Skill | Pre-change codebase research |
| paw-review-impact | Activity Skill | System-wide impact analysis |
| paw-review-gap | Activity Skill | Gap identification with Must/Should/Could |
| paw-review-feedback | Activity Skill | Review comment generation, GitHub integration |
| paw-review-critic | Activity Skill | Comment quality assessment |

### Design Decisions

1. **Single Agent with Dynamic Skills**: Rather than maintaining six separate agents with duplicated guardrails and handoff logic, a single agent loads skills on-demand. This reduces token overhead and centralizes orchestration.

2. **Workflow Skill for Shared Content**: Cross-cutting concerns (evidence-based documentation, file:line references, no fabrication guardrail) live in the workflow skill's "Core Review Principles" section. Activity skills reference these principles rather than duplicating them.

3. **Subagent Execution Model**: Each activity skill runs as a subagent via `runSubagent`. This provides clean context isolation—each stage starts fresh with its skill loaded, rather than accumulating context from all previous stages.

4. **Subagent Skill Loading Requirement**: Every subagent MUST call `paw_get_skill` FIRST before executing any work. The workflow skill explicitly requires delegation prompts to include: "First load your skill using `paw_get_skill('paw-review-<skill-name>')`, then execute the activity." This ensures subagents have the complete skill instructions before beginning their tasks.

5. **Stage Gates Between Stages**: The workflow verifies artifact existence before proceeding to the next stage. Missing artifacts cause the workflow to stop and report, preventing cascading failures.

6. **Human Control Point**: The workflow creates a GitHub pending review but never auto-submits. Human reviewers retain full control over what feedback gets posted.

### Integration Points

- **VS Code Extension**: Tools registered via `vscode.lm.registerTool()` in `src/extension.ts`
- **GitHub MCP**: `paw-review-feedback` skill uses MCP tools for pending review creation
- **Installer**: Prompt files (`paw-review.prompt.md`) installed alongside agents
- **Skill Loader**: `src/skills/skillLoader.ts` provides `loadSkillCatalog()` and `loadSkillContent()`

## User Guide

### Prerequisites

- VS Code with GitHub Copilot installed
- PAW Workflow extension installed
- For GitHub PRs: GitHub MCP Server configured with write access
- Repository with a pull request to review

### Basic Usage

**Invoke the review workflow:**

```
/paw-review 123
```

or with full URL:

```
/paw-review https://github.com/owner/repo/pull/123
```

The workflow:
1. Loads the `paw-review-workflow` skill
2. Executes Understanding, Evaluation, and Output stages automatically
3. Creates artifacts in `.paw/reviews/PR-123/`
4. Creates a GitHub pending review with inline comments

### Review Artifacts

All artifacts are written to `.paw/reviews/<identifier>/`:

| Artifact | Stage | Contents |
|----------|-------|----------|
| ReviewContext.md | Understanding | PR metadata, changed files, CI status |
| ResearchQuestions.md | Understanding | Research questions for baseline analysis |
| CodeResearch.md | Understanding | Pre-change baseline analysis |
| DerivedSpec.md | Understanding | Reverse-engineered spec from implementation |
| ImpactAnalysis.md | Evaluation | System-wide effects, breaking changes |
| GapAnalysis.md | Evaluation | Findings by Must/Should/Could severity |
| ReviewComments.md | Output | Complete feedback with rationale |

### Submitting Your Review

After the workflow completes:

1. Review `ReviewComments.md` for the complete feedback
2. Check the GitHub pending review (if applicable)
3. Modify or remove comments as needed
4. Submit the review manually when satisfied

**Important**: The workflow never auto-submits reviews. This ensures human oversight.

### Non-GitHub Contexts

For local branches without GitHub PRs:

```
/paw-review
```

The agent detects non-GitHub context and:
- Uses the current branch name as identifier
- Creates artifacts in `.paw/reviews/<branch-name>/`
- Generates feedback without GitHub integration
- Provides comments in `ReviewComments.md` for manual posting

### Configuration

No additional configuration required. The workflow uses:
- Default artifact path: `.paw/reviews/<identifier>/`
- Skills bundled with the extension
- GitHub MCP tools for PR integration (when available)

## Cross-Repository Review Support

Phase 7 adds multi-repository review capabilities for coordinated changes across codebases.

### Detection

Multi-repository mode activates when:
- Multiple PR URLs/numbers provided: `/paw-review PR-123 PR-456`
- `paw_get_context` returns `isMultiRootWorkspace: true`
- PR links reference different repositories

### Artifact Structure

| Scenario | Directory Pattern | Example |
|----------|-------------------|---------|
| Single PR | `PR-<number>/` | `.paw/reviews/PR-123/` |
| Multi-repo PRs | `PR-<number>-<repo-slug>/` | `.paw/reviews/PR-123-my-api/` |

**Repo-slug**: Last segment of repository name, lowercase (e.g., `owner/my-api` → `my-api`).

### Multi-Repo Invocation

```
/paw-review https://github.com/org/api/pull/123 https://github.com/org/frontend/pull/456
```

The workflow:
1. Creates separate artifact directories per repository
2. Analyzes each PR independently
3. Correlates impacts across boundaries
4. Creates pending reviews on each PR with cross-references

### Cross-Repository Artifacts

**ReviewContext.md** includes related PRs:
```yaml
repository: org/api
related_prs:
  - number: 456
    repository: org/frontend
    relationship: "depends-on"
```

**ImpactAnalysis.md** includes cross-repo dependencies:
```markdown
## Cross-Repository Dependencies

| This PR Changes | Affects PR | Type | Migration |
|-----------------|------------|------|-----------|
| `api/types.ts` exports | PR-456-frontend | Breaking | Update imports |
```

**GapAnalysis.md** includes cross-repo consistency checks (versioning, coordinated changes, timing dependencies).

**ReviewComments.md** includes cross-references:
```
This API change requires a frontend update. (See also: org/frontend#456)
```

### Deployment Order

When changes have deployment dependencies, ImpactAnalysis.md documents required order:
```markdown
### Deployment Order
1. Deploy `api` first (provides new endpoints)
2. Deploy `frontend` second (consumes endpoints)
```

## Technical Reference

### Skill Loading Tools

**paw_get_skills**: Returns catalog of available skills

```typescript
// Returns formatted markdown list:
// - **paw-review-workflow** (workflow): Orchestrates the PAW Review workflow...
// - **paw-review-understanding** (activity): Analyzes PR changes...
```

**paw_get_skill**: Returns full skill content by name

```typescript
paw_get_skill({ skill_name: 'paw-review-workflow' })
// Returns: Full SKILL.md content including frontmatter and body
```

### paw_get_context Workspace Fields

The `paw_get_context` tool includes workspace information for multi-repo detection:

```markdown
## Workspace Info

- Workspace folder count: 2
- Multi-root workspace: true
```

Agents use `isMultiRootWorkspace: true` to trigger multi-repository review mode.

### Skill File Format

Skills follow the [Agent Skills Specification](https://agentskills.io/specification):

```yaml
---
name: skill-name
description: What the skill does and when to use it
metadata:
  type: workflow | activity
  stage: understanding | evaluation | output
  artifacts: Artifact1.md, Artifact2.md
---

# Skill Content

Instructions, templates, and guidelines...
```

### Key Interfaces

```typescript
// Skill catalog entry
interface SkillCatalogEntry {
  name: string;        // Unique identifier
  description: string; // What the skill does
  type?: string;       // From metadata.type
  source: 'builtin';   // Currently only builtin skills
}

// Skill content result
interface SkillContent {
  name: string;        // Requested skill name
  content: string;     // Full SKILL.md content
  error?: string;      // Error message if load failed
}
```

### Artifact Paths

| Context | Pattern | Example |
|---------|---------|---------|
| GitHub single PR | `.paw/reviews/PR-<number>/` | `.paw/reviews/PR-123/` |
| GitHub multi-repo | `.paw/reviews/PR-<number>-<repo>/` | `.paw/reviews/PR-123-api/` |
| Non-GitHub | `.paw/reviews/<slugified-branch>/` | `.paw/reviews/feature-auth/` |

### Error Handling

The workflow handles errors by:
1. Reporting the specific failure with details
2. Stopping before downstream stages
3. Preserving partial artifacts for debugging
4. Providing recovery instructions

Example error output:
```
Stage gate failed: Understanding

Missing artifacts:
- CodeResearch.md - expected at .paw/reviews/PR-123/CodeResearch.md

Cannot proceed to Evaluation stage. Please investigate and resolve.
```

## Testing Guide

### How to Test This Feature

**1. Verify skills are bundled:**
```bash
ls skills/paw-review-*/SKILL.md
# Should list 7 skill files (1 workflow + 6 activity)
```

**2. Verify tools are registered:**
- Open VS Code with PAW extension
- Check Output panel "PAW Workflow" for:
  - `[INFO] Registered language model tool: paw_get_skills`
  - `[INFO] Registered language model tool: paw_get_skill`

**3. Test skill catalog:**
- In Copilot Chat, have the agent call `paw_get_skills`
- Verify all 7 skills appear with correct names and types

**4. Test skill loading:**
- Have the agent call `paw_get_skill('paw-review-workflow')`
- Verify full skill content is returned

**5. End-to-end review:**
- Create or find a test PR
- Run `/paw-review <PR-number>`
- Verify all 6 artifacts created in `.paw/reviews/PR-<number>/`
- Verify GitHub pending review created (if GitHub context)

**6. Cross-repository review:**
- Open a multi-root workspace with multiple repositories
- Run `/paw-review <PR-URL-1> <PR-URL-2>` with PRs from different repos
- Verify separate artifact directories: `.paw/reviews/PR-<n>-<repo-slug>/`
- Verify ImpactAnalysis.md contains Cross-Repository Dependencies section
- Verify ReviewComments.md includes cross-reference notations

**7. Verify implementation workflow unchanged:**
- Run standard PAW implementation workflow
- Verify PAW-01A through PAW-05 agents work normally

### Automated Test Coverage

- `src/test/suite/skillLoader.test.ts` - Skill loading utilities
- `src/test/suite/skillsTool.test.ts` - paw_get_skills tool
- `src/test/suite/skillTool.test.ts` - paw_get_skill tool
- `src/test/suite/promptTemplates.test.ts` - Prompt file loading

Run tests: `npm test`

## Migration and Compatibility

### From Previous PAW Review

Users of the previous six-agent workflow can migrate by:

1. Using `/paw-review <PR>` instead of manually invoking PAW-R* agents
2. Existing `.paw/reviews/` directories remain compatible
3. Artifact format unchanged—same ReviewContext.md, GapAnalysis.md, etc.

### Breaking Changes

- Six PAW-R* agents removed (PAW-R1A, PAW-R1B, PAW-R2A, PAW-R2B, PAW-R3A, PAW-R3B)
- `review-handoff-instructions.component.md` removed (logic now in workflow skill)
- Manual stage transitions no longer required

### Implementation Workflow Unchanged

PAW implementation agents (PAW-01A through PAW-05, PAW-X) are unaffected:
- Same agent files, same behavior
- Same workflow commands and transitions
- No migration required for implementation workflows

## Edge Cases and Limitations

### Known Limitations

1. **Skill size**: Skills target <5000 tokens each. Very large skills may impact context window availability.

2. **Subagent tool access**: Subagents have equivalent tool access to parent agents (per VS Code behavior), but this is implementation-dependent.

3. **Non-GitHub contexts**: Without GitHub PR context, review comments must be manually posted. The workflow generates the content but cannot create pending reviews.

4. **Cross-repo analysis**: Best-effort when one repository is inaccessible; analysis continues with available data.

### Error Scenarios

| Scenario | Behavior |
|----------|----------|
| Invalid skill name | Clear error: "Skill not found: <name>" |
| Malformed frontmatter | Skill excluded from catalog; error logged |
| Missing artifact | Stage gate fails; workflow stops with instructions |
| Subagent failure | Error reported; partial artifacts preserved |
| GitHub auth issues | Feedback generated locally; MCP error reported |

## References

- [Issue #154](https://github.com/lossyrob/phased-agent-workflow/issues/154) - Original feature request
- [Agent Skills Specification](https://agentskills.io/specification) - Skill format standard
- [VS Code Skills Documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [PAW Review Specification](../../../paw-review-specification.md) - Detailed workflow spec
- [Review Workflow Documentation](../../../docs/specification/review.md) - User guide
