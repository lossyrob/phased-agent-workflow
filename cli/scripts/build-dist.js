#!/usr/bin/env node
/**
 * Build script for @paw/cli distribution.
 * Processes conditional blocks and prepares agents/skills for npm package.
 * 
 * - Keeps content inside {{#cli}}...{{/cli}}
 * - Removes content inside {{#vscode}}...{{/vscode}}
 * - Normalizes agent filenames (spaces → hyphens)
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
 * Build agents to dist.
 */
function buildAgents() {
  console.log('Building agents...');
  mkdirSync(DIST_AGENTS, { recursive: true });
  
  const agentFiles = readdirSync(AGENTS_SRC).filter(f => f.endsWith('.agent.md'));
  let count = 0;
  
  for (const file of agentFiles) {
    const srcPath = join(AGENTS_SRC, file);
    const content = readFileSync(srcPath, 'utf-8');
    const processed = processConditionals(content);
    
    // Normalize filename
    const baseName = file.replace('.agent.md', '');
    const normalizedName = normalizeFilename(baseName);
    const destPath = join(DIST_AGENTS, `${normalizedName}.agent.md`);
    
    writeFileSync(destPath, processed);
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
    
    const content = readFileSync(srcPath, 'utf-8');
    const processed = processConditionals(content);
    
    const destDir = join(DIST_SKILLS, skillName);
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'SKILL.md'), processed);
    count++;
    console.log(`  ${skillName}/SKILL.md`);
  }
  
  return count;
}

/**
 * Main build function.
 */
function build() {
  console.log('Building @paw/cli distribution...\n');
  
  // Clean dist directory
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true });
  }
  
  const agentCount = buildAgents();
  console.log('');
  const skillCount = buildSkills();
  
  console.log(`\nBuild complete: ${agentCount} agents, ${skillCount} skills`);
  console.log(`Output: ${DIST_DIR}`);
}

build();
