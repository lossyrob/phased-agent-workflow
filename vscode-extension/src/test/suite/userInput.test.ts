import * as assert from 'assert';
import { isValidBranchName, isValidGitHubIssueUrl } from '../../ui/userInput';

/**
 * User input validation tests.
 * 
 * These unit tests verify the input validation logic used in the work item initialization flow.
 * Tests cover:
 * - Git branch name validation (alphanumeric, hyphens, underscores, slashes only)
 * - GitHub issue URL format validation (must match exact pattern)
 * 
 * The validation functions are called by VS Code input boxes to provide real-time
 * feedback to users during the initialization process.
 */
suite('User Input Validation', () => {
  test('Valid branch names pass validation', () => {
    const validNames = [
      'feature/my-feature',
      'bugfix/fix-123',
      'hotfix/ISSUE-456',
      'feature/user_auth',
      'main'
    ];

    validNames.forEach(name => {
      assert.ok(isValidBranchName(name), `${name} should be valid`);
    });
  });

  test('Invalid branch names fail validation', () => {
    const invalidNames = [
      'feature/my feature',
      'feature/my@feature',
      ' feature/leading-space',
      '',
      'feature/with%percent'
    ];

    invalidNames.forEach(name => {
      assert.ok(!isValidBranchName(name), `${name} should be invalid`);
    });
  });

  test('Valid GitHub issue URLs pass validation', () => {
    const validUrls = [
      'https://github.com/owner/repo/issues/123',
      'https://github.com/microsoft/vscode/issues/1'
    ];

    validUrls.forEach(url => {
      assert.ok(isValidGitHubIssueUrl(url), `${url} should be valid`);
    });
  });

  test('Invalid GitHub issue URLs fail validation', () => {
    const invalidUrls = [
      'https://github.com/owner/repo/pull/123',
      'github.com/owner/repo/issues/123',
      'https://github.com/owner/issues/123',
      'https://gitlab.com/owner/repo/issues/123'
    ];

    invalidUrls.forEach(url => {
      assert.ok(!isValidGitHubIssueUrl(url), `${url} should be invalid`);
    });
  });
});
