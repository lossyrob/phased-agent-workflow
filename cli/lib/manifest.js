import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { getManifestPath, getManifestDir } from './paths.js';

export function readManifest(target = 'copilot') {
  const manifestPath = getManifestPath(target);
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function writeManifest(manifest) {
  const target = manifest.target || 'copilot';
  const manifestDir = getManifestDir(target);
  const manifestPath = getManifestPath(target);
  
  if (!existsSync(manifestDir)) {
    mkdirSync(manifestDir, { recursive: true });
  }
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

export function createManifest(version, target, files) {
  return {
    version,
    installedAt: new Date().toISOString(),
    target,
    files,
  };
}

export function deleteManifest(target = 'copilot') {
  const manifestPath = getManifestPath(target);
  if (existsSync(manifestPath)) {
    unlinkSync(manifestPath);
  }
}
