const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const skillsRoot = path.join(repoRoot, 'skills');
const outputRoot = path.join(repoRoot, 'vscode-assets', 'skills');
const { renderBundledSkillsForVSCode } = require(path.join(
  repoRoot,
  'out',
  'skills',
  'renderedSkills.js'
));

const renderedSkillNames = renderBundledSkillsForVSCode(skillsRoot, outputRoot);
console.log(`Rendered ${renderedSkillNames.length} VS Code skill asset(s) to ${outputRoot}`);
