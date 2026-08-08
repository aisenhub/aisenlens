import { bindProjectEvents } from '../dom/project-bindings.js';
import { createProjectSessionController } from '../dom/project-session.js';
import { createProjectSessionStateController } from './project-session-state.js';
import { createShotActions } from './shot-actions.js';
import { formatUserError } from './diagnostics.js';
import { normalizeStorageError } from './storage-diagnostics.js';

export function createProjectSessionRuntime({
  elements = {},
  projectController,
  updateProjectRecord,
  getProjectRecord,
  getProjectContext,
  setCurrentProject,
  clearCurrentVideo,
  restoreVideoFromProjectStorage,
  restoreAutoShotSegmentState,
  runtimeState,
  syncShotGroupsWithEntries,
  renderShots,
  updateCurrentProjectButton,
  updateCustomFieldNames,
  resetAutoSaveShotSnapshot,
  applyTemplate,
  ensureLoadedProjectScreenshots,
  releaseLoadedProjectScreenshots = () => {},
  pruneImportedScreenshotAssets = async () => {},
  openDatabase,
  consumePendingSave,
  locationTarget = { search: '' },
  windowTarget = globalThis,
  getTemplateName,
  setTemplateName,
  getEntries,
  setEntries,
  getProjectId,
  removeScreenshotAssets,
  clearShotHeight,
  clearRecordingCache,
  updateEntryScreenshot,
  getActiveShotNumber,
  setActiveShot,
  markDirty,
  showToast,
  documentTarget,
  commandHistory = null,
  getVideoDuration = () => 0,
  pauseAutosave = () => {},
  resumeAutosave = () => {},
  flushAutosave = async () => {}
} = {}) {
  const resetProjectState = createProjectSessionStateController({
    setEntries: value => { runtimeState.entries = value; },
    setGroups: value => { runtimeState.shotGroups = value; },
    setActiveGroupId: value => { runtimeState.activeShotGroupId = value; },
    setEditingTitleId: value => { runtimeState.editingShotGroupTitleId = value; },
    setEditingSummaryId: value => { runtimeState.editingShotGroupSummaryId = value; },
    setSelectedShotIds: value => { runtimeState.selectedShotIds = value; },
    setSelectionAnchorId: value => { runtimeState.shotGroupSelectionAnchorId = value; },
    setCustomFieldNames: value => { runtimeState.customFieldNames = value; },
    setActiveShotNumber: value => { runtimeState.activeShotNumber = value; },
    setExpandedShotNumber: value => { runtimeState.expandedShotNumber = value; },
    resetAutoSaveSnapshot: resetAutoSaveShotSnapshot
  }).reset;
  const resetProjectSessionState = (...args) => {
    commandHistory?.clear();
    return resetProjectState(...args);
  };

  const projectSessionController = createProjectSessionController({
    projectController,
    updateProjectRecord,
    getProjectRecord,
    getProjectContext,
    setCurrentProject,
    clearCurrentVideo,
    restoreVideoFromProjectStorage,
    restoreAutoShotSegmentState,
    resetProjectState: resetProjectSessionState,
    syncShotGroupsWithEntries,
    renderShots,
    updateCurrentProjectButton,
    updateCustomFieldNames,
    applyTemplate,
    ensureLoadedProjectScreenshots,
    releaseLoadedProjectScreenshots,
    pruneImportedScreenshotAssets,
    openDatabase,
    consumePendingSave,
    locationTarget,
    windowTarget,
    onDatabaseError: error => showToast(
      formatUserError(normalizeStorageError(error, {
        operation: '本地数据库初始化',
        fallback: {
          code: 'DATABASE_INIT_FAILED',
          title: '本地数据库初始化失败',
          action: '请检查浏览器存储权限和可用空间后重试。'
        }
      })),
      'warning',
      6000
    ),
    getTemplateName,
    setTemplateName,
    showToast,
    pauseAutosave,
    resumeAutosave,
    flushAutosave
  });

  const shotActions = createShotActions({
    getEntries,
    setEntries,
    getProjectId,
    removeScreenshotAssets,
    clearHeight: clearShotHeight,
    clearRecordingCache,
    updateEntryScreenshot,
    renderShots,
    getActiveShotNumber,
    setActiveShot,
    markDirty,
    showToast,
    history: commandHistory,
    getVideoDuration,
    getGroups: () => runtimeState.shotGroups,
    setGroups: value => { runtimeState.shotGroups = value; }
  });

  bindProjectEvents({
    elements: {
      titleInput: elements.projectTitleInput
    },
    onRename: title => projectSessionController.renameCurrentProject(title)
  });

  return {
    projectSessionController,
    shotActions,
    loadLocalProject: projectSessionController.loadLocalProject
  };
}
