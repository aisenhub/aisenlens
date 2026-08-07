export function createSettingsService({
  key,
  readStorage,
  writeStorage,
  normalizeSettings,
  onSaveError = () => {}
} = {}) {
  const get = () => normalizeSettings(readStorage(key, {}));
  const save = settings => {
    const next = normalizeSettings(settings);
    let capturedError = null;
    const saved = writeStorage(key, next, error => { capturedError = error; });
    if (saved === false) onSaveError(capturedError || new Error('Browser storage write failed'));
    return next;
  };
  return { get, save };
}
