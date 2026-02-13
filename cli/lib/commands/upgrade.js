import { spawn, execSync } from 'child_process';
import { readManifest } from '../manifest.js';
import { getLatestVersion } from '../registry.js';
import { installCommand } from './install.js';

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
  // Check both targets for installations
  const copilotManifest = readManifest('copilot');
  const claudeManifest = readManifest('claude');
  
  if (!copilotManifest && !claudeManifest) {
    console.log('PAW is not installed. Run "paw install copilot" or "paw install claude" first.');
    return;
  }
  
  // Use the first found manifest for version info
  const primaryManifest = copilotManifest || claudeManifest;
  const currentVersion = primaryManifest.version;
  
  const targets = [];
  if (copilotManifest) targets.push('copilot');
  if (claudeManifest) targets.push('claude');
  
  console.log(`Installed version: ${currentVersion}`);
  console.log(`Targets: ${targets.join(', ')}`);
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
    // Global: update the package, then shell out to the NEW paw binary
    // (the running process still has old code/version in memory)
    console.log('Updating @paw-workflow/cli globally...\n');
    await runCommand('npm', ['install', '-g', `@paw-workflow/cli@${latestVersion}`]);
    console.log('');
    for (const target of targets) {
      await runCommand('paw', ['install', target, '--force']);
    }
  } else {
    // npx: the running process IS the latest version already
    for (const target of targets) {
      await installCommand(target, { force: true });
    }
  }
  
  console.log('\n' + '─'.repeat(50));
  console.log('✓ Upgrade complete!');
  console.log(`  CLI version: ${latestVersion}`);
  console.log(`  Agents and skills installed to: ${targets.join(', ')}`);
}
