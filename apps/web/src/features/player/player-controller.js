export function createPlayerController({
  video,
  getFrameRate,
  clampTime,
  stopSegmentPlayback,
  isSegmentPlaybackActive,
  refreshAfterSeek,
  togglePlayback
} = {}) {
  let seekVersion = 0;
  const seekBy = seconds => {
    if (!video) return;
    stopSegmentPlayback?.(true);
    video.currentTime = clampTime(video.currentTime + seconds);
    refreshAfterSeek?.(video.currentTime);
  };

  const seekTo = (time, shouldStop = true) => {
    if (!video) return;
    seekVersion += 1;
    if (shouldStop) stopSegmentPlayback?.(true);
    video.currentTime = clampTime(time);
    refreshAfterSeek?.(video.currentTime, seekVersion);
  };

  const stepFrame = direction => {
    const frameRate = Number(getFrameRate?.()) || 25;
    if (frameRate <= 0) return;
    seekBy(direction / frameRate);
  };

  const togglePlayPause = () => {
    if (!video) return;
    const wasSegmentPlayback = !!isSegmentPlaybackActive?.();
    stopSegmentPlayback?.();
    if (wasSegmentPlayback) {
      video.pause();
      return;
    }
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      video.play().catch(() => {});
    }
    else video.pause();
  };

  return {
    seekBy,
    seekTo,
    stepFrame,
    jump: seekBy,
    togglePlayPause,
    togglePlayback: () => togglePlayback?.(),
    getSeekVersion: () => seekVersion
  };
}
