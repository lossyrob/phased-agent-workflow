import * as assert from 'assert';
import { formatSkillCatalogMarkdown } from '../../tools/skillsTool';
import { SkillCatalogEntry } from '../../skills/skillLoader';

suite('Skills Tool', () => {
  test('formatSkillCatalogMarkdown handles empty catalog', () => {
    const result = formatSkillCatalogMarkdown([]);
    assert.strictEqual(result, 'No PAW skills are available.');
  });

  test('formatSkillCatalogMarkdown renders entries with type', () => {
    const entries: SkillCatalogEntry[] = [
      {
        name: 'paw-review-workflow',
        description: 'Workflow skill',
        type: 'workflow',
        source: 'builtin',
      },
      {
        name: 'paw-review-understanding',
        description: 'Understanding skill',
        source: 'builtin',
      },
    ];

    const result = formatSkillCatalogMarkdown(entries);
    assert.ok(result.includes('paw-review-workflow'));
    assert.ok(result.includes('(workflow)'));
    assert.ok(result.includes('paw-review-understanding'));
  });
});
