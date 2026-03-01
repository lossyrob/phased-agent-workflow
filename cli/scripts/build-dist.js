#!/usr/bin/env node
/**
 * Build script for @paw-workflow/cli distribution.
 * Processes conditional blocks and prepares agents/skills for npm package.
 * 
 * - Keeps content inside {{#cli}}...{{/cli}}
 * - Removes content inside {{#vscode}}...{{/vscode}}
 * - Normalizes agent filenames (spaces → hyphens)
 * - Injects version metadata into skills and agents
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = join(__dirname, '..');
const PROJECT_ROOT = join(CLI_ROOT, '..');
const AGENTS_SRC = join(PROJECT_ROOT, 'agents');
const SKILLS_SRC = join(PROJECT_ROOT, 'skills');
const DIST_DIR = join(CLI_ROOT, 'dist');
const DIST_AGENTS = join(DIST_DIR, 'agents');
const DIST_SKILLS = join(DIST_DIR, 'skills');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8'));
const VERSION = packageJson.version;

/**
 * Process conditional blocks for CLI environment.
 */
function processConditionals(content) {
  // Remove vscode blocks (including tags)
  content = content.replace(/\{\{#vscode\}\}[\s\S]*?\{\{\/vscode\}\}/g, '');
  
  // Keep cli block content, remove tags
  content = content.replace(/\{\{#cli\}\}([\s\S]*?)\{\{\/cli\}\}/g, '$1');
  
  return content;
}

/**
 * Normalize filename for CLI (replace spaces with hyphens).
 */
function normalizeFilename(name) {
  return name.replace(/ /g, '-');
}

/**
 * Inject version into skill YAML frontmatter.
 * Adds metadata.version per Agent Skills spec.
 */
function injectSkillVersion(content, version) {
  // Match YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return content;
  }
  
  const frontmatter = frontmatterMatch[1];
  const afterFrontmatter = content.slice(frontmatterMatch[0].length);
  
  // Check if metadata section exists
  if (frontmatter.includes('metadata:')) {
    // Add version to existing metadata
    const updatedFrontmatter = frontmatter.replace(
      /metadata:\n/,
      `metadata:\n  version: "${version}"\n`
    );
    return `---\n${updatedFrontmatter}\n---${afterFrontmatter}`;
  } else {
    // Add new metadata section before closing ---
    const updatedFrontmatter = `${frontmatter}\nmetadata:\n  version: "${version}"`;
    return `---\n${updatedFrontmatter}\n---${afterFrontmatter}`;
  }
}

/**
 * Inject version footer into agent file.
 */
function injectAgentVersion(content, version) {
  // Add version as HTML comment footer
  const footer = `\n\n<!-- @paw-workflow/cli v${version} -->`;
  return content.trimEnd() + footer + '\n';
}

/**
 * Build agents to dist.
 */
function buildAgents() {
  console.log('Building agents...');
  mkdirSync(DIST_AGENTS, { recursive: true });
  
  const agentFiles = readdirSync(AGENTS_SRC).filter(f => f.endsWith('.agent.md'));
  let count = 0;
  
  for (const file of agentFiles) {
    const srcPath = join(AGENTS_SRC, file);
    let content = readFileSync(srcPath, 'utf-8');
    content = processConditionals(content);
    content = injectAgentVersion(content, VERSION);
    
    // Normalize filename
    const baseName = file.replace('.agent.md', '');
    const normalizedName = normalizeFilename(baseName);
    const destPath = join(DIST_AGENTS, `${normalizedName}.agent.md`);
    
    writeFileSync(destPath, content);
    count++;
    console.log(`  ${file} -> ${normalizedName}.agent.md`);
  }
  
  return count;
}

/**
 * Build skills to dist.
 */
function buildSkills() {
  console.log('Building skills...');
  mkdirSync(DIST_SKILLS, { recursive: true });
  
  const skillDirs = readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  let count = 0;
  
  for (const skillName of skillDirs) {
    const srcPath = join(SKILLS_SRC, skillName, 'SKILL.md');
    if (!existsSync(srcPath)) continue;
    
    let content = readFileSync(srcPath, 'utf-8');
    content = processConditionals(content);
    content = injectSkillVersion(content, VERSION);
    
    const destDir = join(DIST_SKILLS, skillName);
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'SKILL.md'), content);
    count++;
    console.log(`  ${skillName}/SKILL.md`);

    // Copy references/ directory if it exists
    const refsSrc = join(SKILLS_SRC, skillName, 'references');
    if (existsSync(refsSrc)) {
      const refsDest = join(destDir, 'references');
      cpSync(refsSrc, refsDest, { recursive: true, filter: (src) => !src.split('/').pop().startsWith('.') });
      console.log(`  ${skillName}/references/`);
    }
  }
  
  return count;
}

/**
 * Build plugin.json manifest for Copilot CLI plugin distribution.
 */
function buildPluginManifest() {
  console.log('Building plugin manifest...');

  const manifest = {
    name: 'paw-workflow',
    description: 'Phased Agent Workflow (PAW) — structured multi-phase implementation and PR review workflows for AI coding agents',
    version: VERSION,
    author: {
      name: 'Rob Emanuele',
      url: 'https://github.com/lossyrob'
    },
    homepage: 'https://lossyrob.github.io/phased-agent-workflow',
    repository: 'https://github.com/lossyrob/phased-agent-workflow',
    license: 'MIT',
    keywords: ['paw', 'workflow', 'agent', 'copilot', 'implementation', 'code-review'],
    category: 'workflow',
    agents: 'agents/',
    skills: 'skills/'
  };

  writeFileSync(join(DIST_DIR, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('  plugin.json');
}

/**
 * Build marketplace.json for Copilot CLI marketplace discovery.
 */
function buildMarketplaceManifest() {
  console.log('Building marketplace manifest...');

  const marketplaceDir = join(DIST_DIR, '.github', 'plugin');
  mkdirSync(marketplaceDir, { recursive: true });

  const marketplace = {
    name: 'paw-workflow',
    owner: {
      name: 'Rob Emanuele',
      email: 'rdemanuele@gmail.com'
    },
    metadata: {
      description: 'Phased Agent Workflow (PAW) plugin marketplace',
      version: VERSION
    },
    plugins: [
      {
        name: 'paw-workflow',
        description: 'Structured multi-phase implementation and PR review workflows for AI coding agents',
        version: VERSION,
        source: '.',
        author: {
          name: 'Rob Emanuele',
          url: 'https://github.com/lossyrob'
        },
        homepage: 'https://lossyrob.github.io/phased-agent-workflow',
        repository: 'https://github.com/lossyrob/phased-agent-workflow',
        license: 'MIT',
        keywords: ['paw', 'workflow', 'agent', 'copilot', 'implementation', 'code-review'],
        category: 'workflow'
      }
    ]
  };

  writeFileSync(join(marketplaceDir, 'marketplace.json'), JSON.stringify(marketplace, null, 2) + '\n');
  console.log('  .github/plugin/marketplace.json');
}

/**
 * Main build function.
 */
function build() {
  console.log(`Building @paw-workflow/cli v${VERSION} distribution...\n`);
  
  // Clean dist directory
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true });
  }
  
  const agentCount = buildAgents();
  console.log('');
  const skillCount = buildSkills();
  console.log('');
  buildPluginManifest();
  buildMarketplaceManifest();
  
  console.log(`\nBuild complete: ${agentCount} agents, ${skillCount} skills (v${VERSION})`);
  console.log(`Output: ${DIST_DIR}`);
}

build();
