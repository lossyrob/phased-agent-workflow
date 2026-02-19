import { readManifest } from '../manifest.js';
import { SUPPORTED_TARGETS } from '../paths.js';

export async function listCommand() {
  const manifests = [];
  for (const target of SUPPORTED_TARGETS) {
    const manifest = readManifest(target);
    if (manifest) manifests.push(manifest);
  }
  
  if (manifests.length === 0) {
    console.log('PAW is not installed.');
    console.log(`Run "paw install <target>" to install. Supported: ${SUPPORTED_TARGETS.join(', ')}`);
    return;
  }
  
  for (const manifest of manifests) {
    console.log(`PAW v${manifest.version}`);
    console.log(`Target: ${manifest.target}`);
    console.log(`Installed: ${new Date(manifest.installedAt).toLocaleString()}`);
    console.log(`Agents: ${manifest.files.agents.length}`);
    console.log(`Skills: ${manifest.files.skills.length}`);
    if (manifests.length > 1) console.log('');
  }
}
