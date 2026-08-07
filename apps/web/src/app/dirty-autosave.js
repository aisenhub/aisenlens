export function startDirtyAutosave({
  getDirty = () => false,
  getLastEditAt = () => 0,
  save = async () => {},
  markSaved = () => {},
  now = () => Date.now(),
  setIntervalTarget = setInterval,
  intervalMs = 60 * 1000,
  idleMs = 5 * 60 * 1000,
  log = () => {}
} = {}) {
  return setIntervalTarget(async () => {
    const timestamp = now();
    if (!getDirty() || !getLastEditAt() || timestamp - getLastEditAt() < idleMs) return;
    try {
      await save();
      markSaved(timestamp);
      log(timestamp);
    } catch (error) {
      log(timestamp, error);
    }
  }, intervalMs);
}
