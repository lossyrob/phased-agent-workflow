import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { scanWorkItems } from '../utils/workItemScanner';
import { loadTemplate } from '../utils/templateLoader';

/**
 * Template variable substitutions for the stop tracking prompt.
 */
interface StopTrackingPromptVariables {
  /** The Work ID (feature slug) */
  WORK_ID: string;
  /** Path to the work directory */
  WORK_DIR: string;
}

/**
 * Load and render the stop tracking prompt template.
 * 
 * @param variables - Template variable substitutions
 * @returns Rendered prompt string
 */
function renderStopTrackingPrompt(variables: StopTrackingPromptVariables): string {
  let template = loadTemplate('stopTrackingArtifacts.template.md');
  
  // Replace all template variables
  template = template.replace(/\{\{WORK_ID\}\}/g, variables.WORK_ID);
  template = template.replace(/\{\{WORK_DIR\}\}/g, variables.WORK_DIR);
  
  return template;
}

/**
 * Format relative time for display (e.g., "2 hours ago", "3 days ago").
 * 
 * @param date - Date to format
 * @returns Human-readable relative time string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * QuickPick item representing a work item.
 */
interface WorkItemQuickPickItem extends vscode.QuickPickItem {
  /** The Work ID value */
  slug: string;
  /** Path to the work directory */
  workDir: string;
}

/**
 * Main command handler for stopping artifact tracking.
 * 
 * This command allows users to stop tracking PAW workflow artifacts mid-workflow.
 * Following PAW's architecture philosophy (agents provide decision-making, tools
 * provide procedural operations), this command opens a chat with an agent that
 * executes the git operations.
 * 
 * @param outputChannel - VS Code output channel for logging operations
 * @returns Promise that resolves when the command completes or is cancelled
 */
export async function stopTrackingArtifactsCommand(
  outputChannel: vscode.OutputChannel
): Promise<void> {
  outputChannel.appendLine('[INFO] Starting PAW Stop Tracking Artifacts...');

  try {
    // Scan for work items
    const workItems = await scanWorkItems(outputChannel);

    if (workItems.length === 0) {
      vscode.window.showWarningMessage('No PAW work items found in workspace');
      outputChannel.appendLine('[INFO] No work items found');
      return;
    }

    // Build QuickPick items (already sorted by most recently modified)
    const quickPickItems: WorkItemQuickPickItem[] = workItems.map(item => ({
      label: item.slug,
      description: item.title,
      detail: `Last modified: ${formatRelativeTime(item.lastModified)}`,
      slug: item.slug,
      workDir: item.workDir
    }));

    // Show QuickPick
    const selection = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select work item to stop tracking artifacts',
      title: 'PAW Stop Tracking Artifacts'
    });

    if (!selection) {
      outputChannel.appendLine('[INFO] Stop tracking selection cancelled');
      return;
    }

    // Check if .gitignore already exists
    const gitignorePath = path.join(selection.workDir, '.gitignore');
    const alreadyExcluded = fs.existsSync(gitignorePath);

    if (alreadyExcluded) {
      const proceed = await vscode.window.showWarningMessage(
        `Artifacts for "${selection.slug}" are already excluded from git tracking (lifecycle: never-commit).`,
        'OK'
      );
      if (!proceed) {
        return;
      }
      outputChannel.appendLine(`[INFO] .gitignore already exists for ${selection.slug}`);
      return;
    }

    // Render prompt from template
    const query = renderStopTrackingPrompt({
      WORK_ID: selection.slug,
      WORK_DIR: selection.workDir
    });

    outputChannel.appendLine(
      `[INFO] Opening agent to stop tracking artifacts for ${selection.slug}`
    );

    // Open new chat with the agent
    await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async value => {
      outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'agent'
      });
    });

    outputChannel.appendLine('[INFO] Agent invoked for stop tracking artifacts');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Stop tracking artifacts failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`PAW stop tracking artifacts failed: ${errorMessage}`);
  }
}

/**
 * Register the stopTrackingArtifacts command with VS Code.
 * 
 * @param context - Extension context for subscription management
 * @param outputChannel - Output channel for logging
 */
export function registerStopTrackingCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const command = vscode.commands.registerCommand(
    'paw.stopTrackingArtifacts',
    () => stopTrackingArtifactsCommand(outputChannel)
  );
  context.subscriptions.push(command);
}
