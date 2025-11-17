import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { loadAgentTemplates } from './agentTemplates';
import { getPlatformInfo, resolvePromptsDirectory } from './platformDetection';

/**
 * Result of an agent installation operation.
 * Tracks which files were installed, skipped, and any errors encountered.
 */
export interface InstallationResult {
  /** Names of agent files successfully written */
  filesInstalled: string[];
  /** Names of agent files that were skipped (already up to date) */
  filesSkipped: string[];
  /** Error messages for any failed operations */
  errors: string[];
}

/**
 * Installation state persisted in globalState for version tracking and repair.
 */
export interface InstallationState {
  /** The extension version when agents were last installed */
  version: string;
  /** List of installed agent filenames for cleanup and verification */
  filesInstalled: string[];
  /** Timestamp of installation (ISO 8601 format) */
  installedAt: string;
  /** Whether the installation completed successfully */
  success: boolean;
  /** The previous extension version before this installation (for logging version changes) */
  previousVersion?: string;
  /** Count of files deleted during cleanup (for verification) */
  filesDeleted?: number;
}

/**
 * Storage key for installation state in globalState.
 */
export const INSTALLATION_STATE_KEY = 'paw.agentInstallation';

/**
 * Result of uninstall cleanup when removing installed agents.
 */
export interface AgentCleanupResult {
  /** Names of agent files successfully removed during cleanup */
  filesRemoved: string[];
  /** Error messages describing files that could not be removed */
  errors: string[];
}

/**
 * Determine whether a version string represents a development build.
 * Development builds use a "-dev" suffix to force reinstallation on every activation.
 */
export function isDevelopmentVersion(version: string | undefined | null): boolean {
  if (!version) {
    return false;
  }

  return version.includes('-dev');
}

/**
 * Gets the custom prompts directory path from configuration, if set.
 * 
 * @returns Custom path or undefined if not configured
 */
function getCustomPromptsDirectory(): string | undefined {
  const config = vscode.workspace.getConfiguration('paw');
  const customPath = config.get<string>('promptDirectory');
  return customPath && customPath.trim().length > 0 ? customPath : undefined;
}

/**
 * Determines the prompts directory path where agents should be installed.
 * 
 * @returns Absolute path to the prompts directory
 * @throws {Error} If platform is unsupported and no custom path is configured
 */
function getPromptsDirectoryPath(): string {
  const customPath = getCustomPromptsDirectory();
  const platformInfo = getPlatformInfo();
  return resolvePromptsDirectory(platformInfo, customPath);
}

/**
 * Checks if agent installation is needed.
 * 
 * Installation is needed if:
 * - No previous installation record exists (fresh install)
 * - Extension version has changed since last installation (upgrade/downgrade)
 * - Any expected agent files are missing (repair)
 * 
 * @param context - Extension context for accessing globalState
 * @param extensionUri - Extension root URI for loading agent templates
 * @param promptsDir - Path to the prompts directory
 * @returns True if installation is needed, false if agents are up to date
 */
export function needsInstallation(
  context: vscode.ExtensionContext,
  extensionUri: vscode.Uri,
  promptsDir: string
): boolean {
  // Check if we have a previous installation record
  const state = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
  const currentVersion = context.extension.packageJSON.version;
  
  if (!state) {
    // No previous installation record - fresh install needed
    return true;
  }

  if (!state.version) {
    // Safety fallback - treat missing version as needing reinstall
    return true;
  }

  // Development builds always reinstall to pick up agent content edits
  if (isDevelopmentVersion(state.version) || isDevelopmentVersion(currentVersion)) {
    return true;
  }

  // Check if version has changed (upgrade/downgrade)
  if (state.version !== currentVersion) {
    return true;
  }

  // Check if any expected files are missing (repair case)
  const templates = loadAgentTemplates(extensionUri);
  for (const template of templates) {
    const filePath = path.join(promptsDir, template.filename);
    if (!fs.existsSync(filePath)) {
      // Expected file is missing - repair needed
      return true;
    }
  }

  // All checks passed - agents are up to date
  return false;
}

/**
 * Updates the installation state in globalState.
 * 
 * @param context - Extension context for accessing globalState
 * @param version - Current extension version
 * @param filesInstalled - List of installed filenames
 * @param success - Whether installation completed successfully
 * @param previousVersion - Optional previous version before this installation
 * @param filesDeleted - Optional count of files deleted during cleanup
 */
async function updateInstallationState(
  context: vscode.ExtensionContext,
  version: string,
  filesInstalled: string[],
  success: boolean,
  previousVersion?: string,
  filesDeleted?: number
): Promise<void> {
  const state: InstallationState = {
    version,
    filesInstalled,
    installedAt: new Date().toISOString(),
    success,
    previousVersion,
    filesDeleted
  };
  
  await context.globalState.update(INSTALLATION_STATE_KEY, state);
}

/**
 * Result of cleanup operation for previous installation.
 */
interface CleanupResult {
  /** Count of files successfully deleted */
  filesDeleted: number;
  /** Error messages for any failed deletions */
  errors: string[];
}

/**
 * Cleans up all previously installed agent files.
 * 
 * This function deletes all files listed in the previous installation state
 * to ensure clean version changes (upgrades and downgrades). Individual
 * deletion failures are logged but don't prevent the cleanup from continuing.
 * 
 * @param context - Extension context for accessing globalState
 * @param promptsDir - Path to the prompts directory
 * @returns Cleanup result with count of files deleted and any errors
 */
function cleanupPreviousInstallation(
  context: vscode.ExtensionContext,
  promptsDir: string
): CleanupResult {
  const result: CleanupResult = {
    filesDeleted: 0,
    errors: []
  };

  // Get previous installation state
  const state = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
  if (!state || !state.filesInstalled || state.filesInstalled.length === 0) {
    // No previous installation to clean up
    return result;
  }

  // Delete each previously installed file
  // Note: Missing files are treated as already cleaned (no error), but
  // permission errors or other failures are logged without blocking cleanup
  for (const filename of state.filesInstalled) {
    const filePath = path.join(promptsDir, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        result.filesDeleted++;
      }
      // If file doesn't exist, consider it already cleaned up (no error)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to delete ${filename}: ${message}`);
      // Continue with remaining files (errors don't block cleanup)
    }
  }

  return result;
}

/**
 * Installs PAW agent templates to the prompts directory.
 * 
 * This function:
 * 1. Determines the prompts directory path (platform-specific or custom)
 * 2. Creates the prompts directory if it doesn't exist
 * 3. Loads agent templates from the extension's agents/ directory
 * 4. Writes each agent file to the prompts directory (overwrites existing)
 * 5. Updates installation state in globalState
 * 6. Returns structured result with success/failure details
 * 
 * The operation is idempotent - safe to run multiple times. Individual file
 * failures are tracked but don't prevent other files from being installed.
 * 
 * @param context - Extension context for version tracking and state storage
 * @returns Installation result with files installed, skipped, and any errors
 */
export async function installAgents(context: vscode.ExtensionContext): Promise<InstallationResult> {
  const result: InstallationResult = {
    filesInstalled: [],
    filesSkipped: [],
    errors: []
  };

  try {
    // Determine where to install agents
    const promptsDir = getPromptsDirectoryPath();
    
    // Create prompts directory if needed (recursive)
    try {
      if (!fs.existsSync(promptsDir)) {
        fs.mkdirSync(promptsDir, { recursive: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to create prompts directory: ${message}`);
      return result;
    }

    // Check for version change and clean up previous installation if needed
    const currentVersion = context.extension.packageJSON.version;
    const previousState = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
    const currentIsDev = isDevelopmentVersion(currentVersion);
    let previousVersion: string | undefined;
    let filesDeleted = 0;

    const shouldCleanup = Boolean(
      previousState && (
        previousState.version !== currentVersion ||
        isDevelopmentVersion(previousState.version) ||
        currentIsDev
      )
    );

    if (shouldCleanup && previousState?.version) {
      previousVersion = previousState.version;
      const cleanupResult = cleanupPreviousInstallation(context, promptsDir);
      filesDeleted = cleanupResult.filesDeleted;

      // Add cleanup errors to result but don't stop installation
      result.errors.push(...cleanupResult.errors);
    }

    // Load agent templates from extension resources
    let templates;
    try {
      templates = loadAgentTemplates(context.extension.extensionUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to load agent templates: ${message}`);
      return result;
    }

    // Install each agent file
    for (const template of templates) {
      const filePath = path.join(promptsDir, template.filename);
      
      try {
        fs.writeFileSync(filePath, template.content, 'utf-8');
        result.filesInstalled.push(template.filename);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to write ${template.filename}: ${message}`);
        // Continue installing other files
      }
    }

    // Update installation state
    const success = result.errors.length === 0;
    await updateInstallationState(
      context,
      currentVersion,
      result.filesInstalled,
      success,
      previousVersion,
      filesDeleted > 0 ? filesDeleted : undefined
    );

    return result;
  } catch (error) {
    // Catch-all for unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unexpected error during installation: ${message}`);
    return result;
  }
}

/**
 * Removes installed PAW agent files from the prompts directory.
 *
 * This helper is used during extension deactivation/uninstall to ensure that
 * PAW agents do not remain on the user's system after the extension is
 * removed. The cleanup is conservative: it attempts to delete the files tracked
 * in installation state and any additional files that match the PAW agent
 * filename pattern. Errors are collected but do not throw.
 *
 * @param context - Extension context for accessing configuration and global state
 * @returns Cleanup summary with removed files and any errors encountered
 */
export async function removeInstalledAgents(
  context: vscode.ExtensionContext
): Promise<AgentCleanupResult> {
  const result: AgentCleanupResult = {
    filesRemoved: [],
    errors: []
  };

  let promptsDir: string;
  try {
    promptsDir = getPromptsDirectoryPath();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unable to determine prompts directory for cleanup: ${message}`);
    // Still clear global state so the uninstall is treated as complete
    await context.globalState.update(INSTALLATION_STATE_KEY, undefined);
    return result;
  }

  const candidateFiles = new Set<string>();
  const previousState = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
  if (previousState?.filesInstalled?.length) {
    for (const filename of previousState.filesInstalled) {
      candidateFiles.add(filename);
    }
  }

  if (fs.existsSync(promptsDir)) {
    try {
      const directoryEntries = fs.readdirSync(promptsDir);
      for (const entry of directoryEntries) {
        if (/^paw-.*\.agent\.md$/i.test(entry)) {
          candidateFiles.add(entry);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Unable to list prompts directory contents: ${message}`);
    }
  }

  for (const filename of candidateFiles) {
    const filePath = path.join(promptsDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        result.filesRemoved.push(filename);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to delete ${filename}: ${message}`);
    }
  }

  await context.globalState.update(INSTALLATION_STATE_KEY, undefined);
  return result;
}
