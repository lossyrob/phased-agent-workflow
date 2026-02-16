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

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'fs';
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
 * Recursively copy a directory, skipping hidden files.
 * Returns the number of files copied.
 */
function copyDir(srcDir, destDir) {
  let count = 0;
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      count += copyDir(srcPath, destPath);
    } else {
      mkdirSync(destDir, { recursive: true });
      writeFileSync(destPath, readFileSync(srcPath));
      count++;
    }
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
      const refCount = copyDir(refsSrc, refsDest);
      console.log(`  ${skillName}/references/ (${refCount} files)`);
    }
  }
  
  return count;
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
  
  console.log(`\nBuild complete: ${agentCount} agents, ${skillCount} skills (v${VERSION})`);
  console.log(`Output: ${DIST_DIR}`);
}

build();
