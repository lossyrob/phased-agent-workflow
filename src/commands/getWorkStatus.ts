import * as vscode from 'vscode';
import { scanWorkItems } from '../utils/workItemScanner';

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
 * QuickPick item representing a work item or auto-detect option.
 */
interface WorkItemQuickPickItem extends vscode.QuickPickItem {
  /** The Work ID value, or empty string for auto-detect */
  value: string;
}

/**
 * Main command handler for getting PAW work status.
 * 
 * This is the entry point for the "PAW: Get Work Status" command. It:
 * 1. Scans the workspace for active PAW work items
 * 2. Presents a QuickPick with work items sorted by recency
 * 3. Opens the Status Agent in a new chat with the selected Work ID
 * 
 * @param outputChannel - VS Code output channel for logging operations
 * @returns Promise that resolves when the command completes or is cancelled
 */
export async function getWorkStatusCommand(
  outputChannel: vscode.OutputChannel
): Promise<void> {
  outputChannel.appendLine('[INFO] Starting PAW Get Work Status...');

  try {
    // Scan for work items
    const workItems = await scanWorkItems(outputChannel);

    // Build QuickPick items
    const quickPickItems: WorkItemQuickPickItem[] = [
      {
        label: '$(search) Auto-detect from context',
        description: 'Let the agent determine the active work item',
        value: ''
      }
    ];

    for (const item of workItems) {
      quickPickItems.push({
        label: item.slug,
        description: item.title,
        detail: `Last modified: ${formatRelativeTime(item.lastModified)}`,
        value: item.slug
      });
    }

    // Show QuickPick
    const selection = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select work item or auto-detect',
      title: 'PAW Work Status'
    });

    if (!selection) {
      outputChannel.appendLine('[INFO] Work status selection cancelled');
      return;
    }

    // Construct query for Status Agent
    const query = selection.value ? `Work ID: ${selection.value}` : 'What is the current work status?';

    outputChannel.appendLine(
      `[INFO] Opening Status Agent${selection.value ? ` for ${selection.value}` : ' (auto-detect)'}`
    );

    // Open new chat with PAW agent (handles status via paw-status skill)
    await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async value => {
      outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        mode: 'PAW'
      });
    });

    outputChannel.appendLine('[INFO] PAW agent invoked for status');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Get work status failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`PAW get work status failed: ${errorMessage}`);
  }
}

/**
 * Register the getWorkStatus command with VS Code.
 * 
 * @param context - Extension context for subscription management
 * @param outputChannel - Output channel for logging
 */
export function registerGetWorkStatusCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const command = vscode.commands.registerCommand(
    'paw.getWorkStatus',
    () => getWorkStatusCommand(outputChannel)
  );
  context.subscriptions.push(command);
}
