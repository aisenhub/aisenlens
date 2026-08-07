import { bindProjectEvents } from '../dom/project-bindings.js';
import { createProjectSessionController } from '../dom/project-session.js';
import { createProjectSessionStateController } from './project-session-state.js';
import { createShotActions } from './shot-actions.js';
import { createNewSessionWorkflow } from './new-session-workflow.js';
import { formatUserError } from './diagnostics.js';
import { normalizeStorageError } from './storage-diagnostics.js';

export function createProjectSessionRuntime({
  elements = {},
  projectImportController,
  projectController,
  createProjectRecord,
  deleteProjectRecord,
  updateProjectRecord,
  getProjectRecord,
  sanitizeFolderName,
  createProjectUuid,
  getProjectContext,
  setCurrentProject,
  getSaveDirectory,
  setSaveDirectory,
  saveProjectDirectoryHandle,
  clearCurrentVideo,
  loadVideoFile,
  restoreVideoFromProjectFolder,
  copyVideoToProjectFolder,
  restoreAutoShotSegmentState,
  runtimeState,
  syncShotGroupsWithEntries,
  renderShots,
  updateCurrentProjectButton,
  updateCustomFieldNames,
  resetAutoSaveShotSnapshot,
  flushShotGroupsToDB,
  applyTemplate,
  ensureLoadedProjectScreenshots,
  releaseLoadedProjectScreenshots = () => {},
  saveImportedScreenshotAssets = async () => {},
  pruneImportedScreenshotAssets = async () => {},
  generateScreenshotsForAllEntries,
  openDatabase,
  getDatabaseSetting,
  locationTarget = { search: '' },
  sessionStorageTarget = {},
  localStorageTarget = {},
  windowTarget = globalThis,
  getTemplateName,
  setTemplateName,
  escapeText,
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

  const startNewSessionWorkflow = createNewSessionWorkflow({
    setCurrentProject,
    resetProjectState: resetProjectSessionState,
    updateCurrentProjectButton,
    renderShots
  }).start;
  const startNewSession = (...args) => {
    releaseLoadedProjectScreenshots();
    return startNewSessionWorkflow(...args);
  };

  const projectSessionController = createProjectSessionController({
    elements,
    projectImportController,
    projectController,
    createProjectRecord,
    deleteProjectRecord,
    updateProjectRecord,
    getProjectRecord,
    sanitizeFolderName,
    createProjectUuid,
    getProjectContext,
    setCurrentProject,
    getSaveDirectory,
    setSaveDirectory,
    saveProjectDirectoryHandle,
    clearCurrentVideo,
    loadVideoFile,
    restoreVideoFromProjectFolder,
    copyVideoToProjectFolder,
    restoreAutoShotSegmentState,
    resetProjectState: resetProjectSessionState,
    syncShotGroupsWithEntries,
    renderShots,
    updateCurrentProjectButton,
    updateCustomFieldNames,
    resetAutoSaveShotSnapshot,
    flushShotGroupsToDB,
    applyTemplate,
    ensureLoadedProjectScreenshots,
    releaseLoadedProjectScreenshots,
    saveImportedScreenshotAssets,
    pruneImportedScreenshotAssets,
    generateScreenshotsForAllEntries,
    openDatabase,
    getDatabaseSetting,
    locationTarget,
    sessionStorageTarget,
    localStorageTarget,
    windowTarget,
    documentTarget,
    onNewSession: startNewSession,
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
    escapeText,
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

  const {
    showGuideModal,
    hideGuideModal,
    guideNewProject,
    guideImportProject,
    showVideoPickModal,
    hideVideoPickModal,
    showEmptyVideoHint,
    importProjectFromFolder,
    loadLocalProject,
    createProjectFromVideo,
    createNewProject
  } = projectSessionController;

  bindProjectEvents({
    elements: {
      currentButton: elements.projectCurrentBtn,
      newButton: elements.newProjectBtn,
      deleteButton: elements.deleteProjectBtn,
      logo: elements.homeLogo,
      importButton: elements.importProjectFromFolderBtn,
      secondaryImportButton: elements.importProjectBtn2,
      dropdown: elements.projectDropdown
    },
    documentTarget,
    locationTarget,
    onToggle: elements.toggleProjectDropdown,
    onNew: createNewProject,
    onImport: importProjectFromFolder,
    onFolderImport: importProjectFromFolder,
    onDelete: () => projectSessionController.deleteCurrentProject(),
    onCloseDropdown: elements.closeProjectDropdown,
    onProjectId: loadLocalProject
  });

  return {
    projectSessionController,
    shotActions,
    resetProjectSessionState,
    startNewSession,
    showGuideModal,
    hideGuideModal,
    guideNewProject,
    guideImportProject,
    showVideoPickModal,
    hideVideoPickModal,
    showEmptyVideoHint,
    importProjectFromFolder,
    loadLocalProject,
    createProjectFromVideo,
    createNewProject
  };
}
