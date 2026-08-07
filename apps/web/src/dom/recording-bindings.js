export function bindRecordingEvents({
  elements = {},
  video = null,
  documentTarget = null,
  onStart = () => {},
  onPause = () => {},
  onCancel = () => {},
  onEnded = () => {},
  isActive = () => false
} = {}) {
  const {
    recordButton,
    pauseButton,
    cancelButton,
    closeButton,
    modal
  } = elements;
  recordButton?.addEventListener('click', onStart);
  pauseButton?.addEventListener('click', onPause);
  cancelButton?.addEventListener('click', () => onCancel());
  closeButton?.addEventListener('click', () => onCancel());
  modal?.addEventListener('click', event => {
    if (event.target === modal) onCancel();
  });
  documentTarget?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal?.classList.contains('show')) onCancel();
  });
  video?.addEventListener('ended', () => {
    if (isActive()) onEnded();
  });
}
