# Spec Research: Agent Installation Management

**Summary**: Research reveals that VS Code does not expose the profile path through its extension API, preventing extensions from programmatically installing agent files to the user profile's `prompts/` directory. Extension activation is event-driven (not automatic on install/update), requiring explicit activation events like `onStartupFinished`. File operations should be non-blocking with graceful error handling, and installation logic should be idempotent to handle interruptions. Agent discovery happens at Copilot startup, likely requiring a VS Code reload after new agents are installed. Safe migration requires version-based cleanup that preserves user customizations in separate directories. Version strings can technically be embedded in agent descriptions but don't align with VS Code conventions - internal version tracking is preferred.

## Research Findings

### Question 1: VS Code Profile Folder Location

**Question**: What is the API to programmatically determine the current VS Code profile's folder path? What are the fallback behaviors if profile support is unavailable or the API changes?

**Answer**: VS Code does not provide a direct API to programmatically determine the profile's folder path. User prompt files (including custom agents stored as `.agent.md` files) are stored in the current VS Code profile, but extensions cannot query the profile path directly through the VS Code API. The documented profile locations are platform-specific:
- Windows: `%APPDATA%\Code\User\prompts`
- macOS: `$HOME/Library/Application Support/Code/User/prompts`  
- Linux: `$HOME/.config/Code/User/prompts`

VS Code's `ExtensionContext` provides `globalStorageUri` for extension-specific global storage, but this is separate from the profile's `prompts/` directory where user prompt files and agent definitions are discovered.

**Evidence**: VS Code documentation states "User prompt files: Are available across multiple workspaces and are stored in the current VS Code profile." The VS Code API reference shows `ExtensionContext.globalStorageUri` and `env.appRoot`, but no profile path API. Web search confirms platform-specific paths under `User/prompts` within the VS Code user data directory.

**Implications**: Extensions cannot programmatically install agent files to the profile's `prompts/` directory because the profile path is not exposed through the API. Manual installation or alternative approaches (workspace-level agents in `.github/agents/`) would be needed.

### Question 2: Extension Activation Events

**Question**: When exactly does the VS Code extension `activate()` function get called during initial installation vs during extension updates/upgrades? Is there a way to detect if activation is happening due to an upgrade vs first install?

**Answer**: The `activate()` function is called when the extension is first needed based on its `activationEvents`. In the current PAW extension, `activationEvents` is an empty array, which means lazy activation (activated only when one of its commands is invoked). The function is NOT automatically called on installation or update - activation happens when the user first invokes a contributed command or when specified activation events occur (e.g., `onStartupFinished`, `onLanguage:python`, etc.).

VS Code does not provide a built-in API to detect whether activation is happening due to first install vs. upgrade. Extensions can implement their own detection by storing a version marker in `ExtensionContext.globalState` and comparing it with the current `extension.packageJSON.version` during activation.

**Evidence**: The current extension's `package.json` shows `"activationEvents": []` with comment indicating lazy activation. VS Code documentation shows activation events like `onStartupFinished` that trigger activation at specific times. The extension's `activate()` function is called when a command is invoked.

**Implications**: If agent files need to be installed during activation, the extension would need an activation event that triggers appropriately (e.g., `onStartupFinished` for first launch after install/update). Version detection logic would need to be implemented using `globalState` to distinguish first install from updates.

### Question 3: File System Error Handling

**Question**: What are the expected behaviors when the extension cannot write to the profile's `prompts/` directory (permissions issues, disk full, directory locked)? Should the extension fail silently, show warnings, or block activation?

**Answer**: VS Code's file system API provides error types for different failure scenarios (`FileSystemError.NoPermissions`, `FileSystemError.Unavailable`), and extensions should handle these gracefully. The standard pattern is to allow activation to succeed even if optional file operations fail, while notifying the user of the problem.

Based on the current extension's patterns:
- Output channel logs are used for operational transparency
- User notifications (`vscode.window.showErrorMessage`) are displayed for critical failures
- The extension continues functioning even if optional operations fail (graceful degradation)

For file write failures during agent installation, the extension should:
- Log detailed error information to the output channel
- Show a user-facing error notification explaining the problem
- Allow activation to complete successfully (don't block)
- Provide actionable guidance (check permissions, disk space, etc.)

**Evidence**: Current extension uses `vscode.window.createOutputChannel` for logging and handles file operations with try/catch (seen in `customInstructions.ts`). VS Code API provides `FileSystemError` types for different failure scenarios.

**Implications**: Agent installation failures should be non-blocking but clearly communicated to users with actionable error messages and detailed logging for troubleshooting.

### Question 4: Atomic File Operations

**Question**: If the extension needs to write multiple agent files during activation, what happens if the process is interrupted (VS Code crash, system shutdown)? Should partial installations be detected and cleaned up on next activation?

**Answer**: VS Code's file system API does not provide native transactional or atomic multi-file write operations. If the extension writes multiple files sequentially and the process is interrupted, some files may be written while others are not, resulting in a partial installation state.

The standard pattern for managing this is:
- Write files individually using `workspace.fs.writeFile()`
- Track successful writes (e.g., in `globalState`)
- On next activation, verify installation completeness
- Re-write missing or outdated files as needed
- Use version markers to detect when installed files are stale

VS Code itself does not automatically clean up partial file writes - the extension must implement its own validation and repair logic. A common approach is to treat each activation as idempotent: check what files exist, compare versions if applicable, and ensure all required files are present and current.

**Evidence**: VS Code's workspace.fs API shows individual file operations without transaction support. The current extension's tool registration pattern demonstrates idempotent setup (registering tools on each activation regardless of prior state).

**Implications**: Agent installation should be idempotent - verify completeness on each activation and install/update files as needed. Use version markers to detect when installed agents are outdated. No explicit cleanup of partial installs is necessary; simply ensure all required files are present and current.

### Question 5: Agent File Discovery

**Question**: How does VS Code's GitHub Copilot discover and load agent definition files (`.agent.md`) from the profile's `prompts/` directory? Is there a refresh mechanism, or are files loaded only at VS Code startup?

**Answer**: VS Code discovers agent definition files (`.agent.md`) from two locations:
1. Workspace-level: `.github/prompts/` folder (workspace prompt files)
2. User-level: Profile's `prompts/` folder (user prompt files available across workspaces)

Based on available information, GitHub Copilot's discovery behavior:
- Agent files are recognized during Copilot's initialization/startup
- VS Code supports both legacy `.chatmode.md` and new `.agent.md` extensions during the transition period  
- A GitHub issue mentions agents don't auto-load without restart, suggesting manual refresh capability is limited

There is a command "Chat: Configure Prompt Files" that can be used to manage prompt files, which may trigger re-discovery. However, the primary discovery happens at startup or when the Copilot extension initializes.

**Evidence**: VS Code documentation states "Workspace prompt files: Are only available within the workspace and are stored in the .github/prompts folder" and "User prompt files: Are available across multiple workspaces and are stored in the current VS Code profile." A GitHub issue for Claude Code mentions "[BUG] Agents don't auto-load without restart" suggesting limited refresh mechanisms. The PAW README mentions that copying agents to `.github/agents` makes them available in VS Code's GitHub Copilot chat.

**Implications**: Users would likely need to reload VS Code (or at minimum reload the Copilot extension) after agent files are installed for them to be discovered. The extension should inform users about this requirement after installation.

### Question 6: Migration and Cleanup

**Question**: If agent names or filenames change between PAW versions, what is the safest approach to remove outdated agent files while preserving any user customizations in separate instruction files?

**Answer**: The safest approach follows these principles:

1. **Separate concerns**: PAW already uses a pattern where agent definitions (`.agent.md`) are separate from user customizations (`.paw/instructions/*.md`). Agent files contain core PAW instructions, while customization files contain user-specific overrides.

2. **Version-based cleanup**: Store a manifest or version marker listing the current set of agent filenames. On activation, compare installed files against the manifest and remove files that no longer belong to the current version.

3. **Preserve customization files**: Never delete files in `.paw/instructions/` or other designated user customization locations. Only manage files that the extension explicitly installed.

4. **Safe deletion pattern**:
   - Identify files to remove (old agent files not in current manifest)
   - Verify they're in expected locations (e.g., profile's `prompts/` directory)
   - Delete only files matching known PAW naming patterns
   - Log all deletions for user transparency

5. **Naming convention**: PAW uses a clear naming pattern like "PAW-01A Specification.agent.md" which distinguishes them from user-created files.

**Evidence**: PAW project structure shows separation between agent definitions in `.github/agents/` and user customizations in `.paw/instructions/`. The existing codebase pattern in `customInstructions.ts` demonstrates reading but not modifying user files. The "Move Chatmodes to Agents" work shows PAW renamed files from `.chatmode.md` to `.agent.md`.

**Implications**: Version-based cleanup should track installed agent filenames, remove obsolete files, and never touch user customization directories. Use clear naming conventions to distinguish PAW-managed files from user files.

### Question 7: Version String Format

**Question**: The spec note shows version format as "PAW Planner – v0.4.0" in the YAML description field. Are there any VS Code or Copilot constraints on description field length or format that could affect version display?

**Answer**: Based on existing PAW agent files, the `description` field in the YAML frontmatter is a short text field. Current agents use formats like:
- `'Phased Agent Workflow: Spec Agent'`
- `'PAW Implementation Planner Agent'`  
- `'PAW Researcher agent'`

VS Code's custom agent documentation describes the description field as "A short description of the prompt/agent" but does not specify hard character limits. The description appears in UI elements when browsing or selecting agents. Long descriptions may be truncated in UI displays.

Including version information in the description (e.g., "PAW Planner – v0.4.0") is technically possible, but:
- There is no established convention for this in VS Code agent files
- It mixes identity (agent name) with metadata (version)
- Version management is better handled through the extension's own version tracking

Alternative approaches:
- Store version in a separate custom YAML field (though may not be displayed in UI)
- Rely on extension version for tracking installed agent versions
- Use description for agent purpose only, manage versioning separately

**Evidence**: Examination of existing PAW agent files shows simple descriptive strings in the `description` field without version numbers. VS Code documentation refers to description as providing context about the agent's purpose.

**Implications**: While version strings can be included in description fields, they may clutter the UI and don't align with VS Code conventions. Version tracking should be handled through the extension's internal mechanisms rather than embedding in agent descriptions.

## Open Unknowns

No unanswered internal questions. All questions from the prompt have been researched and answered based on available VS Code documentation, API references, web search results, and the current PAW codebase.

## User-Provided External Knowledge (Manual Fill)

The following optional external/context questions may be answered manually if additional information is needed:

- [ ] **VS Code Profile System**: What are the documented behaviors and limitations of VS Code's profile system regarding extension data storage and profile switching? (Documentation link: https://code.visualstudio.com/docs/editor/profiles)

- [ ] **Custom Instructions Best Practices**: Are there community patterns or recommendations for structuring markdown-based instruction files that get composed/merged? (e.g., heading structure conventions, conflict resolution approaches)

- [ ] **Extension Update Patterns**: What are common patterns used by other VS Code extensions for managing bundled content that needs to be "installed" into user-accessible locations during activation?

---

# **Spec Note: VS Code User Prompt Directory Locations**

VS Code stores user-level Copilot Chat *prompt files* (e.g., `*.agent.md`) in a fixed `prompts/` directory inside the **User Settings Directory**. This directory is **global across all profiles**. Profiles reference these files, but the files themselves are not stored per-profile.

Note that this is not a "profile-specific" directory; rather, it is a user-wide directory that all profiles share.

The locations follow the same structure that VS Code uses for `settings.json`, `keybindings.json`, `snippets/`, and other user-scoped configuration.

## **Windows**

### Stable

```
%APPDATA%\Code\User\prompts\
```

Example:

```
C:\Users\<user>\AppData\Roaming\Code\User\prompts\
```

### Insiders

```
%APPDATA%\Code - Insiders\User\prompts\
```

---

## **macOS**

### Stable

```
~/Library/Application Support/Code/User/prompts/
```

### Insiders

```
~/Library/Application Support/Code - Insiders/User/prompts/
```

---

## **Linux**

### Stable

```
~/.config/Code/User/prompts/
```

### OSS Build (Code - OSS)

```
~/.config/Code - OSS/User/prompts/
```

### VSCodium

```
~/.config/VSCodium/User/prompts/
```

---

## **Notes**

* These directories are deterministic and follow VS Code’s long-established user data conventions.
* There is **no VS Code API** to retrieve the prompts directory programmatically.
* PAW should rely on these known paths when discovering or installing user prompt files, with fallback user selection if multiple or none are found.

---

## 2. Custom instructions in Markdown – structure & composition patterns

There isn’t one canonical spec, but there *are* recurring patterns in prompt-engineering and docs best-practices around Markdown instructions:([Gist][11])

### Common structural conventions

Across various “Markdown for prompts / docs” guides you see:

* **Clear, stable top-level sections**
  Things like:

  * `# Role`
  * `# Goals`
  * `# Style`
  * `# Constraints`
  * `# Tools / APIs`
  * `# Workflow` (which is perfect for PAW)
* **Short, atomic bullets** for machine-readable rules:

  * Imperatives: “Do X”, “Don’t do Y”.
  * Avoid nested prose paragraphs with multiple unrelated rules.

For PAW, that suggests each instruction file should have *predictable headings* so composition is deterministic:

* `# Base Instructions`
* `# PAW Phases`
* `# Project-Specific Constraints`
* `# Repo-Specific Context`
* `# Output Formatting`

…and avoid random extra headings.

### Composition / merging patterns

From prompt-engineering articles and multi-prompt systems, a few patterns emerge:([Tenacity][12])

1. **Small, single-responsibility instruction files**

   * `base.md` – global behavior for PAW agents
   * `workflow-phases.md` – your phase definitions
   * `project.md` – project-specific instructions from `.paw/instructions/`
   * `persona-*.md` – per-agent tone/role
   * `tooling-*.md` – how to use specific tools/APIs

   This makes it easier to:

   * reuse pieces across projects
   * override a specific layer (e.g., project overrides base style)

2. **Fixed precedence order**
   A common pattern is: “later files override earlier ones” for conflicting instructions.

   For PAW you could define something like:

   1. Engine defaults (baked into PAW)
   2. Global user instructions (`~/.paw/instructions/*.md`)
   3. Repo instructions (`.paw/instructions/*.md`)
   4. Profile/chatmode instructions (the VS Code profile `prompts/*.md` you’re installing)
   5. Ephemeral, task-specific instructions (e.g., current work-item spec)

   When you compose, concatenate files in that order so “closer to the task” wins.

3. **Heading-level merge, not raw concatenation**
   Patterns you see in “prompt libraries” and docs tooling:

   * Parse Markdown by heading.
   * Build a map like `{ "# Role": [chunk1, chunk2], "# Workflow": [chunk3...] }`.
   * For each heading, decide:

     * **override**: take only the last file’s content for that heading, or
     * **append**: concatenate content from all sources.

   For PAW:

   * Use *override* for sections where multiple sources conflict (e.g., `# Style`, `# Output Format`).
   * Use *append* for inherently additive sections (e.g., `# Tools`, `# Phases`).

4. **Scoping to avoid hard conflicts**
   Guidance from prompt best-practice content: state *when* a rule applies.([Tenacity][12])

   Instead of:

   > Always answer in bullet points.

   Use:

   > When generating code review summaries, answer in bullet points.

   This lets different files add scoped rules rather than overriding each other.

### Concrete conventions you can bake into PAW

To keep it VS Code–friendly (no custom frontmatter, as you requested):

* **No YAML frontmatter** in chatmode files – just plain Markdown.
* Require these heading names for composition:

  * `# Role`
  * `# Scope`
  * `# Workflow Phases`
  * `# Tools`
  * `# Style`
  * `# Output Requirements`
* Treat unknown headings as “append-only, low precedence” so they don’t break anything.
* Optionally support a simple inline precedence hint, like leading tags in a heading:

  ```md
  # [override] Style
  ```

  …but still valid Markdown from VS Code’s POV.

---

## 3. Patterns for “installing” bundled content from extensions

You specifically care about: **“How do other VS Code extensions ship content, then copy/install it into user-visible locations on activation or command?”**

### Typical technical pattern

From extension samples and StackOverflow answers:([Visual Studio Code][6])

1. **Bundle the template/content files inside the extension**

   * e.g., `media/templates/...` or `resources/prompts/...`
   * Use `context.asAbsolutePath('relative/path')` to find them at runtime.([Stack Overflow][13])

2. **Use the VS Code file system API to copy to user locations**

   * Read from the extension path (converted to a `Uri`).
   * Write into:

     * the workspace folder (`vscode.workspace.workspaceFolders` + `workspace.fs`), or
     * `context.globalStorageUri` / `context.storageUri` for extension-owned files.

   Example pattern (from a Q&A on copying files to the workspace): use `workspace.fs.readFile` and `workspace.fs.writeFile` to clone files from the extension into the opened folder when the user runs a command.([Stack Overflow][14])

3. **Let the user choose or configure the target directory**

   * Many “template” extensions (project/file templates, code templates) ask the user to pick a folder and then copy the template contents into that location, leaving them fully user-owned.([Visual Studio Marketplace][15])
   * They often expose a setting like `extensionName.templatesLocation` for a user-controlled path.

4. **Versioning / migration on update**
   Common pattern:

   * Store an `installedVersion` in `globalState`.
   * On activation:

     * Compare `installedVersion` to the current extension version.
     * If different, run a migration:

       * Add new templates or sample files.
       * Optionally update existing ones, but **never silently overwrite user-edited files**.
   * Use `setKeysForSync` if you want that state to travel across machines via Settings Sync.([Visual Studio Code][7])

5. **Keep big or mutable data out of globalState**

   * globalState is great for small preferences and version flags; not for large blobs or entire files.([Stack Overflow][16])
   * For PAW chatmodes/instructions, store the actual Markdown as *files* in user-accessible locations (workspace, profile dir, or a `~/.paw`-style folder); globalState just tracks what’s installed and which version.
