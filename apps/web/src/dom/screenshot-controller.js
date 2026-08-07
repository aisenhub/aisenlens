export function createScreenshotController({
  video,
  updateButton = null,
  getEntries,
  getActiveShotNumber,
  createScreenshotVariants,
  applyShotScreenshot,
  renderShots,
  markDirty,
  showToast,
  waitForVideoSeek,
  waitForVideoReady,
  ensureEntryThumbnails,
  loadProjectScreenshotAssets,
  hydrateEntryFullScreenshots,
  releaseHydratedScreenshots,
  getShotsMissingScreenshots,
  getScreenshotAssetKey,
  getCurrentProjectId,
  flushShotsToDB,
  runScreenshotWorkflow,
  yieldToScreenshotWorkflow,
  screenshotAbort,
  getScreenshotPaused,
  setScreenshotPaused,
  resetScreenshotBatchState,
  showProgress,
  hideProgress,
  updateProgress,
  playCaptureShutterAnimation,
  isGenerating: getGenerating = () => false,
  setGenerating: setGeneratingState = () => {},
  history = null,
  invokeAction = null,
  estimateStorage = async () => ({ available: Infinity }),
  storageReserveBytes = 32 * 1024 * 1024
} = {}) {
  let hydratedProjectScreenshots = [];
  let activeBatchPromise = null;
  const cloneEntry = entry => {
    if (typeof structuredClone === 'function') return structuredClone(entry);
    return JSON.parse(JSON.stringify(entry));
  };
  const restoreEntry = (entry, snapshot) => {
    Object.keys(entry).forEach(key => delete entry[key]);
    Object.assign(entry, cloneEntry(snapshot));
  };

  const prepareCapture = async () => {
    const context = { originalTime: video.currentTime, originalPaused: video.paused };
    if (!context.originalPaused) video.pause();
    return context;
  };

  const restoreCapture = async context => {
    if (context && video) {
      video.currentTime = context.originalTime;
      if (!context.originalPaused) try { await video.play(); } catch (_) {}
    }
    setScreenshotPaused?.(resetScreenshotBatchState(screenshotAbort).paused);
  };

  const releaseLoaded = () => {
    releaseHydratedScreenshots?.(hydratedProjectScreenshots);
    hydratedProjectScreenshots = [];
  };

  const capture = async entry => {
    if (!await waitForVideoSeek(video, entry.time)) throw new Error('Video seek failed');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return createScreenshotVariants(canvas);
  };

  const executeBatch = async (targets, progressOptions = {}) => {
    if (!targets.length || !video?.src) return;
    const recordHistory = progressOptions.recordHistory !== false && !!history;
    const beforeEntries = recordHistory
      ? new Map(targets.map(entry => [entry.shotId, cloneEntry(entry)]))
      : null;
    if (video.readyState < 2 && !(await waitForVideoReady(video))) throw new Error('视频仍在加载');
    const estimatedBytes = targets.reduce((total, entry) => {
      const width = Number(entry.width) || video.videoWidth || 0;
      const height = Number(entry.height) || video.videoHeight || 0;
      return total + Math.max(64 * 1024, width * height * 0.22);
    }, 0);
    const storage = await estimateStorage();
    if (Number.isFinite(storage?.available) && storage.available < estimatedBytes + storageReserveBytes) {
      const error = new Error('本地存储空间不足，已停止批量截图');
      error.code = 'STORAGE_QUOTA_LOW';
      showToast?.('本地存储空间不足，已停止批量截图（错误码：STORAGE_QUOTA_LOW）', 'warning');
      throw error;
    }
    while (getGenerating()) await new Promise(resolve => setTimeout(resolve, 100));
    await runScreenshotWorkflow({
      targets,
      isBusy: getGenerating,
      setBusy: setGeneratingState,
      showProgress,
      hideProgress,
      progressOptions,
      shouldStop: () => screenshotAbort.stop,
      yieldToMainThread: yieldToScreenshotWorkflow,
      waitUntilResumed: async () => {
        while (getScreenshotPaused?.() && !screenshotAbort.stop) await new Promise(resolve => setTimeout(resolve, 120));
      },
      capture,
      apply: applyShotScreenshot,
      onProgress: updateProgress,
      prepare: prepareCapture,
      restore: restoreCapture,
      onBatchComplete: renderShots
    });
    if (recordHistory) {
      const afterEntries = new Map(targets.map(entry => [entry.shotId, cloneEntry(entry)]));
      const applySnapshot = snapshot => {
        (getEntries?.() || []).forEach(entry => {
          const next = snapshot.get(entry.shotId);
          if (next) restoreEntry(entry, next);
        });
        renderShots?.();
        markDirty?.();
      };
      history.record({
        label: '批量更新分镜截图',
        execute: () => applySnapshot(afterEntries),
        undo: () => applySnapshot(beforeEntries)
      });
    }
  };

  const runBatch = (targets, progressOptions = {}) => {
    const task = executeBatch(targets, progressOptions);
    const tracked = task.finally(() => {
      if (activeBatchPromise === tracked) activeBatchPromise = null;
    });
    activeBatchPromise = tracked;
    return task;
  };

  const generateAll = async () => {
    if (!video?.src || video.readyState < 2) return;
    const targets = (getEntries?.() || []).filter(entry => !entry.image && entry.time >= 0);
    if (targets.length) await runBatch(targets);
  };

  const ensureLoaded = async () => {
    const entries = getEntries?.() || [];
    releaseLoaded();
    if (await ensureEntryThumbnails(entries)) {
      renderShots?.();
      if (getCurrentProjectId?.()) await flushShotsToDB?.();
    }
    let storedAssets = [];
    if (getCurrentProjectId?.()) {
      try { storedAssets = await loadProjectScreenshotAssets(getCurrentProjectId()); } catch (_) {}
    }
    if (storedAssets.length && getCurrentProjectId?.() && hydrateEntryFullScreenshots) {
      hydratedProjectScreenshots = await hydrateEntryFullScreenshots(
        getCurrentProjectId(),
        entries,
        { assets: storedAssets, useObjectUrls: true }
      );
      if (hydratedProjectScreenshots.length) renderShots?.();
    }
    const storedKeys = new Set(storedAssets.map(asset => asset.key));
    const missing = getShotsMissingScreenshots(entries, 'first').filter(entry => !storedKeys.has(getScreenshotAssetKey(getCurrentProjectId(), entry.shotId, 'first')));
    if (!video?.src || !missing.length) return;
    if (video.readyState < 2) await waitForVideoReady(video);
    if (video.readyState < 2) return;
    await runBatch(missing, { recordHistory: false });
    if (getCurrentProjectId?.()) await flushShotsToDB?.();
  };

  const updateEntry = async (entry, signal) => {
    if (!video) return false;
    const originalTime = video.currentTime;
    const wasPaused = video.paused;
    if (!wasPaused) video.pause();
    try {
      if (!await waitForVideoSeek(video, entry.time, signal) || signal?.aborted) return false;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      applyShotScreenshot(entry, await createScreenshotVariants(canvas));
      return true;
    } catch (_) { return false; }
    finally {
      if (!signal?.aborted) {
        video.currentTime = originalTime;
        if (!wasPaused) try { video.play(); } catch (_) {}
      }
    }
  };

  const updateActive = async () => {
    if (!video || video.readyState < 2) return;
    const entry = (getEntries?.() || []).find(item => item.shotNumber === getActiveShotNumber?.());
    if (!entry) { showToast?.('请先选择要更新的分镜', 'warning'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width || !canvas.height) { showToast?.('当前视频画面不可用', 'warning'); return; }
    await playCaptureShutterAnimation?.();
    const before = cloneEntry(entry);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    applyShotScreenshot(entry, await createScreenshotVariants(canvas));
    const after = cloneEntry(entry);
    renderShots?.();
    markDirty?.();
    if (history) history.record({
      label: '更新分镜截图',
      execute: () => { restoreEntry(entry, after); renderShots?.(); markDirty?.(); },
      undo: () => { restoreEntry(entry, before); renderShots?.(); markDirty?.(); }
    });
    showToast?.(`已更新第 ${entry.shotNumber} 个分镜截图`, 'success');
  };

  const bind = () => updateButton?.addEventListener('click', () => {
    if (invokeAction) invokeAction('shot.updateScreenshot');
    else updateActive();
  });

  return { bind, generateAll, ensureLoaded, releaseLoaded, waitForIdle: () => activeBatchPromise || Promise.resolve(), generateTargets: runBatch, updateEntry, updateActive, capture, prepareCapture, restoreCapture, isGenerating: getGenerating };
}
