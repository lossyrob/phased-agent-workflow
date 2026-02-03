import { spawn } from 'child_process';
import { readManifest } from '../manifest.js';
import { getLatestVersion } from '../registry.js';

export async function upgradeCommand(_flags = {}) {
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
  console.log('Downloading latest CLI and reinstalling...\n');
  
  // Run npx to get latest CLI and reinstall
  const args = [
    '@paw-workflow/cli@latest',
    'install',
    manifest.target,
    '--force',
  ];
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, {
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('\nUpgrade complete!');
        resolve();
      } else {
        reject(new Error(`Upgrade failed with exit code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      reject(new Error(`Failed to run npx: ${err.message}`));
    });
  });
}
