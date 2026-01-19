import * as assert from 'assert';
import { formatSkillCatalogMarkdown } from '../../tools/skillsTool';
import { SkillCatalogEntry } from '../../skills/skillLoader';

suite('Skills Tool', () => {
  test('formatSkillCatalogMarkdown handles empty catalog', () => {
    const result = formatSkillCatalogMarkdown([]);
    assert.strictEqual(result, 'No PAW skills are available.');
  });

  test('formatSkillCatalogMarkdown renders entries', () => {
    const entries: SkillCatalogEntry[] = [
      {
        name: 'paw-review-workflow',
        description: 'Workflow skill',
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
    assert.ok(result.includes('Workflow skill'));
    assert.ok(result.includes('paw-review-understanding'));
    assert.ok(result.includes('Understanding skill'));
  });

  test('formatSkillCatalogMarkdown produces valid markdown list', () => {
    const entries: SkillCatalogEntry[] = [
      {
        name: 'test-skill',
        description: 'Test description',
        source: 'builtin',
      },
    ];

    const result = formatSkillCatalogMarkdown(entries);
    // Should be a markdown list item
    assert.ok(result.startsWith('- **test-skill**'), 'Should format as markdown list item');
  });
});
