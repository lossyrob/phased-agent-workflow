# Prompt Annotation Process

> A method for analyzing agent/system prompts by wrapping content in XML tags that label each section's purpose.

## Goal

Create annotated versions of prompts where each section is wrapped in descriptive XML tags. This enables:
- Identifying reusable prompt components across agents
- Consolidating similar content with matching labels
- Understanding prompt structure at a glance
- Building a shared vocabulary for prompt design

## Inputs

1. **Source prompts**: The agent/system prompt files to annotate
2. **Taxonomy file** (optional): A vocabulary of existing labels with descriptions. If provided, prefer reusing existing labels over creating new ones.

## Output

For each source prompt, produce:
1. **Annotated file**: The original content wrapped in XML tags
2. **Metadata header**: List of all labels used in that file
3. **Analysis notes**: Observations about patterns, difficult-to-categorize content, and new labels introduced

## The Taxonomy File

The taxonomy file (e.g., `TAXONOMY.md`) contains:
- **Label definitions**: Each label with a brief description of its purpose
- **Usage counts**: How many prompts used each label (helps identify core vs specialized labels)
- **Categories**: Labels grouped by functional area (identity, workflow, quality, etc.)
- **Consolidation notes**: Labels that could potentially be merged

When annotating new prompts, consult the taxonomy to:
- Reuse existing labels where they fit
- Maintain naming conventions (lowercase-with-hyphens)
- Identify gaps where new labels are needed

---

## Annotation Rules

### 1. Tag Naming Convention

- Use lowercase with hyphens: `<agent-identity>`, `<quality-gate>`, `<workflow-step>`
- Be descriptive but concise
- Think generically: what label would apply if this content appeared in other prompts?
- Use attributes for variants: `<guardrail id="no-push">`, `<mode-definition type="auto">`

### 2. Granularity

| Situation | Approach |
|-----------|----------|
| Section serves ONE cohesive purpose | Wrap the whole section |
| Section serves MULTIPLE purposes | Break into multiple annotations |
| Hierarchical structure | Nest tags (parent contains children) |
| Individual items with distinct purposes | Each gets its own tag |

**Example of nesting:**
```xml
<quality-gate id="pre-commit">
  <quality-criterion>All tests pass</quality-criterion>
  <quality-criterion>No lint errors</quality-criterion>
  <quality-criterion>Documentation updated</quality-criterion>
</quality-gate>
```

### 3. Preserve Original Content

- Keep all original markdown formatting inside tags
- Don't modify, summarize, or restructure the content
- The annotated file should be readable as-is

### 4. Label Selection Priority

1. **Use existing labels** from taxonomy when they fit
2. **Extend with attributes** if the existing label is close but needs qualification
3. **Create new labels** only when no existing label captures the purpose
4. **Document new labels** in your analysis notes

---

## Process Steps

### Step 1: Read the Full Prompt

Read the entire prompt to understand:
- What is this agent's role?
- What workflow does it follow?
- What artifacts does it produce?
- What constraints does it operate under?

### Step 2: Identify Major Sections

Look for structural markers:
- Headers (##, ###)
- Numbered lists (workflow steps)
- Bullet lists (responsibilities, criteria)
- Code blocks (templates, examples)

### Step 3: Annotate Top-Down

Start with the largest logical sections, then drill into sub-sections:

```xml
<agent-identity>
# Agent Name

<mission-statement>
You are an agent that does X.
</mission-statement>

</agent-identity>
```

### Step 4: Handle Ambiguous Content

When content serves multiple purposes:
- Choose the **primary** purpose for the outer tag
- Nest secondary purposes inside
- Or split the content if purposes are truly separate

Document difficult decisions in your analysis notes.

### Step 5: Add Metadata Header

At the top of the annotated file, include:

```markdown
# Annotated: [Original Filename]

## Labels Used

| Label | Count | Description |
|-------|-------|-------------|
| `<agent-identity>` | 1 | Agent name and mission |
| `<workflow-step>` | 5 | Individual workflow step |
...

## New Labels Introduced

| Label | Description |
|-------|-------------|
| `<new-label>` | Why this was needed |
...
```

### Step 6: Write Analysis Notes

At the end (or in a separate report), include:
- Patterns observed
- Content that was difficult to categorize
- Labels from taxonomy that were NOT used (and why)
- Suggestions for taxonomy updates

---

## Common Label Categories

These categories appear across most prompt collections:

| Category | Example Labels |
|----------|---------------|
| **Identity** | `agent-identity`, `mission-statement`, `role-definition` |
| **Constraints** | `guardrail`, `scope-boundary`, `anti-pattern`, `blocking-condition` |
| **Workflow** | `workflow-sequence`, `workflow-step`, `initial-behavior`, `verification-step` |
| **Artifacts** | `artifact-format`, `artifact-constraint`, `artifact-metadata` |
| **Quality** | `quality-gate`, `quality-criterion`, `prerequisite-check` |
| **Transitions** | `handoff-instruction`, `handoff-checklist`, `terminal-state` |
| **Communication** | `communication-pattern`, `example`, `input-collection-prompt` |
| **Decisions** | `decision-framework`, `classification-logic`, `default-behavior` |
| **Errors** | `error-handling`, `graceful-degradation`, `blocking-condition` |

---

## Sequential vs Parallel Processing

**Sequential processing** (recommended for building taxonomy):
- Process prompts one at a time
- Pass accumulated labels to each subsequent prompt
- Labels converge toward consistency
- Better for discovering a shared vocabulary

**Parallel processing** (faster, but less consistent):
- Process all prompts simultaneously
- May produce duplicate labels with different names
- Requires post-hoc consolidation pass

---

## Using Subagents for Annotation

When annotating multiple prompts, delegate each prompt to a subagent. This keeps context focused and prevents token overflow on large prompt collections.

### When to Use Subagents

- **Multiple prompts to annotate**: Spawn one subagent per prompt file
- **Large prompts**: Individual prompts that are very long benefit from dedicated processing
- **Building shared taxonomy**: Sequential subagent calls allow vocabulary accumulation

### Subagent Workflow

1. **Create output directory** for annotated files before spawning subagents

2. **First subagent** (no existing taxonomy):
   - Provide: source file path, output file path, annotation rules
   - Request: discover and document labels organically
   - Return: list of labels with descriptions, observations

3. **Subsequent subagents** (with accumulated vocabulary):
   - Provide: source file path, output file path, annotation rules, **accumulated label vocabulary**
   - Instruct: prefer existing labels, add new only when needed
   - Return: labels used (existing vs new), observations, labels NOT used

4. **After all subagents complete**: Compile taxonomy from all discovered labels

### Subagent Prompt Template

```
## Task: Annotate Agent Prompt with Purpose Labels

Read the agent file at `[SOURCE_PATH]` and create an annotated version 
with XML tags that label each section/subsection by its purpose.

### Existing Label Vocabulary
[Include accumulated labels table here, or omit for first agent]

| Label | Description |
|-------|-------------|
| `<label-name>` | What this label represents |
...

### Instructions

1. Read the full agent file carefully.
2. Wrap content in XML tags that describe purpose. Use nested tags 
   where content serves multiple purposes.
3. Naming convention: lowercase with hyphens. PREFER existing labels; 
   add NEW only when needed.
4. Granularity: Cohesive sections get one tag; multi-purpose sections 
   get broken up; nest for hierarchy.
5. Preserve original markdown inside XML tags.
6. Add a metadata section at top listing all labels used.

### Output

Save the annotated file to: `[OUTPUT_PATH]`

### Return Value

1. List of all XML tags used (mark NEW ones)
2. Observations about patterns or difficult-to-categorize content
3. Labels from existing vocabulary NOT used (and why, if notable)
```

### Accumulating the Vocabulary

After each subagent returns, merge its new labels into the vocabulary table before calling the next subagent:

```
Subagent 1 → discovers labels A, B, C
Subagent 2 → receives A, B, C → adds D, E
Subagent 3 → receives A, B, C, D, E → adds F
...
Final taxonomy: A, B, C, D, E, F (with usage counts)
```

### Final Consolidation

After all prompts are annotated:
1. Create `TAXONOMY.md` with all unique labels, grouped by category
2. Include usage counts (how many prompts used each label)
3. Note consolidation opportunities (similar labels that could merge)
4. Identify high-reuse labels (candidates for shared templates)

---

## Example: Annotated Section

**Original:**
```markdown
## Guardrails

- Never push directly to main
- Always run tests before committing
- Do not modify files outside the project directory
```

**Annotated:**
```xml
<quality-gate id="guardrails">

## Guardrails

<guardrail id="no-direct-push">
- Never push directly to main
</guardrail>

<guardrail id="test-before-commit">
- Always run tests before committing
</guardrail>

<guardrail id="scope-boundary">
- Do not modify files outside the project directory
</guardrail>

</quality-gate>
```

---

## After Annotation

With annotated prompts complete, you can:

1. **Build/update the taxonomy**: Extract all unique labels with descriptions
2. **Find consolidation opportunities**: Labels with similar purposes across prompts
3. **Identify reusable components**: High-frequency labels are candidates for shared templates
4. **Compare prompt structures**: See which prompts are missing common sections
