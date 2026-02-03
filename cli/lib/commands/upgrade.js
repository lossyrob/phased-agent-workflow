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
  
  const currentVersion = manifest.version;
  const target = manifest.target;
  
  console.log(`Installed version: ${currentVersion}`);
  console.log(`Target: ${target}`);
  console.log('Checking npm registry for updates...\n');
  
  let latestVersion;
  try {
    latestVersion = await getLatestVersion();
  } catch (error) {
    console.error(`Failed to check for updates: ${error.message}`);
    console.log('Please check your network connection and try again.');
    return;
  }
  
  if (!latestVersion) {
    console.log('Could not determine latest version from npm registry.');
    return;
  }
  
  console.log(`Latest version: ${latestVersion}`);
  
  if (latestVersion === currentVersion) {
    console.log('\n✓ You are already on the latest version.');
    return;
  }
  
  // Compare versions (simple comparison, assumes semver-like format)
  const current = currentVersion.split('.').map(Number);
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
    console.log('\n✓ You are already on the latest version.');
    return;
  }
  
  console.log(`\n→ Upgrading: ${currentVersion} → ${latestVersion}\n`);
  
  const isGlobal = isGlobalInstall();
  
  if (isGlobal) {
    // Upgrade global CLI installation first
    console.log('Step 1/2: Upgrading @paw-workflow/cli globally...\n');
    await runCommand('npm', ['install', '-g', `@paw-workflow/cli@${latestVersion}`]);
    
    // Then reinstall agents/skills using the new CLI
    console.log('\nStep 2/2: Installing PAW agents and skills to', target, '...\n');
    await runCommand('paw', ['install', target, '--force']);
  } else {
    // Running via npx or local - just use npx to get latest
    console.log('Downloading @paw-workflow/cli@' + latestVersion + ' and installing to', target, '...\n');
    await runCommand('npx', [
      `@paw-workflow/cli@${latestVersion}`,
      'install',
      target,
      '--force',
    ]);
  }
  
  console.log('\n' + '─'.repeat(50));
  console.log('✓ Upgrade complete!');
  console.log(`  CLI version: ${latestVersion}`);
  console.log(`  Agents and skills installed to: ${target}`);
}
