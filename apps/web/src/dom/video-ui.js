import { createVideoFrameRateSampler, getVideoMetadata } from '../features/player/video-metadata.js';

export function createVideoUiController({
  video,
  elements = {},
  getFileName = () => '',
  getFileSize = () => 0,
  formatDuration = value => String(value),
  formatFileSize = value => String(value),
  formatFileName = value => ({ base: value, extension: '' }),
  documentTarget = document,
  buttons = []
} = {}) {
  const { fileName, fileBaseName, fileExtension, duration, resolution, fileSize, frameRate } = elements;
  const sampler = createVideoFrameRateSampler(video, value => { if (frameRate) frameRate.textContent = `${value} fps`; });
  const updateInfo = () => {
    const name = getFileName();
    const metadata = getVideoMetadata(video, name, getFileSize());
    if (fileName) {
      const displayName = metadata.fileName || '暂无视频';
      const parts = name ? formatFileName(name) : { base: displayName, extension: '' };
      if (fileBaseName && fileExtension) { fileBaseName.textContent = parts.base; fileExtension.textContent = parts.extension; }
      else fileName.textContent = displayName;
      fileName.title = displayName;
    }
    if (duration) duration.textContent = formatDuration(metadata.hasMetadata ? metadata.duration : 0);
    if (resolution) resolution.textContent = metadata.width && metadata.height ? `${metadata.width} × ${metadata.height}` : '--';
    if (fileSize) fileSize.textContent = formatFileSize(metadata.fileSize);
  };
  const resetFrameRate = () => { sampler.reset(); if (frameRate) frameRate.textContent = '--'; };
  const startFrameRate = () => sampler.start();
  const disableButtons = () => buttons.forEach(button => { if (button) button.disabled = true; });
  const enableButtons = () => buttons.forEach(button => { if (button) button.disabled = false; });
  const waitForReady = targetVideo => {
    if (targetVideo && targetVideo.readyState >= 2 && Number.isFinite(targetVideo.duration) && targetVideo.duration > 0) return Promise.resolve(true);
    return new Promise(resolve => {
      let settled = false;
      const events = ['loadedmetadata', 'loadeddata', 'canplay'];
      const finish = ready => {
        if (settled) return;
        settled = true;
        events.forEach(type => targetVideo?.removeEventListener(type, check));
        documentTarget.defaultView?.clearTimeout(timeoutId);
        resolve(ready);
      };
      const check = () => {
        if (targetVideo && targetVideo.readyState >= 2 && Number.isFinite(targetVideo.duration) && targetVideo.duration > 0) finish(true);
      };
      events.forEach(type => targetVideo?.addEventListener(type, check));
      const timeoutId = documentTarget.defaultView?.setTimeout(() => finish(false), 5000) || setTimeout(() => finish(false), 5000);
      check();
    });
  };
  return { updateInfo, resetFrameRate, startFrameRate, disableButtons, enableButtons, waitForReady };
}
