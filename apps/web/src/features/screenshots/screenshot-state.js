export function createScreenshotAbortState() {
  return { stop: false };
}

export function requestScreenshotStop(abortState) {
  if (abortState) abortState.stop = true;
  return abortState;
}

export function resetScreenshotBatchState(abortState) {
  if (abortState) abortState.stop = false;
  return { paused: false, abort: abortState };
}

export function shouldWaitForScreenshotResume(paused, abortState) {
  return !!paused && !abortState?.stop;
}
