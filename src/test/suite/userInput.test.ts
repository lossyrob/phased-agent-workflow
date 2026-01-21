import * as assert from 'assert';
import { 
  isValidBranchName, 
  WorkflowMode,
  ReviewStrategy,
  WorkflowModeSelection
} from '../../ui/userInput';

/**
 * User input validation tests.
 * 
 * These unit tests verify the input validation logic used in the work item initialization flow.
 * Tests cover:
 * - Git branch name validation (alphanumeric, hyphens, underscores, slashes only)
 * - Workflow mode type validation
 * - Review strategy type validation
 * - WorkflowModeSelection interface usage
 * 
 * Note: Issue URL validation was removed - agents now interpret input contextually
 * (URL, issue number, or identifier) and handle errors gracefully.
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
      'feature/with%percent'
    ];

    invalidNames.forEach(name => {
      assert.ok(!isValidBranchName(name), `${name} should be invalid`);
    });
  });

  test('Empty branch name fails validation (auto-derive handled separately)', () => {
    // Empty string is invalid for isValidBranchName - the auto-derive logic
    // in collectUserInputs allows empty input by checking before validation
    assert.ok(!isValidBranchName(''), 'Empty string should be invalid for isValidBranchName');
  });
});

/**
 * Workflow mode type tests.
 * 
 * Verify that WorkflowMode type accepts valid values and the WorkflowModeSelection
 * interface works correctly with and without custom instructions.
 */
suite('Workflow Mode Types', () => {
  test('WorkflowMode accepts valid values', () => {
    const fullMode: WorkflowMode = 'full';
    const minimalMode: WorkflowMode = 'minimal';
    const customMode: WorkflowMode = 'custom';
    
    assert.strictEqual(fullMode, 'full');
    assert.strictEqual(minimalMode, 'minimal');
    assert.strictEqual(customMode, 'custom');
  });

  test('WorkflowModeSelection works without custom instructions', () => {
    const selection: WorkflowModeSelection = {
      mode: 'full'
    };
    
    assert.strictEqual(selection.mode, 'full');
    assert.strictEqual(selection.customInstructions, undefined);
  });

  test('WorkflowModeSelection works with custom instructions', () => {
    const selection: WorkflowModeSelection = {
      mode: 'custom',
      customInstructions: 'skip docs, single branch'
    };
    
    assert.strictEqual(selection.mode, 'custom');
    assert.strictEqual(selection.customInstructions, 'skip docs, single branch');
  });
});

/**
 * Review strategy type tests.
 * 
 * Verify that ReviewStrategy type accepts valid values (prs, local).
 */
suite('Review Strategy Types', () => {
  test('ReviewStrategy accepts valid values', () => {
    const prsStrategy: ReviewStrategy = 'prs';
    const localStrategy: ReviewStrategy = 'local';
    
    assert.strictEqual(prsStrategy, 'prs');
    assert.strictEqual(localStrategy, 'local');
  });
});
