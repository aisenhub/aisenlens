import { normalizeTimelineViewState } from '../features/project/project-view-state.js';

export function createProjectStateController({
  state,
  getSessionState,
  setLocalValue,
  setSessionValue,
  removeLocalValue,
  removeSessionValue,
  saveLastProjectId,
  onProjectChanged = () => {},
  updateSaveStatus = () => {}
} = {}) {
  const setCurrentProject = (id, title, meta = {}) => {
    const projectChanged = state.currentProjectId !== id;
    state.currentProjectId = id;
    state.currentProjectTitle = title;
    if (projectChanged) onProjectChanged();
    if (Object.prototype.hasOwnProperty.call(meta, 'videoFileName')) {
      state.currentProjectVideoFileName = meta.videoFileName || '';
    } else if (!id) {
      state.currentProjectVideoFileName = '';
    }
    if (Object.prototype.hasOwnProperty.call(meta, 'projectUuid')) {
      state.currentProjectUuid = meta.projectUuid || null;
    } else if (!id) {
      state.currentProjectUuid = null;
    }
    if (Object.prototype.hasOwnProperty.call(meta, 'timelineViewState')) {
      state.currentProjectTimelineViewState = normalizeTimelineViewState(meta.timelineViewState);
    } else if (!id) {
      state.currentProjectTimelineViewState = null;
    }
    if (id) {
      const sessionState = getSessionState(id, title);
      Object.entries(sessionState.local).forEach(([key, value]) => setLocalValue(key, value));
      Object.entries(sessionState.session).forEach(([key, value]) => setSessionValue(key, value));
      saveLastProjectId(sessionState.settingValue);
    } else {
      const sessionState = getSessionState(null, title);
      (sessionState.removeLocal || []).forEach(removeLocalValue);
      (sessionState.removeSession || []).forEach(removeSessionValue);
      saveLastProjectId(sessionState.settingValue);
    }
    updateSaveStatus();
  };

  return { setCurrentProject };
}
