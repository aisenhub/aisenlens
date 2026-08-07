import { initPlayerControls } from './player-controls.js';

export function bindPlayerSession({
  elements = {},
  video,
  playerController,
  playerState,
  audioWaveformState,
  updatePlayerState,
  startFrameRateSampling,
  syncPlayhead,
  renderWaveform,
  resetFrameRateSampling,
  updateVideoInfo,
  updateAutoShotCard,
  followPlayback,
  scheduleWaveformRender,
  seek = null,
  syncShotTable,
  getTimelineViewState = () => null,
  restoreTimelineViewState = () => {},
  persistTimelineViewState = () => {},
  invokeAction = null,
  isShotEditorOpen = () => false,
  formatTime = value => String(value)
} = {}) {
  const {
    stage,
    stepBackFrameButton,
    stepForwardFrameButton,
    jumpBackButton,
    jumpForwardButton,
  playPauseButton,
  audioWaveformTrack
  } = elements;

  const updateTimecode = (time = 0, duration = 0) => {
    if (elements.currentTimeLabel) elements.currentTimeLabel.textContent = formatTime(time);
    if (elements.durationLabel) elements.durationLabel.textContent = formatTime(duration);
  };

  const invokeOrFallback = (actionId, fallback) => {
    if (!invokeAction) return fallback();
    return Promise.resolve(invokeAction(actionId)).then(result => {
      if (!result?.handled) return fallback();
      return result.value;
    });
  };

  initPlayerControls({
    video,
    stage,
    stepBackFrameButton,
    stepForwardFrameButton,
    jumpBackButton,
    jumpForwardButton,
    playPauseButton,
    onFrameStep: direction => invokeOrFallback(direction < 0 ? 'playback.stepBack' : 'playback.stepForward', () => playerController.stepFrame(direction)),
    onJump: seconds => invokeOrFallback(seconds < 0 ? 'playback.jumpBack' : 'playback.jumpForward', () => playerController.jump(seconds)),
    onPlayPause: () => invokeOrFallback('playback.toggle', () => playerController.togglePlayPause()),
    onTogglePlayback: () => invokeOrFallback('playback.toggle', () => playerController.togglePlayback()),
    onSeek: time => seek ? seek(time, false) : playerController.seekTo(time, false),
    onPlay: () => {
      updatePlayerState(playerState, video);
      startFrameRateSampling();
    },
    onPause: () => {
      updatePlayerState(playerState, video);
      persistTimelineViewState?.();
    },
    onLoadedMetadata: () => {
      updateTimecode(video.currentTime, video.duration);
      updatePlayerState(playerState, video);
      restoreTimelineViewState?.();
      const savedTime = Number(getTimelineViewState?.()?.playheadTime);
      if (Number.isFinite(savedTime) && savedTime > 0 && Number.isFinite(video.duration)) {
        const nextTime = Math.max(0, Math.min(video.duration, savedTime));
        if (seek) seek(nextTime, false);
        else video.currentTime = nextTime;
      }
      if (audioWaveformTrack) audioWaveformTrack.setAttribute('aria-valuemax', String(video.duration || 0));
      syncPlayhead();
      renderWaveform();
      resetFrameRateSampling();
      updateVideoInfo();
      updateAutoShotCard();
    },
    onDurationChange: () => {
      updateTimecode(video.currentTime, video.duration);
      updatePlayerState(playerState, video);
      if (audioWaveformTrack && audioWaveformState.status !== 'loading') {
        audioWaveformTrack.setAttribute('aria-valuemax', String(video.duration || 0));
      }
      syncPlayhead();
      renderWaveform();
      updateVideoInfo();
      updateAutoShotCard();
    },
    onTimeUpdate: currentTime => {
      updateTimecode(currentTime, video.duration);
      updatePlayerState(playerState, video);
      if (audioWaveformState.zoom) followPlayback(currentTime);
      syncPlayhead(currentTime);
      if (audioWaveformState.zoom) scheduleWaveformRender();
      if (!isShotEditorOpen()) syncShotTable(currentTime);
    },
    onSeeked: (currentTime, duration) => {
      updateTimecode(currentTime, duration);
      persistTimelineViewState?.();
    }
  });
}
