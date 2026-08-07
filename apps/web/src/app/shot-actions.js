import { formatTime, parseTimecode } from '../utils/time.js';
import { removeShotByNumber } from '../features/shots/shot-store.js';
import { normalizeShotState, updateShots } from '../features/shots/shot-update-pipeline.js';

export function createShotActions({
  getEntries = () => [],
  setEntries = () => {},
  getProjectId = () => null,
  removeScreenshotAssets = async () => {},
  clearHeight = () => {},
  clearRecordingCache = () => {},
  updateEntryScreenshot = async () => {},
  renderShots = () => {},
  getActiveShotNumber = () => null,
  setActiveShot = () => {},
  markDirty = () => {},
  showToast = () => {},
  history = null,
  getVideoDuration = () => 0,
  getGroups = () => [],
  setGroups = () => {}
} = {}) {
  const cloneEntries = entries => entries.map(item => ({ ...item, custom: { ...(item.custom || {}) } }));
  const applyState = (entries, groups = getGroups()) => {
    const normalized = normalizeShotState(entries, groups, { duration: getVideoDuration() });
    setEntries(normalized.entries);
    setGroups(normalized.shotGroups);
    clearRecordingCache();
    renderShots();
    markDirty();
    return normalized;
  };
  const applyEntries = entries => {
    applyState(entries);
  };

  const deleteShot = entry => {
    const before = cloneEntries(getEntries());
    const deletedShotId = entry.shotId;
    const after = removeShotByNumber(before, entry.shotNumber);
    const apply = next => {
      applyEntries(next);
      if (!next.some(item => item.shotId === deletedShotId)) {
        clearHeight(deletedShotId);
        if (!history) removeScreenshotAssets(getProjectId(), [deletedShotId]).catch(() => {});
      }
      if (getActiveShotNumber() === entry.shotNumber) setActiveShot(null);
    };
    if (history) return history.execute(history.createSnapshotCommand({ before, after, apply, label: '删除分镜' }));
    apply(after);
  };

  const saveTime = async (entry, timeValue) => {
    const time = parseTimecode(timeValue);
    if (!Number.isFinite(time)) {
      showToast('无效的时间格式', 'error');
      return false;
    }
    await updateFields(entry, { time });
    return true;
  };

  const updateFieldsBatch = (patches = [], label = '编辑分镜属性') => {
    const before = cloneEntries(getEntries());
    const normalizedPatches = patches.filter(item => item?.shotId && item.patch);
    const computed = updateShots(before, normalizedPatches, { duration: getVideoDuration(), groups: getGroups() });
    const apply = async next => {
      applyState(next);
      const changedIds = new Set(normalizedPatches
        .filter(item => ['time', 'image', 'lastFrameImage'].some(field => item.patch[field] !== undefined))
        .map(item => item.shotId));
      await Promise.all([...changedIds].map(shotId => {
        const nextEntry = getEntries().find(item => item.shotId === shotId);
        return nextEntry ? updateEntryScreenshot(nextEntry) : null;
      }));
    };
    const command = { label, execute: () => apply(computed.entries), undo: () => apply(before) };
    return history ? history.execute(command) : apply(computed.entries);
  };

  const updateFields = (entry, patch = {}) => updateFieldsBatch([{ shotId: entry?.shotId, patch }]);

  const replaceEntries = (entries, groups = getGroups()) => applyState(entries, groups);

  return { deleteShot, saveTime, updateFields, updateFieldsBatch, replaceEntries, applyState };
}
