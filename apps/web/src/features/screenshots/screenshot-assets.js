import { mediaStorageService } from '../../platform/media-storage-service.js';
import { screenshotObjectUrls } from '../../platform/object-url-registry.js';

export const estimateScreenshotStorage = () => mediaStorageService.estimate();

export function loadProjectScreenshotAssets(projectId) {
  return mediaStorageService.loadScreenshots(projectId);
}

export function saveProjectScreenshotAssets(projectId, assets) {
  return mediaStorageService.saveScreenshots(projectId, assets);
}

export function deleteProjectScreenshotAssets(projectId, shotIds) {
  releaseProjectScreenshotUrls(projectId, shotIds);
  return mediaStorageService.removeScreenshots(projectId, shotIds);
}

export function pruneProjectScreenshotAssets(projectId, validShotIds) {
  const valid = new Set((validShotIds || []).map(String));
  screenshotObjectUrls.keys()
    .filter(key => key.startsWith(`${Number(projectId)}:`))
    .filter(key => !valid.has(key.split(':')[1]))
    .forEach(key => screenshotObjectUrls.revoke(key));
  return mediaStorageService.pruneScreenshots(projectId, validShotIds);
}

export function removeProjectScreenshotAssets(projectId) {
  releaseProjectScreenshotUrls(projectId);
  return mediaStorageService.removeProjectScreenshots(projectId);
}

export function clearAllScreenshotAssets() {
  screenshotObjectUrls.clear();
  return mediaStorageService.clearScreenshots();
}

export function releaseProjectScreenshotUrls(projectId, shotIds = null) {
  if (!projectId) return 0;
  if (!Array.isArray(shotIds) || !shotIds.length) return screenshotObjectUrls.revokePrefix(`${Number(projectId)}:`);
  return shotIds.reduce((count, shotId) => count + screenshotObjectUrls.revokePrefix(`${Number(projectId)}:${String(shotId)}:`), 0);
}
