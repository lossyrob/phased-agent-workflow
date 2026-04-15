import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { loadAgentTemplates } from './agentTemplates';
import {
  getPlatformInfo,
  resolveAgentDirectory,
  resolveLegacyPromptsDirectory,
} from './platformDetection';

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
  /** List of installed filenames for cleanup and verification */
  filesInstalled: string[];
  /** Directory where agents were last installed */
  installDirectory?: string;
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
const LEGACY_PROMPT_FILENAMES = ['paw.prompt.md', 'paw-review.prompt.md', 'PAW Review.agent.md'];

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
 * Result of cleanup operation for previous installation.
 */
interface CleanupResult {
  /** Count of files successfully deleted */
  filesDeleted: number;
  /** Error messages for any failed deletions */
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

function getConfiguredPath(settingName: 'agentDirectory' | 'promptDirectory'): string | undefined {
  const configuredPath = vscode.workspace.getConfiguration('paw').get<string>(settingName);
  return configuredPath && configuredPath.trim().length > 0 ? configuredPath.trim() : undefined;
}

function getDeprecatedPromptDirectory(): string | undefined {
  return getConfiguredPath('promptDirectory');
}

function getAgentDirectoryOverride(): string | undefined {
  return getConfiguredPath('agentDirectory') ?? getDeprecatedPromptDirectory();
}

function getAgentDirectoryPath(): string {
  const platformInfo = getPlatformInfo();
  return resolveAgentDirectory(platformInfo, getAgentDirectoryOverride());
}

function getManagedAgentFilenames(extensionUri: vscode.Uri): string[] {
  return loadAgentTemplates(extensionUri).map(template => template.filename);
}

function collectCleanupCandidateFiles(
  previousState: InstallationState | undefined,
  managedAgentFilenames: string[]
): string[] {
  const filenames = new Set<string>([...managedAgentFilenames, ...LEGACY_PROMPT_FILENAMES]);

  for (const filename of previousState?.filesInstalled ?? []) {
    if (filename && filename.trim().length > 0) {
      filenames.add(filename);
    }
  }

  return [...filenames];
}

function getCleanupDirectories(
  currentAgentDir: string,
  previousState?: InstallationState,
  outputChannel?: vscode.OutputChannel
): string[] {
  const directories = new Set<string>();
  directories.add(currentAgentDir);

  if (previousState?.installDirectory) {
    directories.add(previousState.installDirectory);
  }

  const deprecatedPromptDirectory = getDeprecatedPromptDirectory();
  if (deprecatedPromptDirectory) {
    directories.add(deprecatedPromptDirectory);
  }

  try {
    directories.add(resolveLegacyPromptsDirectory(getPlatformInfo()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine(`[WARN] Unable to resolve legacy prompt directory for cleanup: ${message}`);
  }

  return [...directories].filter(directory => directory && directory.trim().length > 0);
}

function hasResidualManagedFiles(
  currentAgentDir: string,
  previousState: InstallationState | undefined,
  managedAgentFilenames: string[]
): boolean {
  const cleanupDirectories = getCleanupDirectories(currentAgentDir, previousState).filter(
    directory => directory !== currentAgentDir
  );
  const candidateFiles = collectCleanupCandidateFiles(previousState, managedAgentFilenames);

  for (const directory of cleanupDirectories) {
    for (const filename of candidateFiles) {
      if (fs.existsSync(path.join(directory, filename))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if agent installation is needed.
 *
 * Installation is needed if:
 * - No previous installation record exists (fresh install)
 * - Extension version has changed since last installation (upgrade/downgrade)
 * - Installation previously failed
 * - The configured install directory changed
 * - Any expected agent files are missing (repair)
 *
 * @param context - Extension context for accessing globalState
 * @param extensionUri - Extension root URI for loading agent templates
 * @param agentDir - Path to the agent directory
 * @returns True if installation is needed, false if agents are up to date
 */
export function needsInstallation(
  context: vscode.ExtensionContext,
  extensionUri: vscode.Uri,
  agentDir: string
): boolean {
  const state = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
  const currentVersion = context.extension.packageJSON.version;
  const managedAgentFilenames = loadAgentTemplates(extensionUri).map(template => template.filename);

  if (!state || !state.version) {
    return true;
  }

  if (!state.success) {
    return true;
  }

  if (isDevelopmentVersion(state.version) || isDevelopmentVersion(currentVersion)) {
    return true;
  }

  if (state.version !== currentVersion) {
    return true;
  }

  if (state.installDirectory && state.installDirectory !== agentDir) {
    return true;
  }

  for (const filename of managedAgentFilenames) {
    const filePath = path.join(agentDir, filename);
    if (!fs.existsSync(filePath)) {
      return true;
    }
  }

  if (hasResidualManagedFiles(agentDir, state, managedAgentFilenames)) {
    return true;
  }

  return false;
}

async function updateInstallationState(
  context: vscode.ExtensionContext,
  version: string,
  filesInstalled: string[],
  installDirectory: string,
  success: boolean,
  previousVersion?: string,
  filesDeleted?: number
): Promise<void> {
  const state: InstallationState = {
    version,
    filesInstalled,
    installDirectory,
    installedAt: new Date().toISOString(),
    success,
    previousVersion,
    filesDeleted
  };

  await context.globalState.update(INSTALLATION_STATE_KEY, state);
}

function cleanupPreviousInstallation(
  directories: string[],
  candidateFiles: string[],
  outputChannel?: vscode.OutputChannel
): CleanupResult {
  const result: CleanupResult = {
    filesDeleted: 0,
    errors: [],
  };

  for (const directory of directories) {
    for (const filename of candidateFiles) {
      const filePath = path.join(directory, filename);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          result.filesDeleted++;
          outputChannel?.appendLine(`[INFO] Deleted previous managed file: ${filePath}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to delete ${filePath}: ${message}`);
        outputChannel?.appendLine(`[ERROR] Failed to delete ${filePath}: ${message}`);
      }
    }
  }

  return result;
}

/**
 * Installs PAW agent templates to the current user agent directory.
 *
 * @param context - Extension context for version tracking and state storage
 * @param outputChannel - Optional output channel for logging installation details
 * @returns Installation result with files installed, skipped, and any errors
 */
export async function installAgents(
  context: vscode.ExtensionContext,
  outputChannel?: vscode.OutputChannel
): Promise<InstallationResult> {
  const result: InstallationResult = {
    filesInstalled: [],
    filesSkipped: [],
    errors: [],
  };

  try {
    const agentDir = getAgentDirectoryPath();
    const currentVersion = context.extension.packageJSON.version;
    const previousState = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
    const previousVersion = previousState?.version;
    let filesDeleted = 0;

    let templates;
    try {
      templates = loadAgentTemplates(context.extension.extensionUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to load agent templates: ${message}`);
      return result;
    }

    const managedAgentFilenames = templates.map(template => template.filename);

    try {
      if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
        outputChannel?.appendLine(`[INFO] Created agent directory: ${agentDir}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to create agent directory: ${message}`);
      return result;
    }

    if (outputChannel) {
      outputChannel.appendLine(`[INFO] Agent directory path: ${agentDir}`);
      if (getConfiguredPath('agentDirectory')) {
        outputChannel.appendLine('[INFO] Using paw.agentDirectory override from configuration');
      } else if (getDeprecatedPromptDirectory()) {
        outputChannel.appendLine('[WARN] Using deprecated paw.promptDirectory fallback for agent installation');
      } else {
        const platformInfo = getPlatformInfo();
        outputChannel.appendLine(`[INFO] Platform: ${platformInfo.platform}`);
        outputChannel.appendLine(`[INFO] VS Code variant: ${platformInfo.variant}`);
      }
    }

    const cleanupResult = cleanupPreviousInstallation(
      getCleanupDirectories(agentDir, previousState, outputChannel),
      collectCleanupCandidateFiles(previousState, managedAgentFilenames),
      outputChannel
    );
    filesDeleted = cleanupResult.filesDeleted;
    result.errors.push(...cleanupResult.errors);

    for (const template of templates) {
      const filePath = path.join(agentDir, template.filename);

      try {
        fs.writeFileSync(filePath, template.content, 'utf-8');
        result.filesInstalled.push(template.filename);
        outputChannel?.appendLine(`[INFO] Installed agent: ${template.filename}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to write ${template.filename}: ${message}`);
        outputChannel?.appendLine(`[ERROR] Failed to write ${template.filename}: ${message}`);
      }
    }

    const success = result.errors.length === 0;
    await updateInstallationState(
      context,
      currentVersion,
      result.filesInstalled,
      agentDir,
      success,
      previousVersion,
      filesDeleted > 0 ? filesDeleted : undefined
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unexpected error during installation: ${message}`);
    return result;
  }
}

/**
 * Removes installed PAW agent files from the current and legacy installation locations.
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

  const previousState = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);
  const candidateDirectories = new Set<string>();

  if (previousState?.installDirectory) {
    candidateDirectories.add(previousState.installDirectory);
  }

  try {
    candidateDirectories.add(getAgentDirectoryPath());
  } catch (error) {
    if (!previousState?.installDirectory) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Unable to determine agent directory for cleanup: ${message}`);
    }
  }

  const deprecatedPromptDirectory = getDeprecatedPromptDirectory();
  if (deprecatedPromptDirectory) {
    candidateDirectories.add(deprecatedPromptDirectory);
  }

  try {
    candidateDirectories.add(resolveLegacyPromptsDirectory(getPlatformInfo()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Unable to resolve legacy prompt directory for cleanup: ${message}`);
  }

  let managedAgentFilenames: string[] = [];
  try {
    managedAgentFilenames = getManagedAgentFilenames(context.extension.extensionUri);
  } catch {
    // Use tracked filenames only if bundled templates are unavailable.
  }

  const candidateFiles = collectCleanupCandidateFiles(previousState, managedAgentFilenames);

  for (const directory of candidateDirectories) {
    for (const filename of candidateFiles) {
      const filePath = path.join(directory, filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          result.filesRemoved.push(filename);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to delete ${filePath}: ${message}`);
      }
    }
  }

  await context.globalState.update(INSTALLATION_STATE_KEY, undefined);
  return result;
}
