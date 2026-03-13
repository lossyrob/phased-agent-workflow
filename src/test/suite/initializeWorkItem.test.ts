import * as assert from 'assert';
import {
  constructPawPromptArguments,
  shouldResumePendingWorktreeInit,
  type PendingWorktreeInit,
} from '../../commands/initializeWorkItem';

suite('Initialize Work Item Helpers', () => {
  test('constructPawPromptArguments includes execution mode for worktree sessions', () => {
    const prompt = constructPawPromptArguments({
      targetBranch: '',
      workflowMode: { mode: 'minimal' },
      executionMode: 'worktree',
      reviewStrategy: 'local',
      reviewPolicy: 'final-pr-only',
      sessionPolicy: 'continuous',
      artifactLifecycle: 'commit-and-clean',
      finalReview: {
        enabled: true,
        mode: 'single-model',
        interactive: 'smart',
      },
      issueUrl: 'https://github.com/example/repo/issues/123',
    }, '/tmp/repo');

    assert.ok(prompt.includes('- **target_branch**: auto'));
    assert.ok(prompt.includes('- **execution_mode**: worktree'));
    assert.ok(prompt.includes('- **issue_url**: https://github.com/example/repo/issues/123'));
  });

  test('shouldResumePendingWorktreeInit matches normalized paths', () => {
    const pending: PendingWorktreeInit = {
      worktreePath: '/tmp/repo-worktree',
      query: '## Initialization Parameters',
      mode: 'PAW',
      createdAt: '2026-03-13T00:00:00.000Z',
    };

    assert.strictEqual(
      shouldResumePendingWorktreeInit('/tmp/repo-worktree', pending),
      true
    );
    assert.strictEqual(
      shouldResumePendingWorktreeInit('/tmp/other-worktree', pending),
      false
    );
  });
});
