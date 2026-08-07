import { normalizeShotState } from '../features/shots/shot-update-pipeline.js';

export function createCaptureController({
  button,
  video,
  createScreenshotVariants,
  createShotEntry,
  getNextShotNumber,
  getEntries = () => [],
  addEntry = () => {},
  setEntries = null,
  getGroups = () => [],
  setGroups = () => {},
  getDuration = () => video?.duration || 0,
  renderShots = () => {},
  setActiveShot = () => {},
  markDirty = () => {},
  history = null,
  invokeAction = null,
  documentTarget = document,
  windowTarget = window
} = {}) {
  const playShutterAnimation = async () => {
    if (!button) return;
    button.classList.remove('shutter-flash');
    await new Promise(resolve => windowTarget.requestAnimationFrame(resolve));
    button.classList.add('shutter-flash');
    await new Promise(resolve => windowTarget.requestAnimationFrame(resolve));
    windowTarget.setTimeout(() => button.classList.remove('shutter-flash'), 320);
  };

  const captureCanvas = async (canvas, time = video?.currentTime) => {
    if (!canvas) return;
    const entry = createShotEntry(time, await createScreenshotVariants(canvas));
    entry.shotNumber = getNextShotNumber(getEntries());
    addEntry(entry);
    if (setEntries) {
      const normalized = normalizeShotState(getEntries(), getGroups(), { duration: getDuration() });
      setEntries(normalized.entries);
      setGroups(normalized.shotGroups);
    }
    renderShots();
    setActiveShot(entry.shotNumber);
    markDirty();
    if (history) {
      history.record({
        label: '新增分镜',
        execute: () => {
          if (!getEntries().some(item => item.shotId === entry.shotId)) {
            addEntry(entry);
            if (setEntries) {
              const normalized = normalizeShotState(getEntries(), getGroups(), { duration: getDuration() });
              setEntries(normalized.entries);
              setGroups(normalized.shotGroups);
            }
            renderShots();
            setActiveShot(entry.shotNumber);
            markDirty();
          }
        },
        undo: () => {
          const remaining = getEntries().filter(item => item.shotId !== entry.shotId);
          if (setEntries) {
            const normalized = normalizeShotState(remaining, getGroups(), { duration: getDuration() });
            setEntries(normalized.entries);
            setGroups(normalized.shotGroups);
          } else getEntries().splice(0, getEntries().length, ...remaining);
          renderShots();
          markDirty();
        }
      });
    }
  };

  const capture = async () => {
    if (!video || video.readyState < 2) return;
    await playShutterAnimation();
    const canvas = documentTarget.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    await captureCanvas(canvas, video.currentTime);
  };

  const bind = () => button?.addEventListener('click', () => {
    if (invokeAction) invokeAction('shot.capture');
    else capture();
  });
  return { bind, capture, captureCanvas, playShutterAnimation };
}
