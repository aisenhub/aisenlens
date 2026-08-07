export function createSegmentPlaybackController({
  video,
  getEntries,
  getFrameRate,
  clampPlaybackTime,
  getSegmentEnd,
  getFrameStep,
  setActiveShot,
  syncShotTable,
  getOverlayMode,
  showToast
} = {}) {
  let activePlayback = null;

  const getFps = () => getFrameRate?.() || 25;
  const clampTime = time => clampPlaybackTime(time);

  const stop = (shouldPause = false) => {
    if (activePlayback) {
      video.removeEventListener('timeupdate', activePlayback.onTimeUpdate);
      video.removeEventListener('ended', activePlayback.onEnded);
      if (activePlayback.frameHandle) {
        if (activePlayback.usesVideoFrameCallback && typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(activePlayback.frameHandle);
        else if (!activePlayback.usesVideoFrameCallback) cancelAnimationFrame(activePlayback.frameHandle);
      }
      activePlayback = null;
    }
    if (shouldPause) video.pause();
  };

  const play = entry => {
    if (!video?.src || !entry) return;
    const startTime = clampTime(Number(entry.time) || 0);
    const endTime = getSegmentEnd(entry);
    if (!(endTime > startTime)) { showToast?.('当前分镜没有可播放的时长', 'warning'); return; }
    stop(true);
    setActiveShot?.(entry.shotNumber, false);
    video.currentTime = startTime;
    syncShotTable?.(startTime);
    const frameStep = 1 / Math.max(1, Number(getFps()) || 25);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stop(true);
      video.currentTime = startTime;
      syncShotTable?.(startTime);
      setActiveShot?.(entry.shotNumber, false);
    };
    const lookahead = () => frameStep * Math.max(1, Math.abs(Number(video.playbackRate)) || 1);
    const willExceed = presentedTime => {
      const current = Number.isFinite(presentedTime) ? presentedTime : video.currentTime;
      return current + lookahead() > endTime + 1e-6;
    };
    const onTimeUpdate = () => { if (willExceed(NaN) || video.ended) finish(); };
    const onEnded = () => finish();
    activePlayback = { onTimeUpdate, onEnded, frameHandle: 0, usesVideoFrameCallback: false };
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    const supportsFrameCallback = typeof video.requestVideoFrameCallback === 'function';
    const watchFrame = (_now, metadata) => {
      if (finished || !activePlayback) return;
      const presented = metadata && Number.isFinite(metadata.mediaTime) ? metadata.mediaTime : NaN;
      if (video.ended || willExceed(presented)) { finish(); return; }
      if (supportsFrameCallback) {
        activePlayback.usesVideoFrameCallback = true;
        activePlayback.frameHandle = video.requestVideoFrameCallback(watchFrame);
      } else {
        activePlayback.usesVideoFrameCallback = false;
        activePlayback.frameHandle = requestAnimationFrame(() => watchFrame(0, null));
      }
    };
    watchFrame(0, null);
    video.play().catch(() => stop());
  };

  const toggle = () => {
    if (getOverlayMode?.()?.startsWith('draw-') || !video || video.readyState < 2) return;
    const wasPlayingSegment = !!activePlayback;
    stop();
    if (wasPlayingSegment) { video.pause(); return; }
    if (video.paused) video.play(); else video.pause();
  };

  return {
    getFps,
    clampTime,
    stop,
    play,
    toggle,
    isActive: () => !!activePlayback
  };
}
