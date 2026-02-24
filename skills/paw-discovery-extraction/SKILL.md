---
name: paw-discovery-extraction
description: Extraction activity skill for PAW Discovery workflow. Processes input documents (docx/PDF conversion), extracts structured themes, and supports interactive Q&A for refinement.
---

# Discovery Extraction

> **Execution Context**: This skill runs **directly** in the PAW Discovery session (not a subagent), preserving user interactivity for Q&A refinement.

Process input documents and extract structured themes with source attribution. Supports heterogeneous inputs including Word documents and text-based PDFs.

## Capabilities

- Convert .docx files to markdown (mammoth)
- Convert text-based PDF files to text (pdf-parse)
- Read markdown and plain text files natively
- Extract structured themes: features, user needs, constraints, vision statements
- Interactive Q&A to validate and refine understanding
- Detect and surface document conflicts
- Warn about scale limits (token overflow)
- Generate Extraction.md with YAML frontmatter

## Document Conversion

### Supported Formats

| Format | Extension | Approach |
|--------|-----------|----------|
| Markdown | .md | Native read via `view` tool |
| Plain text | .txt | Native read via `view` tool |
| Word | .docx | Load `docx` skill or use `pandoc` |
| PDF (text) | .pdf | Load `pdf` skill or use `pypdf` |

### Security Note

When processing filenames from `inputs/`:
- Validate filenames contain only safe characters (alphanumeric, hyphens, underscores, dots)
- Reject or sanitize filenames with shell metacharacters (`$`, `;`, `|`, etc.)
- Use quoted paths in shell commands to prevent injection

### Conversion Approaches

**Option 1: Use installed document skills (Recommended)**

If the user has the `docx` and `pdf` skills installed (from Anthropic skills package), load and invoke them:

- For `.docx`: Load `docx` skill, use its `pandoc` command or unpack/read approach
- For `.pdf`: Load `pdf` skill, use its `pypdf`/`pdfplumber` extraction patterns

**Option 2: Direct CLI commands**

If skills aren't available, use standard tools:

**Word documents (.docx)**:
```bash
pandoc "document.docx" -o "document.md"
cat "document.md"
```

**PDF documents (.pdf)**:
```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text()
print(text)
```

### Conversion Process

1. Scan `inputs/` folder for all files
2. For each file, determine type by extension
3. Convert non-native formats using commands above
4. Combine all content for theme extraction

**Note**: Image-based PDFs are not supported. If pypdf/pdfplumber returns minimal text, warn user that the PDF may be image-based and suggest OCR or alternative format.

## Theme Extraction

### Theme Categories

Extract and categorize content into:

- **Features**: Proposed capabilities, functionality, or behaviors
- **User Needs**: Problems to solve, jobs-to-be-done, pain points
- **Constraints**: Limitations, requirements, boundaries
- **Vision Statements**: Long-term goals, strategic direction
- **Open Questions**: Unresolved items requiring clarification

### Source Attribution

Every extracted theme MUST include:
- Source document path (e.g., `inputs/roadmap.md`)
- Relevant quote or paraphrase
- Theme confidence (high/medium/low based on clarity in source)

## Interactive Q&A Phase

After initial extraction, engage user to validate understanding.

### When to Ask

- Ambiguous themes that could be interpreted multiple ways
- Apparent conflicts between documents
- Gaps in coverage (expected areas with no themes)
- Low-confidence extractions

### Question Guidelines

- One question at a time
- Prefer multiple choice when options are enumerable
- Include recommendation when you have one
- Exit after ~5-10 questions or when user signals done

### Conflict Detection

When documents contain contradictory information:
1. Surface the conflict explicitly
2. Quote both sources
3. Ask user to clarify which interpretation is correct
4. Document resolution in Extraction.md

## Edge Case Handling

### Scale Limits

When total input content approaches context limits:
1. Calculate approximate token count across all inputs
2. If exceeding practical limits (~50k tokens), warn user
3. Suggest prioritizing most important documents
4. Offer to proceed with subset

### Contradictory Documents

When detecting conflicting information:
1. Extract both versions as separate themes
2. Mark with `[CONFLICT]` tag
3. Surface in Q&A phase for resolution
4. Document final resolution with rationale

### Empty or Minimal Inputs

If `inputs/` folder is empty or contains only trivial content:
1. Report to user
2. Ask for additional documents or clarification
3. Do not generate Extraction.md until meaningful input exists

## Extraction.md Artifact

Save to: `.paw/discovery/<work-id>/Extraction.md`

### Template

```markdown
---
date: [ISO timestamp]
work_id: [work-id]
source_documents:
  - path: inputs/doc1.md
    type: markdown
    tokens: [approximate]
  - path: inputs/doc2.docx
    type: docx (converted)
    tokens: [approximate]
theme_count: [N]
conflict_count: [resolved conflicts]
status: complete
---

# Extraction: [Work Title]

## Summary

[2-3 sentence overview of what was extracted and key themes]

## Features

### F1: [Feature Name]
- **Description**: [What this feature does]
- **Source**: `inputs/roadmap.md` - "[relevant quote]"
- **Confidence**: high

### F2: [Feature Name]
...

## User Needs

### N1: [Need Name]
- **Description**: [The problem or job-to-be-done]
- **Source**: `inputs/research.pdf` - "[relevant quote]"
- **Confidence**: medium

...

## Constraints

### C1: [Constraint Name]
- **Description**: [The limitation or boundary]
- **Source**: `inputs/requirements.docx` - "[relevant quote]"
- **Confidence**: high

...

## Vision Statements

### V1: [Vision Statement]
- **Description**: [Long-term goal or direction]
- **Source**: `inputs/strategy.md` - "[relevant quote]"
- **Confidence**: high

...

## Open Questions

- [Question 1] - surfaced during extraction, not resolved in Q&A
- [Question 2]

## Conflict Resolutions

### CR1: [Conflict Description]
- **Source A**: `inputs/doc1.md` - "[quote]"
- **Source B**: `inputs/doc2.md` - "[quote]"
- **Resolution**: [User decision and rationale]
```

## Execution

### Desired End States

- All input documents processed (converted if needed)
- Themes extracted with source attribution
- Conflicts detected and resolved via Q&A
- Scale warnings surfaced if applicable
- Extraction.md saved with valid YAML frontmatter

### Re-extraction Flow

When re-invoked after inputs change:
1. Compare current `inputs/` with last extraction's source list
2. Identify new/modified/removed files
3. Full re-extraction (not incremental merge)
4. Preserve user decisions from previous conflict resolutions if applicable

## Quality Checklist

- [ ] All input documents processed
- [ ] Themes have source attribution with document path
- [ ] Conflicts detected and surfaced for resolution
- [ ] Q&A phase completed or user signaled done
- [ ] Scale warnings surfaced if inputs are large
- [ ] Extraction.md has valid YAML frontmatter
- [ ] Theme categories are populated (features, needs, constraints, vision)
- [ ] DiscoveryContext.md updated with current inputs list

## Completion Response

Report to PAW Discovery agent:
- Artifact path: `.paw/discovery/<work-id>/Extraction.md`
- Theme counts by category
- Conflict resolutions (if any)
- Open questions (if any)
- Ready for extraction review

**State Update**: Update DiscoveryContext.md with:
- `last_extraction_inputs`: List of files processed (enables re-invocation detection)
- Stage Progress table: Mark Extraction as `complete`
