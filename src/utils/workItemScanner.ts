import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a discovered PAW work item.
 */
export interface WorkItem {
  /** The Work ID (feature slug) */
  slug: string;
  /** Work title extracted from WorkflowContext.md */
  title?: string;
  /** Path to the work directory */
  workDir: string;
}

/**
 * Parse Work Title from WorkflowContext.md content.
 * 
 * @param content - Content of WorkflowContext.md
 * @returns The Work Title if found, undefined otherwise
 */
export function parseWorkTitle(content: string): string | undefined {
  const match = content.match(/^Work Title:\s*(.+)$/m);
  return match?.[1]?.trim();
}

/**
 * Scan workspace for active PAW work items.
 * 
 * Searches .paw/work/ directories in all workspace folders for work items
 * that have a WorkflowContext.md file.
 * 
 * @param outputChannel - Output channel for logging
 * @returns Array of WorkItem objects
 */
export async function scanWorkItems(
  outputChannel: vscode.OutputChannel
): Promise<WorkItem[]> {
  const workItems: WorkItem[] = [];
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    outputChannel.appendLine('[INFO] No workspace folders open');
    return [];
  }

  for (const folder of workspaceFolders) {
    const pawWorkDir = path.join(folder.uri.fsPath, '.paw', 'work');

    if (!fs.existsSync(pawWorkDir)) {
      continue;
    }

    try {
      const entries = fs.readdirSync(pawWorkDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const workDir = path.join(pawWorkDir, entry.name);
        const contextPath = path.join(workDir, 'WorkflowContext.md');

        if (!fs.existsSync(contextPath)) {
          continue;
        }

        try {
          const content = fs.readFileSync(contextPath, 'utf-8');
          const title = parseWorkTitle(content);

          workItems.push({
            slug: entry.name,
            title,
            workDir
          });

          outputChannel.appendLine(
            `[INFO] Found work item: ${entry.name}${title ? ` (${title})` : ''}`
          );
        } catch (error) {
          outputChannel.appendLine(
            `[WARN] Could not read WorkflowContext.md for ${entry.name}: ${error}`
          );
        }
      }
    } catch (error) {
      outputChannel.appendLine(
        `[WARN] Could not scan ${pawWorkDir}: ${error}`
      );
    }
  }

  return workItems;
}
