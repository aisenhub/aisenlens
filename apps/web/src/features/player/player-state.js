import { estimateFrameRateFromDuration, normalizePlaybackRate } from '../../utils/player.js';

export function createPlayerState(initial = {}) {
  return {
    currentTime: Number(initial.currentTime) || 0,
    duration: Number(initial.duration) || 0,
    frameRate: estimateFrameRateFromDuration(initial.duration),
    playbackRate: normalizePlaybackRate(initial.playbackRate),
    isPlaying: !!initial.isPlaying
  };
}

export function updatePlayerStateFromVideo(state, video) {
  if (!state || !video) return state;
  state.currentTime = Number(video.currentTime) || 0;
  state.duration = Number(video.duration) || 0;
  state.frameRate = estimateFrameRateFromDuration(state.duration);
  state.playbackRate = normalizePlaybackRate(video.playbackRate);
  state.isPlaying = !video.paused && !video.ended;
  return state;
}

export function setPlayerPlaybackRate(state, value) {
  if (!state) return 1;
  state.playbackRate = normalizePlaybackRate(value);
  return state.playbackRate;
}
