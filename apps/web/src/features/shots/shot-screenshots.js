import { isScreenshotSource } from '../../utils/screenshot.js';

const SCREENSHOT_FIELDS = {
  first: { image: 'image', thumbnail: 'imageThumbnail' },
  last: { image: 'lastFrameImage', thumbnail: 'lastFrameThumbnail' }
};

export function getShotScreenshotFields(type = 'first') {
  return SCREENSHOT_FIELDS[type] || SCREENSHOT_FIELDS.first;
}

export function hasShotScreenshot(entry, type = 'first') {
  if (!entry) return false;
  const fields = getShotScreenshotFields(type);
  return isScreenshotSource(entry[fields.image]);
}

export function getShotsMissingScreenshots(entries = [], type = 'first') {
  return entries.filter(entry => !hasShotScreenshot(entry, type));
}

export function applyShotScreenshot(entry, variants, type = 'first') {
  if (!entry || !variants) return entry;
  const fields = getShotScreenshotFields(type);
  entry[fields.image] = variants.image || '';
  entry[fields.thumbnail] = variants.thumbnail || '';
  if (type === 'first') {
    entry.width = Number(variants.width) || 0;
    entry.height = Number(variants.height) || 0;
  }
  return entry;
}

export function clearShotScreenshot(entry, type = 'first') {
  if (!entry) return entry;
  const fields = getShotScreenshotFields(type);
  entry[fields.image] = '';
  entry[fields.thumbnail] = '';
  if (type === 'first') {
    entry.width = 0;
    entry.height = 0;
  }
  return entry;
}
