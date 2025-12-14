# Documentation Structure Survey

The Documenter agent now surveys your project's documentation structure before creating documentation. This enables feature guides to integrate with your existing documentation navigation rather than remaining isolated.

## How It Works

When the Documenter runs, it automatically:

1. **Detects documentation frameworks** (MkDocs, Docusaurus, VuePress, Sphinx, Jekyll)
2. **Discovers organization patterns** (guide/, reference/, tutorial/ directories)
3. **Identifies navigation configuration** (mkdocs.yml nav, index files)
4. **Creates integrated documentation** when appropriate

## What Gets Created

### For MkDocs Projects with Guide Directory

- **Feature guide** at `docs/guide/<feature-name>.md` with user-focused content
- **Navigation update** in `mkdocs.yml` under User Guide
- **Index update** in `docs/guide/index.md` if it contains guide links

### For Other Projects

- **Standard Docs.md** with survey findings noted
- **README/CHANGELOG updates** as before
- No guide creation for non-MkDocs projects (future enhancement)

## Survey Findings

Every `Docs.md` includes a Documentation Structure section:

```markdown
## Documentation Structure

- **Framework**: MkDocs
- **Docs Directory**: docs/ | **Guide Directory**: docs/guide/
- **Navigation Config**: mkdocs.yml nav section
- **Feature Guide**: Created at docs/guide/my-feature.md
```

## When Guides Are Created

The Documenter exercises judgment about guide creation:

| Scenario | Guide Created? |
|----------|----------------|
| Significant user-facing feature | ✅ Yes |
| Minor bug fix | ❌ No |
| Internal refactoring | ❌ No |
| New workflow or process | ✅ Yes |

## Framework Support

| Framework | Detection | Guide Creation |
|-----------|-----------|----------------|
| MkDocs | ✅ Full | ✅ Supported |
| Docusaurus | ✅ Detection only | ❌ Future |
| VuePress | ✅ Detection only | ❌ Future |
| Sphinx | ✅ Detection only | ❌ Future |
| Jekyll | ✅ Detection only | ❌ Future |

## Next Steps

- [Getting Started](index.md) — Quick start with PAW
- [Workflow Modes](workflow-modes.md) — Choose the right mode for your task
- [Custom Instructions](custom-instructions.md) — Project-specific configuration
