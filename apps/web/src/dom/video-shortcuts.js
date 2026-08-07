export function bindVideoShortcuts({
  video,
  documentTarget = document,
  clampTime,
  getFrameRate,
  refreshAfterSeek,
  onCapture,
  invokeAction = null
} = {}) {
  const handler = async event => {
    const tag = event.target?.tagName || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target?.isContentEditable) return;
    if (!video?.src && !video?.currentSrc) return;
    if (event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
      if (invokeAction) { await invokeAction('playback.toggle'); return; }
      if (video.paused) video.play();
      else video.pause();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.key === 'ArrowLeft' ? -1 : 1;
      if (invokeAction) { await invokeAction(delta < 0 ? 'playback.jumpBack' : 'playback.jumpForward'); return; }
      video.currentTime = clampTime(video.currentTime + delta);
      refreshAfterSeek?.();
      return;
    }
    if (event.key === ',' || event.key === '.') {
      event.preventDefault();
      event.stopPropagation();
      const frameRate = Number(getFrameRate?.()) || 25;
      if (invokeAction) { await invokeAction(event.key === ',' ? 'playback.stepBack' : 'playback.stepForward'); return; }
      video.pause();
      video.currentTime = clampTime(video.currentTime + (event.key === ',' ? -1 : 1) / frameRate);
      refreshAfterSeek?.();
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    if (video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (invokeAction) await invokeAction('shot.capture', { canvas, time: video.currentTime });
    else await onCapture?.(canvas, video.currentTime);
  };
  documentTarget?.addEventListener('keydown', handler, { capture: true });
  return () => documentTarget?.removeEventListener('keydown', handler, { capture: true });
}
