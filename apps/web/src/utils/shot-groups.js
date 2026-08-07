export function getShotGroupMembers(group, entries) {
  if (!group || !Array.isArray(group.shotIds) || !Array.isArray(entries)) return [];
  const entriesById = new Map(entries.map(entry => [entry.shotId, entry]));
  return group.shotIds
    .map(shotId => entriesById.get(shotId))
    .filter(Boolean)
    .sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0));
}

export function reconcileShotGroups({
  entries = [],
  shotGroups = [],
  activeShotGroupId = null,
  editingShotGroupTitleId = null,
  editingShotGroupSummaryId = null,
  selectedShotIds = new Set()
} = {}) {
  const validShotIds = new Set(entries.map(entry => entry.shotId));
  const nextShotGroups = shotGroups
    .map(group => ({
      ...group,
      shotIds: (group.shotIds || []).filter(shotId => validShotIds.has(shotId))
    }))
    .filter(group => group.shotIds.length >= 2);

  return {
    shotGroups: nextShotGroups,
    activeShotGroupId: activeShotGroupId && nextShotGroups.some(group => group.id === activeShotGroupId)
      ? activeShotGroupId
      : null,
    editingShotGroupTitleId: editingShotGroupTitleId && nextShotGroups.some(group => group.id === editingShotGroupTitleId)
      ? editingShotGroupTitleId
      : null,
    editingShotGroupSummaryId: editingShotGroupSummaryId && nextShotGroups.some(group => group.id === editingShotGroupSummaryId)
      ? editingShotGroupSummaryId
      : null,
    selectedShotIds: new Set([...selectedShotIds].filter(shotId => validShotIds.has(shotId)))
  };
}
