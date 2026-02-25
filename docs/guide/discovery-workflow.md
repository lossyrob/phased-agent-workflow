# Discovery Workflow

The Discovery Workflow transforms scattered input documents—PRDs, meeting notes, RFCs, Slack exports—into a prioritized MVP roadmap by correlating product vision with existing codebase capabilities.

```mermaid
graph LR
    A[Documents] --> B[Extraction]
    B --> C[Mapping]
    C --> D[Correlation]
    D --> E[Journey Grounding]
    E --> F[Roadmap]
    F --> G[PAW Handoff]
```

## When to Use Discovery

Use the Discovery Workflow when:

- You have a collection of planning documents (PRD, RFC, meeting notes) that need consolidation
- You want to understand what your codebase can already do before planning new work
- You need to prioritize features based on effort, value, and existing capabilities
- You want to automatically generate actionable work items for PAW implementation

## How to Invoke

1. **Initialize a Discovery session** with a title:
   ```
   Let's start a Discovery workflow for "Q1 Planning"
   ```

2. **Add input documents** to the created `inputs/` folder:
   ```
   .paw/discovery/q1-planning/inputs/
   ├── product-roadmap.md
   ├── engineering-rfcs/
   │   ├── auth-v2.md
   │   └── search-improvements.md
   ├── meeting-notes.docx
   └── stakeholder-feedback.pdf
   ```

3. **Run the workflow** — The agent will guide you through each stage

## Input Document Preparation

### Supported Formats

| Format | Support |
|--------|---------|
| Markdown (`.md`) | Native |
| Word (`.docx`) | Converted to markdown |
| PDF (`.pdf`) | Text extracted (text-based PDFs only) |
| Plain text (`.txt`) | Native |

### Organization Tips

- Use subdirectories to organize related documents
- Include context in filenames (e.g., `2024-q1-planning-meeting.md`)
- Provide a brief description file if document purposes aren't obvious
- Image-only PDFs or scanned documents are not supported

## Workflow Stages

### Stage 1: Extraction

**Skill**: `paw-discovery-extraction`

Processes all documents in `inputs/` to extract themes, requirements, and decisions:

- Converts `.docx` files to markdown
- Extracts text from PDF files
- Identifies themes across documents with source attribution
- Produces `Extraction.md` with structured findings

**Output**: `Extraction.md`

### Stage 2: Mapping

**Skill**: `paw-discovery-mapping`

Analyzes your codebase to inventory existing capabilities:

- Delegates to `paw-code-research` for systematic codebase exploration
- Identifies reusable modules, services, and patterns
- Maps capabilities with file:line references

**Output**: `CapabilityMap.md`

### Stage 3: Correlation

**Skill**: `paw-discovery-correlation`

Cross-references extracted themes with mapped capabilities:

- Identifies which themes are **supported** by existing code
- Finds **gaps** requiring new implementation
- Spots **combination opportunities** where features can share infrastructure
- Flags **conflicts** needing resolution

**Output**: `Correlation.md`

### Stage 4: Journey Grounding

**Skill**: `paw-discovery-journey-grounding`

Extracts user pain points and synthesizes user journeys from source documents:

- Extracts **pain points** with direct quotes and source references
- Identifies **journey models** (patterns/flows) stated in sources
- Synthesizes **concrete user journeys** showing how users achieve goals
- Maps **features to journeys** showing which features enable which journeys
- Applies **source tracing** distinguishing grounded insights from agent synthesis

**Output**: `JourneyMap.md`

After review, an interactive **Journey Scoping** checkpoint lets you define MVP depth (Full/Partial/Minimal) for each journey before prioritization.

### Stage 5: Prioritization

**Skill**: `paw-discovery-prioritize`

Produces a ranked MVP roadmap using multi-factor analysis:

1. **Business Value** — Impact on users, revenue, strategic goals
2. **Technical Feasibility** — How much existing code can be reused
3. **Effort Estimate** — Implementation complexity (T-shirt sizing)
4. **Dependencies** — What must be built first
5. **Risk Assessment** — Technical and business risks
6. **Journey Criticality** — Is the feature required for an MVP-scoped journey?
7. **Pain Point Severity** — How severe is the problem this feature addresses?

**Output**: `Roadmap.md`

## Artifacts

All artifacts are created in your Discovery work directory:

```
.paw/discovery/<work-id>/
├── inputs/              # Your input documents
├── DiscoveryContext.md  # Workflow state and configuration
├── Extraction.md        # Themes with source attribution
├── CapabilityMap.md     # Codebase capabilities inventory
├── Correlation.md       # Theme ↔ capability connections
├── JourneyMap.md        # Pain points, user journeys, MVP scoping
└── Roadmap.md           # Prioritized MVP items
```

## PAW Handoff

At Discovery completion, the workflow offers to initiate PAW implementation for the top-priority roadmap item:

```
Ready to implement "User Authentication v2"? I can start a PAW workflow.
```

Accepting creates a new PAW work with:

- Brief extracted from the roadmap item
- References to Discovery artifacts for context
- Pre-populated understanding of relevant codebase capabilities

## Re-running with New Inputs

Discovery supports iterative refinement. When you add new documents to `inputs/`:

1. **Request re-extraction**: "Re-run extraction with the new documents"
2. **Cascade invalidation**: Downstream artifacts (Mapping, Correlation, Roadmap) are marked stale
3. **Automatic re-run**: The workflow re-processes affected stages

The `DiscoveryContext.md` tracks which stages need re-running.

## Review Policy

Discovery supports the same review policies as PAW Implementation:

| Policy | Behavior |
|--------|----------|
| `every-stage` | Pause after each artifact for review |
| `final-only` | Only pause at Roadmap completion |

Each stage includes a mandatory review skill regardless of policy.

## Example Session

```
User: Let's start a Discovery workflow for "Mobile App Features"

Agent: Created .paw/discovery/mobile-app-features/
       Please add your input documents to:
       .paw/discovery/mobile-app-features/inputs/

User: Done, I added the PRD and meeting notes.

Agent: Starting extraction...
       [Processes documents, creates Extraction.md]
       Found 12 themes across 3 documents.
       
       Running extraction review...
       [Review passes]
       
       Proceeding to mapping stage...
       [Analyzes codebase, creates CapabilityMap.md]
       Identified 45 existing capabilities.
       
       [... continues through correlation and prioritization ...]
       
       Discovery complete! Roadmap.md contains 8 prioritized items.
       
       Top priority: "Push Notification Service"
       Ready to start a PAW workflow for this item?

User: Yes, let's implement push notifications.

Agent: Initializing PAW workflow for "push-notification-service"...
```

## Next Steps

- [Implementation Workflow](two-workflows.md#paw-implementation-workflow) — How PAW implements roadmap items
- [Workflow Modes](workflow-modes.md) — Configure Discovery and PAW together
- [Stage Transitions](stage-transitions.md) — Understanding review policies
