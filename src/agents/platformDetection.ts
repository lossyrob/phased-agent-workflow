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
 * These names are used only for legacy prompt-directory cleanup paths.
 */
export enum VSCodeVariant {
  Stable = 'Code',
  Insiders = 'Code - Insiders',
  OSS = 'Code - OSS',
  VSCodium = 'VSCodium'
}

/**
 * Platform information needed to resolve current and legacy install paths.
 */
export interface PlatformInfo {
  /** The operating system platform */
  platform: SupportedPlatform;
  /** The user's active home directory path */
  homeDir: string;
  /** The VS Code product variant */
  variant: VSCodeVariant;
  /**
   * Windows home directory when running under WSL.
   * Used only for legacy prompt-directory cleanup.
   */
  windowsHomeDir?: string;
}

/**
 * Error thrown when the platform is not supported or cannot be detected.
 * Users can work around this by setting the paw.agentDirectory configuration.
 */
export class UnsupportedPlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPlatformError';
  }
}

function normalizeAppName(appName?: string): string {
  return (appName ?? '').toLowerCase();
}

export function detectVSCodeVariant(appName = vscode.env.appName): VSCodeVariant {
  const normalized = normalizeAppName(appName);

  if (normalized.includes('insider')) {
    return VSCodeVariant.Insiders;
  }

  if (normalized.includes('oss')) {
    return VSCodeVariant.OSS;
  }

  if (normalized.includes('vscodium')) {
    return VSCodeVariant.VSCodium;
  }

  return VSCodeVariant.Stable;
}

export function isWSL(
  nodePlatform: NodeJS.Platform = os.platform(),
  procVersionReader?: () => string
): boolean {
  if (nodePlatform !== 'linux') {
    return false;
  }

  if (procVersionReader) {
    try {
      const versionContent = procVersionReader();
      return versionContent.toLowerCase().includes('microsoft') ||
        versionContent.toLowerCase().includes('wsl');
    } catch {
      return false;
    }
  }

  try {
    const versionContent = fs.readFileSync('/proc/version', 'utf8');
    if (
      versionContent.toLowerCase().includes('microsoft') ||
      versionContent.toLowerCase().includes('wsl')
    ) {
      return true;
    }
  } catch {
    // Fall through to environment detection.
  }

  return Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
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

    const validUsers = users.filter(user =>
      !['Public', 'Default', 'Default User', 'All Users', 'desktop.ini'].includes(user)
    );

    if (validUsers.length === 1) {
      return validUsers[0];
    }

    if (validUsers.length > 1 && process.env.LOGNAME && process.env.LOGNAME !== 'root') {
      const logname = process.env.LOGNAME.toLowerCase();
      const match = validUsers.find(user =>
        user.toLowerCase() === logname || user.toLowerCase().startsWith(logname)
      );
      if (match) {
        return match;
      }
    }
  } catch {
    // Ignore lookup failures; WSL can still use the Linux-side agent directory.
  }

  if (process.env.LOGNAME && process.env.LOGNAME !== 'root') {
    return process.env.LOGNAME;
  }

  return undefined;
}

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
      'Unable to determine user home directory. Set paw.agentDirectory to a custom path.'
    );
  }

  switch (nodePlatform) {
    case 'win32':
      return { platform: 'windows', homeDir, variant };
    case 'darwin':
      return { platform: 'macos', homeDir, variant };
    case 'linux':
      if (isWSL(nodePlatform, procVersionReader)) {
        const windowsUser = getWindowsUsernameFromWSL(usersDirReader);
        return {
          platform: 'wsl',
          homeDir,
          variant,
          ...(windowsUser ? { windowsHomeDir: `/mnt/c/Users/${windowsUser}` } : {})
        };
      }
      return { platform: 'linux', homeDir, variant };
    default:
      throw new UnsupportedPlatformError(
        `Unsupported platform: ${nodePlatform}. Set paw.agentDirectory to the custom agents directory manually.`
      );
  }
}

function windowsConfigRoot(homeDir: string): string {
  const appData = process.env.APPDATA;
  if (appData && appData.length > 0) {
    return path.win32.normalize(appData);
  }

  return path.win32.join(homeDir, 'AppData', 'Roaming');
}

function normalizeWSLOverridePath(overridePath: string): string {
  const windowsDrivePath = /^([a-zA-Z]):[\\/](.*)$/.exec(overridePath);
  if (!windowsDrivePath) {
    return overridePath;
  }

  const driveLetter = windowsDrivePath[1].toLowerCase();
  const remainder = windowsDrivePath[2]
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');

  return path.posix.join('/mnt', driveLetter, remainder);
}

/**
 * Resolves the current user agent directory.
 *
 * @param info - Platform information (OS, home directory, VS Code variant)
 * @param overridePath - Optional custom path from paw.agentDirectory or deprecated paw.promptDirectory
 * @returns Absolute path to the agent directory
 */
export function resolveAgentDirectory(
  info: PlatformInfo,
  overridePath?: string
): string {
  if (overridePath && overridePath.trim().length > 0) {
    const trimmedOverridePath = overridePath.trim();
    return info.platform === 'wsl'
      ? normalizeWSLOverridePath(trimmedOverridePath)
      : trimmedOverridePath;
  }

  switch (info.platform) {
    case 'windows':
      return path.win32.join(info.homeDir, '.copilot', 'agents');
    case 'wsl':
      return path.posix.join(info.homeDir, '.copilot', 'agents');
    case 'macos':
    case 'linux':
      return path.join(info.homeDir, '.copilot', 'agents');
    default:
      throw new UnsupportedPlatformError(
        `Unsupported platform: ${info.platform}. Set paw.agentDirectory to the custom agents directory manually.`
      );
  }
}

/**
 * Resolves the legacy prompt directory used by older VS Code releases.
 *
 * @param info - Platform information (OS, home directory, VS Code variant)
 * @param overridePath - Optional custom path from deprecated paw.promptDirectory
 * @returns Absolute path to the legacy prompts directory
 */
export function resolveLegacyPromptsDirectory(
  info: PlatformInfo,
  overridePath?: string
): string {
  if (overridePath && overridePath.trim().length > 0) {
    const trimmedOverridePath = overridePath.trim();
    return info.platform === 'wsl'
      ? normalizeWSLOverridePath(trimmedOverridePath)
      : trimmedOverridePath;
  }

  let configRoot: string;

  switch (info.platform) {
    case 'windows':
      configRoot = path.win32.join(windowsConfigRoot(info.homeDir), info.variant);
      return path.win32.join(configRoot, 'User', 'prompts');
    case 'wsl':
      if (!info.windowsHomeDir) {
        throw new UnsupportedPlatformError(
          'Running in WSL but cannot determine the Windows home directory for legacy prompt cleanup. Set paw.promptDirectory if you need to clean a custom legacy path.'
        );
      }
      configRoot = path.posix.join(info.windowsHomeDir, 'AppData', 'Roaming', info.variant);
      return path.posix.join(configRoot, 'User', 'prompts');
    case 'macos':
      configRoot = path.join(info.homeDir, 'Library', 'Application Support', info.variant);
      break;
    case 'linux':
      configRoot = path.join(info.homeDir, '.config', info.variant);
      break;
    default:
      throw new UnsupportedPlatformError(
        `Unsupported platform: ${info.platform}. Set paw.promptDirectory to the legacy prompts directory manually.`
      );
  }

  return path.join(configRoot, 'User', 'prompts');
}
