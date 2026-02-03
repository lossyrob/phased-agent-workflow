import { readManifest } from '../manifest.js';
import { getLatestVersion } from '../registry.js';
import { installCommand } from './install.js';

export async function upgradeCommand(flags = {}) {
  const manifest = readManifest();
  
  if (!manifest) {
    console.log('PAW is not installed. Run "paw install copilot" first.');
    return;
  }
  
  console.log(`Current version: ${manifest.version}`);
  console.log('Checking for updates...');
  
  let latestVersion;
  try {
    latestVersion = await getLatestVersion();
  } catch (error) {
    console.error(`Failed to check for updates: ${error.message}`);
    console.log('Please check your network connection and try again.');
    return;
  }
  
  if (!latestVersion) {
    console.log('Could not determine latest version.');
    return;
  }
  
  console.log(`Latest version: ${latestVersion}`);
  
  if (latestVersion === manifest.version) {
    console.log('You are already on the latest version.');
    return;
  }
  
  // Compare versions (simple comparison, assumes semver-like format)
  const current = manifest.version.split('.').map(Number);
  const latest = latestVersion.split('.').map(Number);
  
  let isNewer = false;
  for (let i = 0; i < 3; i++) {
    if (latest[i] > current[i]) {
      isNewer = true;
      break;
    }
    if (latest[i] < current[i]) {
      break;
    }
  }
  
  if (!isNewer) {
    console.log('You are already on the latest version.');
    return;
  }
  
  console.log(`\nUpgrading from ${manifest.version} to ${latestVersion}...`);
  
  // Re-run install with force flag
  await installCommand(manifest.target, { ...flags, force: true });
  
  console.log('\nUpgrade complete!');
}
