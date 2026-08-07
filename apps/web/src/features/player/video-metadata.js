export function getVideoMetadata(video, fileName = '', fileSize = 0) {
  const hasVideo = !!(video && video.src);
  const duration = Number(video && video.duration) || 0;
  return {
    hasVideo,
    hasMetadata: hasVideo && Number.isFinite(video.duration) && duration > 0,
    fileName: String(fileName || ''),
    duration,
    width: Number(video && video.videoWidth) || 0,
    height: Number(video && video.videoHeight) || 0,
    fileSize: Number(fileSize) || 0
  };
}

export function createVideoFrameRateSampler(video, onFrameRate = () => {}) {
  let sample = null;
  let sampling = false;

  const reset = () => {
    sample = null;
    sampling = false;
  };

  const start = () => {
    if (!video || !video.requestVideoFrameCallback || sampling) return;
    sampling = true;
    const sampleFrame = (_timestamp, metadata) => {
      if (!video.src || video.paused || video.ended) {
        sampling = false;
        return;
      }
      const mediaTime = Number(metadata && metadata.mediaTime);
      const presentedFrames = Number(metadata && metadata.presentedFrames);
      if (Number.isFinite(mediaTime)) {
        const frameCount = Number.isFinite(presentedFrames)
          ? presentedFrames
          : (sample ? sample.frameCount + 1 : 1);
        if (sample && mediaTime > sample.mediaTime) {
          const elapsed = mediaTime - sample.mediaTime;
          if (elapsed >= 0.5) {
            const frameRate = (frameCount - sample.frameCount) / elapsed;
            if (Number.isFinite(frameRate) && frameRate >= 1 && frameRate <= 240) {
              onFrameRate(Math.round(frameRate * 100) / 100);
            }
            sample = { mediaTime, frameCount };
          }
        } else if (!sample || mediaTime < sample.mediaTime) {
          sample = { mediaTime, frameCount };
        }
      }
      video.requestVideoFrameCallback(sampleFrame);
    };
    video.requestVideoFrameCallback(sampleFrame);
  };

  return { start, reset, isSampling: () => sampling };
}
