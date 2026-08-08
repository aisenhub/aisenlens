import {
  dbDeleteScreenshotAssets,
  dbGetScreenshotAssets,
  dbPruneScreenshotAssets,
  dbSaveScreenshotAssets
} from './indexeddb.js';
import { createOpfsStorage, estimateStorage } from './opfs-storage.js';
import { RESOURCE_STATUS, createResourceFailure, withResourceStatus } from './resource-state.js';

const resourceFileName = key => `asset-${encodeURIComponent(String(key))}.bin`;

export { estimateStorage, supportsOpfs } from './opfs-storage.js';

export function createScreenshotResourceStore({
  navigatorTarget = globalThis.navigator,
  saveMetadata = dbSaveScreenshotAssets,
  loadMetadata = dbGetScreenshotAssets,
  deleteMetadata = dbDeleteScreenshotAssets,
  pruneMetadata = dbPruneScreenshotAssets
} = {}) {
  const opfs = createOpfsStorage({ navigatorTarget });
  const getProjectPath = projectId => ['projects', String(Number(projectId)), 'screenshots'];
  const preparePending = asset => ({
    ...asset,
    blob: null,
    storage: 'opfs',
    status: RESOURCE_STATUS.PENDING,
    resourceName: resourceFileName(asset.key),
    size: Number(asset.blob?.size) || 0
  });
  const writeOpfs = async (projectId, asset) => {
    if (!projectId || !asset?.key || !asset.blob) throw new Error('Screenshot asset data is required');
    const resourceName = resourceFileName(asset.key);
    await opfs.writeFile({ path: getProjectPath(projectId), fileName: resourceName, data: asset.blob });
    return {
      ...withResourceStatus(asset, RESOURCE_STATUS.READY),
      resourceName
    };
  };
  const readOpfs = async (projectId, asset) => {
    if (asset.storage !== 'opfs' || asset.status === 'deleted') return null;
    const blob = await opfs.readFile({
      path: getProjectPath(projectId),
      fileName: asset.resourceName || resourceFileName(asset.key)
    });
    return blob ? { ...asset, blob } : null;
  };
  const deleteOpfs = async (projectId, assets) => {
    for (const asset of assets) {
      await opfs.removeFile({
        path: getProjectPath(projectId),
        fileName: asset.resourceName || resourceFileName(asset.key)
      });
    }
  };
  const deleteOpfsProject = async projectId => {
    if (!projectId) return;
    await opfs.removeDirectory({ path: getProjectPath(projectId) });
  };

  const save = async (projectId, assets = []) => {
    const prepared = [];
    for (const asset of assets) {
      const pending = preparePending(asset);
      await saveMetadata(projectId, [pending]);
      try {
        const ready = await writeOpfs(projectId, { ...pending, blob: asset.blob });
        await saveMetadata(projectId, [ready]);
        prepared.push(ready);
      } catch (error) {
        await saveMetadata(projectId, [withResourceStatus(pending, RESOURCE_STATUS.FAILED, {
          failure: createResourceFailure(error, 'save-screenshot')
        })]).catch(() => {});
        await Promise.all(prepared.map(ready => saveMetadata(projectId, [withResourceStatus(ready, RESOURCE_STATUS.FAILED, {
          failure: createResourceFailure(error, 'save-screenshot-batch')
        })]).catch(() => {})));
        await deleteOpfs(projectId, [...prepared, pending]);
        throw error;
      }
    }
    return prepared.length;
  };
  const load = async projectId => {
    const assets = await loadMetadata(projectId);
    const loaded = [];
    for (const asset of assets || []) {
      const resolved = await readOpfs(projectId, asset);
      if (resolved) loaded.push(resolved);
    }
    return loaded;
  };
  const remove = async (projectId, shotIds = []) => {
    const ids = new Set(shotIds.map(String));
    const assets = (await loadMetadata(projectId) || []).filter(asset => ids.has(String(asset.shotId)));
    try {
      return await deleteMetadata(projectId, shotIds);
    } finally {
      await deleteOpfs(projectId, assets);
    }
  };
  const prune = async (projectId, validShotIds = []) => {
    const valid = new Set(validShotIds.map(String));
    const assets = (await loadMetadata(projectId) || []).filter(asset => !valid.has(String(asset.shotId)));
    try {
      return await pruneMetadata(projectId, validShotIds);
    } finally {
      await deleteOpfs(projectId, assets);
    }
  };

  const removeProject = async projectId => {
    const assets = await loadMetadata(projectId);
    try {
      return await deleteMetadata(projectId, (assets || []).map(asset => asset.shotId));
    } finally {
      await deleteOpfsProject(projectId);
    }
  };

  const clearAll = async () => {
    const projects = await opfs.listDirectories(['projects']);
    await opfs.removeDirectory({ path: ['projects'] });
    return projects.length;
  };

  return { save, load, remove, prune, removeProject, clearAll, getRoot: opfs.getRoot, estimate: () => estimateStorage(navigatorTarget) };
}

export const screenshotResourceStore = createScreenshotResourceStore();
