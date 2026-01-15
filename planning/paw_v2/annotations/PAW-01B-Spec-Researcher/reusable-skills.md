# PAW-01B Spec Researcher - Reusable Skills

This document catalogs content from PAW-01B Spec Researcher that can be extracted and reused across other agents or workflows.

## 1. Anti-Evaluation Directive

**Category**: Guardrail  
**Applicability**: Any research or documentation agent

```markdown
**YOUR JOB IS TO DESCRIBE THE SYSTEM AS IT EXISTS TODAY**
- DO NOT suggest improvements or alternative implementations
- DO NOT critique current behavior or identify problems
- DO NOT recommend optimizations, refactors, or fixes
- DO NOT evaluate whether the current approach is good or bad
- ONLY document observable behavior and facts supported by the codebase or provided inputs
```

**Use when**: Agent's role is purely observational/documentary; prevents scope creep into design.

---

## 2. Idempotent Artifact Updates

**Category**: Guardrail  
**Applicability**: Any agent that updates existing artifacts

```markdown
- Build artifact incrementally, updating only sections affected by new findings
- Re-running with the same inputs should reproduce the same document (no unnecessary churn)
- Preserve existing sections that remain accurate; avoid rewriting unrelated portions
- When unsure whether a change is warranted, default to keeping prior content and note open unknowns instead
```

**Use when**: Artifacts may be re-generated or updated multiple times; prevents unnecessary diff noise.

---

## 3. Conciseness Directive

**Category**: Guardrail  
**Applicability**: Any agent producing documentation

```markdown
**Be concise**: Provide direct, factual answers without exhaustive detail. Avoid context bloat—the goal is to give [consuming agent/user] enough information to [next action], not to document every edge case or implementation nuance.
```

**Parameterize**:
- `[consuming agent/user]`: Who receives the output
- `[next action]`: What they'll do with it

---

## 4. No Speculation Rule

**Category**: Guardrail  
**Applicability**: Any research or analysis agent

```markdown
No speculative claims—state only what exists or mark as open unknown.
```

**Use when**: Agent must distinguish observed facts from inference.

---

## 5. No Proposals Rule

**Category**: Guardrail  
**Applicability**: Research agents, documentation agents

```markdown
No proposals, refactors, "shoulds".
```

**Use when**: Agent should not cross into design/recommendation territory.

---

## 6. Read Files Fully

**Category**: Guardrail  
**Applicability**: Any code-reading agent

```markdown
**Read files fully** – never use limit/offset parameters; incomplete context leads to incorrect behavioral descriptions.
```

**Use when**: Partial file reads could lead to incorrect conclusions.

---

## 7. Incremental Building Pattern

**Category**: Communication Pattern  
**Applicability**: Any agent producing multi-section documents

```markdown
Build incrementally: [initial placeholder] → [section 1] → [section 2] → ... → [finalize summary] → [add outstanding items]
```

**Parameterize** per artifact structure.

---

## 8. MCP Tool Preference

**Category**: Communication Pattern  
**Applicability**: Any agent interacting with GitHub/external platforms

```markdown
Issues/Work Items (if relevant): When reading issue content, provide the Issue URL and describe what information you need. Prefer using MCP tools for platform operations rather than CLI commands (e.g., gh) or direct web fetching. Copilot will route to the appropriate platform tools based on workspace context.
```

**Use when**: Agent needs to interact with GitHub issues, PRs, or similar.

---

## Summary Table

| Skill | Type | Reuse Potential |
|-------|------|-----------------|
| Anti-Evaluation Directive | Guardrail | High - any documentary agent |
| Idempotent Artifact Updates | Guardrail | High - any artifact-updating agent |
| Conciseness Directive | Guardrail | High - all documentation |
| No Speculation Rule | Guardrail | High - all research |
| No Proposals Rule | Guardrail | Medium - research/doc agents |
| Read Files Fully | Guardrail | Medium - code-reading agents |
| Incremental Building | Pattern | High - multi-section outputs |
| MCP Tool Preference | Pattern | Medium - GitHub-interacting agents |
