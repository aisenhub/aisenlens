export function initPlayerControls({
  video,
  stage,
  stepBackFrameButton,
  stepForwardFrameButton,
  jumpBackButton,
  jumpForwardButton,
  playPauseButton,
  onFrameStep,
  onJump,
  onPlayPause,
  onTogglePlayback,
  onSeek,
  onPlay,
  onPause,
  onLoadedMetadata,
  onDurationChange,
  onTimeUpdate,
  onSeeked
} = {}) {
  if (!video) return null;

  const updatePlayPauseButton = isPlaying => {
    if (!playPauseButton) return;
    playPauseButton.dataset.playing = String(isPlaying);
    const label = isPlaying ? '暂停' : '播放';
    playPauseButton.title = `${label}（空格）`;
    playPauseButton.setAttribute('aria-label', label);
  };

  stepBackFrameButton?.addEventListener('click', () => onFrameStep?.(-1));
  stepForwardFrameButton?.addEventListener('click', () => onFrameStep?.(1));
  jumpBackButton?.addEventListener('click', () => onJump?.(-1));
  jumpForwardButton?.addEventListener('click', () => onJump?.(1));
  playPauseButton?.addEventListener('click', () => onPlayPause?.());
  stage?.addEventListener('click', () => onTogglePlayback?.());

  video.addEventListener('play', () => {
    updatePlayPauseButton(true);
    onPlay?.();
  });
  video.addEventListener('pause', () => {
    updatePlayPauseButton(false);
    onPause?.();
  });
  video.addEventListener('loadedmetadata', () => {
    onLoadedMetadata?.();
  });
  video.addEventListener('durationchange', () => {
    onDurationChange?.();
  });
  video.addEventListener('timeupdate', () => {
    onTimeUpdate?.(video.currentTime, video.duration);
  });
  video.addEventListener('seeked', () => {
    onSeeked?.(video.currentTime, video.duration);
  });

  updatePlayPauseButton(!video.paused);
  return { updatePlayPauseButton };
}
