import {
  loadProjectScreenshotAssets
} from './screenshot-assets.js';
import {
  FULL_SCREENSHOT_MAX_DIMENSION,
  THUMBNAIL_MAX_DIMENSION,
  getScreenshotAssetKey,
  getScreenshotDimensions,
  isPersistentScreenshot
} from '../../utils/screenshot.js';

export async function createScreenshotVariants(sourceCanvas, options = {}) {
  if (!sourceCanvas || !sourceCanvas.width || !sourceCanvas.height) return null;
  const fullSize = getScreenshotDimensions(
    sourceCanvas.width,
    sourceCanvas.height,
    FULL_SCREENSHOT_MAX_DIMENSION
  );
  const fullCanvas = options.createCanvas?.();
  if (!fullCanvas) throw new Error('Screenshot variants require a canvas adapter');
  fullCanvas.width = fullSize.width;
  fullCanvas.height = fullSize.height;
  const fullContext = fullCanvas.getContext('2d');
  fullContext.drawImage(sourceCanvas, 0, 0, fullCanvas.width, fullCanvas.height);
  if (typeof options.drawOverlay === 'function') {
    options.drawOverlay(fullContext, fullCanvas.width, fullCanvas.height);
  }

  const thumbnailSize = getScreenshotDimensions(
    fullCanvas.width,
    fullCanvas.height,
    THUMBNAIL_MAX_DIMENSION
  );
  if (typeof createImageBitmap === 'function'
    && typeof OffscreenCanvas !== 'undefined'
    && typeof options.processImage === 'function') {
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(fullCanvas);
      return await options.processImage({
        bitmap,
        width: fullCanvas.width,
        height: fullCanvas.height,
        thumbnailWidth: thumbnailSize.width,
        thumbnailHeight: thumbnailSize.height
      }, [bitmap]);
    } catch (_) {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  const thumbnailCanvas = options.createCanvas?.();
  if (!thumbnailCanvas) throw new Error('Screenshot variants require a canvas adapter');
  thumbnailCanvas.width = thumbnailSize.width;
  thumbnailCanvas.height = thumbnailSize.height;
  thumbnailCanvas.getContext('2d').drawImage(
    fullCanvas,
    0,
    0,
    thumbnailCanvas.width,
    thumbnailCanvas.height
  );
  return {
    image: fullCanvas.toDataURL('image/jpeg', 0.85),
    thumbnail: thumbnailCanvas.toDataURL('image/jpeg', 0.5),
    width: fullCanvas.width,
    height: fullCanvas.height
  };
}

export function dataUrlToBlob(dataUrl) {
  if (!isPersistentScreenshot(dataUrl)) return null;
  const match = dataUrl.match(/^data:([^;,]+)?;base64,(.*)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1] || 'image/jpeg' });
}

export function blobToDataUrl(blob, options = {}) {
  if (typeof options.readBlobAsDataUrl === 'function') return options.readBlobAsDataUrl(blob);
  return new Promise((resolve, reject) => {
    if (!blob) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('截图读取失败'));
    reader.readAsDataURL(blob);
  });
}

export async function hydrateEntryFullScreenshots(projectId, targetEntries = [], options = {}) {
  if (!projectId || !Array.isArray(targetEntries) || !targetEntries.length) return [];
  const assets = options.assets || await loadProjectScreenshotAssets(projectId);
  const assetMap = new Map((assets || []).map(asset => [asset.key, asset]));
  const hydrated = [];
  for (const entry of targetEntries) {
    for (const descriptor of [
      { type: 'first', field: 'image' },
      { type: 'last', field: 'lastFrameImage' }
    ]) {
      if (isPersistentScreenshot(entry[descriptor.field])) continue;
      const asset = assetMap.get(getScreenshotAssetKey(projectId, entry.shotId, descriptor.type));
      if (!asset || !asset.blob) continue;
      const value = options.useObjectUrls && typeof options.createObjectUrl === 'function'
        ? options.createObjectUrl(asset.key, asset.blob)
        : await blobToDataUrl(asset.blob, options);
      if (!value) continue;
      entry[descriptor.field] = value;
      hydrated.push({ entry, field: descriptor.field, dataUrl: value, objectUrl: options.useObjectUrls, key: asset.key });
    }
  }
  return hydrated;
}

export function releaseHydratedScreenshots(hydrated) {
  (hydrated || []).forEach(item => {
    if (item.objectUrl) item.revokeObjectUrl?.(item.dataUrl);
    if (item.entry && item.entry[item.field] === item.dataUrl) item.entry[item.field] = '';
  });
}

export function createThumbnailFromDataUrl(dataUrl, options = {}) {
  return new Promise(resolve => {
    if (!isPersistentScreenshot(dataUrl)) {
      resolve('');
      return;
    }
    const image = options.createImage?.() || null;
    if (!image) { resolve(''); return; }
    image.onload = () => {
      const size = getScreenshotDimensions(
        image.naturalWidth,
        image.naturalHeight,
        THUMBNAIL_MAX_DIMENSION
      );
      const canvas = options.createCanvas?.();
      if (!canvas) { resolve(''); return; }
      canvas.width = size.width;
      canvas.height = size.height;
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    image.onerror = () => resolve('');
    image.src = dataUrl;
  });
}

export async function ensureEntryThumbnails(entries = [], options = {}) {
  let changed = false;
  for (const entry of entries) {
    if (entry.image && !isPersistentScreenshot(entry.imageThumbnail)) {
      const thumbnail = await createThumbnailFromDataUrl(entry.image, options);
      if (thumbnail) {
        entry.imageThumbnail = thumbnail;
        changed = true;
      }
    }
    if (entry.lastFrameImage && !isPersistentScreenshot(entry.lastFrameThumbnail)) {
      const thumbnail = await createThumbnailFromDataUrl(entry.lastFrameImage, options);
      if (thumbnail) {
        entry.lastFrameThumbnail = thumbnail;
        changed = true;
      }
    }
  }
  return changed;
}

export function applyScreenshotVariants(entry, variants, type = 'first') {
  if (!entry || !variants) return;
  if (type === 'last') {
    entry.lastFrameImage = variants.image;
    entry.lastFrameThumbnail = variants.thumbnail;
    return;
  }
  entry.image = variants.image;
  entry.imageThumbnail = variants.thumbnail;
  entry.width = variants.width;
  entry.height = variants.height;
}
