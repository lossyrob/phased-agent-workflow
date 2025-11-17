import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Supported operating system platforms for PAW agent installation.
 */
export type SupportedPlatform = 'windows' | 'macos' | 'linux' | 'wsl';

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
 * Detects if running in Windows Subsystem for Linux (WSL).
 * 
 * @param nodePlatform - The Node.js platform identifier
 * @param procVersionReader - Optional function to read /proc/version (for testing)
 * @returns true if running in WSL, false otherwise
 */
export function isWSL(
  nodePlatform: NodeJS.Platform = os.platform(),
  procVersionReader?: () => string
): boolean {
  if (nodePlatform !== 'linux') {
    return false;
  }

  // If a mock reader is provided, use only that for detection (for testing)
  if (procVersionReader) {
    try {
      const versionContent = procVersionReader();
      return versionContent.toLowerCase().includes('microsoft') || 
             versionContent.toLowerCase().includes('wsl');
    } catch {
      return false;
    }
  }

  // Production path: try multiple detection methods
  try {
    // Check for WSL in /proc/version
    const versionContent = fs.readFileSync('/proc/version', 'utf8');
    if (versionContent.toLowerCase().includes('microsoft') || 
        versionContent.toLowerCase().includes('wsl')) {
      return true;
    }
  } catch {
    // If we can't read /proc/version, try another method
  }

  // Check for WSL environment variable
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
    return true;
  }

  return false;
}

/**
 * Gets the Windows username from WSL environment.
 * Tries multiple methods to determine the Windows username.
 * 
 * @param usersDirReader - Optional function to read /mnt/c/Users directory (for testing)
 * @returns Windows username or undefined if not found
 */
export function getWindowsUsernameFromWSL(
  usersDirReader?: () => string[]
): string | undefined {
  // Try to read from /mnt/c/Users directory first (most reliable)
  try {
    const usersDir = '/mnt/c/Users';
    let users: string[];
    
    if (usersDirReader) {
      users = usersDirReader();
    } else if (fs.existsSync(usersDir)) {
      users = fs.readdirSync(usersDir);
    } else {
      return undefined;
    }

    // Filter out system directories and files
    const validUsers = users.filter(u => 
      !['Public', 'Default', 'Default User', 'All Users', 'desktop.ini'].includes(u)
    );
    
    // If exactly one user found, use it
    if (validUsers.length === 1) {
      return validUsers[0];
    }
    
    // If multiple users, try to match LOGNAME
    if (validUsers.length > 1 && process.env.LOGNAME && process.env.LOGNAME !== 'root') {
      const logname = process.env.LOGNAME.toLowerCase();
      const match = validUsers.find(u => u.toLowerCase() === logname || u.toLowerCase().startsWith(logname));
      if (match) {
        return match;
      }
    }
  } catch {
    // Ignore errors
  }

  // Fallback to WSLENV variables
  if (process.env.LOGNAME && process.env.LOGNAME !== 'root') {
    return process.env.LOGNAME;
  }

  return undefined;
}

/**
 * Gets platform information needed to resolve the prompts directory.
 * 
 * @param appName - The VS Code application name (defaults to vscode.env.appName)
 * @param nodePlatform - The Node.js platform identifier (defaults to os.platform())
 * @param homeDir - The user's home directory (defaults to os.homedir())
 * @param procVersionReader - Optional function to read /proc/version (for testing)
 * @param usersDirReader - Optional function to read /mnt/c/Users directory (for testing)
 * @returns Platform information including OS, home directory, and VS Code variant
 * @throws {UnsupportedPlatformError} If the platform is not supported or home directory cannot be determined
 */
export function getPlatformInfo(
  appName = vscode.env.appName,
  nodePlatform: NodeJS.Platform = os.platform(),
  homeDir: string = os.homedir(),
  procVersionReader?: () => string,
  usersDirReader?: () => string[]
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
      // Check if running in WSL
      if (isWSL(nodePlatform, procVersionReader)) {
        const windowsUser = getWindowsUsernameFromWSL(usersDirReader);
        if (!windowsUser) {
          throw new UnsupportedPlatformError(
            'Running in WSL but cannot determine Windows username. Set paw.promptDirectory to C:\\Users\\<username>\\AppData\\Roaming\\Code\\User\\prompts manually.'
          );
        }
        // Return WSL platform with Windows-compatible home directory
        return { platform: 'wsl', homeDir: `/mnt/c/Users/${windowsUser}`, variant };
      }
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
 * - WSL: /mnt/c/Users/<username>/AppData/Roaming/<variant>/User/prompts
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
    case 'wsl':
      // In WSL, info.homeDir is already set to /mnt/c/Users/<username>
      // Use path.posix since we're in Linux but accessing Windows paths via /mnt/c
      configRoot = path.posix.join(info.homeDir, 'AppData', 'Roaming', info.variant);
      return path.posix.join(configRoot, 'User', 'prompts');
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
