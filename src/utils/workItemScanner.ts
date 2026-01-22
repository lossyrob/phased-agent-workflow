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
  /** Most recent modification time of any artifact */
  lastModified: Date;
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
 * Get the most recent modification time for a work item directory.
 * 
 * Checks modification times of key artifact files and returns the most recent.
 * 
 * @param workDir - Path to the .paw/work/<slug>/ directory
 * @returns Most recent modification Date
 */
function getLastModified(workDir: string): Date {
  const artifactFiles = [
    'WorkflowContext.md',
    'Spec.md',
    'SpecResearch.md',
    'CodeResearch.md',
    'ImplementationPlan.md',
    'Docs.md'
  ];

  let mostRecent = new Date(0); // Unix epoch as default

  for (const artifact of artifactFiles) {
    const filePath = path.join(workDir, artifact);
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtime > mostRecent) {
        mostRecent = stats.mtime;
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  return mostRecent;
}

/**
 * Scan workspace for active PAW work items.
 * 
 * Searches .paw/work/ directories in all workspace folders for work items
 * that have a WorkflowContext.md file. Results are sorted by most recently
 * modified (newest first).
 * 
 * @param outputChannel - Output channel for logging
 * @returns Array of WorkItem objects sorted by most recently modified
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
          const lastModified = getLastModified(workDir);

          workItems.push({
            slug: entry.name,
            title,
            workDir,
            lastModified
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

  // Sort by most recently modified (newest first)
  workItems.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  return workItems;
}
