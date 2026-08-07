import { writeBinaryFile, writeTextFile } from '../../platform/filesystem.js';

export const PROJECT_MANIFEST_VERSION = 1;
export const PROJECT_RESOURCE_STORAGE_VERSION = 1;

export function createProjectManifest({
  status = 'saving',
  projectUuid = '',
  projectFormatVersion = 2,
  resourceStorageVersion = PROJECT_RESOURCE_STORAGE_VERSION,
  files = []
} = {}) {
  return {
    version: PROJECT_MANIFEST_VERSION,
    projectFormatVersion,
    resourceStorageVersion,
    status,
    projectUuid: String(projectUuid || ''),
    files: Array.isArray(files) ? files.map(String) : [],
    updatedAt: new Date().toISOString()
  };
}

export function writeProjectManifest(dirHandle, manifest) {
  return writeTextFile(dirHandle, 'manifest.json', JSON.stringify(manifest, null, 2));
}

export async function writeProjectDataFiles(dirHandle, { project, shots, groups } = {}) {
  await writeTextFile(dirHandle, 'project.json', JSON.stringify(project || {}, null, 2));
  await writeTextFile(dirHandle, 'shots.json', JSON.stringify(Array.isArray(shots) ? shots : [], null, 2));
  await writeTextFile(dirHandle, 'groups.json', JSON.stringify(Array.isArray(groups) ? groups : [], null, 2));
}

export function writeProjectBinaryFile(dirHandle, fileName, data) {
  return writeBinaryFile(dirHandle, fileName, data);
}

export const getProjectAssetFileName = key => `asset-${encodeURIComponent(String(key || ''))}.bin`;

export async function writeProjectScreenshotAsset(dirHandle, asset) {
  if (!dirHandle || !asset?.key || !asset.blob) return false;
  const directory = await dirHandle.getDirectoryHandle('screenshots', { create: true });
  await writeBinaryFile(directory, getProjectAssetFileName(asset.key), asset.blob);
  return true;
}
