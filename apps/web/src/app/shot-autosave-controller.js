import { createAutoSaveState } from './state.js';
import {
  createShotAutoSaveState,
  createShotSnapshot,
  getShotAutoSaveChanges,
  mergeShotSnapshot
} from '../features/shots/shot-autosave.js';
import { createSaveCoordinator } from './save-coordinator.js';

export function createShotAutosaveController({
  state = createAutoSaveState(),
  getProjectId = () => null,
  getProjectTitle = () => '',
  getProjectUuid = () => null,
  getVideoFileName = () => '',
  getVideoDuration = () => 0,
  getTemplateName = () => '',
  getSerializedShots = () => [],
  updateDurations = () => {},
  saveShotsIncremental,
  flushGroups,
  updateProject,
  createProjectUuid,
  serializeAutoShotState = () => null,
  setCurrentProject = () => {},
  setDirtyState = () => {},
  updateSaveStatus = () => {},
  onSaveDiagnostic = () => {}
} = {}) {
  let coordinator = null;
  const buildShotState = () => {
    updateDurations();
    return createShotAutoSaveState(getSerializedShots());
  };

  const resetSnapshot = () => {
    coordinator?.reset();
    state.timer = null;
    state.revision += 1;
    state.shotSnapshot = createShotSnapshot(buildShotState());
    state.snapshotProjectId = getProjectId() || null;
    state.status = 'idle';
    state.pending = false;
    state.lastError = null;
  };

  const mergeSnapshot = (projectId, savedState, deletedShotIds) => {
    if (state.snapshotProjectId !== projectId) return;
    state.shotSnapshot = mergeShotSnapshot(
      state.shotSnapshot,
      savedState,
      deletedShotIds,
      buildShotState()
    );
  };

  const run = async projectId => {
    if (!getProjectId() || getProjectId() !== projectId) return;
    state.status = 'saving';
    state.pending = false;
    state.lastError = null;
    updateSaveStatus();
    const revision = state.revision;
    const currentState = buildShotState();
    if (state.snapshotProjectId !== projectId) {
      state.snapshotProjectId = projectId;
      state.shotSnapshot = new Map();
    }
    const { upserts, deletedShotIds } = getShotAutoSaveChanges(currentState, state.shotSnapshot);
    await saveShotsIncremental(projectId, upserts, deletedShotIds);
    if (getProjectId() !== projectId) return;
    if (getProjectId() !== projectId) return;
    await flushGroups(projectId);
    try {
      const videoFileName = getVideoFileName();
      const duration = Math.round(getVideoDuration() || 0);
      const templateName = getTemplateName();
      const projectUuid = getProjectUuid() || createProjectUuid();
      setCurrentProject(projectId, getProjectTitle(), { videoFileName, projectUuid });
      await updateProject(projectId, {
        videoFileName,
        duration,
        templateType: templateName,
        projectUuid,
        autoShotState: serializeAutoShotState()
      });
    } catch (error) {
      state.lastError = error;
      throw error;
    }
    mergeSnapshot(projectId, currentState, deletedShotIds);
    state.status = 'saved';
    state.lastSuccessAt = Date.now();
    if (revision === state.revision && getProjectId() === projectId) {
      setDirtyState(false, state.lastSuccessAt);
    }
    updateSaveStatus();
    if (revision !== state.revision) schedule();
  };

  const schedule = () => {
    const projectId = getProjectId();
    if (!projectId) return;
    state.pending = true;
    state.status = 'scheduled';
    coordinator?.schedule();
  };

  const markDirty = () => {
    setDirtyState(true, Date.now());
    state.revision += 1;
    state.status = 'dirty';
    state.lastError = null;
    updateSaveStatus();
    schedule();
  };

  coordinator = createSaveCoordinator({
    debounceMs: 300,
    getProjectId,
    onDiagnostic: onSaveDiagnostic,
    save: () => run(getProjectId()),
    onState: ({ state: nextState, error }) => {
      if (nextState === 'failed') state.lastError = state.lastError || new Error('项目保存失败');
      if (nextState === 'failed') {
        state.lastError = error || state.lastError || new Error('SAVE_FAILED');
        state.pending = true;
        setDirtyState(true, Date.now());
      }
      if (nextState === 'saving') state.status = 'saving';
      if (nextState === 'saved') state.status = 'saved';
      if (nextState === 'failed') state.status = 'failed';
      if (nextState === 'paused') state.status = 'paused';
      updateSaveStatus();
    }
  });

  return {
    state,
    resetSnapshot,
    mergeSnapshot,
    run,
    schedule,
    markDirty,
    flush: () => coordinator.flush(),
    pause: () => coordinator.pause(),
    resume: () => coordinator.resume(),
    getSaveState: () => coordinator.getState(),
    coordinator
  };
}
