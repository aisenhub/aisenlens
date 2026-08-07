import { createApplicationState, createAutoSaveState, bindApplicationState } from './state.js';
import { createProjectStateController } from './project-state.js';
import { createShotAutosaveController } from './shot-autosave-controller.js';
import { createAutoShotSessionController } from './auto-shot-session.js';
import { createShotGroupStateController } from './shot-group-state.js';
import { createShotGroupPersistenceController } from './shot-group-persistence.js';
import { getProjectSessionState } from '../features/project/project-session.js';

export function createProjectStateRuntime({
  windowTarget = window,
  runtimeState,
  getSessionState = getProjectSessionState,
  setLocalValue,
  setSessionValue,
  removeLocalValue,
  removeSessionValue,
  saveLastProjectId,
  updateSaveStatus,
  getVideoFile,
  getVideoName,
  getVideoDuration,
  updateAutoShotCard = () => {},
  getProjectId,
  updateProject,
  getSettings,
  getProjectTitle,
  getProjectUuid,
  getCurrentVideoFileName,
  getTemplateName,
  getSerializedShots,
  updateDurations,
  saveShotsIncremental,
  serializeGroups,
  saveGroups,
  getShotGroups,
  serializeAutoShotState,
  createProjectUuid,
  updateDirtyState,
  getResetAutoSaveSnapshot = () => {},
  getProjectTitleForSave = getProjectTitle,
  onSaveDiagnostic = () => {}
} = {}) {
  const applicationState = createApplicationState();
  bindApplicationState(windowTarget, applicationState);

  const autoShotSessionController = createAutoShotSessionController({
    getVideoFile,
    getVideoName,
    getVideoDuration,
    getProjectId,
    updateProject,
    getDefaults: getSettings,
    updateCard: updateAutoShotCard
  });

  let resetAutoSaveShotSnapshot = getResetAutoSaveSnapshot;
  const projectStateController = createProjectStateController({
    state: applicationState,
    getSessionState,
    setLocalValue,
    setSessionValue,
    removeLocalValue,
    removeSessionValue,
    saveLastProjectId,
    onProjectChanged: () => resetAutoSaveShotSnapshot(),
    updateSaveStatus,
    onSaveDiagnostic
  });
  const currentProjectSetter = projectStateController.setCurrentProject;

  const shotGroupStateController = createShotGroupStateController({
    getEntries: () => runtimeState.entries,
    getGroups: getShotGroups,
    getActiveGroupId: () => runtimeState.activeShotGroupId,
    getEditingTitleId: () => runtimeState.editingShotGroupTitleId,
    getEditingSummaryId: () => runtimeState.editingShotGroupSummaryId,
    getSelectedShotIds: () => runtimeState.selectedShotIds,
    getSelectionAnchorId: () => runtimeState.shotGroupSelectionAnchorId,
    setGroups: value => { runtimeState.shotGroups = value; },
    setActiveGroupId: value => { runtimeState.activeShotGroupId = value; },
    setEditingTitleId: value => { runtimeState.editingShotGroupTitleId = value; },
    setEditingSummaryId: value => { runtimeState.editingShotGroupSummaryId = value; },
    setSelectedShotIds: value => { runtimeState.selectedShotIds = value; },
    setSelectionAnchorId: value => { runtimeState.shotGroupSelectionAnchorId = value; }
  });
  const syncGroups = shotGroupStateController.sync;
  const flushShotGroups = createShotGroupPersistenceController({
    getProjectId,
    syncGroups,
    getGroups: getShotGroups,
    serializeGroups,
    saveGroups
  }).flush;

  const shotAutosaveController = createShotAutosaveController({
    state: createAutoSaveState(),
    getProjectId,
    getProjectTitle: getProjectTitleForSave,
    getProjectUuid,
    getVideoFileName: getCurrentVideoFileName,
    getVideoDuration,
    getTemplateName,
    getSerializedShots,
    updateDurations,
    saveShotsIncremental,
    flushGroups: flushShotGroups,
    updateProject,
    createProjectUuid,
    serializeAutoShotState: serializeAutoShotState || autoShotSessionController.serializeState,
    setCurrentProject: currentProjectSetter,
    setDirtyState: updateDirtyState,
    updateSaveStatus
  });
  resetAutoSaveShotSnapshot = shotAutosaveController.resetSnapshot;

  return {
    applicationState,
    autoShotSessionController,
    projectStateController,
    setCurrentProject: currentProjectSetter,
    shotGroupStateController,
    getShotGroupMembers: shotGroupStateController.getMembers,
    selectShotGroupRange: shotGroupStateController.selectRange,
    syncShotGroupsWithEntries: syncGroups,
    flushShotGroupsToDB: flushShotGroups,
    shotAutosaveController,
    resetAutoSaveShotSnapshot,
    markDirty: shotAutosaveController.markDirty,
    serializeAutoShotSegmentState: autoShotSessionController.serializeState,
    restoreAutoShotSegmentState: autoShotSessionController.restoreState,
    resetAutoShotSegmentState: autoShotSessionController.resetState,
    getAutoShotSegmentState: autoShotSessionController.getState,
    setAutoShotSegmentState: autoShotSessionController.setState
  };
}
