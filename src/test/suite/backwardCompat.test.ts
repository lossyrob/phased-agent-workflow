import * as assert from 'assert';
import { mapHandoffModeToReviewPolicy, mapLegacyReviewPolicy } from '../../utils/backwardCompat';

suite('Backward Compatibility Utilities', () => {
  suite('mapHandoffModeToReviewPolicy', () => {
    test('maps manual to every-stage', () => {
      assert.strictEqual(mapHandoffModeToReviewPolicy('manual'), 'every-stage');
    });

    test('maps semi-auto to milestones', () => {
      assert.strictEqual(mapHandoffModeToReviewPolicy('semi-auto'), 'milestones');
    });

    test('maps auto to final-pr-only', () => {
      assert.strictEqual(mapHandoffModeToReviewPolicy('auto'), 'final-pr-only');
    });

    test('all HandoffMode values have explicit mappings', () => {
      // Ensure each valid HandoffMode produces a valid ReviewPolicy
      const handoffModes = ['manual', 'semi-auto', 'auto'] as const;
      const validPolicies = ['every-stage', 'milestones', 'final-pr-only'];

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

  suite('mapLegacyReviewPolicy', () => {
    test('maps always to every-stage', () => {
      assert.strictEqual(mapLegacyReviewPolicy('always'), 'every-stage');
    });

    test('maps never to final-pr-only', () => {
      assert.strictEqual(mapLegacyReviewPolicy('never'), 'final-pr-only');
    });

    test('passes through milestones unchanged', () => {
      assert.strictEqual(mapLegacyReviewPolicy('milestones'), 'milestones');
    });

    test('passes through planning-only unchanged', () => {
      assert.strictEqual(mapLegacyReviewPolicy('planning-only'), 'planning-only');
    });

    test('passes through every-stage unchanged', () => {
      assert.strictEqual(mapLegacyReviewPolicy('every-stage'), 'every-stage');
    });

    test('passes through final-pr-only unchanged', () => {
      assert.strictEqual(mapLegacyReviewPolicy('final-pr-only'), 'final-pr-only');
    });

    test('defaults to milestones for unknown values', () => {
      assert.strictEqual(mapLegacyReviewPolicy('unknown'), 'milestones');
    });
  });
});
