import {
  dbDeleteScreenshotAssets,
  dbGetScreenshotAssets,
  dbPruneScreenshotAssets,
  dbSaveScreenshotAssets
} from './indexeddb.js';

const resourceFileName = key => `asset-${encodeURIComponent(String(key))}.bin`;

export function supportsOpfs(storageTarget = globalThis.navigator) {
  return typeof storageTarget?.storage?.getDirectory === 'function';
}

export async function estimateStorage(storageTarget = globalThis.navigator) {
  if (typeof storageTarget?.storage?.estimate !== 'function') return { usage: 0, quota: 0, available: Infinity };
  const result = await storageTarget.storage.estimate();
  const usage = Number(result.usage) || 0;
  const quota = Number(result.quota) || 0;
  return { usage, quota, available: quota > 0 ? Math.max(0, quota - usage) : Infinity };
}

export function createScreenshotResourceStore({
  navigatorTarget = globalThis.navigator,
  saveMetadata = dbSaveScreenshotAssets,
  loadMetadata = dbGetScreenshotAssets,
  deleteMetadata = dbDeleteScreenshotAssets,
  pruneMetadata = dbPruneScreenshotAssets
} = {}) {
  let rootPromise = null;
  const getRoot = async () => {
    if (!supportsOpfs(navigatorTarget)) return null;
    if (!rootPromise) rootPromise = navigatorTarget.storage.getDirectory();
    return rootPromise;
  };
  const getProjectDirectory = async (projectId, create = true) => {
    const root = await getRoot();
    if (!root || !projectId) return null;
    return root.getDirectoryHandle(`project-${Number(projectId)}`, { create });
  };
  const writeOpfs = async (projectId, asset) => {
    const directory = await getProjectDirectory(projectId);
    if (!directory) return null;
    const handle = await directory.getFileHandle(resourceFileName(asset.key), { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(asset.blob);
    } finally {
      await writable.close();
    }
    return { ...asset, blob: null, storage: 'opfs', resourceName: resourceFileName(asset.key), size: Number(asset.blob?.size) || 0 };
  };
  const readOpfs = async (projectId, asset) => {
    if (asset.storage !== 'opfs') return asset;
    try {
      const directory = await getProjectDirectory(projectId, false);
      const handle = await directory?.getFileHandle(asset.resourceName || resourceFileName(asset.key));
      return { ...asset, blob: await handle.getFile() };
    } catch (_) {
      return null;
    }
  };
  const deleteOpfs = async (projectId, assets) => {
    let directory = null;
    try { directory = await getProjectDirectory(projectId, false); } catch (_) { return; }
    for (const asset of assets) {
      try { await directory?.removeEntry(asset.resourceName || resourceFileName(asset.key)); } catch (_) {}
    }
  };
  const deleteOpfsProject = async projectId => {
    let root = null;
    try { root = await getRoot(); } catch (_) { return; }
    if (!root || !projectId) return;
    try { await root.removeEntry(`project-${Number(projectId)}`, { recursive: true }); } catch (_) {}
  };

  const save = async (projectId, assets = []) => {
    if (!supportsOpfs(navigatorTarget)) return saveMetadata(projectId, assets);
    const prepared = [];
    for (const asset of assets) {
      try { prepared.push(await writeOpfs(projectId, asset)); } catch (_) {
        await deleteOpfs(projectId, prepared);
        return saveMetadata(projectId, assets);
      }
    }
    try {
      return await saveMetadata(projectId, prepared);
    } catch (error) {
      await deleteOpfs(projectId, prepared);
      throw error;
    }
  };
  const load = async projectId => {
    const assets = await loadMetadata(projectId);
    if (!supportsOpfs(navigatorTarget)) return assets;
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
    const root = await getRoot();
    if (!root?.entries) return 0;
    let removed = 0;
    for await (const [name, handle] of root.entries()) {
      if (!name.startsWith('project-') || handle.kind !== 'directory') continue;
      try {
        await root.removeEntry(name, { recursive: true });
        removed += 1;
      } catch (_) {}
    }
    return removed;
  };

  return { save, load, remove, prune, removeProject, clearAll, getRoot, estimate: () => estimateStorage(navigatorTarget) };
}

export const screenshotResourceStore = createScreenshotResourceStore();
