export function waitForVideoSeek(video, targetTime, signal) {
  return new Promise(resolve => {
    const beforeTime = video.currentTime;
    const alreadyAtTarget = video.readyState >= 2 && Math.abs(beforeTime - targetTime) < 0.001;
    let settled = false;
    let timeoutId = null;
    const finish = success => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', onSeeked);
      if (signal) signal.removeEventListener('abort', onAbort);
      if (timeoutId) clearTimeout(timeoutId);
      resolve(success);
    };
    const onSeeked = () => finish(Math.abs(video.currentTime - targetTime) <= 0.12);
    const onAbort = () => finish(false);
    if (signal && signal.aborted) {
      finish(false);
      return;
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = targetTime;
      if (alreadyAtTarget) requestAnimationFrame(() => requestAnimationFrame(() => finish(true)));
    } catch (_) {
      finish(false);
    }
    timeoutId = setTimeout(() => finish(false), 2000);
  });
}
