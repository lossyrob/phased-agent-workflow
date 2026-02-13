import { readManifest } from '../manifest.js';

export async function listCommand() {
  // Check both targets
  const copilotManifest = readManifest('copilot');
  const claudeManifest = readManifest('claude');
  
  if (!copilotManifest && !claudeManifest) {
    console.log('PAW is not installed.');
    console.log('Run "paw install copilot" or "paw install claude" to install.');
    return;
  }
  
  const manifests = [];
  if (copilotManifest) manifests.push(copilotManifest);
  if (claudeManifest) manifests.push(claudeManifest);
  
  for (const manifest of manifests) {
    console.log(`PAW v${manifest.version}`);
    console.log(`Target: ${manifest.target}`);
    console.log(`Installed: ${new Date(manifest.installedAt).toLocaleString()}`);
    console.log(`Agents: ${manifest.files.agents.length}`);
    console.log(`Skills: ${manifest.files.skills.length}`);
    if (manifests.length > 1) console.log('');
  }
}
