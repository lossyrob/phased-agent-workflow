import * as assert from 'assert';
import { isValidBranchName, isValidIssueUrl } from '../../ui/userInput';

/**
 * User input validation tests.
 * 
 * These unit tests verify the input validation logic used in the work item initialization flow.
 * Tests cover:
 * - Git branch name validation (alphanumeric, hyphens, underscores, slashes only)
 * - Issue URL format validation (supports GitHub Issues and Azure DevOps Work Items)
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

  test('Valid issue URLs pass validation (GitHub and Azure DevOps)', () => {
    // GitHub Issues
    assert.strictEqual(
      isValidIssueUrl('https://github.com/owner/repo/issues/123'),
      true
    );
    assert.strictEqual(
      isValidIssueUrl('https://github.com/microsoft/vscode/issues/99999'),
      true
    );

    // Azure DevOps Work Items
    assert.strictEqual(
      isValidIssueUrl('https://dev.azure.com/myorg/myproject/_workitems/edit/123'),
      true
    );
    assert.strictEqual(
      isValidIssueUrl('https://dev.azure.com/microsoft/vscode/_workitems/edit/54321'),
      true
    );
  });

  test('Invalid issue URLs fail validation', () => {
    // Invalid formats for both platforms
    assert.strictEqual(isValidIssueUrl('not a url'), false);
    assert.strictEqual(isValidIssueUrl('https://example.com'), false);

    // Invalid GitHub issue URLs
    assert.strictEqual(
      isValidIssueUrl('https://github.com/owner/repo/pull/123'),
      false
    );
    assert.strictEqual(
      isValidIssueUrl('github.com/owner/repo/issues/123'),
      false
    );

    // Invalid Azure DevOps URLs
    assert.strictEqual(
      isValidIssueUrl('https://dev.azure.com/org/project/workitems/123'),
      false
    );
    assert.strictEqual(
      isValidIssueUrl('https://visualstudio.com/org/project/_workitems/edit/123'),
      false
    );
  });
});
