import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import {
  getTargetDirs,
  getDistAgentsDir,
  getDistSkillsDir,
} from '../paths.js';
import { readManifest, writeManifest, createManifest } from '../manifest.js';
import { VERSION } from '../version.js';

const SUPPORTED_TARGETS = ['copilot', 'claude'];

async function confirm(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

function copyDirectory(srcDir, destDir, fileList) {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  
  const entries = readdirSync(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, fileList);
    } else if (entry.isFile()) {
      copyFileSync(srcPath, destPath);
      fileList.push(destPath);
    }
  }
}

export async function installCommand(target, flags = {}) {
  if (!SUPPORTED_TARGETS.includes(target)) {
    throw new Error(`Unsupported target: ${target}. Supported: ${SUPPORTED_TARGETS.join(', ')}`);
  }
  
  const distAgentsDir = getDistAgentsDir();
  const distSkillsDir = getDistSkillsDir();
  
  if (!existsSync(distAgentsDir) || !existsSync(distSkillsDir)) {
    throw new Error('Distribution files not found. Package may be corrupted.');
  }
  
  const existingManifest = readManifest(target);
  const { agentsDir, skillsDir } = getTargetDirs(target);
  
  // Check for existing installation
  const hasExistingFiles = existingManifest || 
    existsSync(agentsDir) && readdirSync(agentsDir).some(f => f.includes('PAW'));
  
  if (hasExistingFiles && !flags.force) {
    const proceed = await confirm('PAW files already exist. Overwrite?');
    if (!proceed) {
      console.log('Installation cancelled.');
      return;
    }
  }
  
  console.log(`Installing PAW to ${target}...`);
  
  const installedFiles = {
    agents: [],
    skills: [],
  };
  
  // Copy agents
  console.log('  Copying agents...');
  copyDirectory(distAgentsDir, agentsDir, installedFiles.agents);
  
  // Copy skills
  console.log('  Copying skills...');
  copyDirectory(distSkillsDir, skillsDir, installedFiles.skills);
  
  // Write manifest
  const manifest = createManifest(VERSION, target, installedFiles);
  writeManifest(manifest);
  
  const agentCount = readdirSync(distAgentsDir).filter(f => f.endsWith('.md')).length;
  const skillCount = readdirSync(distSkillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory()).length;
  
  const targetLabel = target === 'claude' ? '~/.claude/' : '~/.copilot/';
  console.log(`\n✓ Installed ${agentCount} agents and ${skillCount} skills to ${targetLabel}`);

  if (!hasExistingFiles) {
    if (target === 'claude') {
      console.log(`
🚀 Quick Start
  Start a workflow:    claude /agents then select PAW
  Review a PR:         claude /agents then select PAW-Review

💡 Try saying:
  "I want to add a feature for..."
  "Help me refactor the auth module"
  "Review PR #100" (with PAW-Review agent)

📦 Manage your installation:
  npx @paw-workflow/cli list       Show installed version
  npx @paw-workflow/cli upgrade    Check for updates
  npx @paw-workflow/cli uninstall  Cleanly remove PAW`);
    } else {
      console.log(`
🚀 Quick Start
  Start a workflow:    copilot --agent PAW
  Review a PR:         copilot --agent PAW-Review
  Or use /agent inside any copilot session to switch agents.

💡 Try saying:
  "I want to add a feature for..."
  "Help me refactor the auth module"
  "Review PR #100" (with PAW-Review agent)

📦 Manage your installation:
  npx @paw-workflow/cli list       Show installed version
  npx @paw-workflow/cli upgrade    Check for updates
  npx @paw-workflow/cli uninstall  Cleanly remove PAW`);
    }
  }
}
