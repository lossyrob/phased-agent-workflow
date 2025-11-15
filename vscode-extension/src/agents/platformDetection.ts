/**
 * Platform detection and VS Code prompts directory resolution
 *
 * This module determines the appropriate User/prompts directory path
 * for installing PAW agents based on the operating system and VS Code variant.
 */

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
 * Platform information including OS, home directory, and VS Code variant
 */
export interface PlatformInfo {
	platform: NodeJS.Platform;
	homeDir: string;
	variant: VSCodeVariant;
}

/**
 * Detects the current VS Code variant based on environment variables and product name
 *
 * @returns The detected VS Code variant
 */
export function detectVSCodeVariant(): VSCodeVariant {
	// Check for VSCodium first (most specific)
	if (process.env.VSCODE_CWD?.includes('vscodium') || 
	    process.env.VSCODE_CWD?.includes('VSCodium')) {
		return VSCodeVariant.VSCodium;
	}

	// Check for Code-OSS
	if (process.env.VSCODE_CWD?.includes('code-oss') || 
	    process.env.VSCODE_CWD?.includes('Code-OSS')) {
		return VSCodeVariant.CodeOSS;
	}

	// Check for Insiders
	if (process.env.VSCODE_CWD?.includes('insiders') || 
	    process.env.VSCODE_CWD?.includes('Insiders')) {
		return VSCodeVariant.Insiders;
	}

	// Check product name from VS Code API
	const appName = vscode.env.appName.toLowerCase();
	if (appName.includes('vscodium')) {
		return VSCodeVariant.VSCodium;
	}
	if (appName.includes('oss')) {
		return VSCodeVariant.CodeOSS;
	}
	if (appName.includes('insiders')) {
		return VSCodeVariant.Insiders;
	}

	// Default to standard Code
	return VSCodeVariant.Code;
}

/**
 * Gets platform information including OS, home directory, and VS Code variant
 *
 * @returns Platform information object
 */
export function getPlatformInfo(): PlatformInfo {
	return {
		platform: os.platform(),
		homeDir: os.homedir(),
		variant: detectVSCodeVariant()
	};
}

/**
 * Resolves the User/prompts directory path for the current platform and VS Code variant
 *
 * First checks for the paw.promptDirectory configuration setting override.
 * If not set, uses platform-specific default paths.
 *
 * @returns Absolute path to the VS Code User/prompts directory
 * @throws Error if the platform is unsupported and no override is configured
 */
export function resolvePromptsDirectory(): string {
	// Check for user-configured override first
	const config = vscode.workspace.getConfiguration('paw');
	const customPath = config.get<string>('promptDirectory');
	
	if (customPath && customPath.trim() !== '') {
		return customPath.trim();
	}

	// Get platform information
	const platformInfo = getPlatformInfo();
	const { platform, homeDir, variant } = platformInfo;

	// Map VS Code variant to directory name
	let variantDir: string;
	switch (variant) {
		case VSCodeVariant.Code:
			variantDir = 'Code';
			break;
		case VSCodeVariant.Insiders:
			variantDir = 'Code - Insiders';
			break;
		case VSCodeVariant.CodeOSS:
			variantDir = 'Code - OSS';
			break;
		case VSCodeVariant.VSCodium:
			variantDir = 'VSCodium';
			break;
	}

	// Construct platform-specific path
	let configPath: string;
	switch (platform) {
		case 'win32':
			// Windows: %APPDATA%\<variant>\User\prompts
			const appData = process.env.APPDATA;
			if (!appData) {
				throw new Error(
					'APPDATA environment variable not set. ' +
					'Please set the "paw.promptDirectory" setting to specify the prompts directory path.'
				);
			}
			configPath = path.join(appData, variantDir, 'User', 'prompts');
			break;

		case 'darwin':
			// macOS: ~/Library/Application Support/<variant>/User/prompts
			configPath = path.join(homeDir, 'Library', 'Application Support', variantDir, 'User', 'prompts');
			break;

		case 'linux':
			// Linux: ~/.config/<variant>/User/prompts
			configPath = path.join(homeDir, '.config', variantDir, 'User', 'prompts');
			break;

		default:
			throw new Error(
				`Unsupported platform: ${platform}. ` +
				'Please set the "paw.promptDirectory" setting to specify the prompts directory path.'
			);
	}

	return configPath;
}
