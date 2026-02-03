import { readManifest } from '../manifest.js';

export async function listCommand() {
  const manifest = readManifest();
  
  if (!manifest) {
    console.log('PAW is not installed.');
    console.log('Run "paw install copilot" to install.');
    return;
  }
  
  console.log(`PAW v${manifest.version}`);
  console.log(`Target: ${manifest.target}`);
  console.log(`Installed: ${new Date(manifest.installedAt).toLocaleString()}`);
  console.log('');
  console.log(`Agents: ${manifest.files.agents.length}`);
  console.log(`Skills: ${manifest.files.skills.length}`);
}
