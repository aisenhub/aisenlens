import {
  getShotEditorDefaultLastTime,
  getShotEditorSplitRange,
  getShotEditorTailBoundary
} from '../features/shots/shot-boundaries.js';
import {
  canEditShotEditorFirstTime,
  createShotEditorDraft,
  getShotEditorNavigation,
  updateShotEditorFrameDraft
} from '../features/shots/shot-editor-state.js';
import { applyShotEditorFrames, createSplitShotEntry } from '../features/shots/shot-editor.js';
import { formatTime } from '../utils/time.js';
import { bindShotEditorEvents } from './shot-editor-bindings.js';
import { normalizeShotState } from '../features/shots/shot-update-pipeline.js';

export function createShotEditorController({
  elements = {},
  video = null,
  documentTarget = document,
  windowTarget = window,
  getEntries = () => [],
  setEntries = () => {},
  getGroups = () => [],
  setGroups = () => {},
  getDuration = () => video?.duration || 0,
  getCurrentProjectId = () => null,
  deleteScreenshotAssets = () => Promise.resolve(),
  clearShotHeight = () => {},
  getFrameRate = () => 25,
  updateDurations = () => {},
  createScreenshotVariants = async () => null,
  waitForVideoReady = async () => true,
  waitForVideoSeek = async () => true,
  renderShots = () => {},
  setActiveShot = () => {},
  markDirty = () => {},
  history = null,
  syncOverlaySize = () => {},
  showToast = () => {}
} = {}) {
  const {
    modal,
    title,
    videoContainer,
    firstImage,
    lastImage,
    firstTime,
    lastTime,
    splitButton,
    firstControls,
    firstNote,
    previousFrameButton,
    nextFrameButton,
    backSecondButton,
    playPauseButton,
    forwardSecondButton,
    firstPreviousButton,
    firstNextButton,
    firstBackSecondButton,
    firstForwardSecondButton,
    lastPreviousButton,
    lastNextButton,
    lastBackSecondButton,
    lastForwardSecondButton,
    closeButton,
    cancelButton,
    saveButton,
    previousShotButton,
    nextShotButton
  } = elements;

  let draft = null;
  let busy = false;
  let originalParent = null;
  let originalNextSibling = null;
  let originalStyle = '';
  let originalTime = 0;
  let wasPlaying = false;

  const cloneEntries = entries => {
    if (typeof structuredClone === 'function') return structuredClone(entries);
    return JSON.parse(JSON.stringify(entries));
  };

  const recordEntriesChange = (before, after, activeShotNumber) => {
    if (!history) return;
    const apply = snapshot => {
      const normalized = normalizeShotState(cloneEntries(snapshot), getGroups(), { duration: getDuration() });
      setEntries(normalized.entries);
      setGroups(normalized.shotGroups);
      renderShots();
      setActiveShot(activeShotNumber);
      markDirty();
    };
    history.record({
      label: '编辑器更新分镜',
      execute: () => apply(after),
      undo: () => apply(before)
    });
  };

  const getFrameStep = () => {
    const fps = Number(getFrameRate?.());
    return 1 / (Number.isFinite(fps) && fps > 0 ? fps : 25);
  };

  const clampTime = value => {
    const time = Number(value);
    if (!Number.isFinite(time)) return 0;
    return video && Number.isFinite(video.duration) && video.duration > 0
      ? Math.max(0, Math.min(video.duration, time))
      : Math.max(0, time);
  };

  const captureFrameAtTime = async time => {
    if (!video || !video.src) return null;
    if (video.readyState < 2 && !(await waitForVideoReady(video))) return null;
    if (!video.videoWidth || !video.videoHeight) return null;
    const savedTime = video.currentTime;
    const playing = !video.paused;
    const targetTime = clampTime(time);
    if (playing) video.pause();
    try {
      if (!await waitForVideoSeek(video, targetTime)) return null;
      await new Promise(resolve => windowTarget.requestAnimationFrame(() => windowTarget.requestAnimationFrame(resolve)));
      const canvas = documentTarget.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      return await createScreenshotVariants(canvas);
    } catch (_) {
      return null;
    } finally {
      video.currentTime = savedTime;
      if (playing) try { video.play(); } catch (_) {}
    }
  };

  const captureEditorFrameAtTime = async time => {
    if (!video || !video.src) return null;
    if (video.readyState < 2 && !(await waitForVideoReady(video))) return null;
    if (!video.videoWidth || !video.videoHeight) return null;
    const targetTime = clampTime(time);
    video.pause();
    try {
      if (!await waitForVideoSeek(video, targetTime)) return null;
      await new Promise(resolve => windowTarget.requestAnimationFrame(() => windowTarget.requestAnimationFrame(resolve)));
      const canvas = documentTarget.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      return await createScreenshotVariants(canvas);
    } catch (_) {
      return null;
    }
  };

  const setVideoTime = time => {
    if (video?.src) video.currentTime = clampTime(time);
  };

  const renderImage = type => {
    const container = type === 'first' ? firstImage : lastImage;
    if (!container) return;
    const image = draft ? draft[`${type}Image`] : '';
    const time = draft ? draft[`${type}Time`] : 0;
    container.innerHTML = '';
    if (image) {
      const imageElement = documentTarget.createElement('img');
      imageElement.src = image;
      imageElement.alt = type === 'first' ? '首帧截图' : '尾帧截图';
      container.appendChild(imageElement);
    } else {
      const empty = documentTarget.createElement('span');
      empty.className = 'shot-editor-frame-empty';
      empty.textContent = busy ? '正在更新截图' : '暂无截图';
      container.appendChild(empty);
    }
    container.onclick = () => { if (draft) setVideoTime(time); };
  };

  const updateNavigation = () => {
    const navigation = getShotEditorNavigation(getEntries?.() || [], draft);
    if (previousShotButton) previousShotButton.disabled = busy || !navigation.canGoPrevious;
    if (nextShotButton) nextShotButton.disabled = busy || !navigation.canGoNext;
    if (splitButton) {
      const canSplit = !!getShotEditorSplitRange(getEntries?.() || [], draft, getFrameStep(), video?.duration);
      splitButton.disabled = busy || !canSplit;
      splitButton.title = canSplit ? '把尾帧之后的一段内容独立为新分镜' : '尾帧之后没有可拆分的区间';
    }
    const isFirstShot = navigation.index === 0;
    if (firstControls) {
      firstControls.hidden = false;
      firstControls.classList.toggle('is-locked', !isFirstShot);
    }
    if (firstNote) firstNote.hidden = isFirstShot;
  };

  const render = () => {
    if (!draft) return;
    if (title) title.textContent = `分镜编辑 #${draft.shotNumber}/${(getEntries?.() || []).length}`;
    if (firstTime) firstTime.textContent = formatTime(draft.firstTime);
    if (lastTime) lastTime.textContent = formatTime(draft.lastTime);
    renderImage('first');
    renderImage('last');
    updateNavigation();
  };

  const setFrame = async (type, time) => {
    if (!draft || busy) return;
    const timeKey = `${type}Time`;
    let nextTime = clampTime(time);
    if (type === 'first') {
      if (!canEditShotEditorFirstTime(getEntries?.() || [], draft)) {
        showToast('首帧由上一个分镜的尾帧决定，请到上一个分镜调整尾帧', 'warning');
        render();
        return;
      }
      if (nextTime > draft.lastTime) {
        nextTime = draft.lastTime;
        showToast('首帧不能晚于尾帧', 'warning');
        if (Math.abs(draft[timeKey] - nextTime) < 1e-6) return;
      }
    }
    updateShotEditorFrameDraft(draft, type, nextTime);
    const frame = await captureEditorFrameAtTime(draft[timeKey]);
    updateShotEditorFrameDraft(draft, type, nextTime, frame);
    render();
    const timeElement = type === 'first' ? firstTime : lastTime;
    if (timeElement) {
      timeElement.classList.remove('is-changing');
      void timeElement.offsetWidth;
      timeElement.classList.add('is-changing');
    }
    setVideoTime(draft[timeKey]);
  };

  const refreshFrames = async currentDraft => {
    if (!currentDraft || draft !== currentDraft || !video?.src) return;
    if (video.readyState < 2 && !(await waitForVideoReady(video))) return;
    ['first', 'last'].forEach(type => {
      currentDraft[`${type}Image`] = '';
      currentDraft[`${type}Thumbnail`] = '';
      currentDraft[`${type}Width`] = 0;
      currentDraft[`${type}Height`] = 0;
    });
    render();
    for (const type of ['first', 'last']) {
      if (draft !== currentDraft) return;
      const frame = await captureEditorFrameAtTime(currentDraft[`${type}Time`]);
      if (draft !== currentDraft) return;
      updateShotEditorFrameDraft(currentDraft, type, currentDraft[`${type}Time`], frame);
      render();
    }
  };

  const close = () => {
    const closedDraft = draft;
    draft = null;
    busy = false;
    modal?.classList.remove('show');
    if (video) {
      if (originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) originalParent.insertBefore(video, originalNextSibling);
        else originalParent.appendChild(video);
      }
      video.style.cssText = originalStyle;
      if (Number.isFinite(originalTime)) video.currentTime = originalTime;
      if (wasPlaying) try { video.play(); } catch (_) {}
    }
    originalParent = null;
    originalNextSibling = null;
    originalStyle = '';
    wasPlaying = false;
    if (closedDraft) syncOverlaySize();
  };

  const save = async () => {
    if (!draft || busy) return false;
    const currentDraft = draft;
    const startTime = clampTime(currentDraft.firstTime);
    const endTime = clampTime(currentDraft.lastTime);
    if (endTime < startTime) { showToast('尾帧不能早于首帧', 'warning'); return false; }
    const entries = getEntries?.() || [];
    const beforeEntries = cloneEntries(entries);
    const entry = entries.find(item => item.shotNumber === currentDraft.shotNumber);
    if (!entry) { close(); return false; }
    const { swallowed, keeper } = getShotEditorTailBoundary(entries, { ...currentDraft, lastTime: endTime }, getFrameStep(), video?.duration);
    const nextStart = clampTime(endTime + getFrameStep());
    busy = true;
    if (saveButton) { saveButton.disabled = true; saveButton.textContent = '更新中...'; }
    try {
      const firstFrame = currentDraft.firstImage ? { image: currentDraft.firstImage, thumbnail: currentDraft.firstThumbnail, width: currentDraft.firstWidth, height: currentDraft.firstHeight } : await captureFrameAtTime(startTime);
      const lastFrame = currentDraft.lastImage ? { image: currentDraft.lastImage, thumbnail: currentDraft.lastThumbnail, width: currentDraft.lastWidth, height: currentDraft.lastHeight } : await captureFrameAtTime(endTime);
      applyShotEditorFrames(entry, startTime, endTime, firstFrame, lastFrame);
      if (keeper) {
        keeper.time = nextStart;
        keeper.timecode = formatTime(nextStart);
        keeper.lastFrameImage = '';
        keeper.lastFrameThumbnail = '';
        const nextFrame = await captureFrameAtTime(nextStart);
        if (nextFrame) {
          keeper.image = nextFrame.image;
          keeper.imageThumbnail = nextFrame.thumbnail;
          keeper.width = nextFrame.width;
          keeper.height = nextFrame.height;
        }
      }
      if (swallowed.length) {
        const removed = new Set(swallowed);
        const normalized = normalizeShotState(entries.filter(item => !removed.has(item)), getGroups(), { duration: getDuration() });
        setEntries(normalized.entries);
        setGroups(normalized.shotGroups);
        swallowed.forEach(item => clearShotHeight(item.shotId));
        if (!history) deleteScreenshotAssets(getCurrentProjectId?.(), swallowed.map(item => item.shotId)).catch(() => {});
      } else {
        const normalized = normalizeShotState(entries, getGroups(), { duration: getDuration() });
        setEntries(normalized.entries);
        setGroups(normalized.shotGroups);
      }
      renderShots();
      setActiveShot(entry.shotNumber);
      markDirty();
      recordEntriesChange(beforeEntries, getEntries?.() || [], entry.shotNumber);
      close();
      showToast(swallowed.length ? `第 ${entry.shotNumber} 个分镜已更新，吞并了 ${swallowed.length} 个分镜` : `第 ${entry.shotNumber} 个分镜已更新`, 'success');
      return true;
    } finally {
      busy = false;
      if (saveButton) { saveButton.disabled = false; saveButton.textContent = '更新'; }
    }
  };

  const split = async () => {
    if (!draft || busy) return false;
    const currentDraft = draft;
    const startTime = clampTime(currentDraft.firstTime);
    const endTime = clampTime(currentDraft.lastTime);
    if (endTime < startTime) { showToast('尾帧不能早于首帧', 'warning'); return false; }
    const entries = getEntries?.() || [];
    const beforeEntries = cloneEntries(entries);
    const range = getShotEditorSplitRange(entries, currentDraft, getFrameStep(), video?.duration);
    if (!range) { showToast('尾帧之后没有可拆分的区间', 'warning'); return false; }
    const entry = entries.find(item => item.shotNumber === currentDraft.shotNumber);
    if (!entry) { close(); return false; }
    const { swallowed } = getShotEditorTailBoundary(entries, { ...currentDraft, lastTime: endTime }, getFrameStep(), video?.duration);
    busy = true;
    if (splitButton) { splitButton.disabled = true; splitButton.textContent = '拆分中...'; }
    if (saveButton) saveButton.disabled = true;
    try {
      const firstFrame = currentDraft.firstImage ? { image: currentDraft.firstImage, thumbnail: currentDraft.firstThumbnail, width: currentDraft.firstWidth, height: currentDraft.firstHeight } : await captureFrameAtTime(startTime);
      const lastFrame = currentDraft.lastImage ? { image: currentDraft.lastImage, thumbnail: currentDraft.lastThumbnail, width: currentDraft.lastWidth, height: currentDraft.lastHeight } : await captureFrameAtTime(endTime);
      applyShotEditorFrames(entry, startTime, endTime, firstFrame, lastFrame);
      const newEntry = createSplitShotEntry(range.start, range.end, await captureFrameAtTime(range.start));
      const removed = new Set(swallowed);
      const remaining = entries.filter(item => !removed.has(item));
      swallowed.forEach(item => clearShotHeight(item.shotId));
      if (swallowed.length && !history) deleteScreenshotAssets(getCurrentProjectId?.(), swallowed.map(item => item.shotId)).catch(() => {});
      const normalized = normalizeShotState([...remaining, newEntry], getGroups(), { duration: getDuration() });
      setEntries(normalized.entries);
      setGroups(normalized.shotGroups);
      renderShots();
      setActiveShot(newEntry.shotNumber);
      markDirty();
      recordEntriesChange(beforeEntries, getEntries?.() || [], newEntry.shotNumber);
      close();
      showToast(swallowed.length ? `已拆分出第 ${newEntry.shotNumber} 个分镜，吞并了 ${swallowed.length} 个分镜` : `已拆分出第 ${newEntry.shotNumber} 个分镜`, 'success');
      return true;
    } finally {
      busy = false;
      if (splitButton) { splitButton.disabled = false; splitButton.textContent = '拆分分镜'; }
      if (saveButton) saveButton.disabled = false;
    }
  };

  const switchEditor = async direction => {
    if (!draft || busy) return;
    const navigation = getShotEditorNavigation(getEntries?.() || [], draft);
    const target = navigation.ordered[navigation.index + direction];
    if (!target) return;
    try {
      const saved = await save();
      if (!saved || !(getEntries?.() || []).includes(target)) return;
      setActiveShot(target.shotNumber);
      await open(target);
    } catch (error) {
      console.error('切换分镜失败:', error);
      showToast('保存当前分镜失败，未切换', 'error');
    }
  };

  const open = async entry => {
    if (!entry || !modal) return;
    updateDurations();
    const defaultLastTime = getShotEditorDefaultLastTime(getEntries?.() || [], entry, video?.duration, getFrameStep());
    draft = createShotEditorDraft(entry, defaultLastTime);
    originalParent = video?.parentNode || null;
    originalNextSibling = video?.nextSibling || null;
    originalStyle = video?.style.cssText || '';
    originalTime = video?.currentTime || 0;
    wasPlaying = !!(video && !video.paused);
    render();
    modal.classList.add('show');
    if (video && videoContainer) {
      video.pause();
      videoContainer.appendChild(video);
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.maxHeight = '100%';
      video.style.objectFit = 'contain';
      setVideoTime(draft.startTime);
    }
    busy = true;
    if (saveButton) saveButton.disabled = true;
    if (splitButton) splitButton.disabled = true;
    try { await refreshFrames(draft); }
    finally {
      if (draft) busy = false;
      if (saveButton) saveButton.disabled = false;
      updateNavigation();
    }
  };

  const bind = () => bindShotEditorEvents({
    elements: {
      modal,
      closeButton,
      cancelButton,
      saveButton,
      splitButton,
      previousShotButton,
      nextShotButton,
      previousFrameButton,
      nextFrameButton,
      backSecondButton,
      forwardSecondButton,
      playPauseButton,
      firstPreviousButton,
      firstNextButton,
      lastPreviousButton,
      lastNextButton,
      firstBackSecondButton,
      firstForwardSecondButton,
      lastBackSecondButton,
      lastForwardSecondButton
    },
    video,
    documentTarget,
    getDraft: () => draft,
    getFrameStep,
    onClose: close,
    onSave: save,
    onSplit: split,
    onPrevious: () => switchEditor(-1),
    onNext: () => switchEditor(1),
    onSetVideoTime: setVideoTime,
    onSetFrame: setFrame
  });

  return {
    bind,
    open,
    close,
    render,
    getDraft: () => draft,
    getFrameStep,
    isBusy: () => busy,
    isOpen: () => !!modal?.classList.contains('show')
  };
}
