export function bindShotEditorEvents({
  elements = {},
  video = null,
  documentTarget = null,
  getDraft = () => null,
  getFrameStep = () => 1 / 30,
  onClose = () => {},
  onSave = () => {},
  onSplit = () => {},
  onPrevious = () => {},
  onNext = () => {},
  onSetVideoTime = () => {},
  onSetFrame = () => {}
} = {}) {
  const {
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
  } = elements;
  if (!modal) return false;

  closeButton?.addEventListener('click', onClose);
  cancelButton?.addEventListener('click', onClose);
  modal.addEventListener('click', event => {
    if (event.target === modal) onClose();
  });
  saveButton?.addEventListener('click', onSave);
  splitButton?.addEventListener('click', onSplit);
  previousShotButton?.addEventListener('click', () => onPrevious());
  nextShotButton?.addEventListener('click', () => onNext());
  previousFrameButton?.addEventListener('click', () => onSetVideoTime((video?.currentTime || 0) - getFrameStep()));
  nextFrameButton?.addEventListener('click', () => onSetVideoTime((video?.currentTime || 0) + getFrameStep()));
  backSecondButton?.addEventListener('click', () => onSetVideoTime((video?.currentTime || 0) - 1));
  forwardSecondButton?.addEventListener('click', () => onSetVideoTime((video?.currentTime || 0) + 1));
  playPauseButton?.addEventListener('click', () => {
    if (!video) return;
    if (video.paused) {
      video.play();
      playPauseButton.textContent = '暂停';
    } else {
      video.pause();
      playPauseButton.textContent = '播放';
    }
  });

  const bindFrameStep = (type, delta) => () => {
    const draft = getDraft();
    if (draft) onSetFrame(type, draft[`${type}Time`] + delta);
  };
  firstPreviousButton?.addEventListener('click', bindFrameStep('first', -getFrameStep()));
  firstNextButton?.addEventListener('click', bindFrameStep('first', getFrameStep()));
  lastPreviousButton?.addEventListener('click', bindFrameStep('last', -getFrameStep()));
  lastNextButton?.addEventListener('click', bindFrameStep('last', getFrameStep()));

  const bindSecondStep = (type, delta) => () => {
    const draft = getDraft();
    if (draft) onSetFrame(type, draft[`${type}Time`] + delta);
  };
  firstBackSecondButton?.addEventListener('click', bindSecondStep('first', -1));
  firstForwardSecondButton?.addEventListener('click', bindSecondStep('first', 1));
  lastBackSecondButton?.addEventListener('click', bindSecondStep('last', -1));
  lastForwardSecondButton?.addEventListener('click', bindSecondStep('last', 1));

  documentTarget?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('show')) onClose();
  });
  return true;
}
