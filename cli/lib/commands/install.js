import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import {
  getCopilotAgentsDir,
  getCopilotSkillsDir,
  getDistAgentsDir,
  getDistSkillsDir,
} from '../paths.js';
import { readManifest, writeManifest, createManifest } from '../manifest.js';

const VERSION = '0.0.1';

const SUPPORTED_TARGETS = ['copilot'];

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
  
  const existingManifest = readManifest();
  const copilotAgentsDir = getCopilotAgentsDir();
  const copilotSkillsDir = getCopilotSkillsDir();
  
  // Check for existing installation
  const hasExistingFiles = existingManifest || 
    existsSync(copilotAgentsDir) && readdirSync(copilotAgentsDir).some(f => f.includes('PAW'));
  
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
  copyDirectory(distAgentsDir, copilotAgentsDir, installedFiles.agents);
  
  // Copy skills
  console.log('  Copying skills...');
  copyDirectory(distSkillsDir, copilotSkillsDir, installedFiles.skills);
  
  // Write manifest
  const manifest = createManifest(VERSION, target, installedFiles);
  writeManifest(manifest);
  
  const agentCount = readdirSync(distAgentsDir).filter(f => f.endsWith('.md')).length;
  const skillCount = readdirSync(distSkillsDir, { withFileTypes: true })
    .filter(e => e.isDirectory()).length;
  
  console.log(`\nInstalled ${agentCount} agents and ${skillCount} skills to ~/.copilot/`);
  console.log('Manifest written to ~/.paw/copilot-cli/manifest.json');
}
