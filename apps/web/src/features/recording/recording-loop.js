export function cancelRecordingFrame(state, video, cancelAnimationFrameFn) {
  if (!state.frameId) return;
  if (state.usesVideoFrameCallback && video && typeof video.cancelVideoFrameCallback === 'function') {
    video.cancelVideoFrameCallback(state.frameId);
  } else if (typeof cancelAnimationFrameFn === 'function') {
    cancelAnimationFrameFn(state.frameId);
  }
  state.frameId = 0;
  state.usesVideoFrameCallback = false;
}

export function scheduleRecordingFrame(state, video, renderLoop, requestAnimationFrameFn) {
  if (!state.active || !video || typeof renderLoop !== 'function') return;
  if (typeof video.requestVideoFrameCallback === 'function') {
    state.usesVideoFrameCallback = true;
    state.frameId = video.requestVideoFrameCallback(renderLoop);
  } else if (typeof requestAnimationFrameFn === 'function') {
    state.usesVideoFrameCallback = false;
    state.frameId = requestAnimationFrameFn(renderLoop);
  }
}

export function renderRecordingFrame(state, timestamp, drawFrame, requestFrame, scheduleFrame) {
  if (!state.active) return;
  const frameInterval = 1000 / state.frameRate;
  const isFirstFrame = !state.lastFrameTime;
  const elapsed = isFirstFrame ? frameInterval : timestamp - state.lastFrameTime;
  if (isFirstFrame || elapsed + 0.5 >= frameInterval) {
    drawFrame();
    requestFrame();
    if (isFirstFrame) {
      state.lastFrameTime = timestamp;
    } else {
      const completedIntervals = Math.max(1, Math.floor((elapsed + 0.5) / frameInterval));
      state.lastFrameTime = Math.min(timestamp, state.lastFrameTime + completedIntervals * frameInterval);
    }
  }
  scheduleFrame();
}
