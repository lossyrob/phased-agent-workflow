const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const skillsRoot = path.join(repoRoot, 'skills');
const renderScriptPath = path.join(repoRoot, 'scripts', 'render-vscode-skills.js');
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tscEntrypoint = require.resolve('typescript/bin/tsc');

let renderTimeout = null;
let watchers = [];

function runInitialCompile() {
  const result = spawnSync(npmExecutable, ['run', 'compile'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function renderSkills() {
  const result = spawnSync(process.execPath, [renderScriptPath], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('[watch] Failed to render VS Code skill assets.');
  }
}

function collectDirectories(rootDir) {
  const directories = [rootDir];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    directories.push(...collectDirectories(path.join(rootDir, entry.name)));
  }

  return directories;
}

function refreshWatchers() {
  for (const watcher of watchers) {
    watcher.close();
  }

  watchers = collectDirectories(skillsRoot).map(directory =>
    fs.watch(directory, (_eventType, filename) => {
      if (!filename) {
        return;
      }

      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }

      renderTimeout = setTimeout(() => {
        refreshWatchers();
        renderSkills();
      }, 100);
    })
  );
}

function shutdown(exitCode, tscWatchProcess) {
  if (renderTimeout) {
    clearTimeout(renderTimeout);
  }

  for (const watcher of watchers) {
    watcher.close();
  }

  if (!tscWatchProcess.killed) {
    tscWatchProcess.kill('SIGTERM');
  }

  process.exit(exitCode);
}

runInitialCompile();
refreshWatchers();

const tscWatchProcess = spawn(process.execPath, [tscEntrypoint, '-watch', '-p', './'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.on('SIGINT', () => shutdown(130, tscWatchProcess));
process.on('SIGTERM', () => shutdown(143, tscWatchProcess));

tscWatchProcess.on('exit', code => {
  for (const watcher of watchers) {
    watcher.close();
  }

  process.exit(code ?? 0);
});
