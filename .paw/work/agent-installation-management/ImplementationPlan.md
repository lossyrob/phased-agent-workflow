# Agent Installation Management Implementation Plan

## Overview

This plan implements automatic agent installation and upgrade management for the PAW VS Code extension. When users install or upgrade the extension, PAW agents will automatically become available in GitHub Copilot Chat without manual configuration. The system will install base agent templates, track installed versions, and handle migrations cleanly.

**Note**: Custom instructions for agents will be handled separately through a PAW Context tool (see issue #86). This implementation focuses solely on installing base agent templates.

## Current State Analysis

The VS Code extension currently:
- Uses lazy activation (empty `activationEvents` array) - activates only when commands are invoked
- Registers one command (`paw.initializeWorkItem`) and one language model tool (`paw_create_prompt_templates`)
- Stores agent templates in `.github/agents/` as `.agent.md` files with YAML frontmatter
- Supports loading custom instructions from `.paw/instructions/` for workspace-level customization
- Uses synchronous file operations with Node.js `fs` module
- Logs operations to "PAW Workflow" output channel
- Has no version tracking or global state usage
- Has no platform detection or VS Code configuration path resolution

### Key Discoveries:
- VS Code does not expose profile path through API - must hardcode platform-specific paths (SpecResearch.md)
- User prompts directory is global across all profiles: `<config>/User/prompts/` (SpecResearch.md)
- Current extension uses `path.join()` for all path operations (extension.ts, customInstructions.ts)
- Agent files follow naming pattern `PAW-##X Agent Name.agent.md` in `.github/agents/`
- Extension uses structured result objects with `{ success, data, errors }` pattern (createPromptTemplates.ts:228-268)

## Desired End State

After implementation:
- Extension activates on VS Code startup via `onStartupFinished` activation event
- Agents automatically install to platform-appropriate prompts directory on first activation
- Agents update automatically when extension version changes
- Version tracking in `globalState` enables upgrade detection
- Obsolete agent files cleaned up during version migrations
- File system errors handled gracefully with detailed logging and user notifications
- All file operations are idempotent and resilient to interruption

### Verification:
- All 15+ PAW agents appear in GitHub Copilot Chat agent selector after first activation
- Upgrading extension version triggers automatic agent file refresh
- Installation completes successfully on Windows, macOS, and Linux with standard VS Code and variants
- Extension remains functional even when agent installation fails due to permissions

## What We're NOT Doing

- Custom instructions composition (handled separately through PAW Context tool - see issue #86)
- Migration from pre-0.4.0 chatmode files to extension-managed agents (users manually migrated when adopting extension-based workflow)
- Manual agent installation UI or commands (agents install automatically only)
- User configuration settings for installation location or behavior (except `paw.promptDirectory` override)
- Backup or preservation of user modifications to installed agent files
- Per-profile agent installation (prompts directory is global)
- Automatic Copilot refresh or reload after installation
- Dynamic agent discovery from external registries
- Manual rollback UI or commands (downgrade via VS Code's extension version picker provides rollback)
- Telemetry or analytics about installation success rates
- GUI for managing or viewing installed agents
- Hot-reload of agent changes without VS Code restart

## Implementation Approach

The implementation follows a four-phase approach:

1. **Core Infrastructure**: Add platform detection, path resolution, and agent template bundling to provide foundation for installation
2. **Installation Logic**: Implement file writing, version tracking, and activation event handling
3. **Update and Migration**: Add version change detection (upgrades and downgrades), migration manifest, and bidirectional cleanup of obsolete files
4. **Uninstall Cleanup**: Implement deactivation hook to remove all PAW agents when extension is uninstalled

Each phase builds incrementally and includes comprehensive testing at both automated and manual levels. The approach prioritizes reliability through idempotent operations, graceful error handling, and detailed logging.

---

## Phase 1: Core Infrastructure

### Overview
This phase establishes the foundational capabilities needed for agent installation: detecting the platform and VS Code variant, resolving the correct prompts directory path, and bundling agent templates with the extension.

### Changes Required:

#### 1. Platform Detection Module
**File**: `vscode-extension/src/agents/platformDetection.ts` (new)
**Changes**: Create module to detect operating system and VS Code distribution variant

```typescript
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Supported VS Code distribution variants
 */
export enum VSCodeVariant {
  Code = 'Code',
  Insiders = 'Code - Insiders',
  CodeOSS = 'Code - OSS',
  VSCodium = 'VSCodium'
}

/**
 * Platform information for determining paths
 */
export interface PlatformInfo {
  platform: NodeJS.Platform;
  homeDir: string;
  variant: VSCodeVariant;
}

/**
 * Get current platform information
 */
export function getPlatformInfo(): PlatformInfo {
  return {
    platform: os.platform(),
    homeDir: os.homedir(),
    variant: detectVSCodeVariant()
  };
}

/**
 * Detect which VS Code variant is running
 * Detection based on environment variables and process information
 */
export function detectVSCodeVariant(): VSCodeVariant {
  // Check environment variable set by VS Code variants
  const productName = process.env.VSCODE_PRODUCT_NAME;
  
  if (productName?.includes('Insiders')) {
    return VSCodeVariant.Insiders;
  }
  if (productName?.includes('OSS')) {
    return VSCodeVariant.CodeOSS;
  }
  if (productName?.includes('VSCodium')) {
    return VSCodeVariant.VSCodium;
  }
  
  // Default to standard Code
  return VSCodeVariant.Code;
}

/**
 * Resolve the User/prompts directory for current platform and VS Code variant
 * Checks for user-configured override setting first
 */
export function resolvePromptsDirectory(info: PlatformInfo): string {
  // Check if user has configured a custom prompt directory
  const config = vscode.workspace.getConfiguration('paw');
  const customPath = config.get<string>('promptDirectory');
  
  if (customPath) {
    // User has specified a custom path - use it
    return customPath;
  }
  
  // Use auto-detected path
  const { platform, homeDir, variant } = info;
  
  switch (platform) {
    case 'win32':
      // Windows: %APPDATA%\<variant>\User\prompts
      const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
      return path.join(appData, variant, 'User', 'prompts');
      
    case 'darwin':
      // macOS: ~/Library/Application Support/<variant>/User/prompts
      return path.join(homeDir, 'Library', 'Application Support', variant, 'User', 'prompts');
      
    case 'linux':
      // Linux: ~/.config/<variant>/User/prompts
      return path.join(homeDir, '.config', variant, 'User', 'prompts');
      
    default:
      throw new Error(`Unsupported platform: ${platform}. Set the 'paw.promptDirectory' setting to manually specify the prompt directory location.`);
  }
}
```

#### 2. Agent Template Bundling
**File**: `vscode-extension/scripts/copyAgents.js` (new)
**Changes**: Create build script to copy agent templates from `.github/agents/` to extension resources

```javascript
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '..', '.github', 'agents');
const targetDir = path.join(__dirname, '..', 'resources', 'agents');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy all .agent.md files
const files = fs.readdirSync(sourceDir);
files.forEach(file => {
  if (file.endsWith('.agent.md')) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied: ${file}`);
  }
});

console.log(`Agent templates copied to ${targetDir}`);
```

**File**: `vscode-extension/package.json`
**Changes**: Update build scripts to include agent copying

```json
{
  "scripts": {
    "vscode:prepublish": "npm run copy-agents && npm run compile",
    "copy-agents": "node scripts/copyAgents.js",
    "compile": "tsc -p ./",
    "watch": "npm run copy-agents && tsc -watch -p ./"
  }
}
```

#### 3. Agent Template Loader
**File**: `vscode-extension/src/agents/agentTemplates.ts` (new)
**Changes**: Create module to load bundled agent templates

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Agent template metadata
 */
export interface AgentTemplate {
  filename: string;
  name: string;
  description: string;
  content: string;
}

/**
 * Load all bundled agent templates from extension resources
 */
export function loadAgentTemplates(context: vscode.ExtensionContext): AgentTemplate[] {
  const agentsDir = path.join(context.extensionPath, 'resources', 'agents');
  
  if (!fs.existsSync(agentsDir)) {
    throw new Error(`Agent templates directory not found: ${agentsDir}`);
  }
  
  const files = fs.readdirSync(agentsDir);
  const templates: AgentTemplate[] = [];
  
  for (const file of files) {
    if (!file.endsWith('.agent.md')) {
      continue;
    }
    
    const filePath = path.join(agentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse YAML frontmatter to extract description
    const metadata = parseFrontmatter(content);
    
    templates.push({
      filename: file,
      name: extractAgentName(file),
      description: metadata.description || '',
      content: content
    });
  }
  
  return templates;
}

/**
 * Parse YAML frontmatter from agent file
 */
function parseFrontmatter(content: string): { description?: string } {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return {};
  }
  
  const frontmatter = frontmatterMatch[1];
  const descMatch = frontmatter.match(/description:\s*['"](.+?)['"]/);
  
  return {
    description: descMatch ? descMatch[1] : undefined
  };
}

/**
 * Extract agent name from filename
 * Example: "PAW-01A Specification.agent.md" -> "Specification"
 */
function extractAgentName(filename: string): string {
  // Remove .agent.md extension
  const withoutExt = filename.replace(/\.agent\.md$/, '');
  // Remove PAW-##X prefix pattern
  const withoutPrefix = withoutExt.replace(/^PAW-[0-9]+[A-Z]?\s+/, '');
  return withoutPrefix;
}
```

#### 4. Update Extension Package Manifest
**File**: `vscode-extension/package.json`
**Changes**: Add `onStartupFinished` activation event and configuration setting

```json
{
  "activationEvents": [
    "onStartupFinished"
  ],
  "contributes": {
    "configuration": {
      "title": "PAW Workflow",
      "properties": {
        "paw.promptDirectory": {
          "type": "string",
          "default": "",
          "description": "Custom path to the VS Code User/prompts directory. If not set, PAW will attempt to auto-detect the location based on your platform and VS Code variant. Use this setting if auto-detection fails or you want to use a custom location."
        }
      }
    }
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `getPlatformInfo()` returns correct platform, homeDir, and variant on Windows, macOS, Linux
- [ ] `detectVSCodeVariant()` correctly identifies Code, Insiders, Code-OSS, VSCodium from environment
- [ ] `resolvePromptsDirectory()` returns correct paths for all platform/variant combinations
- [ ] `npm run copy-agents` successfully copies all .agent.md files to `resources/agents/`
- [ ] `loadAgentTemplates()` loads all 15+ agent templates with correct metadata
- [ ] `extractAgentName()` correctly extracts agent names from PAW filename pattern
- [ ] Extension compiles successfully with new modules: `npm run compile`
- [ ] No TypeScript errors: `npx tsc --noEmit`

#### Manual Verification:
- [ ] Verify agent templates bundled in VSIX package after running `npm run vscode:prepublish`
- [ ] Test `resolvePromptsDirectory()` output matches actual VS Code prompts directory on local machine
- [ ] Test `resolvePromptsDirectory()` returns custom path when `paw.promptDirectory` setting is configured
- [ ] Verify extension activates on VS Code startup (check "PAW Workflow" output channel appears)
- [ ] Verify `paw.promptDirectory` setting appears in VS Code Settings UI under PAW Workflow section

---

## Phase 2: Installation Logic

### Overview
This phase implements the core agent installation functionality: writing agent files to the prompts directory, tracking installed versions, and handling errors gracefully.

### Changes Required:

#### 1. Agent Installer Module
**File**: `vscode-extension/src/agents/installer.ts` (new)
**Changes**: Create module to handle agent installation operations

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getPlatformInfo, resolvePromptsDirectory } from './platformDetection';
import { loadAgentTemplates } from './agentTemplates';

export interface InstallationResult {
  success: boolean;
  filesInstalled: string[];
  filesSkipped: string[];
  errors: Array<{ file: string; error: string }>;
}

/**
 * Install or update all PAW agents to the user prompts directory
 */
export async function installAgents(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<InstallationResult> {
  const result: InstallationResult = {
    success: true,
    filesInstalled: [],
    filesSkipped: [],
    errors: []
  };
  
  try {
    // 1. Determine prompts directory path
    const platformInfo = getPlatformInfo();
    const promptsDir = resolvePromptsDirectory(platformInfo);
    
    outputChannel.appendLine(`[INFO] Installing agents to: ${promptsDir}`);
    
    // 2. Ensure prompts directory exists
    if (!fs.existsSync(promptsDir)) {
      outputChannel.appendLine('[INFO] Creating prompts directory...');
      fs.mkdirSync(promptsDir, { recursive: true });
    }
    
    // 3. Load agent templates
    const templates = loadAgentTemplates(context);
    outputChannel.appendLine(`[INFO] Loaded ${templates.length} agent templates`);
    
    // 4. Write each agent file
    for (const template of templates) {
      try {
        const filename = `paw-${template.name.toLowerCase()}.agent.md`;
        const targetPath = path.join(promptsDir, filename);
        
        // Write file (idempotent - overwrites if exists)
        fs.writeFileSync(targetPath, template.content, 'utf-8');
        
        result.filesInstalled.push(filename);
        outputChannel.appendLine(`[INFO] Installed: ${filename}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({ file: template.filename, error: errorMsg });
        result.success = false;
        outputChannel.appendLine(`[ERROR] Failed to install ${template.filename}: ${errorMsg}`);
      }
    }
    
    // 6. Update installation state
    await updateInstallationState(context, result);
    
    return result;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Agent installation failed: ${errorMsg}`);
    result.success = false;
    result.errors.push({ file: 'installation', error: errorMsg });
    return result;
  }
}

/**
 * Update installation state in global storage
 */
async function updateInstallationState(
  context: vscode.ExtensionContext,
  result: InstallationResult
): Promise<void> {
  const state = {
    version: context.extension.packageJSON.version,
    installedAt: new Date().toISOString(),
    filesInstalled: result.filesInstalled,
    success: result.success
  };
  
  await context.globalState.update('paw.agentInstallation', state);
}

/**
 * Check if agents need to be installed or updated
 */
export function needsInstallation(context: vscode.ExtensionContext): boolean {
  const state = context.globalState.get<any>('paw.agentInstallation');
  
  if (!state) {
    // No previous installation
    return true;
  }
  
  const currentVersion = context.extension.packageJSON.version;
  if (state.version !== currentVersion) {
    // Version changed - need update
    return true;
  }
  
  // Check if all files are present
  try {
    const platformInfo = getPlatformInfo();
    const promptsDir = resolvePromptsDirectory(platformInfo);
    
    for (const file of state.filesInstalled) {
      const filePath = path.join(promptsDir, file);
      if (!fs.existsSync(filePath)) {
        // File missing - need reinstall
        return true;
      }
    }
    
    return false; // All files present and version matches
  } catch (error) {
    // If we can't check, assume installation needed
    return true;
  }
}
```

#### 2. Integration with Extension Activation
**File**: `vscode-extension/src/extension.ts`
**Changes**: Add agent installation to activation flow

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(outputChannel);

  // Install or update agents on activation
  try {
    if (needsInstallation(context)) {
      outputChannel.appendLine('[INFO] Starting agent installation...');
      outputChannel.show(true); // Show output channel during installation
      
      const result = await installAgents(context, outputChannel);
      
      if (result.success) {
        outputChannel.appendLine(`[INFO] Successfully installed ${result.filesInstalled.length} agents`);
        
        // Notify user
        vscode.window.showInformationMessage(
          `PAW agents installed successfully. ${result.filesInstalled.length} agents are now available in Copilot Chat.`
        );
      } else {
        outputChannel.appendLine(`[ERROR] Agent installation completed with errors`);
        
        // Show error notification with actionable guidance
        const errorDetails = result.errors.map(e => `${e.file}: ${e.error}`).join('\n');
        vscode.window.showErrorMessage(
          `PAW agent installation encountered errors. Check the output channel for details.`,
          'View Output'
        ).then(action => {
          if (action === 'View Output') {
            outputChannel.show();
          }
        });
      }
    } else {
      outputChannel.appendLine('[INFO] Agents are up to date');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Agent installation failed: ${errorMsg}`);
    
    // Show error but don't block activation
    vscode.window.showErrorMessage(
      `Failed to install PAW agents: ${errorMsg}. Extension will continue loading.`
    );
  }

  // Register existing commands and tools
  registerPromptTemplatesTool(context);
  
  context.subscriptions.push(
    vscode.commands.registerCommand('paw.initializeWorkItem', async () => {
      await initializeWorkItem(outputChannel);
    })
  );

  return context;
}
```

#### 3. Error Handling Enhancement
**File**: `vscode-extension/src/agents/installer.ts`
**Changes**: Add comprehensive error handling and recovery

```typescript
/**
 * Handle file system errors with detailed user guidance
 */
function handleFileSystemError(error: any, operation: string, path: string): string {
  let message = `${operation} failed for ${path}`;
  let guidance = '';
  
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    guidance = 'Permission denied. Check file permissions and try running VS Code with appropriate privileges. Alternatively, set the "paw.promptDirectory" setting to specify a custom location.';
  } else if (error.code === 'ENOSPC') {
    guidance = 'Disk is full. Free up disk space and try again.';
  } else if (error.code === 'EROFS') {
    guidance = 'File system is read-only. Ensure the directory is writable, or set the "paw.promptDirectory" setting to specify a writable location.';
  } else if (error.message?.includes('Unsupported platform')) {
    guidance = 'Platform auto-detection failed. Set the "paw.promptDirectory" setting to manually specify the prompt directory location.';
  } else {
    guidance = error.message || String(error);
  }
  
  return `${message}: ${guidance}`;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `installAgents()` writes all agent files to prompts directory
- [ ] `needsInstallation()` returns true on first activation, false on subsequent activations with same version
- [ ] `needsInstallation()` returns true when version changes
- [ ] `needsInstallation()` returns true when agent files are missing
- [ ] Installation updates `globalState` with version, timestamp, and file list
- [ ] Extension compiles and activates successfully: `npm run compile`
- [ ] All unit tests pass: `npm test`

#### Manual Verification:
- [ ] Install fresh extension and verify agents appear in `<config>/User/prompts/` directory
- [ ] Verify all 15+ agents appear in GitHub Copilot Chat agent selector after activation
- [ ] Simulate permission error by making prompts directory read-only - verify error notification
- [ ] Check output channel logs show detailed installation progress and any errors

---

## Phase 3: Version Changes and Migration

### Overview
This phase implements version change detection (both upgrades and downgrades), bidirectional migration of agent files, and cleanup logic to ensure smooth transitions between PAW versions in either direction.

### Changes Required:

#### 1. Migration Manifest
**File**: `vscode-extension/src/agents/migrations.ts` (new)
**Changes**: Create migration manifest for handling renamed or removed agents

```typescript
/**
 * Migration rule for handling renamed or removed agent files
 */
export interface MigrationRule {
  oldFilename: string;
  newFilename?: string; // undefined means file was removed
  version: string; // Version when migration applies
}

/**
 * Migration manifest tracking agent file changes across versions
 * Add new entries when agents are renamed or removed
 * Supports bidirectional migrations: upgrades apply forward rules, downgrades apply reverse rules
 * Note: No chatmode→agent migration needed (users manually migrated to 0.4.0+)
 */
export const MIGRATION_MANIFEST: MigrationRule[] = [
  // Example: If agent was renamed in 0.6.0
  // {
  //   oldFilename: 'paw-planner.agent.md',  // Used in 0.5.0
  //   newFilename: 'paw-planning.agent.md', // Used in 0.6.0+
  //   version: '0.6.0'
  // },
  // Example: If agent was removed in 0.7.0
  // {
  //   oldFilename: 'paw-deprecated.agent.md',
  //   newFilename: undefined,
  //   version: '0.7.0'
  // }
];

/**
 * Get list of obsolete files that should be removed for given version change
 * @param fromVersion Version being migrated from
 * @param toVersion Version being migrated to
 * @returns Array of filenames to remove
 */
export function getObsoleteFiles(fromVersion: string, toVersion: string): string[] {
  const isDowngrade = isVersionDowngrade(fromVersion, toVersion);
  
  // For simplicity, apply all migrations (could be version-range filtered in future)
  return MIGRATION_MANIFEST
    .filter(rule => !rule.newFilename) // Only removed files
    .map(rule => isDowngrade ? rule.newFilename || rule.oldFilename : rule.oldFilename)
    .filter(f => f !== undefined) as string[];
}

/**
 * Get file renames that should be applied for given version change
 * For upgrades: old → new, For downgrades: new → old
 */
export function getFileRenames(fromVersion: string, toVersion: string): Map<string, string> {
  const renames = new Map<string, string>();
  const isDowngrade = isVersionDowngrade(fromVersion, toVersion);
  
  for (const rule of MIGRATION_MANIFEST) {
    if (rule.newFilename) {
      if (isDowngrade) {
        // Reverse the mapping for downgrades
        renames.set(rule.newFilename, rule.oldFilename);
      } else {
        // Forward mapping for upgrades
        renames.set(rule.oldFilename, rule.newFilename);
      }
    }
  }
  
  return renames;
}

/**
 * Check if version change is a downgrade
 */
function isVersionDowngrade(fromVersion: string, toVersion: string): boolean {
  // Simple semver comparison (extend for production use)
  const from = fromVersion.split('.').map(Number);
  const to = toVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(from.length, to.length); i++) {
    const f = from[i] || 0;
    const t = to[i] || 0;
    if (f > t) return true;
    if (f < t) return false;
  }
  
  return false; // Versions equal
}
```

#### 2. Migration Logic
**File**: `vscode-extension/src/agents/installer.ts`
**Changes**: Add migration and cleanup operations to installer

```typescript
import { getObsoleteFiles, getFileRenames } from './migrations';

/**
 * Perform migration operations when changing versions (upgrade or downgrade)
 * Handles file renames and removals in appropriate direction based on version change
 */
export async function migrateAgents(
  fromVersion: string,
  toVersion: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const platformInfo = getPlatformInfo();
    const promptsDir = resolvePromptsDirectory(platformInfo);
    
    outputChannel.appendLine(`[INFO] Migrating agents from v${fromVersion} to v${toVersion}`);
    
    // 1. Handle file renames
    const renames = getFileRenames(fromVersion, toVersion);
    for (const [oldName, newName] of renames) {
      const oldPath = path.join(promptsDir, oldName);
      const newPath = path.join(promptsDir, newName);
      
      if (fs.existsSync(oldPath)) {
        try {
          // New file will be written by installer, just remove old
          fs.unlinkSync(oldPath);
          outputChannel.appendLine(`[INFO] Removed renamed file: ${oldName} -> ${newName}`);
        } catch (error) {
          outputChannel.appendLine(`[WARN] Failed to remove old file ${oldName}: ${error}`);
        }
      }
    }
    
    // 2. Remove obsolete files
    const obsoleteFiles = getObsoleteFiles(fromVersion, toVersion);
    for (const filename of obsoleteFiles) {
      const filePath = path.join(promptsDir, filename);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          outputChannel.appendLine(`[INFO] Removed obsolete file: ${filename}`);
        } catch (error) {
          outputChannel.appendLine(`[WARN] Failed to remove obsolete file ${filename}: ${error}`);
        }
      }
    }
    
    // 3. Clean up unknown PAW files (safety measure)
    // Only remove files matching PAW naming pattern that aren't in current templates
    await cleanupUnknownPAWFiles(promptsDir, outputChannel);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Migration failed: ${errorMsg}`);
    // Don't throw - allow installation to proceed even if migration fails
  }
}

/**
 * Clean up PAW agent files that don't match current templates
 * Only removes files matching PAW naming pattern (paw-*.agent.md)
 */
async function cleanupUnknownPAWFiles(
  promptsDir: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    if (!fs.existsSync(promptsDir)) {
      return;
    }
    
    const files = fs.readdirSync(promptsDir);
    const pawPattern = /^paw-.*\.agent\.md$/;
    
    for (const file of files) {
      if (!pawPattern.test(file)) {
        continue; // Not a PAW agent file
      }
      
      // Check if this file is in our current templates
      // (This will be checked by comparing against installed files from state)
      const filePath = path.join(promptsDir, file);
      
      // Skip removal for now - only remove files explicitly in migration manifest
      // This prevents accidental deletion of custom user agents
      // Future: Could add more sophisticated detection
    }
  } catch (error) {
    outputChannel.appendLine(`[WARN] Cleanup check failed: ${error}`);
  }
}
```

#### 3. Update Installation Flow
**File**: `vscode-extension/src/agents/installer.ts`
**Changes**: Integrate migration into installation flow

```typescript
export async function installAgents(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<InstallationResult> {
  const result: InstallationResult = {
    success: true,
    filesInstalled: [],
    filesSkipped: [],
    errors: []
  };
  
  try {
    // Check if this is a version change (upgrade or downgrade)
    const previousState = context.globalState.get<any>('paw.agentInstallation');
    const currentVersion = context.extension.packageJSON.version;
    
    if (previousState && previousState.version !== currentVersion) {
      outputChannel.appendLine(`[INFO] Version change detected: ${previousState.version} -> ${currentVersion}`);
      await migrateAgents(previousState.version, currentVersion, outputChannel);
    }
    
    // Determine prompts directory path
    const platformInfo = getPlatformInfo();
    const promptsDir = resolvePromptsDirectory(platformInfo);
    
    // ... rest of installation logic from Phase 2 ...
    
    return result;
    
  } catch (error) {
    // ... error handling ...
  }
}
```

#### 4. Add Manual Reinstall Command
**File**: `vscode-extension/src/commands/reinstallAgents.ts` (new)
**Changes**: Create command to manually trigger agent reinstallation

```typescript
import * as vscode from 'vscode';
import { installAgents } from '../agents/installer';

export async function reinstallAgentsCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    'This will reinstall all PAW agents, overwriting any local modifications. Continue?',
    'Reinstall',
    'Cancel'
  );
  
  if (confirm !== 'Reinstall') {
    return;
  }
  
  outputChannel.clear();
  outputChannel.show();
  outputChannel.appendLine('[INFO] Manual agent reinstallation started...');
  
  try {
    const result = await installAgents(context, outputChannel);
    
    if (result.success) {
      vscode.window.showInformationMessage(
        `Successfully reinstalled ${result.filesInstalled.length} PAW agents.`
      );
    } else {
      vscode.window.showErrorMessage(
        'Agent reinstallation completed with errors. Check output channel for details.'
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Reinstallation failed: ${errorMsg}`);
    vscode.window.showErrorMessage(`Agent reinstallation failed: ${errorMsg}`);
  }
}
```

**File**: `vscode-extension/src/extension.ts`
**Changes**: Register reinstall command

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // ... existing activation code ...
  
  // Register reinstall command
  context.subscriptions.push(
    vscode.commands.registerCommand('paw.reinstallAgents', async () => {
      await reinstallAgentsCommand(context, outputChannel);
    })
  );
  
  return context;
}
```

**File**: `vscode-extension/package.json`
**Changes**: Add reinstall command to package manifest

```json
{
  "contributes": {
    "commands": [
      {
        "command": "paw.initializeWorkItem",
        "title": "New PAW Workflow",
        "category": "PAW"
      },
      {
        "command": "paw.reinstallAgents",
        "title": "Reinstall Agents",
        "category": "PAW"
      }
    ]
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `isVersionDowngrade()` correctly identifies downgrades vs upgrades
- [ ] `getObsoleteFiles()` returns correct files for both upgrades and downgrades
- [ ] `getFileRenames()` returns forward mapping for upgrades, reverse mapping for downgrades
- [ ] `migrateAgents()` successfully removes obsolete files when they exist
- [ ] `migrateAgents()` handles missing old files gracefully (no errors)
- [ ] Migration preserves all files in `.paw/instructions/` directory (never deleted)
- [ ] Version change (upgrade or downgrade) triggers migration automatically
- [ ] Manual reinstall command successfully overwrites all agent files
- [ ] Extension compiles successfully: `npm run compile`
- [ ] All tests pass: `npm test`

#### Manual Verification:
- [ ] Simulate upgrade by changing version in package.json and reactivating - verify migration runs
- [ ] Simulate downgrade by reverting version and reactivating - verify reverse migration runs
- [ ] Create obsolete agent file manually, trigger version change, verify file removed
- [ ] Run "PAW: Reinstall Agents" command and verify all agents rewritten
- [ ] Check output channel logs show migration operations clearly for both directions
- [ ] Verify globalState updated with new version after migration in both directions

---

## Phase 4: Uninstall Cleanup

### Overview
This phase implements cleanup logic to remove all PAW-managed agent files when the extension is uninstalled, ensuring a clean uninstall experience without orphaned files.

### Changes Required:

#### 1. Uninstall Detection and Cleanup
**File**: `vscode-extension/src/agents/uninstall.ts` (new)
**Changes**: Create module to handle cleanup during extension deactivation

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getPlatformInfo, resolvePromptsDirectory } from './platformDetection';

/**
 * Remove all PAW-managed agent files from the prompts directory
 * Called during extension deactivation
 */
export async function cleanupAgents(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    outputChannel.appendLine('[INFO] Starting agent cleanup for extension uninstall...');
    
    // Get installation state to know which files to remove
    const state = context.globalState.get<any>('paw.agentInstallation');
    
    if (!state || !state.filesInstalled) {
      outputChannel.appendLine('[INFO] No installed agents found in state');
      return;
    }
    
    // Resolve prompts directory
    const platformInfo = getPlatformInfo();
    const promptsDir = resolvePromptsDirectory(platformInfo);
    
    if (!fs.existsSync(promptsDir)) {
      outputChannel.appendLine('[INFO] Prompts directory does not exist, nothing to clean');
      return;
    }
    
    // Remove each installed agent file
    let removedCount = 0;
    let failedCount = 0;
    
    for (const filename of state.filesInstalled) {
      const filePath = path.join(promptsDir, filename);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          removedCount++;
          outputChannel.appendLine(`[INFO] Removed: ${filename}`);
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          outputChannel.appendLine(`[ERROR] Failed to remove ${filename}: ${errorMsg}`);
        }
      }
    }
    
    outputChannel.appendLine(
      `[INFO] Cleanup complete: ${removedCount} files removed, ${failedCount} failures`
    );
    
    // Clear installation state
    await context.globalState.update('paw.agentInstallation', undefined);
    
    if (failedCount > 0) {
      outputChannel.appendLine(
        '[WARN] Some agent files could not be removed. Please delete them manually from:'
      );
      outputChannel.appendLine(`  ${promptsDir}`);
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Cleanup failed: ${errorMsg}`);
    // Don't throw - best effort cleanup
  }
}

/**
 * Check if the extension is being uninstalled
 * VS Code doesn't provide direct uninstall detection, so this is a heuristic
 */
export function isUninstalling(): boolean {
  // Unfortunately, VS Code doesn't expose a reliable way to detect uninstall
  // deactivate() is called on uninstall, disable, and reload
  // We'll perform cleanup on every deactivation as a safety measure
  return true;
}
```

#### 2. Integration with Extension Deactivation
**File**: `vscode-extension/src/extension.ts`
**Changes**: Add deactivation handler to clean up agents

```typescript
import { cleanupAgents, isUninstalling } from './agents/uninstall';

// Store output channel reference at module level for deactivate access
let globalOutputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  // Create output channel
  globalOutputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(globalOutputChannel);

  // ... rest of activation logic ...
}

/**
 * Extension deactivation handler
 * Called when extension is disabled, uninstalled, or VS Code is closing
 */
export async function deactivate(): Promise<void> {
  if (!globalOutputChannel) {
    return;
  }
  
  try {
    // Get extension context from somewhere (challenge: context not passed to deactivate)
    // For now, we'll document manual cleanup in README
    
    globalOutputChannel.appendLine('[INFO] Extension deactivating...');
    
    // Note: Full cleanup implementation requires storing context reference at module level
    // or using alternative approach to track installed files
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    globalOutputChannel.appendLine(`[ERROR] Deactivation cleanup failed: ${errorMsg}`);
  }
}
```

#### 3. Alternative Cleanup Approach via Command
**File**: `vscode-extension/src/commands/uninstallCleanup.ts` (new)
**Changes**: Create manual cleanup command as fallback

```typescript
import * as vscode from 'vscode';
import { cleanupAgents } from '../agents/uninstall';

/**
 * Manual cleanup command for users to run before uninstalling
 */
export async function uninstallCleanupCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    'This will remove all PAW agents from VS Code. This is useful before uninstalling the extension. Continue?',
    'Remove Agents',
    'Cancel'
  );
  
  if (confirm !== 'Remove Agents') {
    return;
  }
  
  outputChannel.clear();
  outputChannel.show();
  
  await cleanupAgents(context, outputChannel);
  
  vscode.window.showInformationMessage(
    'PAW agents removed. You can now safely uninstall the extension.'
  );
}
```

**File**: `vscode-extension/src/extension.ts`
**Changes**: Register cleanup command

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // ... existing activation code ...
  
  // Register cleanup command
  context.subscriptions.push(
    vscode.commands.registerCommand('paw.uninstallCleanup', async () => {
      await uninstallCleanupCommand(context, outputChannel);
    })
  );
  
  return context;
}
```

**File**: `vscode-extension/package.json`
**Changes**: Add cleanup command to package manifest

```json
{
  "contributes": {
    "commands": [
      {
        "command": "paw.initializeWorkItem",
        "title": "New PAW Workflow",
        "category": "PAW"
      },
      {
        "command": "paw.reinstallAgents",
        "title": "Reinstall Agents",
        "category": "PAW"
      },
      {
        "command": "paw.uninstallCleanup",
        "title": "Remove Agents (for Uninstall)",
        "category": "PAW"
      }
    ]
  }
}
```

#### 4. Documentation
**File**: `vscode-extension/README.md`
**Changes**: Add uninstall instructions

```markdown
## Uninstalling

Before uninstalling the PAW extension, we recommend running the cleanup command to remove installed agents:

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run: `PAW: Remove Agents (for Uninstall)`
3. Confirm the removal
4. Uninstall the extension through VS Code's Extensions view

If you uninstall without running the cleanup command, PAW agents may remain in your VS Code configuration. You can manually remove them from:

- **Windows**: `%APPDATA%\Code\User\prompts\paw-*.agent.md`
- **macOS**: `~/Library/Application Support/Code/User/prompts/paw-*.agent.md`
- **Linux**: `~/.config/Code/User/prompts/paw-*.agent.md`
```

### Success Criteria:

#### Automated Verification:
- [ ] `cleanupAgents()` removes all files listed in installation state
- [ ] `cleanupAgents()` handles missing files gracefully (no errors)
- [ ] `cleanupAgents()` clears globalState after cleanup
- [ ] `cleanupAgents()` logs all operations to output channel
- [ ] Manual cleanup command successfully removes all PAW agents
- [ ] Extension compiles successfully: `npm run compile`
- [ ] All tests pass: `npm test`

#### Manual Verification:
- [ ] Run "PAW: Remove Agents (for Uninstall)" command and verify all PAW agents removed from prompts directory
- [ ] Verify PAW agents no longer appear in Copilot Chat after cleanup
- [ ] Check output channel shows detailed cleanup progress
- [ ] Simulate permission error during cleanup - verify error message with manual cleanup instructions
- [ ] Install extension, run cleanup, verify globalState cleared

---

## Testing Strategy

### Unit Tests:

**Platform Detection Tests** (`test/suite/platformDetection.test.ts`):
- Test `getPlatformInfo()` returns valid platform, homeDir, variant
- Test `detectVSCodeVariant()` with mocked environment variables
- Test `resolvePromptsDirectory()` for all platform/variant combinations
- Test path construction uses correct separators for each platform

**Agent Template Tests** (`test/suite/agentTemplates.test.ts`):
- Test `loadAgentTemplates()` loads all templates from resources directory
- Test `extractAgentName()` correctly parses PAW filename patterns
- Test `parseFrontmatter()` extracts description from YAML correctly
- Test error handling when templates directory missing

**Installer Tests** (`test/suite/installer.test.ts`):
- Test `needsInstallation()` returns true when no prior installation
- Test `needsInstallation()` returns true when version changes
- Test `needsInstallation()` returns true when files missing
- Test `needsInstallation()` returns false when all files present with correct version
- Test `installAgents()` creates prompts directory if missing
- Test `installAgents()` writes all agent files
- Test error handling for permission errors
- Test error handling for disk full errors

**Migration Tests** (`test/suite/migrations.test.ts`):
- Test `isVersionDowngrade()` correctly identifies upgrades vs downgrades
- Test `getObsoleteFiles()` returns correct files for upgrades and downgrades
- Test `getFileRenames()` returns forward mapping for upgrades
- Test `getFileRenames()` returns reverse mapping for downgrades
- Test `migrateAgents()` removes obsolete files in both directions
- Test `migrateAgents()` handles missing old files gracefully

**Uninstall Tests** (`test/suite/uninstall.test.ts`):
- Test `cleanupAgents()` removes all installed files
- Test `cleanupAgents()` clears globalState after cleanup
- Test `cleanupAgents()` handles missing files gracefully
- Test `cleanupAgents()` handles permission errors gracefully

### Integration Tests:

**End-to-End Installation** (`test/integration/installation.test.ts`):
- Test complete installation flow from extension activation
- Test agents appear in prompts directory with correct content
- Test globalState updated correctly after installation
- Test reinstallation with existing files (idempotent behavior)

**Version Change Simulation** (`test/integration/versionChange.test.ts`):
- Test upgrade from version 0.5.0 to 0.6.0 (mocked)
- Test downgrade from version 0.6.0 to 0.5.0 (mocked)
- Test migration runs and removes obsolete files in both directions
- Test version marker updated after version change
- Test all appropriate agents installed after version change

**Uninstall Simulation** (`test/integration/uninstall.test.ts`):
- Test manual cleanup command removes all agents
- Test globalState cleared after cleanup
- Test agents removed from prompts directory

### Manual Testing Steps:

**Fresh Installation**:
1. Uninstall PAW extension completely
2. Remove all PAW agent files from prompts directory manually
3. Install PAW extension from VSIX
4. Open VS Code and trigger extension activation
5. Verify all agents appear in `<config>/User/prompts/` directory
6. Open GitHub Copilot Chat and verify all agents appear in selector
7. Invoke a PAW agent and verify it responds correctly

**Version Change Scenario**:
1. Install PAW version 0.5.0 (simulated)
2. Verify agents installed
3. Update to PAW version 0.6.0 which renames an agent (or simulate by changing package.json version)
4. Reload VS Code to trigger reactivation
5. Verify old filename removed and new filename installed
6. Verify all current agent files present and updated
7. Downgrade back to PAW version 0.5.0
8. Reload VS Code
9. Verify new filename removed and old filename restored
10. Verify agents match 0.5.0 exactly

**Error Recovery**:
1. Make prompts directory read-only (chmod 444 on Linux/macOS)
2. Trigger agent installation
3. Verify error notification appears with actionable message
4. Verify output channel shows detailed error information
5. Verify extension continues functioning (doesn't crash)
6. Restore permissions and run "PAW: Reinstall Agents" - verify success

**Platform Compatibility**:
1. Test installation on Windows with standard VS Code
2. Test installation on macOS with VS Code Insiders
3. Test installation on Linux with Code-OSS
4. Test installation on Linux with VSCodium
5. Verify correct prompts directory path used for each platform/variant

**Idempotent Installation**:
1. Install agents successfully
2. Delete 2 random agent files from prompts directory
3. Reload VS Code to trigger activation
4. Verify only the 2 missing files are rewritten (check file timestamps)
5. Verify existing files not modified

**Uninstall Cleanup**:
1. Install PAW extension and verify agents installed
2. Run "PAW: Remove Agents (for Uninstall)" command
3. Verify all PAW agents removed from prompts directory
4. Verify PAW agents no longer appear in Copilot Chat
5. Check output channel for cleanup confirmation
6. Simulate permission error by making a file read-only
7. Run cleanup again and verify error message with manual cleanup instructions

## Performance Considerations

**Installation Time**: Agent installation should complete within 2-3 seconds for all 15+ agents. This is acceptable during extension activation since it only happens on first install or version upgrades.

**File I/O Optimization**: 
- Use synchronous file operations during activation (VS Code activation is synchronous)
- Batch file writes within single try-catch to minimize error handling overhead
- Load templates once at start of installation, reuse for all agents

**Memory Usage**: 
- Agent templates are small (typically 5-20KB each)
- Total memory footprint for all templates is <500KB
- No caching needed - templates loaded fresh on each installation

**Activation Performance**:
- `needsInstallation()` check is fast (single globalState read + file existence checks)
- When installation not needed, activation overhead is <100ms
- When installation needed, user sees progress in output channel

**Migration Performance**:
- Migration operations are rare (only on version upgrades)
- File deletion is fast (typically <10ms per file)
- Migration failures don't block installation (logged and continue)

## Migration Notes

**Version 1.0.0 Initial Release**: No migration needed - fresh installations only. No chatmode→agent migration needed as users manually migrated when adopting extension-based workflow in 0.4.0+.

**Future Version Changes**: 
- Add entries to `MIGRATION_MANIFEST` when renaming or removing agents
- Test migration logic thoroughly for both upgrade and downgrade paths before release
- Include migration notes in changelog for transparency
- Bidirectional migration ensures users can safely move between versions

**Version Downgrades**: 
- Extension automatically detects downgrades and reverses migrations
- Agents are reinstalled to match downgraded version exactly
- Old filenames restored, new filenames removed as appropriate
- Users can safely test new versions and rollback if they encounter issues

**Uninstall Cleanup**:
- Users should run "PAW: Remove Agents (for Uninstall)" before uninstalling
- If uninstalled without cleanup, agents remain but are harmless (no longer managed)
- Manual cleanup instructions provided in README for such cases

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/36
- Spec: `.paw/work/agent-installation-management/Spec.md`
- Research: `.paw/work/agent-installation-management/SpecResearch.md`, `.paw/work/agent-installation-management/CodeResearch.md`
- VS Code Extension API: https://code.visualstudio.com/api/references/vscode-api
- VS Code Custom Chat Participants: https://code.visualstudio.com/api/extension-guides/chat
- Similar implementation (file creation tool): `vscode-extension/src/tools/createPromptTemplates.ts:228-268`
