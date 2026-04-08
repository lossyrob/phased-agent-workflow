import * as assert from 'assert';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, dirname, join, resolve } from 'path';
import { execFileSync } from 'child_process';
import {
  createWorktree,
  deriveExecutionBinding,
  deriveRepositoryIdentity,
  formatCreateWorktreeError,
  listGitWorktrees,
  normalizeRepositorySlug,
  parseWorktreeListPorcelain,
  parseWorkflowContextExecutionMetadata,
  resolveExecutionMode,
  validateExecutionBinding,
  validateReusableWorktree,
} from '../../git/validation';

async function createTempRepo(): Promise<string> {
  const repoDir = await mkdtemp(join(tmpdir(), 'paw-git-validation-'));
  execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.email', 'test@paw.dev'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.name', 'PAW Test'], { cwd: repoDir });
  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:example/paw-test.git'], { cwd: repoDir });
  await writeFile(join(repoDir, 'README.md'), '# Test Repo\n');
  execFileSync('git', ['add', 'README.md'], { cwd: repoDir });
  execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });
  return repoDir;
}

function gitOutput(repoDir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repoDir, encoding: 'utf8' }).trim();
}

function deriveWorkId(targetBranch: string): string {
  return targetBranch.replace(/^[^/]+\//, '').replace(/\//g, '-');
}

function resolveGitDir(checkoutPath: string): string {
  return resolve(checkoutPath, gitOutput(checkoutPath, ['rev-parse', '--git-dir']));
}

async function writeExecutionWorkflowContext(
  worktreeDir: string,
  workId: string,
  targetBranch: string,
  repositoryIdentity: string,
  executionBinding: string
): Promise<void> {
  const workflowContextDir = join(worktreeDir, '.paw', 'work', workId);
  await mkdir(workflowContextDir, { recursive: true });
  await writeFile(
    join(workflowContextDir, 'WorkflowContext.md'),
    [
      '# WorkflowContext',
      '',
      'Work Title: Test Worktree',
      `Work ID: ${workId}`,
      `Target Branch: ${targetBranch}`,
      'Execution Mode: worktree',
      `Repository Identity: ${repositoryIdentity}`,
      `Execution Binding: ${executionBinding}`,
    ].join('\n')
  );
}

async function createExecutionContract(
  repoDir: string,
  worktreeDir: string,
  targetBranch: string
): Promise<{
  workId: string;
  repositoryIdentity: string;
  executionBinding: string;
}> {
  const workId = deriveWorkId(targetBranch);
  const repositoryIdentity = await deriveRepositoryIdentity(repoDir);
  const executionBinding = deriveExecutionBinding(workId, targetBranch);
  await writeExecutionWorkflowContext(
    worktreeDir,
    workId,
    targetBranch,
    repositoryIdentity,
    executionBinding
  );
  execFileSync('git', ['add', '.paw'], { cwd: worktreeDir });
  execFileSync('git', ['commit', '-m', 'Seed workflow context'], { cwd: worktreeDir });

  return {
    workId,
    repositoryIdentity,
    executionBinding,
  };
}

function buildReuseOptions(
  repoDir: string,
  worktreeDir: string,
  targetBranch: string,
  executionContract: {
    workId: string;
    repositoryIdentity: string;
    executionBinding: string;
  },
  overrides: Partial<Parameters<typeof validateReusableWorktree>[0]> = {}
): Parameters<typeof validateReusableWorktree>[0] {
  return {
    repositoryPath: repoDir,
    worktreePath: worktreeDir,
    expectedTargetBranch: targetBranch,
    expectedRepositoryIdentity: executionContract.repositoryIdentity,
    expectedExecutionBinding: executionContract.executionBinding,
    expectedWorkId: executionContract.workId,
    registeredExecutionPath: worktreeDir,
    ...overrides,
  };
}

suite('Git Validation Helpers', () => {
  test('parseWorktreeListPorcelain parses branches and detached entries', () => {
    const parsed = parseWorktreeListPorcelain([
      'worktree /tmp/repo',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /tmp/repo-wt',
      'HEAD def456',
      'detached',
      '',
    ].join('\n'));

    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].path, '/tmp/repo');
    assert.strictEqual(parsed[0].branch, 'main');
    assert.strictEqual(parsed[0].detached, false);
    assert.strictEqual(parsed[1].path, '/tmp/repo-wt');
    assert.strictEqual(parsed[1].detached, true);
  });

  test('parseWorktreeListPorcelain stays under the local performance bound for 50 worktrees', () => {
    const porcelain = Array.from({ length: 50 }, (_, index) => [
      `worktree /tmp/repo-${index}`,
      `HEAD ${String(index).padStart(40, 'a')}`,
      `branch refs/heads/feature/test-${index}`,
      '',
    ].join('\n')).join('\n');

    const startedAt = Date.now();
    const parsed = parseWorktreeListPorcelain(porcelain);
    const elapsedMs = Date.now() - startedAt;

    assert.strictEqual(parsed.length, 50);
    assert.ok(elapsedMs < 500, `Expected parser to stay under 500ms, saw ${elapsedMs}ms`);
  });

  test('normalizeRepositorySlug handles SSH and HTTPS remotes', () => {
    assert.strictEqual(
      normalizeRepositorySlug('git@github.com:example/repo.git'),
      'github.com/example/repo'
    );
    assert.strictEqual(
      normalizeRepositorySlug('https://github.com/Example/Repo.git'),
      'github.com/example/repo'
    );
  });

  test('resolveExecutionMode disables worktree mode when the feature flag is off', () => {
    assert.strictEqual(resolveExecutionMode(false, 'worktree'), 'current-checkout');
    assert.strictEqual(resolveExecutionMode(true, 'worktree'), 'worktree');
  });

  test('deriveRepositoryIdentity combines the normalized remote slug and root commit SHA', async () => {
    const repoDir = await createTempRepo();

    try {
      const rootCommit = gitOutput(repoDir, ['rev-list', '--max-parents=0', 'HEAD']);
      const repositoryIdentity = await deriveRepositoryIdentity(repoDir);

      assert.strictEqual(repositoryIdentity, `github.com/example/paw-test@${rootCommit}`);
    } finally {
      await rm(repoDir, { recursive: true, force: true });
    }
  });

  test('parseWorkflowContextExecutionMetadata extracts dedicated worktree fields', () => {
    const metadata = parseWorkflowContextExecutionMetadata([
      '# WorkflowContext',
      '',
      'Target Branch: feature/test-worktree',
      'Execution Mode: worktree',
      'Repository Identity: github.com/example/paw-test@abc123',
      'Execution Binding: worktree:test-worktree:feature/test-worktree',
    ].join('\n'));

    assert.deepStrictEqual(metadata, {
      executionMode: 'worktree',
      repositoryIdentity: 'github.com/example/paw-test@abc123',
      executionBinding: 'worktree:test-worktree:feature/test-worktree',
      targetBranch: 'feature/test-worktree',
    });
  });

  test('formatCreateWorktreeError wraps concurrent-init git errors with guidance', () => {
    assert.strictEqual(
      formatCreateWorktreeError(
        'feature/test-worktree',
        "fatal: 'feature/test-worktree' is already checked out at /tmp/repo"
      ),
      'Target branch is already checked out for this work item: feature/test-worktree. Reopen the existing execution checkout or choose Reuse Existing Worktree.'
    );
  });

  test('createWorktree creates a detached worktree when no target branch is supplied', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-detached`;

    try {
      const createdPath = await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
      });

      const worktrees = await listGitWorktrees(repoDir);
      const created = worktrees.find((worktree) => worktree.path === createdPath);

      assert.ok(created, 'Expected created worktree to be registered');
      assert.strictEqual(created?.detached, true);
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('createWorktree resolves relative paths from the repository root', async () => {
    const repoDir = await createTempRepo();
    const cwdDir = await mkdtemp(join(tmpdir(), 'paw-git-validation-cwd-'));
    const relativePath = '../repo-feature';
    const expectedPath = resolve(repoDir, relativePath);
    const originalCwd = process.cwd();

    try {
      process.chdir(cwdDir);
      const createdPath = await createWorktree({
        repositoryPath: repoDir,
        worktreePath: relativePath,
        targetBranch: 'feature/relative-create',
      });

      const canonicalExpectedPath = await realpath(expectedPath);
      assert.strictEqual(createdPath, canonicalExpectedPath);
      assert.strictEqual(await realpath(createdPath), canonicalExpectedPath);
    } finally {
      process.chdir(originalCwd);
      await rm(repoDir, { recursive: true, force: true });
      await rm(expectedPath, { recursive: true, force: true });
      await rm(cwdDir, { recursive: true, force: true });
    }
  });

  test('createWorktree rejects when the caller checkout already owns the target branch', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;

    try {
      execFileSync('git', ['checkout', '-b', 'feature/test-worktree'], { cwd: repoDir });

      await assert.rejects(
        () => createWorktree({
          repositoryPath: repoDir,
          worktreePath: worktreeDir,
          targetBranch: 'feature/test-worktree',
        }),
        /Choose a different target branch or use current-checkout mode/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('createWorktree preserves caller checkout branch, HEAD, and status for dirty callers', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-preserve`;

    try {
      await writeFile(join(repoDir, 'dirty.txt'), 'uncommitted\n');

      const before = {
        branch: gitOutput(repoDir, ['branch', '--show-current']),
        head: gitOutput(repoDir, ['rev-parse', 'HEAD']),
        status: gitOutput(repoDir, ['status', '--porcelain']),
      };

      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch: 'feature/preserve-caller',
      });

      const after = {
        branch: gitOutput(repoDir, ['branch', '--show-current']),
        head: gitOutput(repoDir, ['rev-parse', 'HEAD']),
        status: gitOutput(repoDir, ['status', '--porcelain']),
      };

      assert.deepStrictEqual(after, before);
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('createWorktree rejects duplicate target branches across worktrees', async () => {
    const repoDir = await createTempRepo();
    const firstWorktreeDir = `${repoDir}-first`;
    const secondWorktreeDir = `${repoDir}-second`;

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: firstWorktreeDir,
        targetBranch: 'feature/test-worktree',
      });

      await assert.rejects(
        () => createWorktree({
          repositoryPath: repoDir,
          worktreePath: secondWorktreeDir,
          targetBranch: 'feature/test-worktree',
        }),
        /Reopen that execution checkout or choose Reuse Existing Worktree/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(firstWorktreeDir, { recursive: true, force: true });
      await rm(secondWorktreeDir, { recursive: true, force: true });
    }
  });

  test('createWorktree uses a remote-only target branch instead of recreating it from the base branch', async () => {
    const repoDir = await createTempRepo();
    const remoteDir = await mkdtemp(join(tmpdir(), 'paw-git-validation-remote-'));
    const worktreeDir = `${repoDir}-remote-only`;
    const targetBranch = 'feature/remote-only';

    try {
      execFileSync('git', ['init', '--bare', remoteDir], { cwd: remoteDir });
      execFileSync('git', ['remote', 'set-url', 'origin', remoteDir], { cwd: repoDir });
      execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: repoDir });

      execFileSync('git', ['checkout', '-b', targetBranch], { cwd: repoDir });
      await writeFile(join(repoDir, 'remote-only.txt'), 'remote branch content\n');
      execFileSync('git', ['add', 'remote-only.txt'], { cwd: repoDir });
      execFileSync('git', ['commit', '-m', 'Remote branch commit'], { cwd: repoDir });
      const remoteHead = gitOutput(repoDir, ['rev-parse', 'HEAD']);
      execFileSync('git', ['push', '-u', 'origin', targetBranch], { cwd: repoDir });

      execFileSync('git', ['checkout', 'main'], { cwd: repoDir });
      execFileSync('git', ['branch', '-D', targetBranch], { cwd: repoDir });

      const createdPath = await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });

      assert.strictEqual(gitOutput(createdPath, ['branch', '--show-current']), targetBranch);
      assert.strictEqual(gitOutput(createdPath, ['rev-parse', 'HEAD']), remoteHead);
      assert.strictEqual(await readFile(join(createdPath, 'remote-only.txt'), 'utf8'), 'remote branch content\n');
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(remoteDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree accepts clean matching worktrees', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      const createdPath = await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);

      const validatedPath = await validateReusableWorktree(
        buildReuseOptions(repoDir, worktreeDir, targetBranch, executionContract)
      );

      assert.strictEqual(validatedPath, createdPath);
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects untracked, unstaged, and staged dirty states', async function () {
    this.timeout(10000);
    const repoDir = await createTempRepo();
    const baseTargetBranch = 'feature/test-worktree';

    try {
      for (const [suffix, dirtySetup] of [
        ['untracked', async (worktreeDir: string) => writeFile(join(worktreeDir, 'dirty.txt'), 'dirty\n')],
        ['unstaged', async (worktreeDir: string) => writeFile(join(worktreeDir, 'README.md'), '# Modified\n')],
        [
          'staged',
          async (worktreeDir: string) => {
            await writeFile(join(worktreeDir, 'README.md'), '# Modified\n');
            execFileSync('git', ['add', 'README.md'], { cwd: worktreeDir });
          },
        ],
      ] as const) {
        const worktreeDir = `${repoDir}-${suffix}`;
        const targetBranch = `${baseTargetBranch}-${suffix}`;

        await createWorktree({
          repositoryPath: repoDir,
          worktreePath: worktreeDir,
          targetBranch,
        });
        const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);
        await dirtySetup(worktreeDir);

        await assert.rejects(
          () => validateReusableWorktree(
            buildReuseOptions(repoDir, worktreeDir, targetBranch, executionContract)
          ),
          /uncommitted changes/
        );

        await rm(worktreeDir, { recursive: true, force: true });
      }
    } finally {
      await rm(repoDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects in-progress git operations', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);
      await writeFile(join(resolveGitDir(worktreeDir), 'MERGE_HEAD'), 'deadbeef\n');

      await assert.rejects(
        () => validateReusableWorktree(
          buildReuseOptions(repoDir, worktreeDir, targetBranch, executionContract)
        ),
        /in-progress git operation/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects symlinked worktree paths', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const linkPath = `${repoDir}-feature-link`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);
      await symlink(worktreeDir, linkPath);

      await assert.rejects(
        () => validateReusableWorktree(
          buildReuseOptions(repoDir, linkPath, targetBranch, executionContract)
        ),
        /Refusing symlinked worktree path/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
      await rm(linkPath, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects worktrees from another repository', async () => {
    const repoDir = await createTempRepo();
    const otherRepoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);

      await assert.rejects(
        () => validateReusableWorktree(
          buildReuseOptions(otherRepoDir, worktreeDir, targetBranch, executionContract)
        ),
        /Reusable worktree does not belong to the current repository/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(otherRepoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree resolves relative paths from the repository root', async () => {
    const repoDir = await createTempRepo();
    const cwdDir = await mkdtemp(join(tmpdir(), 'paw-git-validation-cwd-'));
    const relativePath = '../repo-feature';
    const worktreeDir = resolve(repoDir, relativePath);
    const targetBranch = 'feature/test-worktree';
    const originalCwd = process.cwd();

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);
      process.chdir(cwdDir);

      const reusablePath = await validateReusableWorktree(
        buildReuseOptions(repoDir, worktreeDir, targetBranch, executionContract, {
          worktreePath: relativePath,
        })
      );

      assert.strictEqual(reusablePath, await realpath(worktreeDir));
    } finally {
      process.chdir(originalCwd);
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
      await rm(cwdDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree accepts worktrees discovered through an aliased path spelling', async () => {
    const repoDir = await createTempRepo();
    const linkedParent = `${repoDir}-parent-link`;
    const targetBranch = 'feature/test-worktree';
    const linkedWorktreePath = join(linkedParent, `${basename(repoDir)}-feature`);
    const realWorktreePath = join(dirname(repoDir), `${basename(repoDir)}-feature`);

    try {
      await symlink(dirname(repoDir), linkedParent);
      const createdPath = await createWorktree({
        repositoryPath: repoDir,
        worktreePath: linkedWorktreePath,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, createdPath, targetBranch);

      const reusablePath = await validateReusableWorktree(
        buildReuseOptions(repoDir, createdPath, targetBranch, executionContract)
      );

      assert.strictEqual(reusablePath, createdPath);
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(realWorktreePath, { recursive: true, force: true });
      await rm(linkedParent, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects orphaned execution bindings', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);

      await assert.rejects(
        () => validateReusableWorktree(
          buildReuseOptions(repoDir, worktreeDir, targetBranch, executionContract, {
            registeredExecutionPath: undefined,
          })
        ),
        /Execution binding is orphaned/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects branch mismatches', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);

      await assert.rejects(
        () => validateReusableWorktree(
          buildReuseOptions(repoDir, worktreeDir, 'feature/other-worktree', executionContract)
        ),
        /Reusable worktree must be on feature\/other-worktree/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects invalid git checkouts', async () => {
    const repoDir = await createTempRepo();
    const invalidWorktreeDir = await mkdtemp(join(tmpdir(), 'paw-invalid-worktree-'));

    try {
      await assert.rejects(
        () => validateReusableWorktree({
          repositoryPath: repoDir,
          worktreePath: invalidWorktreeDir,
          expectedTargetBranch: 'feature/test-worktree',
        }),
        /Reusable worktree is not a valid git checkout/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(invalidWorktreeDir, { recursive: true, force: true });
    }
  });

  test('validateExecutionBinding rejects repository identity mismatches', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);

      await assert.rejects(
        () => validateExecutionBinding({
          workflowContextPath: join(worktreeDir, '.paw', 'work', executionContract.workId, 'WorkflowContext.md'),
          expectedRepositoryIdentity: 'github.com/example/other-repo@abc123',
          expectedExecutionBinding: executionContract.executionBinding,
          expectedTargetBranch: targetBranch,
          registeredExecutionPath: worktreeDir,
          actualWorktreePath: worktreeDir,
        }),
        /expected github\.com\/example\/other-repo@abc123/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateExecutionBinding rejects execution binding mismatches', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);

      await assert.rejects(
        () => validateExecutionBinding({
          workflowContextPath: join(worktreeDir, '.paw', 'work', executionContract.workId, 'WorkflowContext.md'),
          expectedRepositoryIdentity: executionContract.repositoryIdentity,
          expectedExecutionBinding: 'worktree:test-worktree:feature/other-worktree',
          expectedTargetBranch: targetBranch,
          registeredExecutionPath: worktreeDir,
          actualWorktreePath: worktreeDir,
        }),
        /expected worktree:test-worktree:feature\/other-worktree/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateExecutionBinding rejects half-initialized metadata', async () => {
    const workflowContextDir = await mkdtemp(join(tmpdir(), 'paw-half-initialized-'));
    const workflowContextPath = join(workflowContextDir, 'WorkflowContext.md');

    try {
      await writeFile(
        workflowContextPath,
        ['# WorkflowContext', '', 'Execution Mode: worktree', 'Target Branch: feature/test-worktree'].join('\n')
      );

      await assert.rejects(
        () => validateExecutionBinding({
          workflowContextPath,
          expectedRepositoryIdentity: 'github.com/example/paw-test@abc123',
          expectedExecutionBinding: 'worktree:test-worktree:feature/test-worktree',
          expectedTargetBranch: 'feature/test-worktree',
          registeredExecutionPath: workflowContextDir,
          actualWorktreePath: workflowContextDir,
        }),
        /half-initialized/
      );
    } finally {
      await rm(workflowContextDir, { recursive: true, force: true });
    }
  });

  test('validateExecutionBinding rejects registry path mismatches', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';
    const alternatePath = `${repoDir}-alternate`;

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);
      await mkdir(alternatePath, { recursive: true });

      await assert.rejects(
        () => validateExecutionBinding({
          workflowContextPath: join(worktreeDir, '.paw', 'work', executionContract.workId, 'WorkflowContext.md'),
          expectedRepositoryIdentity: executionContract.repositoryIdentity,
          expectedExecutionBinding: executionContract.executionBinding,
          expectedTargetBranch: targetBranch,
          registeredExecutionPath: alternatePath,
          actualWorktreePath: worktreeDir,
        }),
        /cannot be proven/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
      await rm(alternatePath, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree checks execution binding before cleanliness', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      await writeFile(join(worktreeDir, 'dirty.txt'), 'dirty\n');

      await assert.rejects(
        () => validateReusableWorktree({
          repositoryPath: repoDir,
          worktreePath: worktreeDir,
          expectedTargetBranch: targetBranch,
          expectedRepositoryIdentity: 'github.com/example/paw-test@abc123',
          expectedExecutionBinding: 'worktree:test-worktree:feature/test-worktree',
          expectedWorkId: 'test-worktree',
          registeredExecutionPath: worktreeDir,
        }),
        /half-initialized/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects bound worktrees checked out on the base branch', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);
      execFileSync('git', ['switch', '-c', 'feature/caller-checkout'], { cwd: repoDir });
      execFileSync('git', ['switch', 'main'], { cwd: worktreeDir });
      await writeExecutionWorkflowContext(
        worktreeDir,
        executionContract.workId,
        targetBranch,
        executionContract.repositoryIdentity,
        executionContract.executionBinding
      );

      await assert.rejects(
        () => validateReusableWorktree(
          buildReuseOptions(repoDir, worktreeDir, targetBranch, executionContract)
        ),
        /must be on feature\/test-worktree, found main/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree checks target branch before cleanliness', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;
    const targetBranch = 'feature/test-worktree';
    const alternateBranch = 'feature/other-worktree';

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch,
      });
      const executionContract = await createExecutionContract(repoDir, worktreeDir, targetBranch);
      execFileSync('git', ['switch', '-c', alternateBranch], { cwd: worktreeDir });
      await writeFile(join(worktreeDir, 'dirty.txt'), 'dirty\n');

      await assert.rejects(
        () => validateReusableWorktree(
          buildReuseOptions(repoDir, worktreeDir, targetBranch, executionContract)
        ),
        new RegExp(`must be on ${targetBranch}, found ${alternateBranch}`)
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });
});
