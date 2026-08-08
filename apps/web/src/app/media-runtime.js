import { IMAGE_WORKER_SOURCE } from '../features/auto-shot/worker-source.js';
import { createSceneDetector as createWorkerSceneDetector } from '../dom/scene-detector.js';
import {
  AUTO_SHOT_SEGMENT_DURATION,
  createAutoShotEntry,
  createAutoShotSegmentState,
  filterAutoShotCuts,
  formatAutoShotSegmentRange,
  getAutoShotSegmentRange,
  hasMoreAutoShotSegments
} from '../features/auto-shot/segment-runner.js';
import { completeAutoShotSegment } from '../features/auto-shot/state.js';
import { createShotModalController } from '../dom/shot-modals.js';
import { createRecordingConfigController } from '../dom/recording-config.js';
import { createShotAutoCorrectController } from '../dom/shot-auto-correct.js';
import { createOverlayController } from '../dom/overlay-controller.js';
import { createScreenshotCaptureController } from '../dom/screenshot-capture.js';
import { createCaptureController } from '../dom/capture-controller.js';
import { createShotEditorController } from '../dom/shot-editor-controller.js';
import { createWaveformController } from '../dom/waveform-controller.js';
import { createScreenshotController } from '../dom/screenshot-controller.js';
import { createAutoShotController } from '../dom/auto-shot-controller.js';
import { createVideoSessionController } from '../dom/video-session.js';
import { bindPlayerSession } from '../dom/player-session.js';
import { createMonitorController } from '../dom/monitor-controller.js';
import { bindVideoShortcuts } from '../dom/video-shortcuts.js';
import { createSegmentPlaybackController } from '../dom/segment-playback.js';
import { createPlayerController } from '../features/player/player-controller.js';
import {
  createPlayerState,
  setPlayerPlaybackRate,
  updatePlayerStateFromVideo
} from '../features/player/player-state.js';
import { getSupportedRecordingMimeType } from '../features/player/media-capabilities.js';
import {
  getRecordingConfig,
  getRecordingQualityPreset,
  getRecordingVideoBitrate
} from '../features/recording/recording-service.js';
import { createRecordingRuntime } from './recording-runtime.js';
import { createPlaybackRateController } from '../dom/playback-rate.js';
import { getEntryThumbnail } from '../utils/shots.js';
import { getScreenshotAssetKey } from '../utils/screenshot.js';
import { getShotsMissingScreenshots, applyShotScreenshot } from '../features/shots/shot-screenshots.js';
import {
  ensureEntryThumbnails,
  hydrateEntryFullScreenshots,
  releaseHydratedScreenshotUrls,
  dataUrlToBlob
} from '../dom/screenshot-service.js';
import { loadProjectScreenshotAssets, saveProjectScreenshotAssets } from '../features/screenshots/screenshot-assets.js';
import {
  runScreenshotWorkflow,
  yieldToScreenshotWorkflow
} from '../features/screenshots/screenshot-workflow.js';
import { resetScreenshotBatchState } from '../features/screenshots/screenshot-state.js';
import { createWorkerClient as createImageWorkerClient } from '../features/auto-shot/worker-client.js';
import { waitForVideoSeek } from '../features/player/video-seek.js';
import { getShotSegmentPlaybackEnd as calculateShotSegmentPlaybackEnd } from '../features/shots/shot-boundaries.js';
import { updateShots } from '../features/shots/shot-update-pipeline.js';
import {
  clampPlaybackTime,
  estimateFrameRateFromDuration,
  normalizePlaybackRate
} from '../utils/player.js';
import { getActionDefinition } from './action-catalog.js';

export function createMediaRuntime({
  elements = {},
  video,
  runtimeState,
  audioWaveformState,
  autoShotSessionController,
  projectContext,
  savedPlaybackRate = 1,
  getSettings,
  saveSettings,
  formatTime,
  parseTimecode,
  showToast,
  markDirty,
  history = null,
  actionRegistry = null,
  createShotEntry,
  getNextShotNumber,
  getEntries,
  setEntries,
  getShotGroups = () => [],
  setShotGroups = () => {},
  getCurrentProjectId,
  updateProjectRecord,
  getTimelineViewState = () => projectContext?.getTimelineViewState?.() || null,
  setTimelineViewState = () => {},
  restoreProjectVideo,
  saveProjectVideo,
  setCurrentProject,
  getExportController = () => null,
  getShotListController = () => null,
  getShotTableController = () => null,
  getRenderShots = () => {},
  getSetActiveShot = () => {},
  getUpdateDurations = () => {},
  getUpdateVideoInfo = () => {},
  getSyncShotTable = () => {},
  getFlushShotsToDB = () => Promise.resolve(),
  getShowProgress = () => {},
  getUpdateProgress = () => {},
  getUpdateDetectionProgress = () => {},
  getHideProgress = () => {},
  getRecordingDownload = (...args) => getExportController()?.download?.(...args),
  getConfiguredColumns = () => [],
  getCellValue = () => '',
  getTemplateEntryValue = () => '',
  getShotGroupMembers = () => [],
  getVisibleFields = () => [],
  estimateStorage = async () => ({ available: Infinity }),
  documentTarget = document,
  windowTarget = window,
  localStorageTarget = localStorage,
  clearShotHeight = () => {},
  getCurrentVideoFile = () => runtimeState.currentVideoFile,
  setCurrentVideoFile = file => { runtimeState.currentVideoFile = file; },
  setDecodeFailed = value => { runtimeState.videoDecodeFailed = value; }
} = {}) {
  const autoShotStateController = autoShotSessionController;
  const autoShotSignatureCache = autoShotStateController.getSignatureCache();
  const imageProcessingClient = createImageWorkerClient(IMAGE_WORKER_SOURCE);
  const getImageProcessingWorker = imageProcessingClient.getWorker;
  const runImageProcessingTask = imageProcessingClient.runTask;
  let segmentPlaybackController = null;
  let autoShotController = null;

  const shotModalController = createShotModalController({
    video,
    elements: {
      imageModal: elements.imageModal,
      modalImage: elements.modalImage,
      infoTime: elements.infoTime,
      infoShot: elements.infoShot,
      imageModalClose: elements.imageModalClose,
      rangeModal: elements.rangeModal,
      rangeAutoShotDiff: elements.rangeAutoShotDiff,
      rangeAutoShotDiffValue: elements.rangeAutoShotDiffValue,
      rangeAutoShotMinGap: elements.rangeAutoShotMinGap,
      rangeClose: elements.rangeClose
    },
    getSettings,
    saveSettings,
    formatTime,
    parseTimecode,
    onStartAutoShot: (...args) => autoShotController?.start(...args),
    showToast,
    documentTarget
  });
  shotModalController.bind();

  const recordingConfigController = createRecordingConfigController({
    elements: {
      modal: elements.recordingConfigModal,
      closeButton: elements.recordingConfigModalClose,
      stats: elements.recordingConfigStats,
      warning: elements.recordingConfigWarning,
      cancelButton: elements.recordingConfigCancelBtn,
      confirmButton: elements.recordingConfigConfirmBtn
    },
    getSettings,
    getConfig: getRecordingConfig,
    getQualityPreset: getRecordingQualityPreset,
    getVideoBitrate: getRecordingVideoBitrate,
    getSupportedMimeType: getSupportedRecordingMimeType,
    showToast,
    documentTarget
  });
  recordingConfigController.bind();

  const overlayController = createOverlayController({
    canvas: elements.overlayCanvas,
    video,
    button: elements.overlayBtn,
    menu: elements.overlayMenu,
    documentTarget,
    windowTarget,
    showToast
  });
  overlayController.bind();

  const screenshotCaptureController = createScreenshotCaptureController({
    overlayCanvas: elements.overlayCanvas,
    getOverlayMode: overlayController.getMode,
    getShapes: overlayController.getShapes,
    lineColor: 'rgba(255,255,255,0.7)',
    lineDash: [6, 4],
    processImage: (payload, transfer) => runImageProcessingTask('compress', payload, transfer)
  });
  const createScreenshotVariants = screenshotCaptureController.createVariants;

  const captureController = createCaptureController({
    button: elements.captureBtn,
    video,
    createScreenshotVariants,
    createShotEntry,
    getNextShotNumber,
    getEntries,
    setEntries,
    getGroups: getShotGroups,
    setGroups: setShotGroups,
    getDuration: () => video?.duration || 0,
    addEntry: entry => runtimeState.entries.push(entry),
    renderShots: getRenderShots,
    setActiveShot: getSetActiveShot,
    markDirty,
    history,
    invokeAction: actionRegistry ? (id, args) => actionRegistry.invoke(id, args) : null,
    estimateStorage,
    documentTarget,
    windowTarget
  });
  captureController.bind();

  const shotEditorController = createShotEditorController({
    elements: elements.shotEditor,
    video,
    documentTarget,
    windowTarget,
    getEntries,
    setEntries,
    getGroups: getShotGroups,
    setGroups: setShotGroups,
    getDuration: () => video?.duration || 0,
    getCurrentProjectId,
    deleteScreenshotAssets: elements.deleteScreenshotAssets,
    clearShotHeight: shotId => clearShotHeight(shotId),
    getFrameRate: () => estimateFrameRateFromDuration(video?.duration),
    updateDurations: getUpdateDurations,
    createScreenshotVariants,
    waitForVideoReady: elements.waitForVideoReady,
    waitForVideoSeek,
    renderShots: getRenderShots,
    setActiveShot: getSetActiveShot,
    history,
    markDirty,
    syncOverlaySize: overlayController.syncSize,
    showToast
  });
  shotEditorController.bind();

  let seekToTime = (time, shouldStop = true) => {
    if (video) video.currentTime = time;
  };
  const waveformController = createWaveformController({
    video,
    elements: {
      panel: elements.audioWaveformPanel,
      track: elements.audioWaveformTrack,
      canvas: elements.audioWaveformCanvas,
      empty: elements.audioWaveformEmpty,
      cutStatus: elements.audioWaveformCutStatus,
      ruler: elements.audioWaveformRuler,
      playhead: elements.audioWaveformPlayhead,
      zoomLabel: elements.audioWaveformZoomLabel,
      zoomOut: elements.audioWaveformZoomOut,
      zoomIn: elements.audioWaveformZoomIn,
      fitButton: elements.audioWaveformFit,
      followButton: elements.audioWaveformFollow,
      retryButton: elements.audioWaveformRetry
    },
    state: audioWaveformState,
    getEntries,
    getShotGroups,
    onSelectShot: entry => getSetActiveShot?.(entry?.shotNumber),
    getFrameStep: shotEditorController.getFrameStep,
    stopSegmentPlayback: shouldPause => segmentPlaybackController?.stop(shouldPause),
    seek: (time, shouldStop) => seekToTime(time, shouldStop),
    syncShotTable: getSyncShotTable,
    getTimelineViewState,
    onTimelineViewStateChange: setTimelineViewState,
    documentTarget,
    windowTarget,
    onCutPointChange: (entry, time, { commit = false, cancel = false } = {}) => {
      if (!entry?.shotId) return;
      const beforeTime = entry.__cutPointBefore ?? entry.time;
      if (cancel) {
        entry.time = beforeTime;
        entry.timecode = formatTime(entry.time);
        delete entry.__cutPointBefore;
        getRenderShots?.();
        return;
      }
      if (entry.__cutPointBefore === undefined) entry.__cutPointBefore = Number(entry.time) || 0;
      entry.time = Math.max(0, Number(time) || 0);
      entry.timecode = formatTime(entry.time);
      if (commit) {
        const afterTime = entry.time;
        delete entry.__cutPointBefore;
        const beforeEntries = getEntries().map(item => ({ ...item, custom: { ...(item.custom || {}) } }));
        const apply = nextTime => {
          const result = updateShots(beforeEntries, [{ shotId: entry.shotId, patch: { time: nextTime } }], {
            duration: video?.duration || 0,
            groups: getShotGroups()
          });
          setEntries(result.entries);
          setShotGroups(result.shotGroups);
          getUpdateDurations?.();
          getRenderShots?.();
          markDirty?.();
        };
        if (history && beforeTime !== afterTime) {
          const afterEntries = updateShots(beforeEntries, [{ shotId: entry.shotId, patch: { time: afterTime } }], { duration: video?.duration || 0, groups: getShotGroups() });
          history.record(history.createSnapshotCommand({
            label: '拖动分镜切点',
            before: { entries: beforeEntries, groups: getShotGroups() },
            after: { entries: afterEntries.entries, groups: afterEntries.shotGroups },
            apply: snapshot => { setEntries(snapshot.entries); setShotGroups(snapshot.groups); getUpdateDurations?.(); getRenderShots?.(); markDirty?.(); }
          }));
        } else apply(afterTime);
      }
    }
  });
  waveformController.bind();

  const screenshotController = createScreenshotController({
    video,
    updateButton: elements.updateScreenshotBtn,
    getEntries,
    getActiveShotNumber: () => runtimeState.activeShotNumber,
    createScreenshotVariants,
    dataUrlToBlob,
    applyShotScreenshot,
    renderShots: getRenderShots,
    markDirty,
    showToast,
    waitForVideoSeek,
    waitForVideoReady: elements.waitForVideoReady,
    ensureEntryThumbnails,
    loadProjectScreenshotAssets,
    hydrateEntryFullScreenshots,
    releaseHydratedScreenshots: releaseHydratedScreenshotUrls,
    getShotsMissingScreenshots,
    getScreenshotAssetKey,
    saveScreenshotAssets: saveProjectScreenshotAssets,
    getCurrentProjectId,
    flushShotsToDB: getFlushShotsToDB,
    runScreenshotWorkflow,
    yieldToScreenshotWorkflow,
    screenshotAbort: runtimeState.screenshotAbort,
    getScreenshotPaused: () => runtimeState.screenshotPaused,
    setScreenshotPaused: value => { runtimeState.screenshotPaused = value; },
    resetScreenshotBatchState,
    history,
    invokeAction: actionRegistry ? (id, args) => actionRegistry.invoke(id, args) : null,
    estimateStorage,
    showProgress: getShowProgress,
    hideProgress: getHideProgress,
    updateProgress: getUpdateProgress,
    playCaptureShutterAnimation: (...args) => captureController.playShutterAnimation(...args),
    isGenerating: () => runtimeState.generatingScreenshots,
    setGenerating: value => { runtimeState.generatingScreenshots = value; }
  });
  const screenshotActions = {
    generateAll: screenshotController.generateAll,
    ensureLoaded: screenshotController.ensureLoaded,
    generateTargets: screenshotController.generateTargets,
    updateEntry: screenshotController.updateEntry,
    updateActive: screenshotController.updateActive,
    prepareCapture: screenshotController.prepareCapture,
    restoreCapture: screenshotController.restoreCapture
  };
  screenshotController.bind();

  autoShotController = createAutoShotController({
    button: elements.autoShotBtnMeta,
    video,
    getState: autoShotStateController.getState,
    setState: autoShotStateController.setState,
    getSettings,
    isAutoDetecting: () => runtimeState.autoDetecting,
    setAutoDetecting: value => { runtimeState.autoDetecting = value; },
    isGeneratingScreenshots: () => runtimeState.generatingScreenshots,
    getScreenshotAbortState: () => runtimeState.screenshotAbort,
    getActiveDetector: () => runtimeState.activeSceneDetector,
    setActiveDetector: value => { runtimeState.activeSceneDetector = value; },
    getEntries,
    setEntries,
    getGroups: getShotGroups,
    setGroups: setShotGroups,
    getDuration: () => video?.duration || 0,
    createState: createAutoShotSegmentState,
    getSegmentRange: getAutoShotSegmentRange,
    hasMoreSegments: hasMoreAutoShotSegments,
    completeSegment: completeAutoShotSegment,
    filterCuts: filterAutoShotCuts,
    createEntry: createAutoShotEntry,
    createDetector: createWorkerSceneDetector,
    getFrameRate: () => estimateFrameRateFromDuration(video.duration),
    waitForVideoReady: elements.waitForVideoReady,
    waitForVideoSeek,
    getWorker: (...args) => getImageProcessingWorker(...args),
    runWorkerTask: (...args) => runImageProcessingTask(...args),
    getSignatureCache: () => autoShotSignatureCache,
    getCacheKey: autoShotStateController.getSignatureCacheKey,
    pruneSignatureCache: autoShotStateController.pruneSignatureCache,
    generateScreenshots: screenshotActions.generateTargets,
    formatRange: formatAutoShotSegmentRange,
    segmentDuration: AUTO_SHOT_SEGMENT_DURATION,
    showProgress: getShowProgress,
    updateProgress: getUpdateProgress,
    updateDetectionProgress: getUpdateDetectionProgress,
    hideProgress: getHideProgress,
    renderShots: getRenderShots,
    setActiveShot: getSetActiveShot,
    markDirty,
    history,
    persistState: autoShotStateController.persistState,
    updateCard: elements.updateAutoShotCard,
    revealContinuationCard: () => getShotListController()?.revealContinuationCard?.(),
    openRange: shotModalController.openRange,
    invokeAction: actionRegistry ? (id, args) => actionRegistry.invoke(id, args) : null,
    showToast
  });
  autoShotController.bind();

  const recordingRuntime = createRecordingRuntime({
    elements: {
      recordButton: elements.recordVideoBtn,
      modal: elements.recordingModal,
      modalTitle: elements.recordingModalTitle,
      statusLine: elements.recordingStatusLine,
      statusText: elements.recordingStatusText,
      timeText: elements.recordingTimeText,
      progressInner: elements.recordingProgressInner,
      pauseButton: elements.recordingPauseBtn,
      cancelButton: elements.recordingCancelBtn,
      closeButton: elements.recordingModalClose
    },
    video,
    getEntries,
    getColumns: getConfiguredColumns,
    getCellValue,
    getThumbnail: getEntryThumbnail,
    getSettings,
    openConfig: () => recordingConfigController.openForRecording(),
    updateDurations: getUpdateDurations,
    download: getRecordingDownload,
    showToast,
    enableVideoButtons: elements.enableVideoButtons,
    isVideoDecodeFailed: () => runtimeState.videoDecodeFailed
  });
  const recordingState = recordingRuntime.state;

  const videoSession = createVideoSessionController({
    video,
    emptyElement: elements.videoEmpty,
    fileInput: elements.loadVideoInput,
    loadButton: elements.loadVideoBtn,
    getProjectContext: projectContext.getVideoContext,
    setProjectVideoName: (videoFileName, project = null) => {
      if (projectContext.getId()) {
        setCurrentProject(projectContext.getId(), project?.title || projectContext.getTitle(), {
          videoFileName,
          projectUuid: project?.projectUuid || projectContext.getUuid()
        });
      } else projectContext.setVideoFileName(videoFileName);
    },
    setCurrentVideoFile,
    getCurrentVideoFile,
    stopRecording: () => recordingRuntime.controller?.stop(),
    clearAutoShotCache: autoShotStateController.clearSignatureCache,
    resetAutoShot: autoShotStateController.resetState,
    resetWaveform: waveformController.reset,
    prepareWaveform: waveformController.prepare,
    updateVideoInfo: getUpdateVideoInfo,
    disableVideoButtons: elements.disableVideoButtons,
    enableVideoButtons: elements.enableVideoButtons,
    setDecodeFailed,
    updateProjectRecord,
    restoreProjectVideo,
    saveProjectVideo,
    showToast,
    documentTarget,
    windowTarget
  });
  videoSession.bind();

  const segmentPlayback = createSegmentPlaybackController({
    video,
    getEntries,
    getFrameRate: () => playerState.frameRate || estimateFrameRateFromDuration(video.duration),
    clampPlaybackTime: time => clampPlaybackTime(time, playerState.duration || video.duration),
    getSegmentEnd: entry => calculateShotSegmentPlaybackEnd(getEntries(), entry, video?.duration, shotEditorController.getFrameStep()),
    getFrameStep: shotEditorController.getFrameStep,
    setActiveShot: getSetActiveShot,
    syncShotTable: getSyncShotTable,
    getTimelineViewState,
    restoreTimelineViewState: waveformController.restoreViewState,
    persistTimelineViewState: waveformController.persistViewState,
    getOverlayMode: overlayController.getMode,
    showToast
  });
  segmentPlaybackController = segmentPlayback;
  const { getFps, clampTime, stop: stopShotSegmentPlayback, play: playShotSegment, toggle: toggleVideoPlayback } = segmentPlayback;
  const playbackRate = normalizePlaybackRate(savedPlaybackRate);
  const playerState = createPlayerState({ playbackRate });
  const playerController = createPlayerController({
    video,
    getFrameRate: () => playerState.frameRate,
    clampTime,
    stopSegmentPlayback: stopShotSegmentPlayback,
    isSegmentPlaybackActive: segmentPlayback.isActive,
    refreshAfterSeek: waveformController.refreshAfterSeek,
    togglePlayback: toggleVideoPlayback
  });
  seekToTime = (time, shouldStop = true) => playerController.seekTo(time, shouldStop);
  const registerAction = (id, handler, options = {}) => actionRegistry?.register(id, handler, {
    ...options,
    metadata: getActionDefinition(id)
  });
  const videoAvailable = () => !!video?.src;
  registerAction('playback.toggle', () => playerController.togglePlayPause(), { isActive: videoAvailable, getDisabledReason: () => '加载视频后可用' });
  registerAction('playback.stepBack', () => playerController.stepFrame(-1), { isActive: videoAvailable, getDisabledReason: () => '加载视频后可用' });
  registerAction('playback.stepForward', () => playerController.stepFrame(1), { isActive: videoAvailable, getDisabledReason: () => '加载视频后可用' });
  registerAction('playback.jumpBack', () => playerController.jump(-1), { isActive: videoAvailable, getDisabledReason: () => '加载视频后可用' });
  registerAction('playback.jumpForward', () => playerController.jump(1), { isActive: videoAvailable, getDisabledReason: () => '加载视频后可用' });
  registerAction('shot.capture', ({ canvas, time } = {}) => canvas
    ? captureController.captureCanvas(canvas, time)
    : captureController.capture(), {
    isActive: () => !!video?.src && video.readyState >= 2
  });
  registerAction('shot.updateScreenshot', () => screenshotController.updateActive(), {
    isActive: () => !!video?.src && video.readyState >= 2 && runtimeState.activeShotNumber != null
  });
  registerAction('shot.autoDetect', () => autoShotController.openRange(), {
    isActive: () => !!video?.src && video.readyState >= 2 && !runtimeState.autoDetecting && !runtimeState.generatingScreenshots,
    getDisabledReason: () => !video?.src ? '加载视频后可用' : '当前有其他批处理任务正在运行'
  });
  registerAction('shot.split', () => shotEditorController.split(), {
    isActive: () => shotEditorController.isOpen() && !runtimeState.autoDetecting && !runtimeState.generatingScreenshots,
    getDisabledReason: () => '打开分镜详细编辑器后可用'
  });
  bindPlayerSession({
    elements: {
      stage: elements.videoStage,
      currentTimeLabel: elements.playerCurrentTime,
      durationLabel: elements.playerDuration,
      stepBackFrameButton: elements.stepBackFrameBtn,
      stepForwardFrameButton: elements.stepForwardFrameBtn,
      jumpBackButton: elements.jumpBack1sBtn,
      jumpForwardButton: elements.jumpForward1sBtn,
      playPauseButton: elements.playPauseBtn,
      audioWaveformTrack: elements.audioWaveformTrack
    },
    video,
    playerController,
    playerState,
    audioWaveformState,
    updatePlayerState: updatePlayerStateFromVideo,
    startFrameRateSampling: elements.startFrameRateSampling,
    syncPlayhead: waveformController.syncPlayhead,
    renderWaveform: waveformController.render,
    resetFrameRateSampling: elements.resetFrameRateSampling,
    updateVideoInfo: getUpdateVideoInfo,
    updateAutoShotCard: elements.updateAutoShotCard,
    followPlayback: waveformController.followPlayback,
    scheduleWaveformRender: waveformController.scheduleRender,
    seek: (time, shouldStop) => seekToTime(time, shouldStop),
    syncShotTable: getSyncShotTable,
    formatTime,
    invokeAction: actionRegistry ? (id, args) => actionRegistry.invoke(id, args) : null,
    isShotEditorOpen: shotEditorController.isOpen
  });
  createMonitorController({
    surface: elements.monitorSurface,
    zoomSelect: elements.monitorZoomSelect,
    video,
    overlayCanvas: elements.overlayCanvas,
    syncOverlay: overlayController.syncSize,
    windowTarget
  }).bind();
  createPlaybackRateController({
    select: elements.playbackRateSelect,
    video,
    state: playerState,
    normalizeRate: normalizePlaybackRate,
    setRate: setPlayerPlaybackRate,
    savedRate: savedPlaybackRate,
    storage: localStorageTarget
  }).bind();
  bindVideoShortcuts({
    video,
    documentTarget,
    clampTime,
    getFrameRate: getFps,
    refreshAfterSeek: waveformController.refreshAfterSeek,
    onCapture: captureController.captureCanvas,
    invokeAction: actionRegistry ? (id, args) => actionRegistry.invoke(id, args) : null
  });

  const shotAutoCorrectController = createShotAutoCorrectController({
    video,
    waitForVideoSeek,
    scheduleRowSync: entry => getShotTableController()?.scheduleRowSync?.(entry),
    formatTime,
    showToast,
    windowTarget,
    documentTarget
  });

  return {
    shotModalController,
    recordingConfigController,
    shotAutoCorrectController,
    overlayController,
    createScreenshotVariants,
    captureController,
    shotEditorController,
    waveformController,
    screenshotController,
    screenshotActions,
    autoShotController,
    videoSession,
    getCurrentVideoFileName: videoSession.getCurrentVideoFileName,
    clearCurrentVideo: videoSession.clearCurrentVideo,
    loadVideoFile: videoSession.loadVideoFile,
    restoreVideoFromProjectStorage: videoSession.restoreVideoFromProjectStorage,
    recordingState,
    recordingTable: recordingRuntime.table,
    recordingController: recordingRuntime.controller,
    isRecordingCaptureActive: recordingRuntime.isActive,
    stopRecordingCaptureController: recordingRuntime.stop,
    toggleRecordingPauseController: recordingRuntime.togglePause,
    segmentPlaybackController: segmentPlayback,
    playerState,
    updatePlayerState: updatePlayerStateFromVideo,
    getFps,
    clampTime,
    stopShotSegmentPlayback,
    playShotSegment,
    toggleVideoPlayback,
    getImageProcessingWorker,
    runImageProcessingTask,
    terminateImageProcessingWorker: imageProcessingClient.terminate,
    ensureLoadedProjectScreenshots: screenshotActions.ensureLoaded,
    releaseLoadedProjectScreenshots: screenshotController.releaseLoaded,
    waitForScreenshotBatch: screenshotController.waitForIdle,
    generateScreenshotsForAllEntries: screenshotActions.generateAll,
    updateEntryScreenshot: screenshotActions.updateEntry
  };
}
