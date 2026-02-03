import { spawn, execSync } from 'child_process';
import { readManifest } from '../manifest.js';
import { getLatestVersion } from '../registry.js';

function isGlobalInstall() {
  try {
    // Check if this script is running from global node_modules
    const globalRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
    return process.argv[1].startsWith(globalRoot);
  } catch {
    return false;
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      reject(new Error(`Failed to run command: ${err.message}`));
    });
  });
}

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
  
  const isGlobal = isGlobalInstall();
  
  if (isGlobal) {
    // Upgrade global CLI installation first
    console.log('Upgrading global CLI installation...\n');
    await runCommand('npm', ['install', '-g', '@paw-workflow/cli@latest']);
    
    // Then reinstall agents/skills using the new CLI
    console.log('\nReinstalling agents and skills...\n');
    await runCommand('paw', ['install', manifest.target, '--force']);
  } else {
    // Running via npx or local - just use npx to get latest
    console.log('Downloading latest CLI and reinstalling...\n');
    await runCommand('npx', [
      '@paw-workflow/cli@latest',
      'install',
      manifest.target,
      '--force',
    ]);
  }
  
  console.log('\nUpgrade complete!');
}
