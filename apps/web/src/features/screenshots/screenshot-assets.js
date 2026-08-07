import { screenshotResourceStore } from '../../platform/screenshot-resource-store.js';
import { screenshotObjectUrls } from '../../platform/object-url-registry.js';

export const estimateScreenshotStorage = () => screenshotResourceStore.estimate();

export function loadProjectScreenshotAssets(projectId) {
  return screenshotResourceStore.load(projectId);
}

export function saveProjectScreenshotAssets(projectId, assets) {
  return screenshotResourceStore.save(projectId, assets);
}

export function deleteProjectScreenshotAssets(projectId, shotIds) {
  releaseProjectScreenshotUrls(projectId, shotIds);
  return screenshotResourceStore.remove(projectId, shotIds);
}

export function pruneProjectScreenshotAssets(projectId, validShotIds) {
  const valid = new Set((validShotIds || []).map(String));
  screenshotObjectUrls.keys()
    .filter(key => key.startsWith(`${Number(projectId)}:`))
    .filter(key => !valid.has(key.split(':')[1]))
    .forEach(key => screenshotObjectUrls.revoke(key));
  return screenshotResourceStore.prune(projectId, validShotIds);
}

export function removeProjectScreenshotAssets(projectId) {
  releaseProjectScreenshotUrls(projectId);
  return screenshotResourceStore.removeProject(projectId);
}

export function clearAllScreenshotAssets() {
  screenshotObjectUrls.clear();
  return screenshotResourceStore.clearAll();
}

export function releaseProjectScreenshotUrls(projectId, shotIds = null) {
  if (!projectId) return 0;
  if (!Array.isArray(shotIds) || !shotIds.length) return screenshotObjectUrls.revokePrefix(`${Number(projectId)}:`);
  return shotIds.reduce((count, shotId) => count + screenshotObjectUrls.revokePrefix(`${Number(projectId)}:${String(shotId)}:`), 0);
}
