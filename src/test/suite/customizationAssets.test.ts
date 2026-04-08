import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import JSZip from 'jszip';
import { createVSIX } from '@vscode/vsce';
import { listBundledSkillNames, renderBundledSkillsForVSCode } from '../../skills/renderedSkills';

const REPO_ROOT = path.resolve(__dirname, '../../..');

function listFilesRecursively(rootDir: string, prefix = ''): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextPrefix = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(absolutePath, nextPrefix));
    } else {
      files.push(nextPrefix);
    }
  }

  return files.sort();
}

function parseMinimumVersion(range: string): { major: number; minor: number; patch: number } {
  const match = /^\^?(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (!match) {
    throw new Error(`Unexpected VS Code engine range: ${range}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

suite('VS Code customization assets', () => {
  test('renderBundledSkillsForVSCode strips conditional blocks and copies references', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-render-skills-'));
    const skillsRoot = path.join(tempRoot, 'skills');
    const outputRoot = path.join(tempRoot, 'out');
    const skillDir = path.join(skillsRoot, 'example-skill');
    const referencesDir = path.join(skillDir, 'references');

    try {
      fs.mkdirSync(referencesDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        [
          '---',
          'name: example-skill',
          'description: Example skill',
          '---',
          '',
          '{{#vscode}}VS Code only{{/vscode}}',
          '{{#cli}}CLI only{{/cli}}',
        ].join('\n'),
        'utf-8'
      );
      fs.writeFileSync(path.join(referencesDir, 'guide.md'), '# guide\n', 'utf-8');

      const rendered = renderBundledSkillsForVSCode(skillsRoot, outputRoot);
      assert.deepStrictEqual(rendered, ['example-skill']);

      const renderedSkill = fs.readFileSync(path.join(outputRoot, 'example-skill', 'SKILL.md'), 'utf-8');
      assert.ok(renderedSkill.includes('VS Code only'));
      assert.ok(!renderedSkill.includes('CLI only'));
      assert.ok(!renderedSkill.includes('{{#vscode}}'));
      assert.ok(!renderedSkill.includes('{{#cli}}'));
      assert.ok(fs.existsSync(path.join(outputRoot, 'example-skill', 'references', 'guide.md')));
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('package manifest contributes all prompt files and rendered skills', () => {
    const packageJsonPath = path.join(REPO_ROOT, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      engines: { vscode: string };
      contributes: {
        chatPromptFiles?: Array<{ path: string }>;
        chatSkills?: Array<{ path: string }>;
        languageModelTools?: Array<{ name: string }>;
      };
    };

    const minimumVersion = parseMinimumVersion(packageJson.engines.vscode);
    assert.ok(
      minimumVersion.major > 1 || (minimumVersion.major === 1 && minimumVersion.minor >= 109),
      'VS Code engine must support chatSkills and chatPromptFiles'
    );

    const expectedPromptPaths = fs.readdirSync(path.join(REPO_ROOT, 'prompts'))
      .filter(filename => filename.endsWith('.prompt.md'))
      .sort()
      .map(filename => `./prompts/${filename}`);
    const actualPromptPaths = (packageJson.contributes.chatPromptFiles ?? [])
      .map(entry => entry.path)
      .sort();
    assert.deepStrictEqual(actualPromptPaths, expectedPromptPaths);

    const expectedSkillPaths = listBundledSkillNames(path.join(REPO_ROOT, 'skills'))
      .map(skillName => `./vscode-assets/skills/${skillName}/SKILL.md`)
      .sort();
    const actualSkillPaths = (packageJson.contributes.chatSkills ?? [])
      .map(entry => entry.path)
      .sort();
    assert.deepStrictEqual(actualSkillPaths, expectedSkillPaths);

    for (const contributedPath of [...actualPromptPaths, ...actualSkillPaths]) {
      assert.ok(
        fs.existsSync(path.join(REPO_ROOT, contributedPath.replace(/^\.\//, ''))),
        `Missing contributed asset: ${contributedPath}`
      );
    }

    for (const skillPath of actualSkillPaths) {
      const renderedSkill = fs.readFileSync(
        path.join(REPO_ROOT, skillPath.replace(/^\.\//, '')),
        'utf-8'
      );
      assert.ok(!renderedSkill.includes('{{#vscode}}'), `Rendered skill still contains VS Code conditional block: ${skillPath}`);
      assert.ok(!renderedSkill.includes('{{#cli}}'), `Rendered skill still contains CLI conditional block: ${skillPath}`);
    }

    const toolNames = (packageJson.contributes.languageModelTools ?? []).map(tool => tool.name);
    assert.ok(!toolNames.includes('paw_get_skill'));
    assert.ok(!toolNames.includes('paw_get_skills'));
  });

  test('built VSIX contains contributed prompt, skill, and agent assets but excludes workflow scratch files', async function() {
    this.timeout(120000);

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-vsix-test-'));
    const packagePath = path.join(tempRoot, 'paw-workflow-test.vsix');

    try {
      await createVSIX({
        cwd: REPO_ROOT,
        packagePath,
        allowMissingRepository: true,
        allowUnusedFilesPattern: true
      });

      const zip = await JSZip.loadAsync(fs.readFileSync(packagePath));
      const packagedEntries = Object.keys(zip.files).sort();

      const expectedPromptEntries = listFilesRecursively(path.join(REPO_ROOT, 'prompts'))
        .filter(relativePath => relativePath.endsWith('.prompt.md'))
        .map(relativePath => `extension/prompts/${relativePath}`);
      const expectedSkillEntries = listFilesRecursively(path.join(REPO_ROOT, 'vscode-assets', 'skills'))
        .map(relativePath => `extension/vscode-assets/skills/${relativePath}`);
      const expectedAgentEntries = listFilesRecursively(path.join(REPO_ROOT, 'agents'))
        .map(relativePath => `extension/agents/${relativePath}`);

      for (const expectedEntry of [
        ...expectedPromptEntries,
        ...expectedSkillEntries,
        ...expectedAgentEntries
      ]) {
        assert.ok(packagedEntries.includes(expectedEntry), `Missing packaged asset: ${expectedEntry}`);
      }

      assert.ok(
        !packagedEntries.some(entry => entry.startsWith('extension/.paw/')),
        'Packaged VSIX should not contain .paw workflow artifacts'
      );
      assert.ok(
        !packagedEntries.some(entry => entry.startsWith('extension/out/vscode-assets/skills/')),
        'Packaged VSIX should not serve chatSkills from out/vscode-assets'
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
