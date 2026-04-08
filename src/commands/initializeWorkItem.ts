import * as vscode from 'vscode';
import { realpathSync } from 'fs';
import { access } from 'fs/promises';
import * as path from 'path';
import {
  collectUserInputs,
  type FinalReviewConfig,
  type ArtifactLifecycle,
  type WorkItemInputs,
  isWorktreeExecutionEnabled,
} from '../ui/userInput';
import type { ReviewPolicy, SessionPolicy } from '../types/workflow';
import {
  validateGitRepository,
  createWorktree,
  deriveDefaultWorktreePath,
  deriveExecutionBinding,
  deriveRepositoryIdentity,
  ensureUniqueWorktreePath,
  getRepositoryContext,
  resolveExecutionMode,
  validateReusableWorktree,
} from '../git/validation';

export const PENDING_WORKTREE_INIT_KEY = 'paw.pendingWorktreeInit';
export const EXECUTION_REGISTRY_KEY = 'paw.executionRegistry';

export interface ExecutionMetadata {
  workId: string;
  repositoryIdentity: string;
  executionBinding: string;
}

export interface ExecutionRegistryEntry extends ExecutionMetadata {
  worktreePath: string;
  targetBranch: string;
  updatedAt: string;
}

export interface PendingWorktreeInit {
  worktreePath: string;
  query: string;
  mode: 'PAW';
  createdAt: string;
  executionMetadata: ExecutionMetadata;
}

type PendingWorktreeInitRecord = Record<string, PendingWorktreeInit>;

interface InitializeWorkItemCommandDependencies {
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  validateGitRepository(workspacePath: string): Promise<boolean>;
  collectUserInputs(outputChannel: vscode.OutputChannel): Promise<WorkItemInputs | undefined>;
  isWorktreeExecutionEnabled(): boolean;
  resolveExecutionMode(
    worktreeExecutionEnabled: boolean,
    requestedMode?: string
  ): 'current-checkout' | 'worktree';
  buildExecutionMetadata(workspacePath: string, targetBranch: string): Promise<ExecutionMetadata>;
  prepareDedicatedWorktree(
    context: vscode.ExtensionContext,
    workspacePath: string,
    inputs: WorkItemInputs,
    executionMetadata: ExecutionMetadata,
    outputChannel: vscode.OutputChannel
  ): Promise<string>;
  openPawChat(query: string, outputChannel: vscode.OutputChannel): Promise<void>;
  openFolder(worktreePath: string): Promise<unknown>;
  recordExecutionRegistryEntry(
    context: vscode.ExtensionContext,
    entry: ExecutionRegistryEntry
  ): Promise<void>;
  recordPendingWorktreeInit(
    context: vscode.ExtensionContext,
    pending: PendingWorktreeInit
  ): Promise<void>;
  showErrorMessage(message: string): Thenable<string | undefined>;
  showOutput(outputChannel: vscode.OutputChannel): void;
}

interface ResumePendingWorktreeInitDependencies {
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  openPawChat(query: string, outputChannel: vscode.OutputChannel): Promise<void>;
  clearPendingWorktreeInit(
    context: vscode.ExtensionContext,
    executionMetadata: ExecutionMetadata
  ): Promise<void>;
  showErrorMessage(message: string): Thenable<string | undefined>;
}

interface PromptArgumentsInput {
  targetBranch: string;
  workflowMode: { mode: string; workflowCustomization?: string };
  executionMode: string;
  reviewStrategy: string;
  reviewPolicy: ReviewPolicy;
  sessionPolicy: SessionPolicy;
  artifactLifecycle: ArtifactLifecycle;
  finalReview: FinalReviewConfig;
  issueUrl?: string;
  executionMetadata?: ExecutionMetadata;
}

function normalizePath(targetPath: string): string {
  return targetPath.replace(/\\/g, '/');
}

function canonicalizePath(targetPath: string): string {
  try {
    return normalizePath(realpathSync(targetPath));
  } catch {
    return normalizePath(path.resolve(targetPath));
  }
}

function createPendingWorktreeInitLookupKey(executionMetadata: ExecutionMetadata): string {
  return createExecutionRegistryLookupKey(
    executionMetadata.repositoryIdentity,
    executionMetadata.executionBinding
  );
}

function isPendingWorktreeInit(value: unknown): value is PendingWorktreeInit {
  return !!value
    && typeof value === 'object'
    && 'worktreePath' in value
    && 'executionMetadata' in value;
}

function normalizePendingWorktreeInitState(
  state: PendingWorktreeInit | PendingWorktreeInitRecord | undefined
): PendingWorktreeInitRecord {
  if (!state) {
    return {};
  }

  if (isPendingWorktreeInit(state)) {
    return {
      [createPendingWorktreeInitLookupKey(state.executionMetadata)]: state,
    };
  }

  return state;
}

function getPendingWorktreeInits(
  context: vscode.ExtensionContext
): PendingWorktreeInitRecord {
  return normalizePendingWorktreeInitState(
    context.globalState.get<PendingWorktreeInit | PendingWorktreeInitRecord>(PENDING_WORKTREE_INIT_KEY)
  );
}

/**
 * Constructs the configuration prompt arguments for the PAW agent.
 */
export function constructPawPromptArguments(
  inputs: PromptArgumentsInput,
  _workspacePath: string
): string {
  const config: Record<string, string | boolean> = {
    target_branch: inputs.targetBranch.trim() || 'auto',
    workflow_mode: inputs.workflowMode.mode,
    execution_mode: inputs.executionMode,
    review_strategy: inputs.reviewStrategy,
    review_policy: inputs.reviewPolicy,
    session_policy: inputs.sessionPolicy,
    artifact_lifecycle: inputs.artifactLifecycle,
    final_agent_review: inputs.finalReview.enabled ? 'enabled' : 'disabled',
  };

  if (inputs.executionMetadata) {
    config.work_id = inputs.executionMetadata.workId;
    config.repository_identity = inputs.executionMetadata.repositoryIdentity;
    config.execution_binding = inputs.executionMetadata.executionBinding;
  }

  if (inputs.finalReview.enabled) {
    config.final_review_mode = inputs.finalReview.mode;
    config.final_review_interactive = inputs.finalReview.interactive;
    config.final_review_models = 'latest GPT, latest Gemini, latest Claude Opus';
  }

  if (inputs.issueUrl) {
    config.issue_url = inputs.issueUrl;
  }

  if (inputs.workflowMode.workflowCustomization) {
    config.custom_instructions = inputs.workflowMode.workflowCustomization;
  }

  let params = '';
  for (const [key, value] of Object.entries(config)) {
    params += `- **${key}**: ${value}\n`;
  }

  return `Load the \`paw-workflow\` skill and execute it.\n\n## Initialization Parameters\n\n${params}`;
}

async function openPawChat(
  query: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const value = await vscode.commands.executeCommand('workbench.action.chat.newChat');
  outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
  await vscode.commands.executeCommand('workbench.action.chat.open', {
    query,
    mode: 'PAW',
  });
}

async function executionPathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function deriveWorkIdFromTargetBranch(targetBranch: string): string {
  const normalizedBranch = targetBranch.trim().replace(/^[^/]+\//, '');
  const workId = normalizedBranch
    .replace(/[/_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  if (!workId) {
    throw new Error(`Unable to derive Work ID from target branch: ${targetBranch}`);
  }

  return workId;
}

export function createExecutionRegistryLookupKey(
  repositoryIdentity: string,
  executionBinding: string
): string {
  return `${repositoryIdentity}::${executionBinding}`;
}

export function buildExecutionRegistryEntry(
  executionMetadata: ExecutionMetadata,
  worktreePath: string,
  targetBranch: string
): ExecutionRegistryEntry {
  return {
    ...executionMetadata,
    worktreePath,
    targetBranch,
    updatedAt: new Date().toISOString(),
  };
}

function getExecutionRegistry(
  context: vscode.ExtensionContext
): Record<string, ExecutionRegistryEntry> {
  return context.globalState.get<Record<string, ExecutionRegistryEntry>>(EXECUTION_REGISTRY_KEY, {});
}

function getExecutionRegistryEntry(
  context: vscode.ExtensionContext,
  executionMetadata: ExecutionMetadata
): ExecutionRegistryEntry | undefined {
  return getExecutionRegistry(context)[
    createExecutionRegistryLookupKey(
      executionMetadata.repositoryIdentity,
      executionMetadata.executionBinding
    )
  ];
}

export async function recordExecutionRegistryEntry(
  context: vscode.ExtensionContext,
  entry: ExecutionRegistryEntry
): Promise<void> {
  const registry = {
    ...getExecutionRegistry(context),
    [createExecutionRegistryLookupKey(entry.repositoryIdentity, entry.executionBinding)]: entry,
  };
  await context.globalState.update(EXECUTION_REGISTRY_KEY, registry);
}

export async function removeExecutionRegistryEntry(
  context: vscode.ExtensionContext,
  executionMetadata: ExecutionMetadata
): Promise<void> {
  const registry = {
    ...getExecutionRegistry(context),
  };
  delete registry[
    createExecutionRegistryLookupKey(
      executionMetadata.repositoryIdentity,
      executionMetadata.executionBinding
    )
  ];
  await context.globalState.update(
    EXECUTION_REGISTRY_KEY,
    Object.keys(registry).length > 0 ? registry : undefined
  );
}

async function buildExecutionMetadata(
  workspacePath: string,
  targetBranch: string
): Promise<ExecutionMetadata> {
  const workId = deriveWorkIdFromTargetBranch(targetBranch);
  const repositoryIdentity = await deriveRepositoryIdentity(workspacePath);

  return {
    workId,
    repositoryIdentity,
    executionBinding: deriveExecutionBinding(workId, targetBranch),
  };
}

function resolveConfiguredWorktreePath(
  repositoryRoot: string,
  configuredPath: string
): string {
  return path.isAbsolute(configuredPath)
    ? path.resolve(configuredPath)
    : path.resolve(repositoryRoot, configuredPath);
}

function buildPendingWorktreeInit(
  worktreePath: string,
  query: string,
  executionMetadata: ExecutionMetadata
): PendingWorktreeInit {
  return {
    worktreePath,
    query,
    mode: 'PAW',
    createdAt: new Date().toISOString(),
    executionMetadata,
  };
}

export async function recordPendingWorktreeInit(
  context: vscode.ExtensionContext,
  pending: PendingWorktreeInit
): Promise<void> {
  const pendingInits = {
    ...getPendingWorktreeInits(context),
    [createPendingWorktreeInitLookupKey(pending.executionMetadata)]: pending,
  };
  await context.globalState.update(PENDING_WORKTREE_INIT_KEY, pendingInits);
}

export async function clearPendingWorktreeInit(
  context: vscode.ExtensionContext,
  executionMetadata: ExecutionMetadata
): Promise<void> {
  const pendingInits = {
    ...getPendingWorktreeInits(context),
  };
  delete pendingInits[createPendingWorktreeInitLookupKey(executionMetadata)];
  await context.globalState.update(
    PENDING_WORKTREE_INIT_KEY,
    Object.keys(pendingInits).length > 0 ? pendingInits : undefined
  );
}

function findPendingWorktreeInitForWorkspace(
  currentWorkspacePath: string,
  pendingInits: PendingWorktreeInitRecord
): PendingWorktreeInit | undefined {
  return Object.values(pendingInits).find((pending) =>
    shouldResumePendingWorktreeInit(currentWorkspacePath, pending)
  );
}

export function shouldResumePendingWorktreeInit(
  currentWorkspacePath: string,
  pending: PendingWorktreeInit | undefined
): boolean {
  if (!pending) {
    return false;
  }

  return canonicalizePath(currentWorkspacePath) === canonicalizePath(pending.worktreePath);
}

async function prepareDedicatedWorktree(
  context: vscode.ExtensionContext,
  workspacePath: string,
  inputs: WorkItemInputs,
  executionMetadata: ExecutionMetadata,
  outputChannel: vscode.OutputChannel
): Promise<string> {
  const branchName = inputs.targetBranch.trim();
  const baseBranch = 'main';
  const repositoryContext = await getRepositoryContext(workspacePath);
  const worktreeConfig = inputs.worktree;
  let registeredExecution = getExecutionRegistryEntry(context, executionMetadata);

  if (!worktreeConfig) {
    throw new Error('Dedicated worktree mode requires worktree configuration.');
  }

  if (registeredExecution && !(await executionPathExists(registeredExecution.worktreePath))) {
    outputChannel.appendLine(
      `[WARN] Pruning stale execution registry entry for ${executionMetadata.executionBinding}: ${registeredExecution.worktreePath}`
    );
    await removeExecutionRegistryEntry(context, executionMetadata);
    registeredExecution = undefined;
  }

  const requestedPath = worktreeConfig.path?.trim();
  const resolvedRequestedPath = requestedPath && requestedPath.length > 0
    ? resolveConfiguredWorktreePath(repositoryContext.rootPath, requestedPath)
    : undefined;

  if (worktreeConfig.strategy === 'reuse') {
    if (!resolvedRequestedPath) {
      throw new Error('Reusable worktree path is required.');
    }

    outputChannel.appendLine(`[INFO] Validating reusable worktree: ${resolvedRequestedPath}`);
    return validateReusableWorktree({
      repositoryPath: workspacePath,
      worktreePath: resolvedRequestedPath,
      expectedTargetBranch: branchName || undefined,
      expectedRepositoryIdentity: executionMetadata.repositoryIdentity,
      expectedExecutionBinding: executionMetadata.executionBinding,
      expectedWorkId: executionMetadata.workId,
      registeredExecutionPath: registeredExecution?.worktreePath,
      baseBranch,
    });
  }

  if (registeredExecution) {
    if (await executionPathExists(registeredExecution.worktreePath)) {
      throw new Error(
        `An execution worktree for ${executionMetadata.workId} is already registered at ${registeredExecution.worktreePath}. Reopen that execution checkout or choose Reuse Existing Worktree.`
      );
    }

    throw new Error(
      `Execution binding is orphaned for ${executionMetadata.executionBinding}. Run 'git worktree list', reopen the original execution checkout if it still exists, or clear the stale registry entry before re-initializing.`
    );
  }

  const defaultPath = resolvedRequestedPath
    ? resolvedRequestedPath
    : deriveDefaultWorktreePath(repositoryContext.rootPath, branchName, inputs.issueUrl);
  const uniquePath = resolvedRequestedPath
    ? defaultPath
    : await ensureUniqueWorktreePath(defaultPath);

  outputChannel.appendLine(`[INFO] Creating dedicated worktree at: ${uniquePath}`);
  return createWorktree({
    repositoryPath: workspacePath,
    worktreePath: uniquePath,
    targetBranch: branchName || undefined,
    baseBranch,
  });
}

const defaultInitializeWorkItemCommandDependencies: InitializeWorkItemCommandDependencies = {
  getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
  validateGitRepository,
  collectUserInputs,
  isWorktreeExecutionEnabled,
  resolveExecutionMode,
  buildExecutionMetadata,
  prepareDedicatedWorktree,
  openPawChat,
  openFolder: (worktreePath: string) =>
    Promise.resolve(
      vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(worktreePath), true)
    ),
  recordExecutionRegistryEntry,
  recordPendingWorktreeInit,
  showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
  showOutput: (outputChannel: vscode.OutputChannel) => outputChannel.show(true),
};

const defaultResumePendingWorktreeInitDependencies: ResumePendingWorktreeInitDependencies = {
  getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
  openPawChat,
  clearPendingWorktreeInit,
  showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
};

/**
 * Resume a pending dedicated-worktree initialization when the target window activates.
 */
export async function maybeResumePendingWorktreeInit(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  dependencies: ResumePendingWorktreeInitDependencies = defaultResumePendingWorktreeInitDependencies
): Promise<void> {
  const pendingInits = getPendingWorktreeInits(context);
  if (Object.keys(pendingInits).length === 0) {
    return;
  }

  const workspaceFolder = dependencies.getWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  const pending = findPendingWorktreeInitForWorkspace(workspaceFolder.uri.fsPath, pendingInits);
  if (!pending) {
    return;
  }

  outputChannel.appendLine(`[INFO] Resuming pending worktree initialization for ${pending.worktreePath}`);

  try {
    await dependencies.openPawChat(pending.query, outputChannel);
    await dependencies.clearPendingWorktreeInit(context, pending.executionMetadata);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(
      `[ERROR] Failed to resume pending worktree initialization: ${errorMessage}`
    );
    await dependencies.showErrorMessage(
      `Failed to resume pending PAW worktree initialization: ${errorMessage}`
    );
  }
}

/**
 * Main command handler for initializing a PAW workflow.
 */
export async function initializeWorkItemCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  dependencies: InitializeWorkItemCommandDependencies = defaultInitializeWorkItemCommandDependencies
): Promise<void> {
  outputChannel.appendLine('[INFO] Starting PAW workflow initialization...');

  try {
    const workspaceFolder = dependencies.getWorkspaceFolder();
    if (!workspaceFolder) {
      await dependencies.showErrorMessage(
        'No workspace folder open. Please open a workspace to initialize a PAW workflow.'
      );
      outputChannel.appendLine('[ERROR] No workspace folder open');
      return;
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    outputChannel.appendLine(`[INFO] Workspace: ${workspacePath}`);
    outputChannel.appendLine('[INFO] Validating git repository...');

    const isGitRepo = await dependencies.validateGitRepository(workspacePath);
    if (!isGitRepo) {
      await dependencies.showErrorMessage(
        'PAW requires a Git repository. Please initialize Git with: git init'
      );
      outputChannel.appendLine('[ERROR] Not a git repository');
      return;
    }

    outputChannel.appendLine('[INFO] Git repository validated');
    outputChannel.appendLine('[INFO] Collecting user inputs...');

    const inputs = await dependencies.collectUserInputs(outputChannel);
    if (!inputs) {
      outputChannel.appendLine('[INFO] User cancelled initialization');
      return;
    }

    outputChannel.appendLine(`[INFO] Execution mode: ${inputs.executionMode}`);
    outputChannel.appendLine(`[INFO] Target branch: ${inputs.targetBranch || '(auto)'}`);
    if (inputs.worktree) {
      outputChannel.appendLine(`[INFO] Worktree strategy: ${inputs.worktree.strategy}`);
      if (inputs.worktree.path) {
        outputChannel.appendLine(`[INFO] Worktree path: ${inputs.worktree.path}`);
      }
    }
    outputChannel.appendLine(`[INFO] Workflow mode: ${inputs.workflowMode.mode}`);
    if (inputs.workflowMode.workflowCustomization) {
      outputChannel.appendLine(`[INFO] Workflow customization: ${inputs.workflowMode.workflowCustomization}`);
    }
    outputChannel.appendLine(`[INFO] Review strategy: ${inputs.reviewStrategy}`);
    outputChannel.appendLine(`[INFO] Review policy: ${inputs.reviewPolicy}`);
    outputChannel.appendLine(`[INFO] Session policy: ${inputs.sessionPolicy}`);
    outputChannel.appendLine(`[INFO] Artifact lifecycle: ${inputs.artifactLifecycle}`);
    outputChannel.appendLine(`[INFO] Final Review: ${inputs.finalReview.enabled ? 'enabled' : 'disabled'}`);
    if (inputs.finalReview.enabled) {
      outputChannel.appendLine(`[INFO] Final Review mode: ${inputs.finalReview.mode}`);
      outputChannel.appendLine(`[INFO] Final Review interactive: ${inputs.finalReview.interactive}`);
    }
    if (inputs.issueUrl) {
      outputChannel.appendLine(`[INFO] Issue URL: ${inputs.issueUrl}`);
    }

    outputChannel.appendLine('[INFO] Constructing PAW agent prompt arguments...');
    const resolvedExecutionMode = dependencies.resolveExecutionMode(
      dependencies.isWorktreeExecutionEnabled(),
      inputs.executionMode
    );
    const effectiveInputs = resolvedExecutionMode === inputs.executionMode
      ? inputs
      : {
          ...inputs,
          executionMode: resolvedExecutionMode,
          worktree: undefined,
        };
    const executionMetadata = effectiveInputs.executionMode === 'worktree'
      ? await dependencies.buildExecutionMetadata(workspacePath, effectiveInputs.targetBranch.trim())
      : undefined;
    const promptArgs = constructPawPromptArguments(
      {
        ...effectiveInputs,
        executionMetadata,
      },
      workspacePath
    );

    outputChannel.appendLine('[INFO] Invoking PAW agent...');
    dependencies.showOutput(outputChannel);

    if (effectiveInputs.executionMode === 'current-checkout') {
      await dependencies.openPawChat(promptArgs, outputChannel);
      outputChannel.appendLine('[INFO] PAW agent invoked - check chat panel for progress');
      return;
    }

    if (!executionMetadata) {
      throw new Error('Dedicated worktree execution metadata could not be resolved.');
    }

    if (!effectiveInputs.targetBranch.trim()) {
      throw new Error('Dedicated worktree execution requires an explicit target branch.');
    }

    const worktreePath = await dependencies.prepareDedicatedWorktree(
      context,
      workspacePath,
      effectiveInputs,
      executionMetadata,
      outputChannel
    );
    await dependencies.recordExecutionRegistryEntry(
      context,
      buildExecutionRegistryEntry(executionMetadata, worktreePath, effectiveInputs.targetBranch.trim())
    );
    await dependencies.recordPendingWorktreeInit(
      context,
      buildPendingWorktreeInit(worktreePath, promptArgs, executionMetadata)
    );

    outputChannel.appendLine(`[INFO] Opening dedicated worktree in a new window: ${worktreePath}`);
    await dependencies.openFolder(worktreePath);
    outputChannel.appendLine('[INFO] Dedicated worktree opened - PAW will launch there on activation');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Initialization failed: ${errorMessage}`);
    await dependencies.showErrorMessage(`PAW initialization failed: ${errorMessage}`);
  }
}
