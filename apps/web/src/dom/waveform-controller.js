import { renderWaveformCanvas } from './waveform-canvas.js';
import {
  followWaveform,
  panWaveform,
  resetWaveformZoom,
  zoomWaveformAtPoint
} from '../features/waveform/waveform-controller.js';
import {
  AUDIO_WAVEFORM_MAX_BINS,
  buildAudioWaveformBins,
  getWaveformCurrentEntry,
  getWaveformShotRange,
  getWaveformView
} from '../utils/audio-waveform.js';
import { resetAudioWaveformData } from '../app/state.js';
import { formatShortTime } from '../utils/time.js';

export function createWaveformController({
  video,
  elements = {},
  state,
  getEntries,
  getShotGroups = () => [],
  stopSegmentPlayback,
  seek = null,
  syncShotTable,
  onCutPointChange = () => {},
  onSelectShot = () => {},
  getTimelineViewState = () => null,
  onTimelineViewStateChange = () => {},
  getFrameStep = () => 1 / 25,
  documentTarget = document,
  windowTarget = window
} = {}) {
  const {
    panel,
    track,
    canvas,
    empty,
    cutStatus,
    ruler,
    playhead,
    zoomLabel,
    zoomOut,
    zoomIn,
    fitButton,
    followButton,
    retryButton
  } = elements;
  let preparedFile = null;
  let renderFrame = null;
  let viewStateTimer = null;

  const getDuration = () => Number(video?.duration) > 0 ? Number(video.duration) : Number(state?.duration) || 0;
  const getView = (duration = getDuration()) => getWaveformView(duration, state?.zoom);
  const getPersistedViewState = () => ({
    ...(getTimelineViewState?.() || {}),
    playheadTime: Number(video?.currentTime) || 0,
    waveformZoom: state.zoom ? { ...state.zoom } : null,
    scrollLeft: Math.max(0, Number(track?.scrollLeft) || 0)
  });
  const persistViewState = () => onTimelineViewStateChange?.(getPersistedViewState());
  const queuePersistViewState = () => {
    if (viewStateTimer !== null) windowTarget.clearTimeout?.(viewStateTimer);
    viewStateTimer = windowTarget.setTimeout(() => {
      viewStateTimer = null;
      persistViewState();
    }, 120);
  };
  const setState = (status, message, ready = false) => {
    state.status = status;
    if (panel) panel.dataset.state = status;
    if (empty) empty.textContent = message;
    if (track) track.dataset.ready = String(ready);
    if (retryButton) retryButton.hidden = status !== 'unavailable';
    const statusEvent = status === 'loading' || status === 'processing'
      ? 'waveformLoading'
      : status === 'unavailable' || status === 'silent' ? 'noAudio' : null;
    if (statusEvent) windowTarget.dispatchEvent?.(new CustomEvent('app:status', { detail: statusEvent }));
  };
  const updateZoomUi = () => {
    const duration = getDuration();
    const view = getView(duration);
    const zoomed = !!state.zoom && duration > 0 && view.end - view.start < duration - 0.001;
    if (zoomLabel) zoomLabel.textContent = zoomed ? `${Math.round((view.end - view.start) * 10) / 10}s 可见` : '全片';
    if (zoomOut) zoomOut.disabled = !duration;
    if (zoomIn) zoomIn.disabled = !duration;
    if (fitButton) fitButton.disabled = !duration;
    if (followButton) followButton.disabled = !duration;
  };

  const restoreViewState = () => {
    const saved = getTimelineViewState?.() || {};
    const zoom = saved.waveformZoom;
    state.zoom = zoom && Number(zoom.end) > Number(zoom.start)
      ? { start: Number(zoom.start) || 0, end: Number(zoom.end) || 0 }
      : null;
    if (state.zoom) track?.setAttribute?.('data-zoomed', 'true');
    else track?.removeAttribute?.('data-zoomed');
    if (track && Number.isFinite(Number(saved.scrollLeft))) {
      track.scrollLeft = Math.max(0, Number(saved.scrollLeft));
    }
    updateZoomUi();
    scheduleRender();
  };

  const setPlayheadState = stateName => {
    if (playhead) playhead.dataset.state = stateName;
    if (track) track.dataset.playheadState = stateName;
  };

  const render = () => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(windowTarget.devicePixelRatio || 1, 2);
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    renderWaveformCanvas(context, {
      width,
      height,
      duration: getDuration(),
      bins: state.bins,
      view: getView(),
      frameRate: Math.max(1, Math.round(1 / Math.max(0.001, Number(getFrameStep?.()) || 1 / 25))),
      entries: getEntries?.() || [],
      shotGroups: getShotGroups?.() || [],
      currentTime: video?.currentTime,
      maxPeak: state.maxPeak,
      colors: {
        rms: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-rms').trim() || '#16A9F3',
        peak: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-peak').trim() || '#61C8F7',
        marker: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-marker').trim() || 'rgba(71, 85, 105, 0.58)',
        selection: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-selection').trim() || 'rgba(22, 169, 243, 0.12)',
        rulerBackground: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-ruler-background').trim() || 'rgba(15, 23, 42, 0.24)',
        ruler: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-ruler').trim() || 'rgba(128, 128, 128, 0.46)',
        rulerMinor: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-ruler-minor').trim() || 'rgba(128, 128, 128, 0.22)',
        rulerBorder: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-ruler-border').trim() || 'rgba(148, 163, 184, 0.28)',
        rulerText: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-ruler-text').trim() || 'rgba(222, 222, 222, 0.68)',
        dbGuide: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-db-guide').trim() || 'rgba(148, 163, 184, 0.24)',
        dbText: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-db-text').trim() || 'rgba(148, 163, 184, 0.72)',
        dbBase: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-db-base').trim() || 'rgba(226, 232, 240, 0.56)',
        volumeLine: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-volume-line').trim() || 'rgba(255, 255, 255, 0.86)',
        volumeText: getComputedStyle(documentTarget.documentElement).getPropertyValue('--waveform-volume-text').trim() || 'rgba(255, 255, 255, 0.88)'
      },
      getCurrentEntry: getWaveformCurrentEntry,
      getShotRange: getWaveformShotRange
    });
  };

  const syncPlayhead = (currentTime = video?.currentTime) => {
    const duration = getDuration();
    const time = Math.max(0, Number(currentTime) || 0);
    const view = getView(duration);
    const ratio = view.end > view.start ? (time - view.start) / (view.end - view.start) : 0;
    if (playhead) {
      playhead.style.left = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
      playhead.style.visibility = ratio >= 0 && ratio <= 1 ? 'visible' : 'hidden';
    }
    if (track) track.setAttribute('aria-valuenow', String(time));
    updateZoomUi();
  };

  const scheduleRender = () => {
    if (renderFrame !== null) return;
    const requestFrame = windowTarget.requestAnimationFrame || (callback => windowTarget.setTimeout(callback, 16));
    renderFrame = requestFrame(() => {
      renderFrame = null;
      render();
      syncPlayhead();
    });
  };

  const resetZoom = () => {
    resetWaveformZoom(state);
    track?.removeAttribute('data-zoomed');
    scheduleRender();
    updateZoomUi();
    persistViewState();
  };

  const focusPlayhead = () => {
    const duration = getDuration();
    if (!duration) return;
    const visibleDuration = Math.min(duration, Math.max(6, state.zoom ? state.zoom.end - state.zoom.start : duration * 0.35));
    if (visibleDuration >= duration - 0.001) {
      resetZoom();
      return;
    }
    const currentTime = Math.max(0, Math.min(duration, Number(video?.currentTime) || 0));
    const start = Math.max(0, Math.min(duration - visibleDuration, currentTime - visibleDuration / 2));
    state.zoom = { start, end: start + visibleDuration };
    track?.setAttribute('data-zoomed', 'true');
    scheduleRender();
    persistViewState();
  };

  const refreshAfterSeek = (currentTime = video?.currentTime) => {
    if (!state.zoom) return;
    followWaveform(state, getDuration(), currentTime, !video?.paused, true);
    scheduleRender();
  };

  const timeFromEvent = event => {
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const view = getView(getDuration());
    return view.start + ratio * (view.end - view.start);
  };

  const canSeek = () => !!track && !!(video?.src || video?.currentSrc) && Number.isFinite(video.duration) && video.duration > 0;

  const seekToTime = (time, shouldStop = true) => {
    if (!canSeek()) return;
    const duration = getDuration();
    const nextTime = Math.max(0, Math.min(duration, Number(time) || 0));
    if (shouldStop) stopSegmentPlayback?.(true);
    if (seek) seek(nextTime, false);
    else video.currentTime = nextTime;
    syncShotTable?.(nextTime);
    syncPlayhead(nextTime);
  };

  const seekFromEvent = event => {
    if (!canSeek()) return;
    seekToTime(timeFromEvent(event));
  };

  const findCutPoint = event => {
    const entries = [...(getEntries?.() || [])].sort((left, right) => (Number(left.time) || 0) - (Number(right.time) || 0));
    if (!entries.length) return null;
    const rect = track.getBoundingClientRect();
    const view = getView(getDuration());
    let nearest = null;
    entries.forEach(entry => {
      const ratio = ((Number(entry.time) || 0) - view.start) / Math.max(0.0001, view.end - view.start);
      const distance = Math.abs(rect.left + ratio * rect.width - event.clientX);
      if (distance <= 10 && (!nearest || distance < nearest.distance)) nearest = { entry, distance };
    });
    return nearest?.entry || null;
  };

  const prepare = async file => {
    preparedFile = file || null;
    const jobId = ++state.jobId;
    resetAudioWaveformData(state, 'loading');
    track?.classList.add('is-loading');
    setState('loading', '正在分析音频');
    render();
    const AudioContextCtor = windowTarget.AudioContext || windowTarget.webkitAudioContext;
    if (!AudioContextCtor) {
      setState('unavailable', '当前浏览器不支持音频分析');
      track?.classList.remove('is-loading');
      return;
    }
    let audioContext = null;
    try {
      audioContext = new AudioContextCtor();
      const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());
      if (audioContext.state !== 'closed') await audioContext.close();
      audioContext = null;
      if (jobId !== state.jobId) return;
      state.duration = Number(audioBuffer.duration) || 0;
      setState('processing', '正在生成波形');
      const bins = await buildAudioWaveformBins(audioBuffer, {
        maxBins: AUDIO_WAVEFORM_MAX_BINS,
        yieldFn: () => new Promise(resolve => (windowTarget.requestIdleCallback ? windowTarget.requestIdleCallback(resolve, { timeout: 50 }) : windowTarget.requestAnimationFrame(resolve))),
        isCancelled: () => jobId !== state.jobId
      });
      if (!bins || jobId !== state.jobId) return;
      state.bins = bins;
      state.maxPeak = Math.max(...bins.map(bin => bin.peak), 0);
      state.status = state.maxPeak < 0.0005 ? 'silent' : 'ready';
      restoreViewState();
      track?.classList.remove('is-loading');
      track?.setAttribute('aria-valuemax', String(state.duration));
      setState(state.status, state.status === 'silent' ? '音频静音' : '已生成波形', true);
      render();
      syncPlayhead();
    } catch (error) {
      if (audioContext && audioContext.state !== 'closed') {
        try { await audioContext.close(); } catch (_) {}
      }
      if (jobId !== state.jobId) return;
      resetAudioWaveformData(state, 'unavailable');
      track?.classList.remove('is-loading');
      setState('unavailable', '未检测到可用音频');
      render();
      console.info('当前视频没有可解码的音频轨道', error);
    }
  };

  const bind = () => {
    if (!track) return;
    track.dataset.timeline = 'true';
    setPlayheadState('idle');
    const zoomBy = factor => {
      const duration = getDuration();
      if (!duration) return;
      zoomWaveformAtPoint(state, duration, 0.5, factor);
      if (state.zoom) track.dataset.zoomed = 'true';
      else track.removeAttribute('data-zoomed');
      scheduleRender();
      updateZoomUi();
    };
    zoomOut?.addEventListener('click', () => zoomBy(1.25));
    zoomIn?.addEventListener('click', () => zoomBy(0.8));
    followButton?.addEventListener('click', focusPlayhead);
    fitButton?.addEventListener('click', resetZoom);
    retryButton?.addEventListener('click', () => { if (preparedFile) prepare(preparedFile); });
    let dragging = false;
    let panning = false;
    let startX = 0;
    let startZoom = null;
    let cutDragging = null;
    let cutWasPlaying = false;
    let rulerDragging = false;
    let rulerHovering = false;
    let pendingRulerTime = null;
    let rulerSeekFrame = null;
    const restorePlayheadIdleState = () => setPlayheadState(rulerHovering ? 'hover' : 'idle');
    const requestFrame = callback => windowTarget.requestAnimationFrame
      ? windowTarget.requestAnimationFrame(callback)
      : windowTarget.setTimeout(callback, 16);
    const cancelFrame = frame => windowTarget.cancelAnimationFrame?.(frame) || windowTarget.clearTimeout?.(frame);
    const scheduleRulerSeek = event => {
      if (!canSeek()) return;
      pendingRulerTime = timeFromEvent(event);
      if (rulerSeekFrame !== null) return;
      rulerSeekFrame = requestFrame(() => {
        rulerSeekFrame = null;
        if (pendingRulerTime === null) return;
        const nextTime = pendingRulerTime;
        pendingRulerTime = null;
        seekToTime(nextTime, false);
      });
    };
    const flushRulerSeek = event => {
      if (rulerSeekFrame !== null) {
        cancelFrame(rulerSeekFrame);
        rulerSeekFrame = null;
      }
      const nextTime = event ? timeFromEvent(event) : pendingRulerTime;
      pendingRulerTime = null;
      if (nextTime !== null && nextTime !== undefined) seekToTime(nextTime, false);
    };
    const cancelRulerSeek = () => {
      if (rulerSeekFrame !== null) {
        cancelFrame(rulerSeekFrame);
        rulerSeekFrame = null;
      }
      pendingRulerTime = null;
    };
    ruler?.addEventListener?.('pointerenter', () => {
      rulerHovering = true;
      if (!rulerDragging) setPlayheadState('hover');
    });
    ruler?.addEventListener?.('pointerleave', () => {
      rulerHovering = false;
      if (!rulerDragging) restorePlayheadIdleState();
    });
    const isRulerEvent = event => {
      if (ruler?.contains?.(event.target)) return true;
      const rect = track.getBoundingClientRect();
      return event.clientY - rect.top <= 28;
    };
    track.addEventListener('wheel', event => {
      const duration = getDuration();
      if (!duration || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
      zoomWaveformAtPoint(state, duration, ratio, event.deltaY < 0 ? 0.8 : 1.25);
      if (!state.zoom) resetZoom(); else { track.dataset.zoomed = 'true'; scheduleRender(); updateZoomUi(); }
      queuePersistViewState();
      event.preventDefault();
    }, { passive: false });
    track.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      panning = false;
      startX = event.clientX;
      startZoom = state.zoom ? { ...getView(getDuration()) } : null;
      track.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      if (isRulerEvent(event)) {
        rulerDragging = true;
        startZoom = null;
        setPlayheadState('dragging');
        stopSegmentPlayback?.(true);
        seekToTime(timeFromEvent(event), false);
        return;
      }
      cutDragging = findCutPoint(event);
      if (cutDragging) {
        cutWasPlaying = !!video && !video.paused;
        stopSegmentPlayback?.(true);
        onSelectShot?.(cutDragging);
        onCutPointChange(cutDragging, timeFromEvent(event), { commit: false });
        if (cutStatus) cutStatus.textContent = `切点 ${formatShortTime(Number(cutDragging.time) || 0)} → ${formatShortTime(timeFromEvent(event))}`;
        scheduleRender();
        return;
      }
      if (!state.zoom) seekFromEvent(event);
    });
    track.addEventListener('pointermove', event => {
      if (!dragging) return;
      event.preventDefault();
      if (rulerDragging) {
        scheduleRulerSeek(event);
        return;
      }
      if (cutDragging) {
        const entries = [...(getEntries?.() || [])].sort((left, right) => (Number(left.time) || 0) - (Number(right.time) || 0));
        const index = entries.indexOf(cutDragging);
        const frameStep = Math.max(0.001, Number(getFrameStep?.()) || 1 / 25);
        const previous = entries[index - 1];
        const next = entries[index + 1];
        const duration = getDuration();
        let time = Math.max(0, Math.min(duration, timeFromEvent(event)));
        if (previous) time = Math.max(time, (Number(previous.time) || 0) + frameStep);
        if (next) time = Math.min(time, (Number(next.time) || duration) - frameStep);
        onCutPointChange(cutDragging, time, { commit: false });
        if (cutStatus) cutStatus.textContent = `切点 ${formatShortTime(Number(cutDragging.__cutPointBefore ?? cutDragging.time) || 0)} → ${formatShortTime(time)}`;
        scheduleRender();
        return;
      }
      if (!startZoom) { seekFromEvent(event); return; }
      const deltaX = event.clientX - startX;
      if (!panning && Math.abs(deltaX) > 4) panning = true;
      if (!panning) return;
      const rect = track.getBoundingClientRect();
      panWaveform(state, getDuration(), startZoom, -deltaX / Math.max(1, rect.width));
      track.dataset.zoomed = 'true';
      scheduleRender();
    });
    const stopDragging = event => {
      if (rulerDragging) {
        if (event?.type === 'pointerup') flushRulerSeek(event);
        else cancelRulerSeek();
      } else if (cutDragging && event?.type === 'pointerup') onCutPointChange(cutDragging, Number(cutDragging.time) || 0, { commit: true });
      else if (cutDragging) onCutPointChange(cutDragging, Number(cutDragging.__cutPointBefore ?? cutDragging.time) || 0, { cancel: true });
      else if (dragging && startZoom && !panning && event?.type === 'pointerup') seekFromEvent(event);
      if (event?.type === 'pointerup' && !cutDragging) persistViewState();
      rulerDragging = false;
      dragging = false;
      panning = false;
      startX = 0;
      startZoom = null;
      cutDragging = null;
      if (cutWasPlaying && video) video.play().catch(() => {});
      cutWasPlaying = false;
      if (cutStatus) cutStatus.textContent = '';
      restorePlayheadIdleState();
      if (event && track.hasPointerCapture?.(event.pointerId)) track.releasePointerCapture(event.pointerId);
    };
    track.addEventListener('pointerup', stopDragging);
    track.addEventListener('pointercancel', stopDragging);
    track.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (cutDragging) {
          onCutPointChange(cutDragging, Number(cutDragging.time) || 0, { cancel: true });
          cutDragging = null;
          dragging = false;
        }
        if (rulerDragging) {
          cancelRulerSeek();
          rulerDragging = false;
          dragging = false;
          restorePlayheadIdleState();
        }
        if (state.zoom) { event.preventDefault(); resetZoom(); return; }
      }
      if (!(video?.src || video?.currentSrc) || !Number.isFinite(video.duration) || video.duration <= 0) return;
      let nextTime = null;
      if (event.key === 'Home') nextTime = 0;
      if (event.key === 'End') nextTime = video.duration;
      if (event.key === 'ArrowLeft') nextTime = Math.max(0, video.currentTime - (event.shiftKey ? 1 : 0.1));
      if (event.key === 'ArrowRight') nextTime = Math.min(video.duration, video.currentTime + (event.shiftKey ? 1 : 0.1));
      if (nextTime === null) return;
      event.preventDefault();
      stopSegmentPlayback?.(true);
      if (seek) seek(nextTime, false);
      else video.currentTime = nextTime;
      syncShotTable?.(nextTime);
      syncPlayhead(nextTime);
      refreshAfterSeek(nextTime);
      persistViewState();
    });
    track.addEventListener('focus', () => {
      if (!rulerDragging) setPlayheadState('focused');
    });
    track.addEventListener('blur', () => {
      if (!rulerDragging) restorePlayheadIdleState();
    });
    documentTarget.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.zoom) { event.preventDefault(); resetZoom(); }
    });
    documentTarget.addEventListener('pointerdown', event => {
      const isVideoControl = event.target?.closest?.('.tool-player .player-controls');
      if (!state.zoom || track.contains(event.target) || isVideoControl) return;
      resetZoom();
    });
    windowTarget.addEventListener('blur', () => {
      if (rulerDragging) {
        cancelRulerSeek();
        rulerDragging = false;
        dragging = false;
        restorePlayheadIdleState();
      }
      if (!cutDragging) return;
      onCutPointChange(cutDragging, Number(cutDragging.time) || 0, { cancel: true });
      cutDragging = null;
      dragging = false;
      restorePlayheadIdleState();
    });
    windowTarget.addEventListener('resize', render);
    const ResizeObserverCtor = windowTarget.ResizeObserver;
    if (ResizeObserverCtor && track) {
      const observer = new ResizeObserverCtor(() => scheduleRender());
      observer.observe(track);
    }
    updateZoomUi();
    restoreViewState();
  };

  const followPlayback = (currentTime = video?.currentTime, force = false) => {
    if (!state.zoom || !video || (!force && video.paused)) return false;
    return followWaveform(state, getDuration(), currentTime, !video.paused, force);
  };

  return {
    bind,
    prepare,
    reset: () => {
      state.jobId += 1;
      if (viewStateTimer !== null) {
        windowTarget.clearTimeout?.(viewStateTimer);
        viewStateTimer = null;
      }
      preparedFile = null;
      if (renderFrame !== null) {
        windowTarget.cancelAnimationFrame?.(renderFrame);
        renderFrame = null;
      }
      resetAudioWaveformData(state);
      state.zoom = null;
      setPlayheadState('idle');
      setState('empty', '等待音频');
      render();
      syncPlayhead();
    },
    render,
    refreshAfterSeek,
    resetZoom,
    followPlayback,
    syncPlayhead,
    scheduleRender,
    getDuration,
    getView,
    restoreViewState,
    persistViewState
  };
}
