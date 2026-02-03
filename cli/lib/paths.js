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

export function getPawDir() {
  return join(getHomeDir(), '.paw');
}

export function getManifestDir() {
  return join(getPawDir(), 'copilot-cli');
}

export function getManifestPath() {
  return join(getManifestDir(), 'manifest.json');
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
