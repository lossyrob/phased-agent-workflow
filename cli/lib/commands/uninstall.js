import { existsSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { dirname } from 'path';
import { createInterface } from 'readline';
import { readManifest } from '../manifest.js';
import { getCopilotAgentsDir, getCopilotSkillsDir, getManifestPath } from '../paths.js';

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

function removeEmptyDirs(dir) {
  if (!existsSync(dir)) return;
  
  try {
    const entries = readdirSync(dir);
    if (entries.length === 0) {
      rmdirSync(dir);
      removeEmptyDirs(dirname(dir));
    }
  } catch {
    // Ignore errors when cleaning up
  }
}

export async function uninstallCommand(flags = {}) {
  const manifest = readManifest();
  
  if (!manifest) {
    // Check for orphaned files
    const agentsDir = getCopilotAgentsDir();
    const skillsDir = getCopilotSkillsDir();
    const hasPawAgents = existsSync(agentsDir) && 
      readdirSync(agentsDir).some(f => f.includes('PAW'));
    const hasPawSkills = existsSync(skillsDir) &&
      readdirSync(skillsDir).some(f => f.startsWith('paw-'));
    
    if (!hasPawAgents && !hasPawSkills) {
      console.log('PAW is not installed.');
      return;
    }
    
    console.log('Warning: PAW files found but no manifest. Cannot determine exact files to remove.');
    console.log('Please manually remove PAW files from ~/.copilot/agents/ and ~/.copilot/skills/');
    return;
  }
  
  if (!flags.force) {
    const proceed = await confirm('Remove all PAW agents and skills?');
    if (!proceed) {
      console.log('Uninstall cancelled.');
      return;
    }
  }
  
  console.log('Uninstalling PAW...');
  
  let removedAgents = 0;
  let removedSkills = 0;
  
  // Remove agents
  for (const filePath of manifest.files.agents) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      removedAgents++;
    }
  }
  
  // Remove skills
  for (const filePath of manifest.files.skills) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      removedSkills++;
      removeEmptyDirs(dirname(filePath));
    }
  }
  
  // Remove manifest
  const manifestPath = getManifestPath();
  if (existsSync(manifestPath)) {
    unlinkSync(manifestPath);
  }
  
  console.log(`Removed ${removedAgents} agent files and ${removedSkills} skill files.`);
  console.log('PAW has been uninstalled.');
}
