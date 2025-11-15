# Agent Installation Management Implementation Plan

## Overview

This plan implements automatic agent installation and upgrade management for the PAW VS Code extension. When users install or upgrade the extension, PAW agents will automatically become available in GitHub Copilot Chat without manual configuration. The system will compose base agent templates with optional workspace and user customizations, track installed versions, and handle migrations cleanly.

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
- Custom instruction loading pattern exists at `vscode-extension/src/prompts/customInstructions.ts:24-48`
- Agent files follow naming pattern `PAW-##X Agent Name.agent.md` in `.github/agents/`
- Extension uses structured result objects with `{ success, data, errors }` pattern (createPromptTemplates.ts:228-268)

## Desired End State

After implementation:
- Extension activates on VS Code startup via `onStartupFinished` activation event
- Agents automatically install to platform-appropriate prompts directory on first activation
- Agents update automatically when extension version changes
- Custom instructions from workspace (`.paw/instructions/`) and user (`~/.paw/instructions/`) compose with base templates
- Version tracking in `globalState` enables upgrade detection
- Obsolete agent files cleaned up during version migrations
- File system errors handled gracefully with detailed logging and user notifications
- All file operations are idempotent and resilient to interruption

### Verification:
- All 15+ PAW agents appear in GitHub Copilot Chat agent selector after first activation
- Upgrading extension version triggers automatic agent file refresh
- Custom instruction files compose in correct precedence order (workspace → user → base)
- Installation completes successfully on Windows, macOS, and Linux with standard VS Code and variants
- Extension remains functional even when agent installation fails due to permissions

## What We're NOT Doing

- Manual agent installation UI or commands (agents install automatically only)
- User configuration settings for installation location or behavior
- Backup or preservation of user modifications to installed agent files
- Per-profile agent installation (prompts directory is global)
- Automatic Copilot refresh or reload after installation
- Dynamic agent discovery from external registries
- Rollback mechanisms to restore previous agent versions
- Telemetry or analytics about installation success rates
- Cross-machine synchronization of custom instruction files
- GUI for managing or viewing installed agents
- Hot-reload of agent changes without VS Code restart

## Implementation Approach

The implementation follows a three-phase approach:

1. **Core Infrastructure**: Add platform detection, path resolution, and agent template bundling to provide foundation for installation
2. **Installation Logic**: Implement agent composition, file writing, version tracking, and activation event handling
3. **Update and Migration**: Add upgrade detection, migration manifest, and cleanup of obsolete files

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
This phase implements the core agent installation functionality: composing agent files with custom instructions, writing them to the prompts directory, tracking installed versions, and handling errors gracefully.

### Changes Required:

#### 1. Custom Instructions Composition
**File**: `vscode-extension/src/agents/customInstructions.ts` (new - extends existing customInstructions.ts)
**Changes**: Create module to compose agent content with custom instructions

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { CustomInstructions, loadCustomInstructions } from '../prompts/customInstructions';

export interface ComposedAgent {
  filename: string;
  content: string;
  hasWorkspaceCustomizations: boolean;
  hasUserCustomizations: boolean;
}

/**
 * Compose agent content with custom instructions
 * Precedence order: workspace instructions -> user instructions -> base template
 */
export function composeAgentContent(
  agentName: string,
  baseContent: string,
  workspacePath: string | undefined
): ComposedAgent {
  const parts: string[] = [];
  let hasWorkspace = false;
  let hasUser = false;
  
  // 1. Load workspace-level custom instructions
  if (workspacePath) {
    const workspaceInstructions = loadCustomInstructions(
      workspacePath,
      path.join('.paw', 'instructions', `${agentName.toLowerCase()}-instructions.md`)
    );
    
    if (workspaceInstructions.exists && workspaceInstructions.content) {
      parts.push('<!-- Workspace-level custom instructions -->');
      parts.push(workspaceInstructions.content);
      parts.push('');
      hasWorkspace = true;
    }
  }
  
  // 2. Load user-level custom instructions
  const userHome = require('os').homedir();
  const userInstructionsPath = path.join(userHome, '.paw', 'instructions', `${agentName.toLowerCase()}-instructions.md`);
  
  if (fs.existsSync(userInstructionsPath)) {
    try {
      const userContent = fs.readFileSync(userInstructionsPath, 'utf-8');
      if (userContent.trim()) {
        parts.push('<!-- User-level custom instructions -->');
        parts.push(userContent);
        parts.push('');
        hasUser = true;
      }
    } catch (error) {
      // Log but don't fail - user instructions are optional
      console.error(`Failed to read user instructions for ${agentName}:`, error);
    }
  }
  
  // 3. Add base template content
  parts.push(baseContent);
  
  return {
    filename: `paw-${agentName.toLowerCase()}.agent.md`,
    content: parts.join('\n'),
    hasWorkspaceCustomizations: hasWorkspace,
    hasUserCustomizations: hasUser
  };
}
```

#### 2. Agent Installer Module
**File**: `vscode-extension/src/agents/installer.ts` (new)
**Changes**: Create module to handle agent installation operations

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getPlatformInfo, resolvePromptsDirectory } from './platformDetection';
import { loadAgentTemplates } from './agentTemplates';
import { composeAgentContent } from './customInstructions';

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
    
    // 4. Get workspace path for custom instructions
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    // 5. Compose and write each agent
    for (const template of templates) {
      try {
        const composed = composeAgentContent(
          template.name,
          template.content,
          workspacePath
        );
        
        const targetPath = path.join(promptsDir, composed.filename);
        
        // Write file (idempotent - overwrites if exists)
        fs.writeFileSync(targetPath, composed.content, 'utf-8');
        
        result.filesInstalled.push(composed.filename);
        
        const customInfo = [];
        if (composed.hasWorkspaceCustomizations) {
          customInfo.push('workspace customizations');
        }
        if (composed.hasUserCustomizations) {
          customInfo.push('user customizations');
        }
        const customSuffix = customInfo.length > 0 ? ` (with ${customInfo.join(' + ')})` : '';
        
        outputChannel.appendLine(`[INFO] Installed: ${composed.filename}${customSuffix}`);
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

#### 3. Integration with Extension Activation
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

#### 4. Error Handling Enhancement
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
- [ ] `composeAgentContent()` correctly combines workspace, user, and base instructions in precedence order
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
- [ ] Create workspace custom instructions and verify they appear in installed agent files
- [ ] Create user custom instructions and verify composition precedence (workspace before user before base)
- [ ] Simulate permission error by making prompts directory read-only - verify error notification
- [ ] Check output channel logs show detailed installation progress and any errors

---

## Phase 3: Update and Migration

### Overview
This phase implements version upgrade detection, migration of obsolete files, and cleanup logic to ensure smooth transitions between PAW versions.

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
 */
export const MIGRATION_MANIFEST: MigrationRule[] = [
  // Example: If agent was renamed from .chatmode.md to .agent.md
  // {
  //   oldFilename: 'paw-planner.chatmode.md',
  //   newFilename: 'paw-planning.agent.md',
  //   version: '0.4.0'
  // },
  // Example: If agent was removed
  // {
  //   oldFilename: 'paw-old-agent.agent.md',
  //   newFilename: undefined,
  //   version: '0.5.0'
  // }
];

/**
 * Get list of obsolete files that should be removed for given version upgrade
 */
export function getObsoleteFiles(fromVersion: string, toVersion: string): string[] {
  // For simplicity, apply all migrations (could be version-range filtered in future)
  return MIGRATION_MANIFEST
    .filter(rule => !rule.newFilename) // Only removed files
    .map(rule => rule.oldFilename);
}

/**
 * Get file renames that should be applied for given version upgrade
 */
export function getFileRenames(fromVersion: string, toVersion: string): Map<string, string> {
  const renames = new Map<string, string>();
  
  for (const rule of MIGRATION_MANIFEST) {
    if (rule.newFilename) {
      renames.set(rule.oldFilename, rule.newFilename);
    }
  }
  
  return renames;
}
```

#### 2. Migration Logic
**File**: `vscode-extension/src/agents/installer.ts`
**Changes**: Add migration and cleanup operations to installer

```typescript
import { getObsoleteFiles, getFileRenames } from './migrations';

/**
 * Perform migration operations when upgrading from previous version
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
    // Check if this is an upgrade
    const previousState = context.globalState.get<any>('paw.agentInstallation');
    const currentVersion = context.extension.packageJSON.version;
    
    if (previousState && previousState.version !== currentVersion) {
      outputChannel.appendLine(`[INFO] Upgrade detected: ${previousState.version} -> ${currentVersion}`);
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
- [ ] `getObsoleteFiles()` returns correct list of files to remove based on manifest
- [ ] `getFileRenames()` returns correct mapping of old to new filenames
- [ ] `migrateAgents()` successfully removes obsolete files when they exist
- [ ] `migrateAgents()` handles missing old files gracefully (no errors)
- [ ] Migration preserves all files in `.paw/instructions/` directory (never deleted)
- [ ] Upgrade from version X to X+1 triggers migration automatically
- [ ] Manual reinstall command successfully overwrites all agent files
- [ ] Extension compiles successfully: `npm run compile`
- [ ] All tests pass: `npm test`

#### Manual Verification:
- [ ] Simulate upgrade by changing version in package.json and reactivating - verify migration runs
- [ ] Create obsolete agent file manually, trigger upgrade, verify file removed
- [ ] Verify custom instruction files never deleted during migration
- [ ] Run "PAW: Reinstall Agents" command and verify all agents rewritten
- [ ] Check output channel logs show migration operations clearly
- [ ] Verify globalState updated with new version after migration

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

**Custom Instructions Tests** (`test/suite/agentCustomInstructions.test.ts`):
- Test `composeAgentContent()` combines workspace, user, and base content
- Test composition precedence order is correct
- Test handling of missing workspace path
- Test handling of missing custom instruction files
- Test empty custom instruction files ignored

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
- Test `getObsoleteFiles()` returns correct files for version range
- Test `getFileRenames()` returns correct rename mapping
- Test `migrateAgents()` removes obsolete files
- Test `migrateAgents()` handles missing old files gracefully
- Test migration never touches `.paw/instructions/` directory

### Integration Tests:

**End-to-End Installation** (`test/integration/installation.test.ts`):
- Test complete installation flow from extension activation
- Test agents appear in prompts directory with correct content
- Test globalState updated correctly after installation
- Test reinstallation with existing files (idempotent behavior)

**Upgrade Simulation** (`test/integration/upgrade.test.ts`):
- Test upgrade from version 0.3.0 to 0.4.0 (mocked)
- Test migration runs and removes obsolete files
- Test version marker updated after upgrade
- Test all current agents installed after upgrade

### Manual Testing Steps:

**Fresh Installation**:
1. Uninstall PAW extension completely
2. Remove all PAW agent files from prompts directory manually
3. Install PAW extension from VSIX
4. Open VS Code and trigger extension activation
5. Verify all agents appear in `<config>/User/prompts/` directory
6. Open GitHub Copilot Chat and verify all agents appear in selector
7. Invoke a PAW agent and verify it responds correctly

**Upgrade Scenario**:
1. Install PAW version X
2. Verify agents installed
3. Manually add an obsolete agent file to prompts directory
4. Update to PAW version X+1 (or simulate by changing package.json version)
5. Reload VS Code to trigger reactivation
6. Verify obsolete file removed
7. Verify all current agent files present and updated

**Custom Instructions**:
1. Create workspace custom instructions: `.paw/instructions/specification-instructions.md`
2. Create user custom instructions: `~/.paw/instructions/implementation-instructions.md`
3. Trigger agent reinstallation
4. Open installed agent files and verify custom instructions present
5. Verify composition order: workspace first, user second, base last
6. Remove custom instruction files and reinstall - verify agents contain only base content

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

**Version 1.0.0 Initial Release**: No migration needed - fresh installations only.

**Future Version Upgrades**: 
- Add entries to `MIGRATION_MANIFEST` when renaming or removing agents
- Test migration logic thoroughly before release
- Include migration notes in changelog for transparency

**Rolling Back**: If users need to downgrade:
- Agents will be reinstalled to match downgraded version
- Custom instruction files remain untouched
- Users may see duplicate agents temporarily if new version added agents that old version doesn't know about

**Custom Instruction Migration**: Custom instruction files are never migrated or modified. If agent names change, users must manually rename their instruction files to match new agent names.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/36
- Spec: `.paw/work/agent-installation-management/Spec.md`
- Research: `.paw/work/agent-installation-management/SpecResearch.md`, `.paw/work/agent-installation-management/CodeResearch.md`
- VS Code Extension API: https://code.visualstudio.com/api/references/vscode-api
- VS Code Custom Chat Participants: https://code.visualstudio.com/api/extension-guides/chat
- Similar implementation (custom instructions): `vscode-extension/src/prompts/customInstructions.ts:24-48`
- Similar implementation (file creation tool): `vscode-extension/src/tools/createPromptTemplates.ts:228-268`
