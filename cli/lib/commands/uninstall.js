import { existsSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { readManifest } from '../manifest.js';
import { getTargetDirs, getManifestPath, SUPPORTED_TARGETS } from '../paths.js';
import { confirm } from '../utils.js';

function removeEmptyDirs(dir, stopAt) {
  if (!existsSync(dir)) return;
  if (stopAt && resolve(dir) === resolve(stopAt)) return;
  
  try {
    const entries = readdirSync(dir);
    if (entries.length === 0) {
      rmdirSync(dir);
      removeEmptyDirs(dirname(dir), stopAt);
    }
  } catch {
    // Ignore errors when cleaning up
  }
}

function uninstallTarget(manifest, target) {
  const { skillsDir } = getTargetDirs(target);
  let removedAgents = 0;
  let removedSkills = 0;
  
  // Remove agents
  for (const filePath of manifest.files.agents) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      removedAgents++;
    }
  }
  
  // Remove skills (stop cleanup at the skills root to avoid deleting shared dirs)
  for (const filePath of manifest.files.skills) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      removedSkills++;
      removeEmptyDirs(dirname(filePath), skillsDir);
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
  // Check all targets
  const installed = [];
  for (const target of SUPPORTED_TARGETS) {
    const manifest = readManifest(target);
    if (manifest) installed.push({ target, manifest });
  }
  
  if (installed.length === 0) {
    // Check for orphaned files in all locations
    let foundOrphans = false;
    
    for (const target of SUPPORTED_TARGETS) {
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
  
  for (const { target, manifest } of installed) {
    const { removedAgents, removedSkills } = uninstallTarget(manifest, target);
    totalAgents += removedAgents;
    totalSkills += removedSkills;
  }
  
  console.log(`Removed ${totalAgents} agent files and ${totalSkills} skill files.`);
  console.log('PAW has been uninstalled.');
}
