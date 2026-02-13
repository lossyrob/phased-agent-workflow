import * as assert from 'assert';
import { 
  isValidBranchName, 
  WorkflowMode,
  ReviewStrategy,
  WorkflowModeSelection,
  FinalReviewConfig
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
    assert.strictEqual(selection.workflowCustomization, undefined);
  });

  test('WorkflowModeSelection works with workflow customization', () => {
    const selection: WorkflowModeSelection = {
      mode: 'custom',
      workflowCustomization: 'skip docs, single branch'
    };
    
    assert.strictEqual(selection.mode, 'custom');
    assert.strictEqual(selection.workflowCustomization, 'skip docs, single branch');
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

/**
 * Final Review configuration type tests.
 * 
 * Verify that FinalReviewConfig interface accepts valid configurations.
 */
suite('Final Review Config Types', () => {
  test('FinalReviewConfig works when disabled', () => {
    const config: FinalReviewConfig = {
      enabled: false,
      mode: 'single-model',
      interactive: true
    };
    
    assert.strictEqual(config.enabled, false);
    assert.strictEqual(config.mode, 'single-model');
    assert.strictEqual(config.interactive, true);
  });

  test('FinalReviewConfig works with single-model mode', () => {
    const config: FinalReviewConfig = {
      enabled: true,
      mode: 'single-model',
      interactive: true
    };
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.mode, 'single-model');
  });

  test('FinalReviewConfig works with multi-model mode', () => {
    const config: FinalReviewConfig = {
      enabled: true,
      mode: 'multi-model',
      interactive: false
    };
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.mode, 'multi-model');
    assert.strictEqual(config.interactive, false);
  });

  test('FinalReviewConfig works with smart interactive mode', () => {
    const config: FinalReviewConfig = {
      enabled: true,
      mode: 'multi-model',
      interactive: 'smart'
    };
    
    assert.strictEqual(config.enabled, true);
    assert.strictEqual(config.mode, 'multi-model');
    assert.strictEqual(config.interactive, 'smart');
  });
});
