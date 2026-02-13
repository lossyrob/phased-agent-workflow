import { existsSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { dirname } from 'path';
import { createInterface } from 'readline';
import { readManifest } from '../manifest.js';
import { getTargetDirs, getManifestPath } from '../paths.js';

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

function uninstallTarget(manifest, target) {
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
  const manifestPath = getManifestPath(target);
  if (existsSync(manifestPath)) {
    unlinkSync(manifestPath);
  }
  
  return { removedAgents, removedSkills };
}

export async function uninstallCommand(flags = {}) {
  // Check both targets
  const copilotManifest = readManifest('copilot');
  const claudeManifest = readManifest('claude');
  
  if (!copilotManifest && !claudeManifest) {
    // Check for orphaned files in both locations
    const targets = ['copilot', 'claude'];
    let foundOrphans = false;
    
    for (const target of targets) {
      const { agentsDir, skillsDir } = getTargetDirs(target);
      const hasPawAgents = existsSync(agentsDir) && 
        readdirSync(agentsDir).some(f => f.includes('PAW'));
      const hasPawSkills = existsSync(skillsDir) &&
        readdirSync(skillsDir).some(f => f.startsWith('paw-'));
      
      if (hasPawAgents || hasPawSkills) {
        const dirLabel = target === 'claude' ? '~/.claude/' : '~/.copilot/';
        console.log(`Warning: PAW files found in ${dirLabel} but no manifest. Cannot determine exact files to remove.`);
        console.log(`Please manually remove PAW files from ${dirLabel}agents/ and ${dirLabel}skills/`);
        foundOrphans = true;
      }
    }
    
    if (!foundOrphans) {
      console.log('PAW is not installed.');
    }
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
  
  let totalAgents = 0;
  let totalSkills = 0;
  
  if (copilotManifest) {
    const { removedAgents, removedSkills } = uninstallTarget(copilotManifest, 'copilot');
    totalAgents += removedAgents;
    totalSkills += removedSkills;
  }
  
  if (claudeManifest) {
    const { removedAgents, removedSkills } = uninstallTarget(claudeManifest, 'claude');
    totalAgents += removedAgents;
    totalSkills += removedSkills;
  }
  
  console.log(`Removed ${totalAgents} agent files and ${totalSkills} skill files.`);
  console.log('PAW has been uninstalled.');
}
