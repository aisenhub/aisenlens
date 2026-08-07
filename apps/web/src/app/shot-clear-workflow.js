export function createShotClearWorkflow({
  closeEditor = () => {},
  setEntries = () => {},
  clearHeights = () => {},
  pruneScreenshots = () => {},
  clearRecordingCache = () => {},
  resetAutoShot = () => {},
  setGroups = () => {},
  setActiveGroupId = () => {},
  setEditingTitleId = () => {},
  setEditingSummaryId = () => {},
  setSelectedShotIds = () => {},
  setSelectionAnchorId = () => {},
  setActiveShotNumber = () => {},
  setExpandedShotNumber = () => {},
  renderShots = () => {},
  markDirty = () => {},
  showToast = () => {},
  getEntries = () => [],
  getGroups = () => [],
  history = null
} = {}) {
  const clone = value => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };
  const applyClear = () => {
    closeEditor();
    setEntries([]);
    clearHeights();
    clearRecordingCache();
    resetAutoShot();
    setGroups([]);
    setActiveGroupId(null);
    setEditingTitleId(null);
    setEditingSummaryId(null);
    setSelectedShotIds(new Set());
    setSelectionAnchorId(null);
    setActiveShotNumber(null);
    setExpandedShotNumber(null);
    renderShots();
    markDirty();
    showToast('已清除全部分镜', 'success');
    return history ? Promise.resolve() : Promise.resolve(pruneScreenshots()).catch(() => {});
  };

  const clear = () => {
    const beforeEntries = clone(getEntries());
    const beforeGroups = clone(getGroups());
    const cleanup = applyClear();
    if (history) history.record({
      label: '清除全部分镜',
      execute: applyClear,
      undo: () => {
        setEntries(clone(beforeEntries));
        setGroups(clone(beforeGroups));
        renderShots();
        markDirty();
      }
    });
    return cleanup;
  };

  return { clear };
}
