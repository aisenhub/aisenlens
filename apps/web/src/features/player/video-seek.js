export function waitForVideoSeek(video, targetTime, signal) {
  return new Promise(resolve => {
    const beforeTime = video.currentTime;
    const alreadyAtTarget = video.readyState >= 2 && Math.abs(beforeTime - targetTime) < 0.001;
    let settled = false;
    let timeoutId = null;
    let frameId = null;
    const requestFrame = globalThis.requestAnimationFrame || (callback => setTimeout(callback, 16));
    const cancelFrame = globalThis.cancelAnimationFrame || clearTimeout;
    const finish = success => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      if (signal) signal.removeEventListener('abort', onAbort);
      if (timeoutId) clearTimeout(timeoutId);
      if (frameId !== null) cancelFrame(frameId);
      resolve(success);
    };
    const onSeeked = () => finish(Math.abs(video.currentTime - targetTime) <= 0.12);
    const onAbort = () => finish(false);
    const checkPosition = () => {
      if (video.readyState >= 2 && Math.abs(video.currentTime - targetTime) <= 0.12) {
        finish(true);
        return;
      }
      frameId = requestFrame(checkPosition);
    };
    if (signal && signal.aborted) {
      finish(false);
      return;
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = targetTime;
      if (alreadyAtTarget) requestFrame(() => requestFrame(() => finish(true)));
      else frameId = requestFrame(checkPosition);
    } catch (_) {
      finish(false);
    }
    timeoutId = setTimeout(() => finish(false), 2000);
  });
}
