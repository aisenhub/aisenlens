import {
  dbDeleteMediaAssets,
  dbGetMediaAsset,
  dbSaveMediaAsset
} from './indexeddb.js';
import { createEntityId } from '../utils/ids.js';
import { createOpfsStorage, estimateStorage } from './opfs-storage.js';
import { RESOURCE_STATUS, createResourceFailure, withResourceStatus } from './resource-state.js';

const STORAGE_RESERVE_BYTES = 32 * 1024 * 1024;

function createStorageQuotaError() {
  const error = new Error('Not enough browser storage is available for this video');
  error.name = 'QuotaExceededError';
  error.code = 'STORAGE_QUOTA_LOW';
  return error;
}

const getProjectPath = projectId => ['projects', String(Number(projectId)), 'media'];
const getResourceName = assetId => `asset-${encodeURIComponent(String(assetId))}.bin`;

function createStoredFile(blob, asset) {
  return new File([blob], asset.originalName, {
    type: asset.mimeType || blob.type,
    lastModified: Number(asset.lastModified) || Date.now()
  });
}

export function createMediaResourceStore({
  navigatorTarget = globalThis.navigator,
  getMetadata = dbGetMediaAsset,
  saveMetadata = dbSaveMediaAsset,
  deleteMetadata = dbDeleteMediaAssets,
  createId = createEntityId,
  getStorageEstimate = () => estimateStorage(navigatorTarget),
  storageReserveBytes = STORAGE_RESERVE_BYTES
} = {}) {
  const opfs = createOpfsStorage({ navigatorTarget });

  const saveVideo = async (projectId, file) => {
    if (!projectId || !file || typeof file.name !== 'string') throw new Error('Video file is required');
    const storage = await getStorageEstimate();
    const requiredBytes = (Number(file.size) || 0) + Math.max(0, Number(storageReserveBytes) || 0);
    if (Number.isFinite(storage?.available) && storage.available < requiredBytes) throw createStorageQuotaError();
    const previous = await getMetadata(projectId, 'video');
    const id = createId('media');
    const resourceName = getResourceName(createId('media-file'));
    const pending = {
      id,
      projectId: Number(projectId),
      kind: 'video',
      storage: 'opfs',
      status: RESOURCE_STATUS.PENDING,
      resourceName,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: Number(file.size) || 0,
      lastModified: Number(file.lastModified) || Date.now()
    };
    await saveMetadata(pending);
    try {
      await opfs.writeFile({ path: getProjectPath(projectId), fileName: resourceName, data: file });
      const asset = withResourceStatus(pending, RESOURCE_STATUS.READY);
      await saveMetadata(asset);
      if (previous?.resourceName && previous.resourceName !== resourceName) {
        await saveMetadata(withResourceStatus(previous, RESOURCE_STATUS.DELETED)).catch(error => {
          console.warn('Unable to mark replaced video resource as deleted:', error);
        });
        try { await opfs.removeFile({ path: getProjectPath(projectId), fileName: previous.resourceName }); }
        catch (error) { console.warn('Unable to remove replaced video resource:', error); }
      }
      return asset;
    } catch (error) {
      await saveMetadata(withResourceStatus(pending, RESOURCE_STATUS.FAILED, {
        failure: createResourceFailure(error, 'save-video')
      })).catch(() => {});
      await opfs.removeFile({ path: getProjectPath(projectId), fileName: resourceName }).catch(() => {});
      throw error;
    }
  };

  const loadVideo = async projectId => {
    const asset = await getMetadata(projectId, 'video');
    if (!asset || asset.status !== 'ready' || asset.storage !== 'opfs') return null;
    const blob = await opfs.readFile({ path: getProjectPath(projectId), fileName: asset.resourceName });
    return blob ? { asset, file: createStoredFile(blob, asset) } : null;
  };

  const removeProject = async projectId => {
    await deleteMetadata(projectId);
    return opfs.removeDirectory({ path: getProjectPath(projectId) });
  };

  return { saveVideo, loadVideo, removeProject };
}

export const mediaResourceStore = createMediaResourceStore();
