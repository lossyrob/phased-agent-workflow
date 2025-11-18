import * as vscode from 'vscode';
import { initializeWorkItemCommand } from './commands/initializeWorkItem';
import { registerPromptTemplatesTool } from './tools/createPromptTemplates';
import {
  installAgents,
  needsInstallation,
  isDevelopmentVersion,
  INSTALLATION_STATE_KEY,
  InstallationState,
  removeInstalledAgents
} from './agents/installer';
import { getPlatformInfo, resolvePromptsDirectory } from './agents/platformDetection';

const OUTPUT_CHANNEL_NAME = 'PAW Workflow';
let sharedOutputChannel: vscode.OutputChannel | undefined;
let sharedExtensionContext: vscode.ExtensionContext | undefined;

/**
 * Extension activation function called when extension is first needed.
 * 
 * This function is invoked by VS Code when the extension is activated. The extension
 * activates on VS Code startup (onStartupFinished event) to ensure PAW agents are
 * installed before users interact with GitHub Copilot.
 * 
 * Responsibilities:
 * - Create and register the output channel for logging PAW operations
 * - Install or update PAW agents if needed
 * - Register all extension commands
 * - Register language model tools for agent integration
 * 
 * @param context - Extension context provided by VS Code, used for registering
 *                  disposable resources and accessing extension-specific APIs
 */
export async function activate(context: vscode.ExtensionContext) {
  sharedExtensionContext = context;
  // Create output channel for logging
  // The channel provides transparency into PAW operations and helps with debugging
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  sharedOutputChannel = outputChannel;
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');

  // Install or update PAW agents if needed
  await installAgentsIfNeeded(context, outputChannel);

  registerPromptTemplatesTool(context);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_create_prompt_templates');

  const initCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    () => initializeWorkItemCommand(outputChannel)
  );
  context.subscriptions.push(initCommand);
  outputChannel.appendLine('[INFO] Registered command: paw.initializeWorkItem');

  outputChannel.appendLine('[INFO] PAW Workflow extension ready');
}

/**
 * Installs or updates PAW agents if needed during extension activation.
 * 
 * This function checks if agent installation is needed (fresh install, version change,
 * or missing files) and performs the installation if necessary. It provides user
 * feedback through notifications and detailed logging to the output channel.
 * 
 * Installation failures do not block extension activation - the extension continues
 * to function, and users can still use non-agent features.
 * 
 * @param context - Extension context for version tracking and state storage
 * @param outputChannel - Output channel for detailed logging
 */
async function installAgentsIfNeeded(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Determine prompts directory path
    const customPath = vscode.workspace.getConfiguration('paw').get<string>('promptDirectory');
    const customPromptDir = customPath && customPath.trim().length > 0 ? customPath : undefined;
    const platformInfo = getPlatformInfo();
    const promptsDir = resolvePromptsDirectory(platformInfo, customPromptDir);
    const currentVersion = context.extension.packageJSON.version as string;
    const previousState = context.globalState.get<InstallationState>(INSTALLATION_STATE_KEY);

    if (isDevelopmentVersion(currentVersion)) {
      outputChannel.appendLine('[INFO] Development build detected (-dev); agents will reinstall on every activation.');
    }

    if (
      previousState?.version &&
      isDevelopmentVersion(previousState.version) &&
      !isDevelopmentVersion(currentVersion)
    ) {
      outputChannel.appendLine(
        `[INFO] Migrating from development build ${previousState.version} to production version ${currentVersion}.`
      );
    }
    
    // Check if installation is needed
    const installationNeeded = needsInstallation(
      context,
      context.extension.extensionUri,
      promptsDir
    );
    
    if (!installationNeeded) {
      outputChannel.appendLine('[INFO] PAW agents are up to date');
      return;
    }

    // Installation needed - show output channel for production builds only
    // Development builds reinstall frequently, so showing output each time is noisy
    outputChannel.appendLine('[INFO] Installing PAW agents...');
    if (!isDevelopmentVersion(currentVersion)) {
      outputChannel.show(true); // Show but don't focus
    }
    
    const result = await installAgents(context, outputChannel);
    
    // Log installation results
    if (result.filesInstalled.length > 0) {
      outputChannel.appendLine(`[INFO] Successfully installed ${result.filesInstalled.length} agent(s):`);      
    }
    
    if (result.filesSkipped.length > 0) {
      outputChannel.appendLine(`[INFO] Skipped ${result.filesSkipped.length} agent(s) (already up to date):`);      
    }
    
    if (result.errors.length > 0) {
      outputChannel.appendLine(`[ERROR] Encountered ${result.errors.length} error(s) during installation:`);
      for (const error of result.errors) {
        outputChannel.appendLine(`[ERROR]   ${error}`);
      }
      
      // Show error notification with action to view output
      const action = await vscode.window.showErrorMessage(
        'PAW agent installation encountered errors. Check output channel for details.',
        'View Output'
      );
      
      if (action === 'View Output') {
        outputChannel.show();
      }
      
      // Log remediation guidance
      outputChannel.appendLine('[INFO] If you encounter permission errors, you can set a custom prompts directory:');
      outputChannel.appendLine('[INFO]   1. Open Settings (Cmd/Ctrl+,)');
      outputChannel.appendLine('[INFO]   2. Search for "paw.promptDirectory"');
      outputChannel.appendLine('[INFO]   3. Set a path where you have write permissions');
    } else {
      // Full success - log to output channel only (no notification popup)
      outputChannel.appendLine(`[INFO] PAW agent installation completed successfully`);
    }
  } catch (error) {
    // Catch-all for unexpected errors during the installation check/process
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to install PAW agents: ${message}`);
    
    const action = await vscode.window.showErrorMessage(
      'PAW agent installation failed. Extension will continue without agents.',
      'View Output'
    );
    
    if (action === 'View Output') {
      outputChannel.show();
    }
    
    // Don't throw - allow extension to continue activating
  }
}

/**
 * Extension deactivation function called when extension is deactivated.
 * 
 * This function is called when the extension is deactivated, either because
 * VS Code is shutting down or the extension is being disabled/uninstalled.
 * 
 * All resources registered via context.subscriptions are automatically disposed,
 * so no manual cleanup is required in this implementation.
 */
export async function deactivate(): Promise<void> {
  if (!sharedExtensionContext) {
    return;
  }

  const outputChannel = sharedOutputChannel ?? vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const createdTempChannel = sharedOutputChannel === undefined;

  outputChannel.appendLine('[INFO] PAW Workflow extension deactivating - removing installed agents.');

  try {
    const cleanupResult = await removeInstalledAgents(sharedExtensionContext);

    if (cleanupResult.filesRemoved.length > 0) {
      outputChannel.appendLine(
        `[INFO] Removed ${cleanupResult.filesRemoved.length} PAW agent file(s) during uninstall cleanup.`
      );
      for (const file of cleanupResult.filesRemoved) {
        outputChannel.appendLine(`[INFO]   - ${file}`);
      }
    } else {
      outputChannel.appendLine('[INFO] No PAW agent files were found during uninstall cleanup.');
    }

    if (cleanupResult.errors.length > 0) {
      outputChannel.appendLine('[WARN] Some PAW agent files could not be removed automatically:');
      for (const error of cleanupResult.errors) {
        outputChannel.appendLine(`[WARN]   ${error}`);
      }
      outputChannel.appendLine('[WARN] Manual removal instructions:');
      outputChannel.appendLine('[WARN]   Windows: %APPDATA%\\Code\\User\\prompts');
      outputChannel.appendLine('[WARN]   macOS: ~/Library/Application Support/Code/User/prompts');
      outputChannel.appendLine('[WARN]   Linux: ~/.config/Code/User/prompts');
      outputChannel.appendLine('[WARN] If you use a custom prompts directory, delete any paw-*.agent.md files manually.');
    } else {
      outputChannel.appendLine('[INFO] PAW agent cleanup completed successfully.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Failed to clean up PAW agents during uninstall: ${message}`);
  } finally {
    if (createdTempChannel) {
      outputChannel.dispose();
    }
    sharedOutputChannel = undefined;
    sharedExtensionContext = undefined;
  }
}
