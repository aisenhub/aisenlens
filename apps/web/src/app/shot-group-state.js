import {
  getShotGroupMembers,
  reconcileShotGroups
} from '../features/groups/group-service.js';
import { toggleShotGroupSelection } from '../features/groups/group-editor.js';

export function createShotGroupStateController({
  getEntries = () => [],
  getGroups = () => [],
  getActiveGroupId = () => null,
  getEditingTitleId = () => null,
  getEditingSummaryId = () => null,
  getSelectedShotIds = () => new Set(),
  getSelectionAnchorId = () => null,
  setGroups = () => {},
  setActiveGroupId = () => {},
  setEditingTitleId = () => {},
  setEditingSummaryId = () => {},
  setSelectedShotIds = () => {},
  setSelectionAnchorId = () => {}
} = {}) {
  const getMembers = group => getShotGroupMembers(group, getEntries());

  const sync = () => {
    const next = reconcileShotGroups({
      entries: getEntries(),
      shotGroups: getGroups(),
      activeShotGroupId: getActiveGroupId(),
      editingShotGroupTitleId: getEditingTitleId(),
      editingShotGroupSummaryId: getEditingSummaryId(),
      selectedShotIds: getSelectedShotIds()
    });
    setGroups(next.shotGroups);
    setActiveGroupId(next.activeShotGroupId);
    setEditingTitleId(next.editingShotGroupTitleId);
    setEditingSummaryId(next.editingShotGroupSummaryId);
    setSelectedShotIds(next.selectedShotIds);
    return next;
  };

  const toggleSelection = (entry, selected) => {
    if (!entry?.shotId) return getSelectedShotIds();
    const next = toggleShotGroupSelection(getSelectedShotIds(), entry.shotId, selected);
    setSelectedShotIds(next);
    return next;
  };

  const selectRange = entry => {
    if (!entry?.shotId) return { entries: [], valid: false };
    const entries = getEntries();
    const anchorId = getSelectionAnchorId();
    const anchorIndex = anchorId ? entries.findIndex(item => item.shotId === anchorId) : -1;
    const entryIndex = entries.findIndex(item => item.shotId === entry.shotId);
    if (entryIndex < 0) return { entries: [], valid: false };
    const groupedShotIds = new Set(getGroups().flatMap(group => group.shotIds || []));
    if (groupedShotIds.has(entry.shotId)) return { entries: [], valid: false };
    const selectedEntries = entries.filter(item => getSelectedShotIds().has(item.shotId));
    if (selectedEntries.some(item => item.shotId === entry.shotId)) {
      const clickedIndex = selectedEntries.findIndex(item => item.shotId === entry.shotId);
      const nextEntries = clickedIndex === 0
        ? selectedEntries.slice(1)
        : selectedEntries.slice(0, clickedIndex);
      setSelectedShotIds(new Set(nextEntries.map(item => item.shotId)));
      setSelectionAnchorId(nextEntries[0]?.shotId || null);
      return { entries: nextEntries, valid: true, cancelled: true };
    }
    if (anchorIndex < 0) {
      setSelectionAnchorId(entry.shotId);
      setSelectedShotIds(new Set([entry.shotId]));
      return { entries: [entry], valid: true };
    }
    const start = Math.min(anchorIndex, entryIndex);
    const end = Math.max(anchorIndex, entryIndex);
    const rangeEntries = entries.slice(start, end + 1);
    if (rangeEntries.some(item => groupedShotIds.has(item.shotId))) return { entries: [], valid: false };
    setSelectedShotIds(new Set(rangeEntries.map(item => item.shotId)));
    return { entries: rangeEntries, valid: true };
  };

  return { getMembers, sync, toggleSelection, selectRange };
}
