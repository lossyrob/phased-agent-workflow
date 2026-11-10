import * as assert from 'assert';
import { parseWorkTitle } from '../../utils/workItemScanner';

suite('Work Item Scanner', () => {
  test('parseWorkTitle reads the v2 WorkflowContext.md header', () => {
    assert.strictEqual(parseWorkTitle('# WorkflowContext\n\n- Work title: Request Stats\n- Work id: request-stats\n'), 'Request Stats');
  });

  test('parseWorkTitle reads a v1 WorkflowContext.md', () => {
    assert.strictEqual(parseWorkTitle('# WorkflowContext\n\nWork Title: Auth System\nWork ID: auth-system\n'), 'Auth System');
  });

  test('parseWorkTitle returns undefined without a title', () => {
    assert.strictEqual(parseWorkTitle('# WorkflowContext\n'), undefined);
  });
});
