import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  initializeWorkItemCommand,
  maybeResumePendingWorktreeInit,
} from './commands/initializeWorkItem';
import { registerGetWorkStatusCommand } from './commands/getWorkStatus';
import { registerStopTrackingCommand } from './commands/stopTrackingArtifacts';
import { registerHandoffTool } from './tools/handoffTool';
import {
  installAgents,
  needsInstallation,
  isDevelopmentVersion,
  INSTALLATION_STATE_KEY,
  InstallationState
} from './agents/installer';
import { getPlatformInfo, resolveAgentDirectory } from './agents/platformDetection';

const OUTPUT_CHANNEL_NAME = 'PAW Workflow';

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
export interface ActivationDependencies {
  createOutputChannel?: (name: string) => vscode.OutputChannel;
  installAgentsIfNeeded?: (
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel,
    options?: InstallAgentsIfNeededOptions
  ) => Promise<void>;
  installOptions?: InstallAgentsIfNeededOptions;
  checkForDeprecatedInstructions?: (outputChannel: vscode.OutputChannel) => Promise<void>;
  registerHandoffTool?: (context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) => void;
  registerInitializeWorkItemCommand?: (
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) => vscode.Disposable | void;
  registerGetWorkStatusCommand?: (
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) => void;
  registerStopTrackingCommand?: (
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) => void;
  maybeResumePendingWorktreeInit?: (
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) => Promise<void>;
}

export async function activate(
  context: vscode.ExtensionContext,
  dependencies: ActivationDependencies = {}
) {
  // Create output channel for logging
  // The channel provides transparency into PAW operations and helps with debugging
  const outputChannel = (dependencies.createOutputChannel ?? vscode.window.createOutputChannel)(
    OUTPUT_CHANNEL_NAME
  );
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');

  // Install or update PAW agents if needed
  await (dependencies.installAgentsIfNeeded ?? installAgentsIfNeeded)(
    context,
    outputChannel,
    dependencies.installOptions
  );

  // Check for deprecated .paw/instructions directories
  await (dependencies.checkForDeprecatedInstructions ?? checkForDeprecatedInstructions)(
    outputChannel
  );

  (dependencies.registerHandoffTool ?? registerHandoffTool)(context, outputChannel);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_new_session');

  const initCommand = dependencies.registerInitializeWorkItemCommand
    ? dependencies.registerInitializeWorkItemCommand(context, outputChannel)
    : vscode.commands.registerCommand(
      'paw.initializeWorkItem',
      () => initializeWorkItemCommand(context, outputChannel)
    );
  if (initCommand) {
    context.subscriptions.push(initCommand);
  }
  outputChannel.appendLine('[INFO] Registered command: paw.initializeWorkItem');

  (dependencies.registerGetWorkStatusCommand ?? registerGetWorkStatusCommand)(
    context,
    outputChannel
  );
  outputChannel.appendLine('[INFO] Registered command: paw.getWorkStatus');

  (dependencies.registerStopTrackingCommand ?? registerStopTrackingCommand)(
    context,
    outputChannel
  );
  outputChannel.appendLine('[INFO] Registered command: paw.stopTrackingArtifacts');

  await (dependencies.maybeResumePendingWorktreeInit ?? maybeResumePendingWorktreeInit)(
    context,
    outputChannel
  );
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
 * Note: Agent installation is skipped when running in test mode to prevent test runs
 * from overwriting agents in the user's real agent directory.
 *
 * @param context - Extension context for version tracking and state storage
 * @param outputChannel - Output channel for detailed logging
 */
export interface InstallAgentsIfNeededOptions {
  allowTestModeInstallation?: boolean;
}

export async function installAgentsIfNeeded(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  options: InstallAgentsIfNeededOptions = {}
): Promise<void> {
  // Skip agent installation in test mode to prevent test runs from overwriting
  // agents in the user's real agent directory (important when working on
  // multiple PAW branches simultaneously)
  if (
    context.extensionMode === vscode.ExtensionMode.Test &&
    options.allowTestModeInstallation !== true
  ) {
    outputChannel.appendLine('[INFO] Running in test mode - skipping agent installation');
    return;
  }

  try {
    // Determine agent directory path
    const config = vscode.workspace.getConfiguration('paw');
    const configuredAgentDir = config.get<string>('agentDirectory');
    const deprecatedPromptDir = config.get<string>('promptDirectory');
    const customAgentDir = configuredAgentDir && configuredAgentDir.trim().length > 0
      ? configuredAgentDir.trim()
      : deprecatedPromptDir && deprecatedPromptDir.trim().length > 0
        ? deprecatedPromptDir.trim()
        : undefined;
    const platformInfo = getPlatformInfo();
    const agentDir = resolveAgentDirectory(platformInfo, customAgentDir);
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
      agentDir
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
      outputChannel.appendLine('[INFO] If you encounter permission errors, you can set a custom agent directory:');
      outputChannel.appendLine('[INFO]   1. Open Settings (Cmd/Ctrl+,)');
      outputChannel.appendLine('[INFO]   2. Search for "paw.agentDirectory"');
      outputChannel.appendLine('[INFO]   3. Set a path where you have write permissions');
    } else {
      // Full success - log to output channel only (no notification popup)
      outputChannel.appendLine(`[INFO] PAW agent installation completed successfully`);
      if (configuredAgentDir && configuredAgentDir.trim().length > 0) {
        outputChannel.appendLine('[INFO] Installed agents using paw.agentDirectory override');
      } else if (deprecatedPromptDir && deprecatedPromptDir.trim().length > 0) {
        outputChannel.appendLine('[WARN] Installed agents using deprecated paw.promptDirectory fallback');
      }
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
 * Checks for deprecated .paw/instructions directories and notifies users to migrate.
 * 
 * PAW custom instructions (.paw/instructions/) were deprecated in favor of VS Code's
 * standard copilot-instructions.md mechanism. This function warns users who still
 * have the deprecated directory structure.
 */
async function checkForDeprecatedInstructions(
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  const foldersWithDeprecated: string[] = [];

  for (const folder of workspaceFolders) {
    const instructionsDir = path.join(folder.uri.fsPath, '.paw', 'instructions');
    if (fs.existsSync(instructionsDir)) {
      foldersWithDeprecated.push(folder.name);
      outputChannel.appendLine(
        `[WARN] Deprecated .paw/instructions/ directory found in "${folder.name}". ` +
        `Custom instructions are no longer supported. Use copilot-instructions.md instead.`
      );
    }
  }

  if (foldersWithDeprecated.length > 0) {
    const action = await vscode.window.showWarningMessage(
      `PAW custom instructions (.paw/instructions/) are deprecated and no longer loaded. ` +
      `Migrate to copilot-instructions.md for project-level customization.`,
      'Learn More',
      'Dismiss'
    );

    if (action === 'Learn More') {
      vscode.env.openExternal(
        vscode.Uri.parse('https://code.visualstudio.com/docs/copilot/copilot-customization')
      );
    }
  }
}
