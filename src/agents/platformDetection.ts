import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Supported operating system platforms for PAW agent installation.
 */
export type SupportedPlatform = 'windows' | 'macos' | 'linux';

/**
 * VS Code product variants with their canonical names.
 * These names are used in the configuration directory paths.
 */
export enum VSCodeVariant {
  Stable = 'Code',
  Insiders = 'Code - Insiders',
  OSS = 'Code - OSS',
  VSCodium = 'VSCodium'
}

/**
 * Platform information needed to resolve the prompts directory path.
 */
export interface PlatformInfo {
  /** The operating system platform */
  platform: SupportedPlatform;
  /** The user's home directory path */
  homeDir: string;
  /** The VS Code product variant */
  variant: VSCodeVariant;
}

/**
 * Error thrown when the platform is not supported or cannot be detected.
 * Users can work around this by setting the paw.promptDirectory configuration.
 */
export class UnsupportedPlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPlatformError';
  }
}

/**
 * Normalizes app name for case-insensitive comparison.
 */
function normalizeAppName(appName?: string): string {
  return (appName ?? '').toLowerCase();
}

/**
 * Detects the VS Code product variant from the application name.
 * This determines which configuration directory to use for agent installation.
 * 
 * @param appName - The VS Code application name (defaults to vscode.env.appName)
 * @returns The detected VS Code variant
 * 
 * @example
 * detectVSCodeVariant('Visual Studio Code') // returns VSCodeVariant.Stable
 * detectVSCodeVariant('Visual Studio Code - Insiders') // returns VSCodeVariant.Insiders
 */
export function detectVSCodeVariant(appName = vscode.env.appName): VSCodeVariant {
  const normalized = normalizeAppName(appName);

  // Check for variants in order of specificity
  if (normalized.includes('insider')) {
    return VSCodeVariant.Insiders;
  }

  if (normalized.includes('oss')) {
    return VSCodeVariant.OSS;
  }

  if (normalized.includes('vscodium')) {
    return VSCodeVariant.VSCodium;
  }

  // Default to stable variant
  return VSCodeVariant.Stable;
}

/**
 * Gets platform information needed to resolve the prompts directory.
 * 
 * @param appName - The VS Code application name (defaults to vscode.env.appName)
 * @param nodePlatform - The Node.js platform identifier (defaults to os.platform())
 * @param homeDir - The user's home directory (defaults to os.homedir())
 * @returns Platform information including OS, home directory, and VS Code variant
 * @throws {UnsupportedPlatformError} If the platform is not supported or home directory cannot be determined
 */
export function getPlatformInfo(
  appName = vscode.env.appName,
  nodePlatform: NodeJS.Platform = os.platform(),
  homeDir: string = os.homedir()
): PlatformInfo {
  const variant = detectVSCodeVariant(appName);

  if (!homeDir) {
    throw new UnsupportedPlatformError(
      'Unable to determine user home directory. Set paw.promptDirectory to a custom path.'
    );
  }

  // Map Node.js platform identifiers to our platform types
  switch (nodePlatform) {
    case 'win32':
      return { platform: 'windows', homeDir, variant };
    case 'darwin':
      return { platform: 'macos', homeDir, variant };
    case 'linux':
      return { platform: 'linux', homeDir, variant };
    default:
      throw new UnsupportedPlatformError(
        `Unsupported platform: ${nodePlatform}. Set paw.promptDirectory to the prompts directory manually.`
      );
  }
}

/**
 * Resolves the Windows configuration root directory.
 * Prefers APPDATA environment variable, falls back to standard path.
 */
function windowsConfigRoot(homeDir: string): string {
  const appData = process.env.APPDATA;
  if (appData && appData.length > 0) {
    return path.win32.normalize(appData);
  }
  // Fallback to standard Windows AppData path
  return path.win32.join(homeDir, 'AppData', 'Roaming');
}

/**
 * Resolves the platform-specific prompts directory path.
 * 
 * The prompts directory is where VS Code stores user prompt templates for GitHub Copilot.
 * This function determines the correct path based on the OS and VS Code variant.
 * 
 * @param info - Platform information (OS, home directory, VS Code variant)
 * @param overridePath - Optional custom path from paw.promptDirectory configuration
 * @returns Absolute path to the prompts directory
 * @throws {UnsupportedPlatformError} If the platform is not supported
 * 
 * @remarks
 * Default paths by platform:
 * - Windows: %APPDATA%\<variant>\User\prompts
 * - macOS: ~/Library/Application Support/<variant>/User/prompts
 * - Linux: ~/.config/<variant>/User/prompts
 */
export function resolvePromptsDirectory(
  info: PlatformInfo,
  overridePath?: string
): string {
  // Allow users to override the prompts directory for unsupported platforms or custom setups
  if (overridePath && overridePath.trim().length > 0) {
    return overridePath;
  }

  let configRoot: string;

  switch (info.platform) {
    case 'windows':
      configRoot = path.win32.join(windowsConfigRoot(info.homeDir), info.variant);
      return path.win32.join(configRoot, 'User', 'prompts');
    case 'macos':
      configRoot = path.join(info.homeDir, 'Library', 'Application Support', info.variant);
      break;
    case 'linux':
      configRoot = path.join(info.homeDir, '.config', info.variant);
      break;
    default:
      throw new UnsupportedPlatformError(
        `Unsupported platform: ${info.platform}. Set paw.promptDirectory to the prompts directory manually.`
      );
  }

  return path.join(configRoot, 'User', 'prompts');
}
