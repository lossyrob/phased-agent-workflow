# Developing PAW (Phased Agent Workflow)

This document contains information for developers working on the Phased Agent Workflow project.

## Development Setup

### Prerequisites

- **Node.js** (v16 or higher) - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)

### Install Dependencies

Install all required development dependencies:

```bash
npm install
```

## Development Scripts

### Prompting Linting

Agent and skill files should be kept within reasonable token limits to ensure they work effectively with language models.

**Script**: `scripts/lint-prompting.sh`

**Usage**:
```bash
# Lint all agent files in agents/
./scripts/lint-prompting.sh

# Lint a specific agent file
./scripts/lint-prompting.sh agents/PAW.agent.md

# Lint all skill files in skills/
./scripts/lint-prompting.sh --skills

# Lint both agents and skills
./scripts/lint-prompting.sh --all

# Lint a specific skill file
./scripts/lint-prompting.sh skills/paw-workflow/SKILL.md
```

**npm Scripts**:
```bash
# Lint all agents
npm run lint:agent

# Lint all agents and skills
npm run lint:agent:all

# Lint only skills
npm run lint:skills
```

**Token Thresholds**:

| File Type | Warning | Error |
|-----------|---------|-------|
| Agents (default) | 5,000 tokens | 7,000 tokens |
| Skills | 8,000 tokens | 12,000 tokens |
| Status Agent | 5,000 tokens | 8,000 tokens |
| Spec Agent | 5,000 tokens | 10,000 tokens |

Skills have higher thresholds since they are loaded on-demand rather than included in every prompt.

The linter uses `@dqbd/tiktoken` with the `gpt-4o-mini` model to count tokens, which provides accurate token counts for OpenAI models.

**Best Practices**:
- Keep agent files focused and concise
- Break up large instructions into multiple sections
- Remove redundant or overly verbose explanations
- Run the linter before committing changes to agent files

## VS Code Extension Development

The PAW Workflow extension automatically installs PAW agents and provides commands to streamline work item initialization.

### Prerequisites

- Node.js 16.x or later
- npm 7.x or later
- VS Code 1.85.0 or later

### Setup for Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Compile TypeScript sources:**
   ```bash
   npm run compile
   ```

3. **Run automated tests (optional but recommended):**
   ```bash
   npm test
   ```

4. **Package the extension:**
   ```bash
   npm run package
   ```
   The compiled `.vsix` file will be created in the repository root.

### Installing the Packaged Extension

Use either the VS Code UI or the command line.

#### Command Line

```bash
code --install-extension paw-workflow-0.0.1-dev.vsix
```

#### VS Code UI

1. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Open the overflow menu (`…`) and choose **Install from VSIX...**.
3. Select `paw-workflow-0.0.1-dev.vsix` from the extension directory.
4. Reload VS Code when prompted.

### Development Workflow

- Launch the extension in an Extension Development Host by pressing `F5` in VS Code.
- Use `npm run watch` to recompile on TypeScript file changes.
- Reload the development host window (`Ctrl+R` / `Cmd+R`) after changes.

### Developing PAW with PAW

When developing PAW itself using PAW agents:

1. **Make agent changes** in `agents/` directory
2. **Build and install VSIX**: `npm run package && code --install-extension paw-workflow-0.0.1-dev.vsix`
3. **Reload VS Code** to use updated agents in your PAW workflow
4. **Important**: Local agent changes DO NOT automatically update installed agents. You must rebuild and reinstall the VSIX to test agent modifications.

This workflow prevents mid-session agent changes from disrupting active PAW workflows.

### Development Version Behavior

Local builds use version `0.0.1-dev`, which forces agent reinstallation on every activation so agent content changes are reflected immediately. Production releases overwrite this version number during the GitHub Actions release workflow.

#### Testing Agent Changes

1. Modify agents in `agents/`
2. Run `npm run package`
3. Install the VSIX: `code --install-extension paw-workflow-0.0.1-dev.vsix`
4. Reload VS Code and monitor the **PAW Workflow** output channel for the "Development build detected" log
5. Validate agents inside Copilot Chat

#### Testing Migration Logic

Use `scripts/test-migration.sh` to build VSIX files with temporary versions:

```bash
# Build VSIX tagged as 0.2.0
./scripts/test-migration.sh 0.2.0

# Return to dev version builds
./scripts/test-migration.sh 0.0.1-dev
```

The script updates `package.json`, runs the standard VSIX build, restores the original version, and prints follow-up installation steps. After installing each VSIX, reload VS Code and verify the migration logs plus agent availability.

#### Production Releases

- Keep `package.json` set to `0.0.1-dev` locally
- When tagging a release, the workflow replaces the version with the tag (e.g., `v0.2.0` -> `0.2.0`)
- Published VSIX files therefore use their tag-based semantic version instead of `-dev`

### Uninstalling

```bash
code --uninstall-extension paw-workflow.paw-workflow
```

Or uninstall from the Extensions view inside VS Code.

## Documentation Development

PAW documentation is built with MkDocs and the Material theme, publishing to GitHub Pages at https://lossyrob.github.io/phased-agent-workflow.

### Prerequisites

- Python 3.x
- Virtual environment with `mkdocs-material` installed

### Setup

```bash
# Create and activate virtual environment (if not already done)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install MkDocs and Material theme
pip install mkdocs-material
```

### Local Development

```bash
# Activate virtual environment
source .venv/bin/activate

# Build the site (validates config and links)
mkdocs build

# Serve locally with live reload
mkdocs serve
# Visit http://localhost:8000
```

### Documentation Structure

```
docs/
├── index.md                    # Landing page
├── guide/                      # User guides
│   ├── index.md               # Getting Started
│   ├── vscode-extension.md    # Extension commands and config
│   ├── workflow-modes.md      # Full/Minimal/Custom modes
│   └── ...
├── specification/              # Technical specifications
│   ├── index.md               # Overview
│   ├── implementation.md      # Implementation workflow
│   └── review.md              # Review workflow
└── reference/                  # Reference documentation
    ├── agents.md              # All PAW agents
    └── artifacts.md           # Artifact descriptions
```

### Adding New Pages

1. Create a new Markdown file in the appropriate `docs/` subdirectory
2. Add the page to navigation in `mkdocs.yml` under the `nav:` section
3. Run `mkdocs build --strict` to validate links before committing

### Deployment

Documentation deploys automatically when changes to `docs/**` or `mkdocs.yml` are merged to `main`. The GitHub Actions workflow handles building and publishing to the `gh-pages` branch.

## GitHub Actions Workflows

PAW includes automated workflows for the VS Code extension and documentation:

### Release Workflow

Automatically creates GitHub Releases with VSIX files when version tags are pushed.

**Usage**:
1. Tag: `git tag v0.2.0`
2. Push: `git push origin <branch> && git push origin v0.2.0`

The workflow builds the extension, packages it as VSIX, generates a changelog, and creates a GitHub Release. The tag version automatically becomes the VSIX version (no manual `package.json` updates needed). Odd minor versions (`0.1.x`, `0.3.x`) are marked as pre-releases; even versions (`0.2.x`, `0.4.x`) are stable releases.

### PR Gate Workflow

Runs automated quality checks on pull requests before merging.

**Checks**:
- Extension unit tests
- Agent file linting (token limits)

The workflow triggers automatically on PRs to `main` or `feature/**` branches when relevant files change. Failed checks prevent merge when branch protection is enabled.

### Documentation Workflow

Builds and deploys documentation to GitHub Pages when changes are merged to main.

**Triggers**: Pushes to `main` that modify `docs/**`, `mkdocs.yml`, or `.github/workflows/docs.yml`

**Process**:
1. Sets up Python and caches Material theme assets
2. Installs `mkdocs-material`
3. Runs `mkdocs gh-deploy --force` to build and push to `gh-pages` branch
4. Site updates at https://lossyrob.github.io/phased-agent-workflow

## Integration Testing

PAW includes an integration testing framework that programmatically drives Copilot SDK sessions to verify skill behavior end-to-end.

### Prerequisites

- **GitHub Copilot CLI** - Must be authenticated (`copilot auth status`)
- **Node.js** (v18 or higher)

### Setup

Install integration test dependencies:

```bash
cd tests/integration
npm install
```

### Running Tests

From the **repository root**:

```bash
# All integration tests
npm run test:integration

# Only skill-level tests (fast, no LLM calls)
npm run test:integration:skills

# Only workflow tests (slow, requires Copilot auth)
npm run test:integration:workflows
```

### Architecture

The framework provides five core components:

| Component | Purpose |
|-----------|---------|
| **TestFixture** | Clones template repos into temp directories for test isolation |
| **RuleBasedAnswerer** | Deterministic auto-responder with configurable rules (fail-closed by default) |
| **HybridAnswerer** | Rules-first answerer that falls back to an LLM session for unmatched questions |
| **ToolPolicy** | Sandboxes tool execution—blocks git push, GitHub writes, filesystem escapes |
| **ToolCallLog** | Records all tool invocations for assertion |
| **Assertions** | Helpers for artifact existence, spec/plan structure, tool call patterns |

`HybridAnswerer` tries deterministic rules first (fast, free). If no rule matches, it asks a separate Copilot SDK session to answer the question — or reject it if the question seems off-track. This avoids the brittleness of pure regex matching while keeping the fail-closed safety net.

### Debug Mode

Set environment variables for troubleshooting:

```bash
# Keep temp workspaces after test completion
PAW_TEST_KEEP_WORKSPACE=1 npm run test:integration

# Enable verbose logging
PAW_TEST_DEBUG=1 npm run test:integration
```

### Writing New Tests

1. **Skill-level tests** (no LLM): Test harness components directly. Place in `tests/integration/tests/skills/`.
2. **Workflow tests** (LLM required): Drive full PAW stages via SDK sessions. Place in `tests/integration/tests/workflows/`.

Fixture templates live in `tests/integration/fixtures/`. Pre-built workflow artifacts (specs, plans) live in `tests/integration/fixtures/seeds/`.

## Project Structure

- `agents/` - PAW agent definitions (bundled in VS Code extension)
- `.github/workflows/` - GitHub Actions workflows for releases and PR checks
- `scripts/` - Development and utility scripts
- `src/` - VS Code extension TypeScript source code
- `out/` - Compiled JavaScript (generated by TypeScript compiler)
- `tests/integration/` - Integration testing framework (Copilot SDK + Node test runner)
