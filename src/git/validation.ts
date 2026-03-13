import { access, lstat, mkdir, realpath } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface RepositoryContext {
  rootPath: string;
  commonDir: string;
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
  baseBranch?: string;
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

/**
 * Resolve the repository root, common dir, and current branch for a git checkout.
 */
export async function getRepositoryContext(workspacePath: string): Promise<RepositoryContext> {
  try {
    const rootPath = await runGit(['rev-parse', '--show-toplevel'], workspacePath);
    const commonDirRaw = await runGit(['rev-parse', '--git-common-dir'], workspacePath);
    const currentBranch = await runGit(['branch', '--show-current'], workspacePath);

    return {
      rootPath: await realpath(rootPath),
      commonDir: await canonicalizeGitPath(rootPath, commonDirRaw),
      currentBranch,
      repoName: path.basename(rootPath),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve repository context: ${message}`);
  }
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
      throw new Error(`Target branch is already checked out in another worktree: ${options.targetBranch}`);
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
    throw new Error(`Failed to create worktree: ${message}`);
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

  if (await hasUncommittedChanges(candidatePath)) {
    throw new Error(`Reusable worktree has uncommitted changes: ${candidatePath}`);
  }

  const expectedBranch = options.expectedTargetBranch?.trim();
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
