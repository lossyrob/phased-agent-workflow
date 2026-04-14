import * as assert from 'assert';
import { constructGetWorkStatusQuery } from '../../commands/getWorkStatus';

suite('Get Work Status Command', () => {
  test('constructGetWorkStatusQuery includes control-state instructions for explicit work IDs', () => {
    const query = constructGetWorkStatusQuery('workflow-hardening');

    assert.ok(query.includes('Work ID: workflow-hardening'));
    assert.ok(query.includes('WorkflowContext.md'));
    assert.ok(query.includes('embedded control state'));
    assert.ok(query.includes('legacy best-effort mode'));
    assert.ok(query.includes('stale/unverified'));
  });

  test('constructGetWorkStatusQuery includes control-state instructions for auto-detect mode', () => {
    const query = constructGetWorkStatusQuery();

    assert.ok(query.includes('What is the current work status?'));
    assert.ok(query.includes('WorkflowContext.md'));
    assert.ok(query.includes('legacy best-effort mode'));
    assert.ok(query.includes('blocked, pending, and stale/unverified'));
  });
});
