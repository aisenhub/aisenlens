export const RECORDING_QUALITY_PRESETS = {
  low: { label: '低清晰度', width: 540, height: 720, videoBitsPerSecond: 2000000 },
  medium: { label: '中等清晰度', width: 720, height: 960, videoBitsPerSecond: 4000000 },
  high: { label: '高清晰度', width: 1080, height: 1440, videoBitsPerSecond: 8000000 }
};

export function getRecordingQualityPreset(quality = 'medium') {
  return RECORDING_QUALITY_PRESETS[quality] || RECORDING_QUALITY_PRESETS.medium;
}

export function getRecordingVideoBitrate(qualityPreset, frameRate = 30) {
  return Math.round(qualityPreset.videoBitsPerSecond * Number(frameRate || 30) / 30);
}

export function getRecordingConfig({ format = 'webm', quality = 'medium', frameRate = 30, mp4Supported = false } = {}) {
  const qualityPreset = getRecordingQualityPreset(quality);
  const videoBitsPerSecond = getRecordingVideoBitrate(qualityPreset, frameRate);
  return {
    format,
    quality,
    qualityPreset,
    frameRate: Number(frameRate) || 30,
    videoBitsPerSecond,
    mp4Supported: !!mp4Supported,
    blocked: format === 'mp4' && !mp4Supported
  };
}
