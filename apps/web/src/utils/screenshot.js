export const FULL_SCREENSHOT_MAX_DIMENSION = 1920;
export const THUMBNAIL_MAX_DIMENSION = 320;

export function isPersistentScreenshot(value) {
  return typeof value === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(value);
}

export function isScreenshotSource(value) {
  return isPersistentScreenshot(value)
    || (typeof value === 'string' && /^blob:/.test(value));
}

export function getScreenshotDimensions(width, height, maxDimension) {
  const sourceWidth = Math.max(1, Number(width) || 1);
  const sourceHeight = Math.max(1, Number(height) || 1);
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  };
}

export function getScreenshotAssetKey(projectId, shotId, type) {
  return `${Number(projectId)}:${String(shotId)}:${type}`;
}
