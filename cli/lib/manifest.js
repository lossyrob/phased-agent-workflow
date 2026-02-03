import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { getManifestPath, getManifestDir } from './paths.js';

export function readManifest() {
  const manifestPath = getManifestPath();
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
  const manifestDir = getManifestDir();
  const manifestPath = getManifestPath();
  
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

export function deleteManifest() {
  const manifestPath = getManifestPath();
  if (existsSync(manifestPath)) {
    unlinkSync(manifestPath);
  }
}
