export function createProjectSessionStateController({
  setEntries = () => {},
  setGroups = () => {},
  setActiveGroupId = () => {},
  setEditingTitleId = () => {},
  setEditingSummaryId = () => {},
  setSelectedShotIds = () => {},
  setSelectionAnchorId = () => {},
  setCustomFieldNames = () => {},
  setActiveShotNumber = () => {},
  setExpandedShotNumber = () => {},
  resetAutoSaveSnapshot = () => {}
} = {}) {
  const reset = (next = {}) => {
    setEntries(next.entries ? [...next.entries] : []);
    setGroups(next.shotGroups ? [...next.shotGroups] : []);
    setActiveGroupId(null);
    setEditingTitleId(null);
    setEditingSummaryId(null);
    setSelectedShotIds(new Set());
    setSelectionAnchorId(null);
    setCustomFieldNames([]);
    setActiveShotNumber(null);
    setExpandedShotNumber(null);
    resetAutoSaveSnapshot();
  };

  return { reset };
}
