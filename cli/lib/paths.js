import { homedir } from 'os';
import { join } from 'path';

export function getHomeDir() {
  return homedir();
}

export function getCopilotDir() {
  return join(getHomeDir(), '.copilot');
}

export function getCopilotAgentsDir() {
  return join(getCopilotDir(), 'agents');
}

export function getCopilotSkillsDir() {
  return join(getCopilotDir(), 'skills');
}

export function getClaudeDir() {
  return join(getHomeDir(), '.claude');
}

export function getClaudeAgentsDir() {
  return join(getClaudeDir(), 'agents');
}

export function getClaudeSkillsDir() {
  return join(getClaudeDir(), 'skills');
}

/**
 * Returns agents and skills directories for the given target.
 */
export function getTargetDirs(target) {
  if (target === 'claude') {
    return {
      agentsDir: getClaudeAgentsDir(),
      skillsDir: getClaudeSkillsDir(),
    };
  }
  return {
    agentsDir: getCopilotAgentsDir(),
    skillsDir: getCopilotSkillsDir(),
  };
}

export function getPawDir() {
  return join(getHomeDir(), '.paw');
}

export function getManifestDir(target = 'copilot') {
  return join(getPawDir(), `${target}-cli`);
}

export function getManifestPath(target = 'copilot') {
  return join(getManifestDir(target), 'manifest.json');
}

export function getDistDir() {
  return join(import.meta.dirname, '..', 'dist');
}

export function getDistAgentsDir() {
  return join(getDistDir(), 'agents');
}

export function getDistSkillsDir() {
  return join(getDistDir(), 'skills');
}
