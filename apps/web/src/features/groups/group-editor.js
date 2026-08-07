export function toggleShotGroupSelection(selectedShotIds, shotId, selected) {
  const nextSelection = new Set(selectedShotIds);
  if (!shotId) return nextSelection;
  if (selected) nextSelection.add(shotId);
  else nextSelection.delete(shotId);
  return nextSelection;
}

export function clearShotGroupSelection() {
  return new Set();
}

export function canCreateShotGroup(selectedShotIds, minimumMembers = 2) {
  return selectedShotIds.size >= minimumMembers;
}
