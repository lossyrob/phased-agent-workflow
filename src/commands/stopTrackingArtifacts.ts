import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { scanWorkItems } from '../utils/workItemScanner';

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

    // Build QuickPick items
    const quickPickItems: WorkItemQuickPickItem[] = workItems.map(item => ({
      label: item.slug,
      description: item.title,
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
        `Artifacts for "${selection.slug}" are already excluded from git tracking.`,
        'OK'
      );
      if (!proceed) {
        return;
      }
      outputChannel.appendLine(`[INFO] .gitignore already exists for ${selection.slug}`);
      return;
    }

    // Construct query for the agent to execute git operations
    const query = `Stop tracking PAW artifacts for Work ID: ${selection.slug}

Execute the following git commands to untrack artifacts and create .gitignore:

1. Untrack the workflow directory from git (keep files locally):
   \`git rm --cached -r .paw/work/${selection.slug}/\`

2. Create .gitignore to exclude future tracking:
   \`echo '*' > .paw/work/${selection.slug}/.gitignore\`

3. Stage the .gitignore file:
   \`git add .paw/work/${selection.slug}/.gitignore\`

4. Verify the changes:
   - Run \`git status\` to confirm artifacts are untracked
   - Confirm .gitignore contains \`*\`

Report success or any errors encountered.`;

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
