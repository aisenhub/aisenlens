import {
  createScreenshotVariants as createFeatureScreenshotVariants,
  hydrateEntryFullScreenshots as hydrateFeatureScreenshots,
  ensureEntryThumbnails as ensureFeatureThumbnails,
  dataUrlToBlob,
  blobToDataUrl,
  createThumbnailFromDataUrl,
  releaseHydratedScreenshots,
  applyScreenshotVariants
} from '../features/screenshots/screenshot-service.js';
import { screenshotObjectUrls } from '../platform/object-url-registry.js';

const createCanvas = () => document.createElement('canvas');
const createImage = () => new Image();
const readBlobAsDataUrl = blob => blobToDataUrl(blob);

export const createScreenshotVariants = (sourceCanvas, options = {}) => createFeatureScreenshotVariants(sourceCanvas, {
  ...options,
  createCanvas
});

export const hydrateEntryFullScreenshots = (projectId, entries = [], options = {}) => hydrateFeatureScreenshots(projectId, entries, {
  readBlobAsDataUrl,
  ...options,
  ...(options.useObjectUrls ? { createObjectUrl: screenshotObjectUrls.create } : {})
});
export const ensureEntryThumbnails = entries => ensureFeatureThumbnails(entries, { createCanvas, createImage });
export const releaseHydratedScreenshotUrls = hydrated => {
  (hydrated || []).forEach(item => screenshotObjectUrls.revokeUrl(item?.dataUrl));
  releaseHydratedScreenshots(hydrated);
};
export { dataUrlToBlob, blobToDataUrl, createThumbnailFromDataUrl, releaseHydratedScreenshots, applyScreenshotVariants };
