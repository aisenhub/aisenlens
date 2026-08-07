export function createShotRenderingController({
  getEntries = () => [],
  setEntries = () => {},
  normalizeEntries = entries => entries,
  getHeights = () => new Map(),
  updateDurations = () => {},
  updateVideoInfo = () => {},
  updateTable = () => {},
  renderWaveform = () => {},
  renderGroups = () => {},
  hasList = () => true,
  syncSelectionMode = () => {},
  ensureList = () => {},
  renderList = () => {}
} = {}) {
  const render = () => {
    const entries = normalizeEntries(getEntries());
    setEntries(entries);
    const validShotIds = new Set(entries.map(entry => entry.shotId));
    getHeights().forEach((height, shotId) => {
      if (!validShotIds.has(shotId)) getHeights().delete(shotId);
    });
    updateDurations();
    updateVideoInfo();
    updateTable();
    renderWaveform();
    renderGroups();
    if (!hasList()) return;
    syncSelectionMode();
    ensureList();
    renderList();
  };

  return { render };
}
