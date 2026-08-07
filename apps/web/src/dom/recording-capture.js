import { waitForVideoSeek } from '../features/player/video-seek.js';
import {
  getSupportedRecordingMimeType,
  supportsCanvasRecording
} from '../features/player/media-capabilities.js';
import {
  getRecordingQualityPreset,
  getRecordingVideoBitrate
} from '../features/recording/recording-service.js';
import {
  createRecordingState,
  prepareRecordingState,
  resetRecordingState,
  setRecordingPaused,
  transitionRecordingState
} from '../features/recording/recording-state.js';
import { messages } from '../app/messages.js';
import { formatUserError, normalizeAppError } from '../app/diagnostics.js';
import {
  attachRecordingAudio,
  releaseRecordingAudio,
  unmuteRecordingAudio
} from '../features/recording/recording-audio.js';
import {
  createRecordingRecorder,
  createRecordingChunkCollector,
  startRecordingRecorder
} from '../features/recording/recording-media.js';
import { createRecordingOutput } from '../features/recording/recording-output.js';
import {
  cancelRecordingFrame,
  renderRecordingFrame,
  scheduleRecordingFrame
} from '../features/recording/recording-loop.js';

export function createRecordingCaptureController({
  video,
  recordButton,
  modal,
  modalTitle,
  statusLine,
  statusText,
  timeText,
  progressInner,
  pauseButton,
  getSettings,
  openConfig,
  updateDurations,
  prepareTableCache,
  preloadTableImages,
  drawRecordingFrame,
  download,
  showToast,
  enableVideoButtons,
  isVideoDecodeFailed = () => false,
  state = null,
  documentTarget = document
} = {}) {
  const recordingState = state || createRecordingState();

  const formatTime = seconds => {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  };

  const updateModal = () => {
    if (!timeText || !progressInner) return;
    const duration = Number(video?.duration) || 0;
    const current = Number(video?.currentTime) || 0;
    const preparing = recordingState.active && !recordingState.started;
    timeText.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    progressInner.style.width = `${duration > 0 ? Math.min(100, current / duration * 100) : 0}%`;
    if (statusText) statusText.textContent = preparing ? '正在稳定首帧' : recordingState.paused ? '已暂停' : '录制中';
    if (statusLine) statusLine.classList.toggle('paused', recordingState.paused);
    if (pauseButton) {
      pauseButton.disabled = preparing;
      pauseButton.textContent = recordingState.paused ? '继续录制' : '暂停';
    }
  };

  const openModal = () => {
    updateModal();
    modal?.classList.add('show');
  };

  const closeModal = () => modal?.classList.remove('show');

  const startProgressTimer = () => {
    if (recordingState.progressTimer) clearInterval(recordingState.progressTimer);
    recordingState.progressTimer = setInterval(updateModal, 150);
  };

  const stopProgressTimer = () => {
    if (recordingState.progressTimer) clearInterval(recordingState.progressTimer);
    recordingState.progressTimer = 0;
  };

  const requestCanvasFrame = () => {
    if (!recordingState.manualFrameCapture || !recordingState.videoTrack) return;
    try { recordingState.videoTrack.requestFrame(); } catch (error) { console.warn('录制画布帧提交失败:', error); }
  };

  const drawFrame = () => {
    if (!recordingState.context || !recordingState.canvas) return;
    drawRecordingFrame?.(recordingState.context, recordingState);
  };

  let scheduleRender;
  const renderLoop = (timestamp = performance.now(), metadata = {}) => {
    const mediaTime = Number(metadata?.mediaTime);
    const currentTime = Number(video?.currentTime);
    recordingState.mediaTime = Number.isFinite(currentTime)
      ? currentTime
      : Number.isFinite(mediaTime) ? mediaTime : 0;
    renderRecordingFrame(
      recordingState,
      timestamp,
      drawFrame,
      requestCanvasFrame,
      scheduleRender
    );
  };

  scheduleRender = () => {
    scheduleRecordingFrame(recordingState, video, renderLoop, requestAnimationFrame);
  };

  const primeEncoder = async (coverFrame, duration = 350) => {
    const frameInterval = 1000 / recordingState.frameRate;
    const endTime = performance.now() + duration;
    do {
      if (!recordingState.active || !recordingState.context) return false;
      recordingState.context.putImageData(coverFrame, 0, 0);
      requestCanvasFrame();
      await new Promise(resolve => setTimeout(resolve, frameInterval));
    } while (performance.now() < endTime);
    return recordingState.active;
  };

  const attachAudio = stream => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    return attachRecordingAudio(recordingState, stream, video, AudioContextCtor);
  };

  const unmuteAudio = async () => {
    try { await unmuteRecordingAudio(recordingState); } catch (error) { console.warn('恢复录制声音失败:', error); }
  };

  const releaseAudio = () => {
    try { releaseRecordingAudio(recordingState); } catch (error) { console.warn('释放录制音频节点失败:', error); }
  };

  const waitForStableVideoFrame = () => new Promise(resolve => {
    let frameCount = 0;
    let settled = false;
    const finish = force => {
      frameCount++;
      if (!force && frameCount < 2 && typeof video?.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(() => finish(false));
        return;
      }
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve();
    };
    const timeoutId = setTimeout(() => finish(true), 500);
    if (typeof video?.requestVideoFrameCallback === 'function') video.requestVideoFrameCallback(() => finish(false));
    else requestAnimationFrame(() => requestAnimationFrame(() => finish(false)));
  });

  const waitForPlayback = (targetVideo, timeout = 1200) => new Promise((resolve, reject) => {
    if (!targetVideo) return reject(new Error('录制视频不存在'));
    const startTime = Number(targetVideo.currentTime) || 0;
    let settled = false;
    let timeoutId = 0;
    let frameId = 0;
    const cleanup = () => {
      targetVideo.removeEventListener('playing', checkProgress);
      targetVideo.removeEventListener('timeupdate', checkProgress);
      clearTimeout(timeoutId);
      if (frameId) cancelAnimationFrame(frameId);
    };
    const finish = error => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const checkProgress = () => {
      if (targetVideo.ended || (Number(targetVideo.currentTime) || 0) > startTime + 0.01) return finish();
      if (!settled) frameId = requestAnimationFrame(checkProgress);
    };
    targetVideo.addEventListener('playing', checkProgress);
    targetVideo.addEventListener('timeupdate', checkProgress);
    timeoutId = setTimeout(() => finish(new Error(messages.videoPlaybackFailed)), timeout);
    try { Promise.resolve(targetVideo.play()).then(checkProgress).catch(finish); } catch (error) { finish(error); }
  });

  const resetState = () => {
    const shouldRestartEndedVideo = !!video?.ended;
    cancelRecordingFrame(recordingState, video, cancelAnimationFrame);
    stopProgressTimer();
    recordingState.stream?.getTracks().forEach(track => track.stop());
    releaseAudio();
    resetRecordingState(recordingState);
    recordButton?.classList.remove('active');
    if (recordButton) {
      recordButton.title = '录制拉片视频';
      recordButton.setAttribute('aria-label', '录制拉片视频');
    }
    if (shouldRestartEndedVideo && video) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (_) {}
    }
    closeModal();
    updateModal();
    if (video?.src && !isVideoDecodeFailed()) enableVideoButtons?.();
  };

  const stop = ({ cancel = false } = {}) => {
    if (!recordingState.recorder) return;
    recordingState.cancelled = cancel;
    transitionRecordingState(recordingState, cancel ? 'cancel' : 'stop');
    cancelRecordingFrame(recordingState, video, cancelAnimationFrame);
    if (video && !video.ended) video.pause();
    if (['recording', 'paused'].includes(recordingState.recorder.state)) recordingState.recorder.stop();
    else resetState();
  };

  const togglePause = () => {
    const recorder = recordingState.recorder;
    if (!recordingState.active || !recordingState.started || !recorder) return;
    if (recordingState.paused) {
      if (recorder.state === 'paused') recorder.resume();
      setRecordingPaused(recordingState, false);
      unmuteAudio();
      video?.play().catch(() => {});
    } else {
      if (recordingState.audioGainNode) recordingState.audioGainNode.gain.value = 0;
      if (recorder.state === 'recording') recorder.pause();
      setRecordingPaused(recordingState, true);
      video?.pause();
    }
    updateModal();
  };

  const finishAndDownload = (chunks, mimeType) => {
    const output = createRecordingOutput(chunks, mimeType);
    if (!output) {
      resetState();
      showToast?.('录制文件为空', 'error');
      return;
    }
    download?.(output.filename, output.blob);
    resetState();
    showToast?.(output.extension === 'mp4' ? '录制完成，MP4 文件已开始下载' : '录制完成，WebM 文件已开始下载', 'success');
  };

  const start = async () => {
    if (recordingState.active) {
      stop();
      return;
    }
    if (!video?.src || video.readyState < 2) {
      showToast?.('请先加载可播放的视频', 'warning');
      return;
    }
    const selectedSettings = openConfig ? await openConfig() : null;
    if (openConfig && !selectedSettings) return;
    const settings = { ...(getSettings?.() || {}), ...(selectedSettings || {}) };
    const qualityPreset = getRecordingQualityPreset(settings.recordingQuality);
    const videoBitsPerSecond = getRecordingVideoBitrate(qualityPreset, settings.recordingFrameRate);
    if (settings.recordingFormat === 'mp4' && !getSupportedRecordingMimeType('mp4')) {
      openConfig?.();
      showToast?.('当前浏览器不支持原生 MP4 录制，已保留 WebM 作为可用格式', 'warning', 6000);
      return;
    }
    if (!supportsCanvasRecording()) {
      showToast?.('当前浏览器不支持画布录制', 'error');
      return;
    }
    updateDurations?.();
    prepareRecordingState(recordingState, {
      width: qualityPreset.width,
      height: qualityPreset.height,
      frameRate: settings.recordingFrameRate
    });
    let stage = '准备录制画布';
    prepareTableCache?.();
    stage = '准备录制截图';
    await preloadTableImages?.();
    if (video.ended) {
      video.pause();
      video.currentTime = 0;
      await waitForVideoSeek(video, 0);
    }
    if (video.currentTime < 0.15 && Number(video.duration) > 0.2) await waitForVideoSeek(video, 0.15);
    const canvas = document.createElement('canvas');
    canvas.width = recordingState.width;
    canvas.height = recordingState.height;
    let recorder = null;
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('当前浏览器无法创建录制画布');
      stage = '创建录制视频流';
      recordingState.canvas = canvas;
      recordingState.context = context;
      const recordingStartTime = video.currentTime;
      await waitForPlayback(video);
      await waitForStableVideoFrame();
      video.pause();
      if (!await waitForVideoSeek(video, recordingStartTime)) throw new Error('无法定位录制首帧');
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      recordingState.mediaTime = Number(video.currentTime) || 0;
      drawFrame();
      const coverFrame = context.getImageData(0, 0, canvas.width, canvas.height);
      let stream = canvas.captureStream(0);
      if (!stream?.getVideoTracks().length) throw new Error('当前浏览器无法创建画布视频流');
      let videoTrack = stream.getVideoTracks()[0];
      const manualFrameCapture = typeof videoTrack.requestFrame === 'function';
      if (!manualFrameCapture) {
        stream.getTracks().forEach(track => track.stop());
        stream = canvas.captureStream(recordingState.frameRate);
        videoTrack = stream.getVideoTracks()[0];
      }
      recordingState.stream = stream;
      recordingState.videoTrack = videoTrack;
      recordingState.manualFrameCapture = manualFrameCapture;
      context.putImageData(coverFrame, 0, 0);
      requestCanvasFrame();
      stage = '添加视频声音';
      attachAudio(stream);
      stage = '创建录制器';
      let recorderInfo;
      try {
        recorderInfo = createRecordingRecorder(stream, settings.recordingFormat, videoBitsPerSecond, MediaRecorder, getSupportedRecordingMimeType);
      } catch (recorderError) {
        stream.getAudioTracks().forEach(track => { stream.removeTrack(track); track.stop(); });
        releaseAudio();
        console.warn('带声音录制器创建失败，降级为无声录制:', recorderError);
        recorderInfo = createRecordingRecorder(stream, settings.recordingFormat, videoBitsPerSecond, MediaRecorder, getSupportedRecordingMimeType);
      }
      recorder = recorderInfo.recorder;
      const chunkCollector = createRecordingChunkCollector();
      recorder.ondataavailable = chunkCollector.onData;
      recorder.onerror = () => {
        showToast?.('录制过程中发生错误', 'error');
        stop();
      };
      recorder.onstop = () => {
        if (recordingState.cancelled) {
          resetState();
          showToast?.('录制已取消', 'info');
        } else if (chunkCollector.chunks.length) {
          finishAndDownload(chunkCollector.chunks, recorderInfo.mimeType);
        } else {
          resetState();
          showToast?.('录制文件为空', 'error');
        }
      };
      recordingState.cancelled = false;
      recordingState.recorder = recorder;
      recordButton?.classList.add('active');
      if (recordButton) {
        recordButton.title = '停止录制';
        recordButton.setAttribute('aria-label', '停止录制');
      }
      context.putImageData(coverFrame, 0, 0);
      openModal();
      startProgressTimer();
      stage = '预热视频编码器';
      await startRecordingRecorder(recorder);
      if (!await primeEncoder(coverFrame)) return;
      if (!recordingState.active || recordingState.recorder !== recorder) return;
      stage = '开始播放视频';
      await unmuteAudio();
      await waitForPlayback(video);
      if (!recordingState.active || recordingState.recorder !== recorder) return;
      transitionRecordingState(recordingState, 'start');
      drawFrame();
      requestCanvasFrame();
      recordingState.lastFrameTime = 0;
      scheduleRender();
      updateModal();
    } catch (error) {
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        try { recorder.stop(); } catch (_) {}
      }
      resetState();
      const diagnostic = normalizeAppError(error, {
        code: 'REC_START_FAILED',
        title: messages.recordingFailed,
        action: '请确认视频可以播放、录制格式受支持后重试。'
      });
      console.error('录制启动失败:', diagnostic);
      showToast?.(`${stage}失败：${formatUserError(diagnostic)}`, 'error', 5000);
    }
  };

  return {
    state: recordingState,
    start,
    stop,
    togglePause,
    isActive: () => recordingState.active,
    updateModal,
    syncConfigInputs: () => {}
  };
}
