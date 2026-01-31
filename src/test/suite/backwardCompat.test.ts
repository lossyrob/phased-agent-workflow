import * as assert from 'assert';
import { mapHandoffModeToReviewPolicy } from '../../utils/backwardCompat';

suite('Backward Compatibility Utilities', () => {
  suite('mapHandoffModeToReviewPolicy', () => {
    test('maps manual to always', () => {
      assert.strictEqual(mapHandoffModeToReviewPolicy('manual'), 'always');
    });

    test('maps semi-auto to milestones', () => {
      assert.strictEqual(mapHandoffModeToReviewPolicy('semi-auto'), 'milestones');
    });

    test('maps auto to never', () => {
      assert.strictEqual(mapHandoffModeToReviewPolicy('auto'), 'never');
    });

    test('all HandoffMode values have explicit mappings', () => {
      // Ensure each valid HandoffMode produces a valid ReviewPolicy
      const handoffModes = ['manual', 'semi-auto', 'auto'] as const;
      const validPolicies = ['always', 'milestones', 'never'];

      for (const mode of handoffModes) {
        const result = mapHandoffModeToReviewPolicy(mode);
        assert.ok(
          validPolicies.includes(result),
          `Expected ${mode} to map to a valid ReviewPolicy, got ${result}`
        );
      }
    });

    test('mapping is bijective (each HandoffMode maps to unique ReviewPolicy)', () => {
      const results = new Set([
        mapHandoffModeToReviewPolicy('manual'),
        mapHandoffModeToReviewPolicy('semi-auto'),
        mapHandoffModeToReviewPolicy('auto'),
      ]);
      assert.strictEqual(results.size, 3, 'Each HandoffMode should map to a unique ReviewPolicy');
    });
  });
});
