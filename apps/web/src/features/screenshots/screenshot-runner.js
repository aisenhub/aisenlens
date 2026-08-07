export async function runScreenshotBatch(options = {}) {
  const targets = Array.isArray(options.targets) ? options.targets : [];
  const chunkSize = Math.max(1, Number(options.chunkSize) || 8);
  let processed = 0;
  for (let index = 0; index < targets.length; index += chunkSize) {
    if (options.shouldStop && options.shouldStop()) break;
    const batch = targets.slice(index, index + chunkSize);
    for (const entry of batch) {
      if (options.shouldStop && options.shouldStop()) break;
      if (typeof options.yieldToMainThread === 'function') await options.yieldToMainThread();
      if (typeof options.waitUntilResumed === 'function') await options.waitUntilResumed();
      if (options.shouldStop && options.shouldStop()) break;
      const variants = await options.capture(entry);
      if (typeof options.apply === 'function') options.apply(entry, variants);
      processed += 1;
      if (typeof options.onProgress === 'function') options.onProgress(processed, targets.length);
    }
    if (typeof options.onBatchComplete === 'function') await options.onBatchComplete();
    if (typeof options.yieldToMainThread === 'function') await options.yieldToMainThread(100);
  }
  return processed;
}
