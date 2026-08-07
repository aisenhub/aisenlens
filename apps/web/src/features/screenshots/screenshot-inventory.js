import { getScreenshotAssetKey, isPersistentScreenshot, isScreenshotSource } from '../../utils/screenshot.js';

const RESOURCE_FIELDS = [
  { field: 'imageThumbnail', type: 'thumbnail-first' },
  { field: 'lastFrameThumbnail', type: 'thumbnail-last' },
  { field: 'image', type: 'full-first' },
  { field: 'lastFrameImage', type: 'full-last' }
];

export function getScreenshotResourceInventory({ projectId, entries = [], assets = [], folderFiles = [] } = {}) {
  const files = new Set((Array.isArray(folderFiles) ? folderFiles : []).map(String));
  const paths = { memory: 0, indexeddb: 0, opfs: 0, projectJson: 0, projectFolder: 0 };
  const variants = { thumbnail: 0, first: 0, last: 0 };
  const resources = [];
  const assetMap = new Map((Array.isArray(assets) ? assets : []).map(asset => [String(asset.key), asset]));

  (Array.isArray(entries) ? entries : []).forEach(entry => {
    RESOURCE_FIELDS.forEach(({ field, type }) => {
      if (!isScreenshotSource(entry?.[field])) return;
      if (isPersistentScreenshot(entry[field])) paths.projectJson += 1;
      else paths.memory += 1;
      variants[type.startsWith('thumbnail') ? 'thumbnail' : type === 'full-last' ? 'last' : 'first'] += 1;
      resources.push({ key: getScreenshotAssetKey(projectId, entry.shotId, type.replace('thumbnail-', '').replace('full-', '')), shotId: String(entry.shotId || ''), type, paths: [isPersistentScreenshot(entry[field]) ? 'projectJson' : 'memory'] });
    });
  });
  (Array.isArray(assets) ? assets : []).forEach(asset => {
    const key = String(asset?.key || '');
    if (!key) return;
    const storage = asset.storage === 'opfs' ? 'opfs' : 'indexeddb';
    paths[storage] += 1;
    const fileName = `screenshots/asset-${encodeURIComponent(key)}.bin`;
    if (files.has(fileName)) paths.projectFolder += 1;
    resources.push({ key, shotId: String(asset.shotId || ''), type: String(asset.type || ''), paths: [storage, ...(files.has(fileName) ? ['projectFolder'] : [])], size: Number(asset.size) || Number(asset.blob?.size) || 0 });
  });
  return {
    projectId: Number(projectId) || 0,
    paths,
    variants,
    resources,
    duplicateResourceCount: resources.filter(resource => resource.paths.length > 1).length,
    assetKeys: [...assetMap.keys()]
  };
}
