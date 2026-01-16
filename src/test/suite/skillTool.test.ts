import * as assert from 'assert';
import { formatSkillContentResult } from '../../tools/skillTool';
import { SkillContent } from '../../skills/skillLoader';

suite('Skill Tool', () => {
  test('formatSkillContentResult returns error message when error present', () => {
    const result: SkillContent = {
      name: 'paw-review-workflow',
      content: '',
      error: 'Skill not found: paw-review-workflow',
    };

    const output = formatSkillContentResult(result);
    assert.ok(output.includes('Error retrieving skill'));
    assert.ok(output.includes('Skill not found'));
  });

  test('formatSkillContentResult returns content when no error', () => {
    const result: SkillContent = {
      name: 'paw-review-workflow',
      content: '# Skill content',
    };

    const output = formatSkillContentResult(result);
    assert.strictEqual(output, '# Skill content');
  });
});
