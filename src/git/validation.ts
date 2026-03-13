import { access, lstat, mkdir, readFile, realpath } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface RepositoryContext {
  rootPath: string;
  commonDir: string;
  gitDir: string;
  currentBranch: string;
  repoName: string;
}

export interface GitWorktreeInfo {
  path: string;
  branch?: string;
  head?: string;
  detached: boolean;
  bare: boolean;
  locked?: string;
  prunable?: string;
}

export interface CreateWorktreeOptions {
  repositoryPath: string;
  worktreePath: string;
  targetBranch?: string;
  baseBranch?: string;
}

export interface ValidateReusableWorktreeOptions {
  repositoryPath: string;
  worktreePath: string;
  expectedTargetBranch?: string;
  expectedRepositoryIdentity?: string;
  expectedExecutionBinding?: string;
  expectedWorkId?: string;
  registeredExecutionPath?: string;
  baseBranch?: string;
}

export interface WorkflowContextExecutionMetadata {
  executionMode?: string;
  repositoryIdentity?: string;
  executionBinding?: string;
  targetBranch?: string;
}

export interface ValidateExecutionBindingOptions {
  workflowContextPath: string;
  expectedRepositoryIdentity: string;
  expectedExecutionBinding: string;
  expectedTargetBranch: string;
  registeredExecutionPath?: string;
  actualWorktreePath: string;
}

async function runGit(
  args: string[],
  cwd: string
): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

async function canonicalizeGitPath(basePath: string, gitPath: string): Promise<string> {
  const resolved = path.isAbsolute(gitPath) ? gitPath : path.resolve(basePath, gitPath);
  return realpath(resolved);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureUserPathIsCanonical(targetPath: string): Promise<string> {
  const resolvedPath = path.resolve(targetPath);
  const stat = await lstat(resolvedPath);
  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing symlinked worktree path: ${targetPath}`);
  }
  return realpath(resolvedPath);
}

function stripBranchRef(branchRef: string): string {
  return branchRef.replace(/^refs\/heads\//, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readWorkflowContextValue(content: string, label: string): string | undefined {
  const match = content.match(new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim();
}

export function parseWorkflowContextExecutionMetadata(content: string): WorkflowContextExecutionMetadata {
  return {
    executionMode: readWorkflowContextValue(content, 'Execution Mode'),
    repositoryIdentity: readWorkflowContextValue(content, 'Repository Identity'),
    executionBinding: readWorkflowContextValue(content, 'Execution Binding'),
    targetBranch: readWorkflowContextValue(content, 'Target Branch'),
  };
}

export function resolveExecutionMode(
  worktreeExecutionEnabled: boolean,
  requestedMode?: string
): 'current-checkout' | 'worktree' {
  if (!worktreeExecutionEnabled) {
    return 'current-checkout';
  }

  return requestedMode === 'worktree' ? 'worktree' : 'current-checkout';
}

/**
 * Check if the workspace path points to a git repository.
 */
export async function validateGitRepository(workspacePath: string): Promise<boolean> {
  try {
    await runGit(['rev-parse', '--git-dir'], workspacePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determine if the repository has uncommitted changes.
 */
export async function hasUncommittedChanges(workspacePath: string): Promise<boolean> {
  try {
    const stdout = await runGit(['status', '--porcelain'], workspacePath);
    return stdout.trim().length > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check git status: ${message}`);
  }
}

export async function hasInProgressGitOperation(workspacePath: string): Promise<boolean> {
  const repositoryContext = await getRepositoryContext(workspacePath);
  const operationMarkers = [
    'MERGE_HEAD',
    'CHERRY_PICK_HEAD',
    'REVERT_HEAD',
    'BISECT_LOG',
    'rebase-apply',
    'rebase-merge',
    'sequencer',
  ];

  for (const marker of operationMarkers) {
    if (await pathExists(path.join(repositoryContext.gitDir, marker))) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve the repository root, common dir, and current branch for a git checkout.
 */
export async function getRepositoryContext(workspacePath: string): Promise<RepositoryContext> {
  try {
    const rootPath = await runGit(['rev-parse', '--show-toplevel'], workspacePath);
    const commonDirRaw = await runGit(['rev-parse', '--git-common-dir'], workspacePath);
    const gitDirRaw = await runGit(['rev-parse', '--git-dir'], workspacePath);
    const currentBranch = await runGit(['branch', '--show-current'], workspacePath);

    return {
      rootPath: await realpath(rootPath),
      commonDir: await canonicalizeGitPath(rootPath, commonDirRaw),
      gitDir: await canonicalizeGitPath(rootPath, gitDirRaw),
      currentBranch,
      repoName: path.basename(rootPath),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve repository context: ${message}`);
  }
}

async function getOriginRemoteUrl(repositoryPath: string): Promise<string> {
  try {
    return await runGit(['remote', 'get-url', 'origin'], repositoryPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve origin remote URL: ${message}`);
  }
}

async function getRootCommitSha(repositoryPath: string): Promise<string> {
  try {
    const stdout = await runGit(['rev-list', '--max-parents=0', 'HEAD'], repositoryPath);
    return stdout.split(/\r?\n/)[0]?.trim() ?? '';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve root commit SHA: ${message}`);
  }
}

export function normalizeRepositorySlug(remoteUrl: string): string {
  const trimmed = remoteUrl.trim().replace(/\.git$/i, '');
  const sshMatch = trimmed.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  }

  try {
    const parsed = new URL(trimmed);
    return `${parsed.host}${parsed.pathname}`
      .replace(/\/+$/, '')
      .replace(/^\/+/, '')
      .toLowerCase();
  } catch {
    return trimmed
      .replace(/^ssh:\/\//i, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/:/g, '/')
      .toLowerCase();
  }
}

export async function deriveRepositoryIdentity(repositoryPath: string): Promise<string> {
  const originRemoteUrl = await getOriginRemoteUrl(repositoryPath);
  const rootCommitSha = await getRootCommitSha(repositoryPath);
  return `${normalizeRepositorySlug(originRemoteUrl)}@${rootCommitSha}`;
}

export function deriveExecutionBinding(workId: string, targetBranch: string): string {
  return `worktree:${workId.trim()}:${targetBranch.trim()}`;
}

export async function validateExecutionBinding(
  options: ValidateExecutionBindingOptions
): Promise<WorkflowContextExecutionMetadata> {
  if (!(await pathExists(options.workflowContextPath))) {
    throw new Error(
      `Reusable worktree is half-initialized: missing ${options.workflowContextPath}. Reopen the execution checkout and rerun initialization.`
    );
  }

  const workflowContextContent = await readFile(options.workflowContextPath, 'utf-8');
  const metadata = parseWorkflowContextExecutionMetadata(workflowContextContent);

  if (
    metadata.executionMode !== 'worktree'
    || !metadata.repositoryIdentity
    || !metadata.executionBinding
  ) {
    throw new Error(
      `Reusable worktree is half-initialized: ${options.workflowContextPath} is missing dedicated worktree execution metadata. Reopen the execution checkout and rerun initialization.`
    );
  }

  if (metadata.repositoryIdentity !== options.expectedRepositoryIdentity) {
    throw new Error(
      `Reusable worktree belongs to ${metadata.repositoryIdentity}, expected ${options.expectedRepositoryIdentity}.`
    );
  }

  if (metadata.executionBinding !== options.expectedExecutionBinding) {
    throw new Error(
      `Reusable worktree is bound to ${metadata.executionBinding}, expected ${options.expectedExecutionBinding}.`
    );
  }

  if (!options.registeredExecutionPath) {
    throw new Error(
      `Execution binding is orphaned for ${options.expectedExecutionBinding}. Run 'git worktree list', reopen the original execution checkout, or reinitialize with a fresh worktree.`
    );
  }

  let registeredExecutionPath: string;
  try {
    registeredExecutionPath = await realpath(options.registeredExecutionPath);
  } catch {
    throw new Error(
      `Execution binding is orphaned for ${options.expectedExecutionBinding}. The local registry points to ${options.registeredExecutionPath}, which no longer exists. Run 'git worktree list', reopen the original execution checkout if it still exists, or clear the stale registry entry before retrying.`
    );
  }

  if (path.resolve(registeredExecutionPath) !== path.resolve(options.actualWorktreePath)) {
    throw new Error(
      `Execution binding cannot be proven for ${options.expectedExecutionBinding}. The local registry points to ${registeredExecutionPath}, not ${options.actualWorktreePath}. Reopen the registered execution checkout or clear the stale registry entry before retrying.`
    );
  }

  if (metadata.targetBranch && metadata.targetBranch !== options.expectedTargetBranch) {
    throw new Error(
      `Reusable worktree must be on ${options.expectedTargetBranch}, found ${metadata.targetBranch}.`
    );
  }

  return metadata;
}

/**
 * Parse `git worktree list --porcelain` output into structured worktree records.
 */
export function parseWorktreeListPorcelain(output: string): GitWorktreeInfo[] {
  const lines = output.split(/\r?\n/);
  const worktrees: GitWorktreeInfo[] = [];
  let current: Partial<GitWorktreeInfo> | undefined;

  const finalize = () => {
    if (!current?.path) {
      current = undefined;
      return;
    }

    worktrees.push({
      path: current.path,
      branch: current.branch,
      head: current.head,
      detached: current.detached ?? false,
      bare: current.bare ?? false,
      locked: current.locked,
      prunable: current.prunable,
    });
    current = undefined;
  };

  for (const line of [...lines, '']) {
    if (line.trim().length === 0) {
      finalize();
      continue;
    }

    const [key, ...rest] = line.split(' ');
    const value = rest.join(' ').trim();

    if (key === 'worktree') {
      finalize();
      current = { path: value, detached: false, bare: false };
      continue;
    }

    if (!current) {
      continue;
    }

    switch (key) {
      case 'HEAD':
        current.head = value;
        break;
      case 'branch':
        current.branch = stripBranchRef(value);
        break;
      case 'detached':
        current.detached = true;
        break;
      case 'bare':
        current.bare = true;
        break;
      case 'locked':
        current.locked = value;
        break;
      case 'prunable':
        current.prunable = value;
        break;
      default:
        break;
    }
  }

  return worktrees;
}

/**
 * List registered worktrees for a repository checkout.
 */
export async function listGitWorktrees(repositoryPath: string): Promise<GitWorktreeInfo[]> {
  try {
    const stdout = await runGit(['worktree', 'list', '--porcelain'], repositoryPath);
    return parseWorktreeListPorcelain(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list git worktrees: ${message}`);
  }
}

/**
 * Determine whether a local branch exists.
 */
export async function branchExists(repositoryPath: string, branchName: string): Promise<boolean> {
  try {
    await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], repositoryPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Derive a default worktree path adjacent to the repository.
 */
export function deriveDefaultWorktreePath(
  repositoryRoot: string,
  targetBranch: string,
  issueUrl?: string
): string {
  const repoName = path.basename(repositoryRoot);
  const parentDir = path.dirname(repositoryRoot);
  const containerDir = path.join(parentDir, `${repoName}-paw-worktrees`);

  const branchHint = targetBranch.trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
  const issueMatch = issueUrl?.match(/\/(\d+)(?:\/)?$/);
  const issueHint = issueMatch?.[1] ? `issue-${issueMatch[1]}` : '';
  const fallback = `paw-worktree-${Date.now()}`;
  const leafName = (branchHint || issueHint || fallback).replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();

  return path.join(containerDir, leafName || fallback);
}

/**
 * Ensure a worktree path is unique by appending numeric suffixes when using the auto-derived path.
 */
export async function ensureUniqueWorktreePath(worktreePath: string): Promise<string> {
  let candidate = path.resolve(worktreePath);
  let counter = 2;

  while (await pathExists(candidate)) {
    candidate = `${path.resolve(worktreePath)}-${counter}`;
    counter += 1;
  }

  return candidate;
}

/**
 * Create a new dedicated worktree without switching the caller checkout.
 */
export async function createWorktree(options: CreateWorktreeOptions): Promise<string> {
  const baseBranch = options.baseBranch ?? 'main';
  const canonicalRepositoryPath = await realpath(options.repositoryPath);
  const worktreePath = path.resolve(options.worktreePath);
  const repoContext = await getRepositoryContext(canonicalRepositoryPath);

  if (await pathExists(worktreePath)) {
    throw new Error(`Worktree path already exists: ${worktreePath}`);
  }

  if (options.targetBranch) {
    if (repoContext.currentBranch === options.targetBranch) {
      throw new Error(
        `Target branch is already checked out in the current checkout: ${options.targetBranch}. Choose a different target branch or use current-checkout mode.`
      );
    }

    const occupiedWorktrees = (await listGitWorktrees(canonicalRepositoryPath))
      .filter((worktree) => worktree.branch === options.targetBranch);

    if (occupiedWorktrees.length > 0) {
      throw new Error(
        `Target branch is already checked out in another worktree: ${options.targetBranch}. Reopen that execution checkout or choose Reuse Existing Worktree.`
      );
    }
  }

  await mkdir(path.dirname(worktreePath), { recursive: true });

  const args = ['worktree', 'add'];
  if (!options.targetBranch) {
    args.push('--detach', worktreePath, baseBranch);
  } else if (await branchExists(canonicalRepositoryPath, options.targetBranch)) {
    args.push(worktreePath, options.targetBranch);
  } else {
    args.push('-b', options.targetBranch, worktreePath, baseBranch);
  }

  try {
    await runGit(args, canonicalRepositoryPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(formatCreateWorktreeError(options.targetBranch, message));
  }

  const createdContext = await getRepositoryContext(worktreePath);
  if (createdContext.commonDir !== repoContext.commonDir) {
    throw new Error(`Created worktree does not belong to the expected repository: ${worktreePath}`);
  }

  return realpath(worktreePath);
}

/**
 * Validate an existing worktree before reuse.
 */
export async function validateReusableWorktree(
  options: ValidateReusableWorktreeOptions
): Promise<string> {
  const baseBranch = options.baseBranch ?? 'main';
  const sourceContext = await getRepositoryContext(options.repositoryPath);
  const candidatePath = await ensureUserPathIsCanonical(options.worktreePath);
  let candidateContext: RepositoryContext;
  const expectedBranch = options.expectedTargetBranch?.trim();

  try {
    candidateContext = await getRepositoryContext(candidatePath);
  } catch {
    throw new Error(`Reusable worktree is not a valid git checkout: ${candidatePath}`);
  }

  if (candidateContext.commonDir !== sourceContext.commonDir) {
    throw new Error(`Reusable worktree does not belong to the current repository: ${candidatePath}`);
  }

  const registeredWorktrees = await listGitWorktrees(options.repositoryPath);
  const registeredCandidate = registeredWorktrees.find(
    (worktree) => path.resolve(worktree.path) === path.resolve(candidatePath)
  );

  if (!registeredCandidate) {
    throw new Error(`Path is not a registered git worktree: ${candidatePath}`);
  }

  if (
    expectedBranch
    && options.expectedRepositoryIdentity
    && options.expectedExecutionBinding
    && options.expectedWorkId
  ) {
    const workflowContextPath = path.join(
      candidatePath,
      '.paw',
      'work',
      options.expectedWorkId,
      'WorkflowContext.md'
    );

    await validateExecutionBinding({
      workflowContextPath,
      expectedRepositoryIdentity: options.expectedRepositoryIdentity,
      expectedExecutionBinding: options.expectedExecutionBinding,
      expectedTargetBranch: expectedBranch,
      registeredExecutionPath: options.registeredExecutionPath,
      actualWorktreePath: candidatePath,
    });
  }

  if (await hasInProgressGitOperation(candidatePath)) {
    throw new Error(`Reusable worktree has an in-progress git operation: ${candidatePath}`);
  }

  if (await hasUncommittedChanges(candidatePath)) {
    throw new Error(`Reusable worktree has uncommitted changes: ${candidatePath}`);
  }

  const allowedBranches = new Set<string>();
  if (expectedBranch) {
    allowedBranches.add(expectedBranch);
  }
  allowedBranches.add(baseBranch);

  if (registeredCandidate.detached && !expectedBranch) {
    return candidatePath;
  }

  if (registeredCandidate.detached) {
    throw new Error(`Reusable worktree is detached and cannot satisfy target branch ${expectedBranch}`);
  }

  if (!registeredCandidate.branch || !allowedBranches.has(registeredCandidate.branch)) {
    throw new Error(
      `Reusable worktree must be on ${expectedBranch ?? baseBranch}, found ${registeredCandidate.branch ?? 'unknown'}`
    );
  }

  if (expectedBranch) {
    const branchOccupants = registeredWorktrees.filter((worktree) => worktree.branch === expectedBranch);
    const currentCheckoutOwnsBranch = sourceContext.currentBranch === expectedBranch;
    const occupantConflict = branchOccupants.some(
      (worktree) => path.resolve(worktree.path) !== path.resolve(candidatePath)
    );

    if (currentCheckoutOwnsBranch || occupantConflict) {
      throw new Error(`Target branch is already checked out outside the reusable worktree: ${expectedBranch}`);
    }
  }

  return candidatePath;
}

export function formatCreateWorktreeError(
  targetBranch: string | undefined,
  message: string
): string {
  if (targetBranch && /already checked out/i.test(message)) {
    return `Target branch is already checked out for this work item: ${targetBranch}. Reopen the existing execution checkout or choose Reuse Existing Worktree.`;
  }

  return `Failed to create worktree: ${message}`;
}
