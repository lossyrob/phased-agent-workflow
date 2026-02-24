# Code Research: Discovery SoT Specialists

## Research Questions

1. How is the existing specialist discovery mechanism implemented in paw-sot SKILL.md?
2. What is the exact structure and format of existing specialist files (frontmatter, sections)?
3. How does paw-sot handle the `type` field currently? Where is the preamble injection?
4. What does paw-discovery-final-review currently pass to paw-sot invocation?
5. What are the existing per-stage Discovery review criteria (from extraction-review, mapping-review, etc.) to inform specialist cognitive strategies?

---

## Q1: Specialist Discovery Mechanism

### Discovery Flow

**Location**: `skills/paw-sot/SKILL.md:49-64`

The discovery mechanism operates at 4 precedence levels (most-specific-wins for name conflicts):

1. **Workflow**: Parse `specialists` from review context — if explicit comma-separated list, resolve only those names
2. **Project**: Scan `.paw/personas/<name>.md` files in the repository
3. **User**: Scan `~/.paw/personas/<name>.md` files
4. **Built-in**: Scan `references/specialists/<name>.md` files (excluding `_shared-rules.md`)

### Resolution Rules

**Location**: `skills/paw-sot/SKILL.md:59-64`

- If `specialists` is `all` (default): include all discovered specialists from all levels
- If a fixed list (e.g., `security, performance, testing`): resolve each name against discovered specialists, most-specific-wins
- If `adaptive:<N>`: discover all, then select N most relevant (see Adaptive Selection)
- Same filename at project level overrides user level overrides built-in
- Skip malformed or empty specialist files with a warning; continue with remaining roster
- If zero specialists found after discovery, fall back to built-in defaults with a warning

### Adaptive Selection

**Location**: `skills/paw-sot/SKILL.md:66-83`

When `specialists` is `adaptive:<N>`, selection process:
1. Analyze review target to identify dominant change categories
2. For each discovered specialist, assess relevance by matching cognitive strategy and domain against change categories
3. Select up to N specialists with highest relevance
4. Document selection rationale in REVIEW-SYNTHESIS.md

**Key insight for Discovery**: The adaptive selection mechanism analyzes "change categories" which is code-centric. For Discovery artifacts, the selection criteria would need to analyze artifact types and content patterns instead.

### Current Built-in Specialists

**Location**: `skills/paw-sot/references/specialists/`

Existing specialists (9 total):
- `_shared-rules.md` (not a specialist — shared rules)
- `architecture.md`
- `assumptions.md`
- `correctness.md`
- `edge-cases.md`
- `maintainability.md`
- `performance.md`
- `release-manager.md`
- `security.md`
- `testing.md`

---

## Q2: Specialist File Structure and Format

### File Structure Pattern

**Location**: `skills/paw-sot/references/specialists/security.md` (representative example)

Specialists have NO YAML frontmatter in the current implementation. They are pure markdown files with consistent section structure:

```markdown
# {Name} Specialist

## Identity & Narrative Backstory
[Rich narrative establishing expertise, formative experiences, lessons learned]

## Cognitive Strategy
[Structured methodology for how the specialist approaches reviews]

## Domain Boundary
[Explicit scope definition — what IS and IS NOT in this specialist's territory]

## Behavioral Rules
[Bullet-point rules governing specialist behavior]

## Shared Rules
See `_shared-rules.md` for Anti-Sycophancy Rules and Confidence Scoring.

## Demand Rationale
[What context the specialist needs before evaluating — gap-flagging behavior]

## Shared Output Format
See `_shared-rules.md` for Required Output Format (Toulmin structure). Use `**Category**: {name}`.

## Example Review Comments
[2-3 example findings in full Toulmin structure with Grounds, Warrant, Rebuttal Conditions, Suggested Verification]
```

### Shared Rules Content

**Location**: `skills/paw-sot/references/specialists/_shared-rules.md:1-43`

The shared rules document contains:

1. **Anti-Sycophancy Rules** (lines 5-13):
   - MUST identify at least one substantive concern
   - If no issues found, explain what was analyzed and why it passed
   - Prioritize finding real issues over maintaining harmony
   - State uncertainty explicitly rather than omitting

2. **Confidence Scoring** (lines 15-22):
   - HIGH: Direct evidence from diff, cognitive strategy identifies concern
   - MEDIUM: Analysis suggests concern but working from inference
   - LOW: Hunch or pattern-match from experience

3. **Required Output Format** (lines 24-43):
   - Toulmin structure: Finding claim, Severity, Confidence, Category
   - Grounds (Evidence): Diff-anchored evidence
   - Warrant (Rule): Why evidence supports the claim
   - Rebuttal Conditions: What would falsify the finding
   - Suggested Verification: How to verify

### Model Override Support

**Location**: `skills/paw-sot/SKILL.md:94`

Specialist files CAN have YAML frontmatter with `model:` field, but this is optional. The SKILL.md mentions:

> If a specialist file contains `shared_rules_included: true` in its YAML frontmatter, skip shared rules injection to avoid duplication.

So frontmatter is supported but not currently used in built-in specialists.

---

## Q3: Type Field and Preamble Injection

### Review Context Input Contract

**Location**: `skills/paw-sot/SKILL.md:22-35`

The `type` field is required and accepts three values:
- `diff`: Code/implementation review
- `artifacts`: Design/planning review
- `freeform`: Caller-provided framing

### Context-Adaptive Preambles

**Location**: `skills/paw-sot/SKILL.md:36-48`

Preambles are injected BEFORE composing specialist prompts:

**Type `diff`** (lines 40-41):
> You are reviewing implementation changes (code diff). Apply your cognitive strategy and domain expertise to the actual code changes. Look for bugs, security issues, performance problems, pattern violations, and correctness gaps in the diff. Cite specific file paths and line numbers.

**Type `artifacts`** (lines 43-44):
> You are reviewing design and planning documents, not code. Apply your cognitive strategy to design decisions, architectural choices, and unstated assumptions. Your domain expertise should evaluate whether the planned approach is sound — look for gaps in reasoning, missing edge cases, feasibility risks, and cross-concern conflicts. Reference specific sections and claims in the documents rather than code lines.

**Type `freeform`** (lines 46-48):
> Use the caller-provided `framing` field content as the preamble. If no `framing` provided, use a neutral framing: "You are reviewing the provided content..."

### Prompt Composition Order

**Location**: `skills/paw-sot/SKILL.md:87-96`

Four layers composed for each specialist:
1. **Shared rules** — load `references/specialists/_shared-rules.md` once
2. **Context preamble** — inject type-dependent preamble
3. **Specialist content** — load discovered specialist `.md` file
4. **Review coordinates** — review target location and output directory

**Key insight**: The preamble is SEPARATE from the specialist content — it's injected between shared rules and specialist content. This allows the same specialists to work across different review types without modification.

---

## Q4: paw-discovery-final-review SoT Invocation

### Current Invocation Pattern

**Location**: `skills/paw-discovery-final-review/SKILL.md:90-93`

```markdown
**If society-of-thought mode**:
- Load `paw-sot` skill
- Invoke with review context (type: `artifacts`, coordinates: Discovery artifact paths)
- SoT handles specialist orchestration and synthesis
```

### Configuration Reading

**Location**: `skills/paw-discovery-final-review/SKILL.md:22-32`

Configuration comes from DiscoveryContext.md:
- `Final Review Mode`: `single-model` | `multi-model` | `society-of-thought`
- `Final Review Interactive`: `true` | `false` | `smart`
- `Final Review Specialists`: `all` (default) | comma-separated names | `adaptive:<N>`
- `Final Review Interaction Mode`: `parallel` (default) | `debate`

### Review Prompt (Shared)

**Location**: `skills/paw-discovery-final-review/SKILL.md:49-77`

The review prompt passed to models/specialists:

```markdown
Review this Discovery workflow output. Be critical and thorough.

## Context Locations
- **Input Documents**: `.paw/discovery/<work-id>/inputs/`
- **Extraction**: `.paw/discovery/<work-id>/Extraction.md`
- **Capability Map**: `.paw/discovery/<work-id>/CapabilityMap.md`
- **Correlation**: `.paw/discovery/<work-id>/Correlation.md`
- **Roadmap**: `.paw/discovery/<work-id>/Roadmap.md`

## Review Criteria
1. **Extraction Completeness**: Are all key themes from input documents captured?
2. **Source Attribution**: Does every theme cite specific documents and sections?
3. **Capability Coverage**: Does the capability map reflect actual codebase features?
4. **Correlation Accuracy**: Are theme-capability connections logical and well-reasoned?
5. **Prioritization Rationale**: Does each roadmap item have clear 5-factor justification?
6. **Actionability**: Can the top roadmap item be handed off to PAW for implementation?
7. **Artifact Consistency**: Do artifacts reference each other correctly?
```

**Key insight**: The current shared prompt provides general review criteria but doesn't leverage specialist cognitive strategies. Discovery-specific specialists would provide domain-focused cognitive strategies for each review criterion area.

---

## Q5: Per-Stage Discovery Review Criteria

### Extraction Review Criteria

**Location**: `skills/paw-discovery-extraction-review/SKILL.md:12-53`

| Category | Criteria |
|----------|----------|
| **Document Coverage** | All inputs processed, source documents match actual inputs, token counts reasonable |
| **Theme Quality** | Clear actionable descriptions, source attribution present, confidence levels assigned, no placeholders |
| **Category Completeness** | Features/User Needs sections populated, at least one category has content, categories reflect actual input |
| **Conflict Handling** | Conflicts detected, surfaced for resolution, outcomes documented, no unresolved tags |
| **Interactive Refinement** | Q&A conducted, ambiguous items clarified, open questions captured |
| **Artifact Integrity** | Valid YAML, status complete, theme count matches, well-structured |

**Quality Thresholds** (lines 84-89):
- Document coverage: 100% of inputs processed
- Source attribution: 100% of themes attributed
- Category population: ≥1 category with ≥1 theme
- Conflict resolution: 0 unresolved conflicts
- Artifact validity: Valid YAML, complete sections

### Mapping Review Criteria

**Location**: `skills/paw-discovery-mapping-review/SKILL.md:12-47`

| Category | Criteria |
|----------|----------|
| **Capability Evidence** | File:line references present, specific (not just directories), descriptions accurate, no fabricated capabilities |
| **Theme Coverage** | Coverage table complete, all themes listed, status assigned, valid theme IDs |
| **Capability Quality** | Clear descriptions, distinct capabilities, useful notes, count ≥3 for non-trivial codebases |
| **Gap Identification** | Gaps listed, explanations reasonable, no obvious capabilities missed |
| **Artifact Integrity** | Valid YAML, status complete, count matches, summary accurate |

**Quality Thresholds** (lines 79-83):
- File:line references: 100% of capabilities
- Theme coverage: 100% of themes listed
- Capability count: ≥3 for non-trivial codebases
- Artifact validity: Valid YAML, complete sections

### Correlation Review Criteria

**Location**: `skills/paw-discovery-correlation-review/SKILL.md:12-53`

| Category | Criteria |
|----------|----------|
| **Theme Coverage** | All themes in matrix, none missing/orphaned, IDs match between artifacts |
| **Correlation Completeness** | Every theme has type assigned, valid types (match/gap/combination/partial), confidence assigned, rationale provided |
| **Evidence Quality** | Matches reference valid capability IDs, gaps have explanations, combinations identify capabilities, partial matches specify scope |
| **Logical Consistency** | No obvious correlations missed, types match relationship, confidence justified, strategic insights supported |
| **Relevance Assessment** | Mismatch addressed if applicable, user decision documented, domain alignment reasonable |
| **Artifact Integrity** | Valid YAML, counts match, status complete, sections populated |

**Quality Thresholds** (lines 87-90):
- Theme coverage: 100% of themes correlated
- Correlation type assignment: 100% have valid type
- Confidence levels: 100% assigned
- Rationale: Present for all correlations
- Artifact validity: Valid YAML, complete sections

### Prioritization Review Criteria

**Location**: `skills/paw-discovery-prioritize-review/SKILL.md:12-55`

| Category | Criteria |
|----------|----------|
| **Multi-Factor Rationale** | All 5 factors scored (value, effort, dependencies, risk, leverage), scores justified, user adjustments documented, tradeoffs discussed |
| **Priority Logic** | Order logically consistent, dependencies respected, blockers prioritized, high-value/low-effort favored |
| **Item Completeness** | Theme reference present, correlation type specified, rationale explains position, no placeholders |
| **PAW Handoff Quality** | Top priority clearly identified, handoff brief actionable, work title appropriate, description sufficient, context references artifacts |
| **Coverage** | All themes accounted for, deferred items have rationale, no orphaned themes |
| **Artifact Integrity** | Valid YAML, count matches, status complete, paw_handoff_ready set |

**Quality Thresholds** (lines 93-97):
- Factor scoring: 5 factors for each item
- Item completeness: All fields populated
- Handoff quality: Actionable brief present
- Theme coverage: 100% accounted for
- Artifact validity: Valid YAML, complete sections

---

## Implementation Insights

### Specialist Cognitive Strategy Patterns

From existing specialists, cognitive strategies follow a consistent pattern:
1. **Survey/identify** — scan the target to identify relevant elements
2. **Trace/map** — follow relationships and connections
3. **Classify/evaluate** — apply domain-specific criteria
4. **Check/validate** — verify against documented requirements
5. **Prioritize/escalate** — rank findings by severity and impact

### Domain Boundary Pattern

Each specialist explicitly states:
- **IS my territory**: Specific concerns I own
- **IS NOT my territory**: Concerns that belong to other specialists
- Clear handoff rules when finding crosses boundaries

### Preamble vs Specialist Content

The `type` field preamble provides:
- Context framing (what KIND of thing you're reviewing)
- Output expectations (what to cite: lines vs sections)

The specialist content provides:
- Cognitive strategy (HOW to think about the review)
- Domain expertise (WHAT to look for)
- Behavioral rules (HOW to behave)

**For Discovery specialists**: The `type: artifacts` preamble already provides appropriate framing. Discovery specialists need to provide domain-specific cognitive strategies for extraction completeness, correlation accuracy, prioritization logic, etc.

### No Frontmatter in Built-in Specialists

Current built-in specialists have NO YAML frontmatter — they're pure markdown. Optional frontmatter fields:
- `model:` — override model for this specialist
- `shared_rules_included: true` — skip shared rules injection

Discovery specialists could follow the same pattern (no frontmatter required).

---

## Documentation Infrastructure

**No existing documentation infrastructure found** for specialists. New Discovery specialists would be the first domain-specific specialist set.

Potential locations:
- `skills/paw-sot/references/specialists/discovery/` — subdirectory for Discovery specialists
- `skills/paw-discovery-specialists/` — separate skill with specialist files in `references/`

The spec mentions ".paw/sot-specialists/" for Discovery specialists, which would be:
- Project-level: `.paw/sot-specialists/` (shipped with PAW)
- Not user-level or workflow-level

---

## Summary

| Question | Key Finding | Location |
|----------|-------------|----------|
| Q1: Discovery mechanism | 4-level precedence, adaptive selection analyzes "change categories" | SKILL.md:49-83 |
| Q2: Specialist format | Pure markdown, no frontmatter required, consistent section structure | security.md (full file) |
| Q3: Type field handling | Preamble injected between shared rules and specialist content | SKILL.md:36-48, 87-96 |
| Q4: Final-review invocation | `type: artifacts`, shared review prompt, no custom framing | final-review SKILL.md:90-93, 49-77 |
| Q5: Per-stage criteria | 6 categories each with specific quality thresholds | extraction/mapping/correlation/prioritize review SKILLs |
