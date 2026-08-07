import { runScreenshotBatch } from './screenshot-runner.js';

export function yieldToScreenshotWorkflow(timeout = 50) {
  if (typeof requestIdleCallback === 'function') {
    return new Promise(resolve => requestIdleCallback(resolve, { timeout }));
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function runScreenshotWorkflow({
  targets = [],
  isBusy = () => false,
  setBusy = () => {},
  showProgress = () => {},
  hideProgress = () => {},
  progressOptions = {},
  shouldStop = () => false,
  yieldToMainThread = yieldToScreenshotWorkflow,
  waitUntilResumed = async () => {},
  capture,
  apply,
  onProgress,
  onBatchComplete,
  prepare = async () => null,
  restore = async () => {}
} = {}) {
  if (!Array.isArray(targets) || !targets.length || isBusy()) return false;

  setBusy(true);
  showProgress(targets.length, '正在生成分镜截图', progressOptions);
  let context;
  try {
    context = await prepare();
    await runScreenshotBatch({
      targets,
      shouldStop,
      yieldToMainThread,
      waitUntilResumed,
      capture,
      apply,
      onProgress,
      onBatchComplete
    });
    return true;
  } finally {
    if (!progressOptions.keepOpen) hideProgress();
    await restore(context);
    setBusy(false);
  }
}
