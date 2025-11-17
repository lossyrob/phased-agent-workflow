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
interface InstallationState {
  /** The extension version when agents were last installed */
  version: string;
  /** List of installed agent filenames for cleanup and verification */
  filesInstalled: string[];
  /** Timestamp of installation (ISO 8601 format) */
  installedAt: string;
  /** Whether the installation completed successfully */
  success: boolean;
}

/**
 * Storage key for installation state in globalState.
 */
const INSTALLATION_STATE_KEY = 'paw.agentInstallation';

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
  
  if (!state) {
    // No previous installation record - fresh install needed
    return true;
  }

  // Check if version has changed
  const currentVersion = context.extension.packageJSON.version;
  if (state.version !== currentVersion) {
    // Version changed - reinstallation needed for upgrade/downgrade
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
 */
async function updateInstallationState(
  context: vscode.ExtensionContext,
  version: string,
  filesInstalled: string[],
  success: boolean
): Promise<void> {
  const state: InstallationState = {
    version,
    filesInstalled,
    installedAt: new Date().toISOString(),
    success
  };
  
  await context.globalState.update(INSTALLATION_STATE_KEY, state);
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
    const currentVersion = context.extension.packageJSON.version;
    const success = result.errors.length === 0;
    await updateInstallationState(
      context,
      currentVersion,
      result.filesInstalled,
      success
    );

    return result;
  } catch (error) {
    // Catch-all for unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unexpected error during installation: ${message}`);
    return result;
  }
}
