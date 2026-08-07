import { createStateMachine } from '../app/state-machine.js';
import { normalizeShotState } from '../features/shots/shot-update-pipeline.js';

export function createAutoShotController({
  button,
  video,
  getState = () => ({}),
  setState = () => {},
  getSettings = () => ({}),
  isAutoDetecting = () => false,
  setAutoDetecting = () => {},
  isGeneratingScreenshots = () => false,
  getAbortState = () => ({}),
  getActiveDetector = () => null,
  setActiveDetector = () => {},
  getEntries = () => [],
  setEntries = () => {},
  getGroups = () => [],
  setGroups = () => {},
  getDuration = () => video?.duration || 0,
  createState = () => ({}),
  getSegmentRange = () => ({}),
  hasMoreSegments = () => false,
  completeSegment = state => state,
  filterCuts = cuts => cuts,
  createEntry = () => null,
  createDetector = () => null,
  getFrameRate = () => 25,
  waitForVideoReady = async () => true,
  waitForVideoSeek = async () => true,
  getWorker = () => null,
  runWorkerTask = () => {},
  getSignatureCache = () => new Map(),
  getCacheKey = value => value,
  pruneSignatureCache = () => {},
  generateScreenshots = async () => {},
  getScreenshotAbortState = () => ({}),
  formatRange = value => String(value),
  segmentDuration = 300,
  showProgress = () => {},
  updateProgress = () => {},
  updateDetectionProgress = () => {},
  hideProgress = () => {},
  renderShots = () => {},
  setActiveShot = () => {},
  markDirty = () => {},
  history = null,
  persistState = () => {},
  updateCard = () => {},
  revealContinuationCard = () => {},
  openRange = () => {},
  showToast = () => {},
  invokeAction = null
} = {}) {
  const detectionMachine = createStateMachine({
    initial: 'idle',
    transitions: {
      idle: { start: 'detecting' },
      detecting: { complete: 'idle', cancel: 'idle', fail: 'idle' }
    }
  });

  const cloneEntries = entries => {
    if (typeof structuredClone === 'function') return structuredClone(entries);
    return JSON.parse(JSON.stringify(entries));
  };

  const recordBatchChange = (before, after, activeShotNumber) => {
    if (!history) return;
    const apply = snapshot => {
      const normalized = normalizeShotState(cloneEntries(snapshot), getGroups(), { duration: getDuration() });
      setEntries(normalized.entries);
      setGroups(normalized.shotGroups);
      renderShots();
      if (activeShotNumber) setActiveShot(activeShotNumber);
      markDirty();
    };
    history.record({
      label: '自动分镜批量结果',
      execute: () => apply(after),
      undo: () => apply(before)
    });
  };

  const runNext = async () => {
    const state = getState();
    if (!state.active || state.completed || detectionMachine.state !== 'idle' || isAutoDetecting() || isGeneratingScreenshots() || !video?.src) return false;
    const { start: segmentStart, end: segmentEnd, scanStart } = getSegmentRange(state);
    detectionMachine.transition('start');
    setAutoDetecting(true);
    if (button) button.disabled = true;
    updateCard();
    showProgress(0, `正在检测 ${formatRange(segmentStart, segmentEnd)}`, { blocking: true, indeterminate: true });
    let originalPaused = true;
    let completionEvent = 'complete';
    const beforeEntries = cloneEntries(getEntries());
    let entriesChanged = false;
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      if (!await waitForVideoReady(video)) throw new Error('视频仍在加载');
      originalPaused = video.paused;
      if (!originalPaused) video.pause();
      pruneSignatureCache(scanStart);
      const detector = createDetector(video, getFrameRate(), {
        diff: state.diff,
        minGap: state.minGap,
        onProgress: updateDetectionProgress,
        waitForSeek: waitForVideoSeek,
        getWorker,
        runWorkerTask,
        signatureCache: getSignatureCache(),
        getCacheKey
      });
      setActiveDetector(detector);
      const detected = await detector.runBetween(scanStart, segmentEnd);
      if (detector.abort.stop || getScreenshotAbortState().stop) {
        completionEvent = 'cancel';
        showToast('已停止自动分镜', 'info');
        return false;
      }
      const entries = getEntries();
      const cuts = filterCuts(detected, state, entries, 0.05);
      const nextEntries = [];
      const startNumber = entries.length ? Math.max(...entries.map(entry => entry.shotNumber)) + 1 : 1;
      for (const cut of cuts) {
        const time = Math.max(segmentStart, Math.min(segmentEnd, Number(cut.time)));
        if (!Number.isFinite(time) || nextEntries.some(entry => Math.abs(entry.time - time) <= 0.05)) continue;
        const entry = createEntry({ time }, startNumber + nextEntries.length, segmentStart);
        entries.push(entry);
        nextEntries.push(entry);
      }
      if (nextEntries.length) nextEntries[nextEntries.length - 1].segmentEnd = segmentEnd;
      const normalized = normalizeShotState(entries, getGroups(), { duration: getDuration() });
      setEntries(normalized.entries);
      setGroups(normalized.shotGroups);
      entriesChanged = true;
      renderShots();
      if (nextEntries.length) setActiveShot(nextEntries[nextEntries.length - 1].shotNumber);
      const newIds = new Set(nextEntries.map(entry => entry.shotId));
      const pendingEntries = normalized.entries.filter(entry => entry.autoShotSegmentStart === segmentStart && !entry.image && !newIds.has(entry.shotId));
      const targets = normalized.entries.filter(entry => newIds.has(entry.shotId)).concat(pendingEntries);
      await generateScreenshots(targets, { blocking: true, keepOpen: true, recordHistory: false });
      if (getScreenshotAbortState().stop) {
        completionEvent = 'cancel';
        showToast('已停止自动分镜', 'info');
        return false;
      }
      targets.forEach(entry => { delete entry.autoShotSegmentStart; });
      setState(completeSegment(getState(), segmentEnd));
      persistState();
      renderShots();
      markDirty();
      recordBatchChange(beforeEntries, getEntries(), nextEntries[nextEntries.length - 1]?.shotNumber);
      updateCard();
      revealContinuationCard();
      return true;
    } catch (error) {
      completionEvent = 'fail';
      if (entriesChanged) {
        const normalized = normalizeShotState(cloneEntries(beforeEntries), getGroups(), { duration: getDuration() });
        setEntries(normalized.entries);
        setGroups(normalized.shotGroups);
        renderShots();
      }
      console.error('自动分镜失败:', error);
      renderShots();
      showToast(error?.message === '视频仍在加载' ? error.message : '自动分镜失败，请重试', 'error');
      return false;
    } finally {
      if (!originalPaused) try { video.play(); } catch (_) {}
      setActiveDetector(null);
      hideProgress();
      setAutoDetecting(false);
      detectionMachine.transition(completionEvent);
      if (button) button.disabled = false;
      updateCard();
    }
  };

  const start = async (startTime, endTime, options = {}) => {
    if (!video?.src || detectionMachine.state !== 'idle' || isAutoDetecting() || isGeneratingScreenshots()) return;
    const startValue = Math.max(0, Math.min(video.duration || endTime, Number(startTime) || 0));
    const endValue = Math.max(startValue, Math.min(video.duration || endTime, Number(endTime) || 0));
    const current = getState();
    if (options.reset || !current.active || Math.abs(current.start - startValue) > 0.001 || Math.abs(current.end - endValue) > 0.001) {
      setState(createState(startValue, endValue, getSettings()));
      persistState();
      updateCard();
    }
    if (options.runAll) {
      while (hasMoreSegments(getState())) if (!await runNext()) break;
      return;
    }
    await runNext();
  };

  const openRangeAction = async () => {
    if (!video?.src || detectionMachine.state !== 'idle' || isAutoDetecting() || isGeneratingScreenshots()) return;
    button.disabled = true;
    const ready = await waitForVideoReady(video);
    button.disabled = false;
    if (!ready) { showToast('视频仍在加载，请稍后再试', 'warning'); return; }
    openRange();
  };

  const bind = () => button?.addEventListener('click', () => {
    if (invokeAction) invokeAction('shot.autoDetect');
    else openRangeAction();
  });

  return { bind, runNext, start, openRange: openRangeAction, updateCard, getState: () => detectionMachine.state };
}
