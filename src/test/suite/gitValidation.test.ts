import * as assert from 'assert';
import { mkdtemp, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';
import {
  createWorktree,
  listGitWorktrees,
  parseWorktreeListPorcelain,
  validateReusableWorktree,
} from '../../git/validation';

async function createTempRepo(): Promise<string> {
  const repoDir = await mkdtemp(join(tmpdir(), 'paw-git-validation-'));
  execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.email', 'test@paw.dev'], { cwd: repoDir });
  execFileSync('git', ['config', 'user.name', 'PAW Test'], { cwd: repoDir });
  await writeFile(join(repoDir, 'README.md'), '# Test Repo\n');
  execFileSync('git', ['add', 'README.md'], { cwd: repoDir });
  execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: repoDir });
  return repoDir;
}

function gitOutput(repoDir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repoDir, encoding: 'utf8' }).trim();
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
        /Target branch is already checked out in another worktree/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(firstWorktreeDir, { recursive: true, force: true });
      await rm(secondWorktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree accepts clean matching worktrees', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;

    try {
      const createdPath = await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch: 'feature/test-worktree',
      });

      const validatedPath = await validateReusableWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        expectedTargetBranch: 'feature/test-worktree',
      });

      assert.strictEqual(validatedPath, createdPath);
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects dirty worktrees', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch: 'feature/test-worktree',
      });

      await writeFile(join(worktreeDir, 'dirty.txt'), 'uncommitted\n');

      await assert.rejects(
        () => validateReusableWorktree({
          repositoryPath: repoDir,
          worktreePath: worktreeDir,
          expectedTargetBranch: 'feature/test-worktree',
        }),
        /uncommitted changes/
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

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch: 'feature/test-worktree',
      });
      await symlink(worktreeDir, linkPath);

      await assert.rejects(
        () => validateReusableWorktree({
          repositoryPath: repoDir,
          worktreePath: linkPath,
          expectedTargetBranch: 'feature/test-worktree',
        }),
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

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch: 'feature/test-worktree',
      });

      await assert.rejects(
        () => validateReusableWorktree({
          repositoryPath: otherRepoDir,
          worktreePath: worktreeDir,
          expectedTargetBranch: 'feature/test-worktree',
        }),
        /Reusable worktree does not belong to the current repository/
      );
    } finally {
      await rm(repoDir, { recursive: true, force: true });
      await rm(otherRepoDir, { recursive: true, force: true });
      await rm(worktreeDir, { recursive: true, force: true });
    }
  });

  test('validateReusableWorktree rejects branch mismatches', async () => {
    const repoDir = await createTempRepo();
    const worktreeDir = `${repoDir}-feature`;

    try {
      await createWorktree({
        repositoryPath: repoDir,
        worktreePath: worktreeDir,
        targetBranch: 'feature/test-worktree',
      });

      await assert.rejects(
        () => validateReusableWorktree({
          repositoryPath: repoDir,
          worktreePath: worktreeDir,
          expectedTargetBranch: 'feature/other-worktree',
        }),
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
});
