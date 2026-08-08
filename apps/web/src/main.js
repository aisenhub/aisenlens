import { $ } from './dom/query.js';
import { showToast } from './dom/toast.js';
import { initTheme } from './dom/theme.js';
import { attachShotEditorNote, bindDomElements } from './app/dom-bindings.js';
import { createAudioWaveformState } from './app/state.js';
import { onDomReady } from './app/dom-ready.js';
import { createEntryRuntime } from './app/entry-runtime.js';
import { createTemplateRuntime } from './app/template-runtime.js';
import { normalizeProjectGroups, normalizeProjectShots } from './features/project/project-data.js';
import {
  createProjectRecord,
  getProjectBundle,
  getProjectRecord,
  updateProjectRecord
} from './features/project/project-service.js';
import { loadProjectVideo, saveProjectVideo } from './features/project/project-media.js';
import { createProjectController } from './features/project/project-controller.js';
import { createModalFocusManager } from './dom/modal-focus.js';
import { createProjectNavigationController } from './dom/project-navigation.js';
import { createVideoUiController } from './dom/video-ui.js';
import { createVideoInfoPopoverController } from './dom/video-info-popover.js';
import { serializeProjectGroups, serializeProjectShots } from './features/project/project-serialization.js';
import {
  deleteProjectScreenshotAssets,
  loadProjectScreenshotAssets,
  pruneProjectScreenshotAssets,
  saveProjectScreenshotAssets,
  estimateScreenshotStorage
} from './features/screenshots/screenshot-assets.js';
import { hydrateEntryFullScreenshots, releaseHydratedScreenshots } from './dom/screenshot-service.js';
import { createScreenshotAbortState, requestScreenshotStop } from './features/screenshots/screenshot-state.js';
import {
  saveProjectShotGroups,
  saveProjectShots,
  saveProjectShotsIncremental
} from './features/shots/shot-persistence.js';
import {
  createShotEntry,
  getNextShotNumber
} from './features/shots/shot-store.js';
import { createProjectSessionRuntime } from './app/project-session-runtime.js';
import { createMediaRuntime } from './app/media-runtime.js';
import { createShotRuntime } from './app/shot-runtime.js';
import { createStartupRuntime } from './app/startup-runtime.js';
import { createTemplateSystemRuntime } from './app/template-system-runtime.js';
import { createProjectStateRuntime } from './app/project-state-runtime.js';
import { createSettingsRuntime } from './app/settings-runtime.js';
import { createRuntimeState } from './app/runtime-state.js';
import { createProjectContextAdapter } from './app/project-context.js';
import { createFeedbackController } from './dom/feedback-controller.js';
import { createShotGroupFromSelection as createShotGroupFromSelectionDom } from './dom/shot-group-workflow.js';
import { createShotTableCellValue } from './dom/shot-table-value.js';
import { createWindowDialogAdapter } from './dom/window-dialogs.js';
import { createCommandHistory } from './app/command-history.js';
import { createActionRegistry } from './app/action-registry.js';
import { getActionDefinition } from './app/action-catalog.js';
import { ACTION_DEFINITIONS } from './app/action-catalog.js';
import { createShortcutHelpController } from './dom/shortcut-help.js';
import { createTooltipController } from './dom/tooltip.js';
import { createHistoryControls } from './dom/history-controls.js';
import { createStatusController } from './app/status-matrix.js';
import { createTableDisplayModalController } from './dom/table-display-modal.js';
import { createTemplateSelectionAdapter } from './dom/template-selection.js';
import { escapeTemplateText } from './utils/text.js';
import { formatTime, parseTimecode } from './utils/time.js';
import { getEntryThumbnail } from './utils/shots.js';
import {
  formatVideoInfoDuration,
  formatVideoInfoFileSize,
  formatVideoInfoFileName
} from './utils/video-info.js';
import { createEntityId, createProjectUuid } from './utils/ids.js';
import { getTemplateEntryValue, normalizeTemplateFields, normalizeFieldPool, normalizeReferenceOptions } from './utils/templates.js';
import { serializeShotGroups } from './features/groups/group-persistence.js';
import {
  TEMPLATES,
  TEMPLATE_DEFINITIONS_KEY,
  FIELD_POOL_ORDER,
  FIELD_POOL_KEY,
  FIELD_POOL_VERSION
} from './utils/template-config.js';
import {
  DEFAULT_APP_SETTINGS,
  TABLE_DISPLAY_FIELD_LIMIT,
  normalizeAppSettings
} from './utils/settings.js';
import {
  dbDeleteSetting,
  dbGetSetting,
  dbSetSetting,
  openDB
} from './platform/indexeddb.js';
import { readJsonStorage, writeJsonStorage, removeStorageKeys } from './platform/browser-storage.js';
import { requestStoragePersistence } from './platform/opfs-storage.js';
import { createSettingsService } from './features/settings/settings-service.js';
import { createTemplateController } from './dom/template-controller.js';
import { formatUserError } from './app/diagnostics.js';
import { normalizeStorageError } from './app/storage-diagnostics.js';
import { normalizeTimelineViewState } from './features/project/project-view-state.js';
import { createProjectBackupService } from './platform/project-backup-service.js';
import { getAppRoute, getEditorPath } from './app/routes.js';

const projectController = createProjectController({
  getProjectRecord,
  getProjectBundle,
  normalizeShots: normalizeProjectShots,
  normalizeGroups: normalizeProjectGroups,
  createProjectUuid
});
const projectBackupService = createProjectBackupService({
  getProject: getProjectRecord,
  getProjectBundle,
  loadVideo: loadProjectVideo,
  loadScreenshots: loadProjectScreenshotAssets
});

/* ===================================================================
 *  Theme
 * =================================================================== */
initTheme(() => renderAudioWaveform());

/* ===================================================================
 *  File System Access Utilities (for import/export project folders)
 * =================================================================== */
const APP_SETTINGS_KEY = 'ashenVideoAppSettings';
const PENDING_PROJECT_SAVE_KEY = 'pendingProjectSave';
const showStorageError = (error, operation = '本地数据操作') => {
  const diagnostic = normalizeStorageError(error, {
    operation,
    fallback: {
      code: 'STORAGE_OPERATION_FAILED',
      title: '本地数据操作失败',
      action: '请检查浏览器存储权限后重试。'
    }
  });
  showToast(formatUserError(diagnostic), 'warning', 6000);
};
const setBrowserStorageValue = (storage, key, value, operation) => {
  try {
    storage.setItem(key, value);
  } catch (error) {
    showStorageError(error, operation);
    throw error;
  }
};
const removeBrowserStorageValue = (storage, key, operation) => {
  try {
    storage.removeItem(key);
  } catch (error) {
    showStorageError(error, operation);
  }
};
const settingsService = createSettingsService({
  key: APP_SETTINGS_KEY,
  readStorage: readJsonStorage,
  writeStorage: writeJsonStorage,
  normalizeSettings: normalizeAppSettings,
  onSaveError: error => showStorageError(error, '本地配置保存')
});
const getAppSettings = settingsService.get;
const saveAppSettings = settingsService.save;
const runtimeState = createRuntimeState({
  playbackRate: Number(localStorage.getItem('playbackRate')) || 1
});
let storagePersistence = { status: 'checking', persisted: false };
const savedPlaybackRate = runtimeState.playbackRate;
const projectContext = createProjectContextAdapter({ target: window });

const commandHistory = createCommandHistory({
  onChange: ({ canUndo, canRedo }) => {
    window.dispatchEvent(new CustomEvent('app:historychange', { detail: { canUndo, canRedo } }));
  }
});
const actionRegistry = createActionRegistry({
  getContext: () => ({ projectId: projectContext.getId(), history: commandHistory }),
  onError: error => console.error('Action failed', error),
  onUnavailable: (id, reason) => showToast(`${getActionDefinition(id)?.label || '当前操作'}：${reason}`, 'warning')
});
actionRegistry.register('history.undo', async () => {
  const result = await commandHistory.undo();
  if (result) showToast('已撤销上一项编辑', 'info');
  return result;
}, {
  metadata: getActionDefinition('history.undo'),
  isActive: () => commandHistory.canUndo()
});
actionRegistry.register('history.redo', async () => {
  const result = await commandHistory.redo();
  if (result) showToast('已重做上一项编辑', 'info');
  return result;
}, {
  metadata: getActionDefinition('history.redo'),
  isActive: () => commandHistory.canRedo()
});

let templateSelection = null;
let projectStateRuntime = null;
const templateRuntime = createTemplateRuntime({
  templates: TEMPLATES,
  getTemplateName: () => templateSelection?.getValue() || '',
  defaultTemplateName: '默认模板',
  getController: () => templateController,
  updateShotTable: (...args) => entryRuntime.updateShotTable(...args)
});
const entryRuntime = createEntryRuntime({
  getProjectContext: projectContext.getVideoContext,
  getProjectNavigationController: () => projectNavigationController,
  getTemplateRuntime: () => templateRuntime,
  getShotGroupController: () => shotRuntime?.shotGroupController,
  getShotGroupStateController: () => projectStateRuntime?.shotGroupStateController,
  getShotTableController: () => shotRuntime?.shotTableController,
  getShotRendererController: () => shotRuntime?.shotRendererController,
  getShotModalController: () => shotModalController,
  getVideoUiController: () => videoUiController,
  getAutoShotController: () => autoShotController,
  getAppShellController: () => shotRuntime?.appShellController,
  getRuntimeState: () => runtimeState,
  getVideo: () => toolVideo,
  createShotGroupFromSelection: createShotGroupFromSelectionDom,
  getPrompt: () => windowDialogs.prompt,
  getIdFactory: () => createEntityId,
  markDirty: (...args) => markDirty(...args),
  renderShotView: () => shotRuntime?.shotRendererController?.render?.(),
  history: commandHistory
});
const {
  updateSaveStatus: updateSaveStatusRuntime,
  resetVideoInfoFrameRate: resetVideoInfoFrameRateRuntime,
  startVideoInfoFrameRateSampling: startVideoInfoFrameRateSamplingRuntime,
  updateVideoInfo: updateVideoInfoRuntime,
  openImageModal: openImageModalRuntime,
  disableVideoButtons: disableVideoButtonsRuntime,
  enableVideoButtons: enableVideoButtonsRuntime,
  waitForVideoReady: waitForVideoReadyRuntime,
  updateDurations: updateDurationsRuntime,
  updateShotTable: updateShotTableRuntime,
  syncShotTable: syncShotTableRuntime,
  renderShots: renderShotsRuntime,
  setActiveShot: setActiveShotRuntime,
  updateCustomFieldNames: updateCustomFieldNamesRuntime
} = entryRuntime;

/* ===================================================================
 *  Import Project from Folder
 * =================================================================== */
const updateCurrentProjectBtn = entryRuntime.updateCurrentProjectButton;

/* 顶栏模板面板：集中放模板选项、编辑字段、自定义模板 */
const openTemplateMenu = entryRuntime.openTemplateMenu;
const closeTemplateMenu = entryRuntime.closeTemplateMenu;
const isTemplateMenuOpen = entryRuntime.isTemplateMenuOpen;

/* 触发按钮上显示当前模板名，收起状态下也能看出用的是哪个模板 */
const updateTemplateMenuLabel = entryRuntime.updateTemplateMenuLabel;
const closeProjectDropdown = entryRuntime.closeProjectDropdown;

const audioWaveformState = createAudioWaveformState();

/* ===================================================================
 *  Templates
 * =================================================================== */
const FIXED_TEMPLATE_FIELD_NAMES = ['镜号', '时长', '画面截图'];


const syncTemplateOptions = entryRuntime.syncTemplateOptions;
const getTemplateSelection = () => templateSelection?.getValue() || '';

const getSelectedTemplate = templateRuntime.getSelectedTemplate;
const getConfiguredTemplateFields = templateRuntime.getConfiguredTemplateFields;
const FIXED_TABLE_COLUMNS = [
  { key: 'shotNumber', label: '镜号', fixed: true },
  { key: 'duration', label: '时长', fixed: true },
  { key: 'image', label: '画面截图', fixed: true }
];
const getShotTableCellValue = createShotTableCellValue({
  getThumbnail: getEntryThumbnail,
  getTemplateValue: getTemplateEntryValue
});

const refreshShotTableConfiguration = entryRuntime.refreshShotTableConfiguration;
const renderTemplateEditor = entryRuntime.renderTemplateEditor;
const renderCustomTemplateEditor = entryRuntime.renderCustomTemplateEditor;

const templateSystemRuntime = createTemplateSystemRuntime({
  templates: TEMPLATES,
  fixedFields: FIXED_TEMPLATE_FIELD_NAMES,
  fixedColumns: FIXED_TABLE_COLUMNS,
  defaultTemplateName: '榛樿妯℃澘',
  tableDisplayFieldLimit: TABLE_DISPLAY_FIELD_LIMIT,
  templateStorageKey: TEMPLATE_DEFINITIONS_KEY,
  fieldPoolStorageKey: FIELD_POOL_KEY,
  fieldPoolVersion: FIELD_POOL_VERSION,
  fieldPoolOrder: FIELD_POOL_ORDER,
  ignoredTemplateNames: ['通用模板', '轻剪辑', '不使用模版', '不使用模板'],
  onStorageError: error => showStorageError(error, '模板配置保存'),
  readStorage: readJsonStorage,
  writeStorage: writeJsonStorage,
  getSettings: getAppSettings,
  saveSettings: saveAppSettings,
  getTemplateName: getTemplateSelection,
  setTemplateName: name => templateSelection?.setValue(name),
  getSelectedTemplate,
  getConfiguredFields: getConfiguredTemplateFields,
  getTemplateDraft: () => runtimeState.templateEditorDraft,
  setTemplateDraft: value => { runtimeState.templateEditorDraft = value; },
  getCustomDraft: () => runtimeState.customTemplateDraft,
  setCustomDraft: value => { runtimeState.customTemplateDraft = value; },
  getFieldOptionsDraft: () => runtimeState.fieldOptionsDraft,
  setFieldOptionsDraft: value => { runtimeState.fieldOptionsDraft = value; },
  setCustomFieldNames: fields => { runtimeState.customFieldNames = [...fields]; },
  escapeText: escapeTemplateText,
  updateTemplateMenuLabel,
  renderTemplateEditor,
  renderCustomTemplateEditor,
  renderShots: () => renderShots(),
  refreshTable: refreshShotTableConfiguration,
  markDirty: () => markDirty(),
  syncTemplateOptions,
  showToast
});
const {
  templatePoolController,
  ensureFieldInPool,
  getFieldReferenceOptions,
  getCategorizedFieldPool,
  getVisibleTableFields,
  getSelectedTableDisplayFields,
  getShotTableColumns,
  getHomepageShotTableColumns,
  getOrderedFixedColumns,
  applyTemplate,
  updateSelectedTemplateFields,
  saveTemplateEditorDraft,
  saveCustomTemplateDraft,
  handleTemplateChange,
  saveFieldOptions,
  getTemplateEditorFields,
  updateCustomTemplateDraftFields
} = templateSystemRuntime;

let shotRuntime = null;
runtimeState.screenshotAbort = createScreenshotAbortState();
let updateAutoShotSegmentCard = () => {};
const windowDialogs = createWindowDialogAdapter(window);
let resetAutoSaveShotSnapshot = () => {};
let markDirty = () => {};

let setCurrentProject = () => {};

projectStateRuntime = createProjectStateRuntime({
  windowTarget: window,
  runtimeState,
  setLocalValue: (key, value) => setBrowserStorageValue(localStorage, key, value, '项目本地状态保存'),
  setSessionValue: (key, value) => setBrowserStorageValue(sessionStorage, key, value, '项目会话状态保存'),
  removeLocalValue: key => removeBrowserStorageValue(localStorage, key, '项目本地状态清理'),
  removeSessionValue: key => removeBrowserStorageValue(sessionStorage, key, '项目会话状态清理'),
  saveLastProjectId: value => {
    dbSetSetting('lastProjectId', value).catch(error => showStorageError(error, '项目索引保存'));
  },
  updateSaveStatus: () => updateSaveStatus(),
  getVideoFile: () => runtimeState.currentVideoFile,
  getVideoName: () => getCurrentVideoFileName(),
  getVideoDuration: () => toolVideo?.duration,
  updateAutoShotCard: () => updateAutoShotSegmentCard(),
  getProjectId: projectContext.getId,
  updateProject: updateProjectRecord,
  getSettings: getAppSettings,
  getProjectTitle: projectContext.getTitle,
  getProjectUuid: projectContext.getUuid,
  getCurrentVideoFileName: () => getCurrentVideoFileName(),
  getTemplateName: getTemplateSelection,
  getSerializedShots: () => getSerializedProjectShots(),
  updateDurations: () => updateDurations(),
  saveShotsIncremental: saveProjectShotsIncremental,
  serializeGroups: serializeShotGroups,
  saveGroups: saveProjectShotGroups,
  getShotGroups: () => runtimeState.shotGroups,
  createProjectUuid,
  updateDirtyState: (dirty, timestamp) => {
    window.__dirty = dirty;
    window.__lastEditAt = timestamp;
  },
  markSavePending: pendingSave => dbSetSetting(PENDING_PROJECT_SAVE_KEY, pendingSave),
  clearSavePending: () => dbDeleteSetting(PENDING_PROJECT_SAVE_KEY),
  getResetAutoSaveSnapshot: () => resetAutoSaveShotSnapshot(),
  onSaveDiagnostic: diagnostic => {
    const error = diagnostic?.error || diagnostic;
    const normalized = normalizeStorageError(error, {
      operation: '项目自动保存',
      fallback: {
        code: 'PROJECT_AUTOSAVE_FAILED',
        title: '项目自动保存失败',
        action: '请检查浏览器存储权限和可用空间后重试保存。'
      }
    });
    showToast(formatUserError(normalized), 'error', 6000);
  }
});
const {
  autoShotSessionController,
  shotAutosaveController,
  getShotGroupMembers,
  syncShotGroupsWithEntries,
  flushShotGroupsToDB,
  serializeAutoShotSegmentState,
  restoreAutoShotSegmentState,
  resetAutoShotSegmentState,
  getAutoShotSegmentState
} = projectStateRuntime;
const setProjectState = projectStateRuntime.setCurrentProject;
setCurrentProject = (...args) => {
  setProjectState(...args);
  const projectId = Number(args[0]);
  if (!projectId) return;
  const route = getAppRoute(window.location);
  if (route.projectId !== projectId) window.history.replaceState({}, '', getEditorPath(projectId));
};
resetAutoSaveShotSnapshot = projectStateRuntime.resetAutoSaveShotSnapshot;
markDirty = projectStateRuntime.markDirty;

const updateShotGroupToolbar = entryRuntime.updateShotGroupToolbar;

const focusShotGroupSummary = entryRuntime.focusShotGroupSummary;

const focusShotGroupTitle = entryRuntime.focusShotGroupTitle;

const setShotGroupSelectionMode = entryRuntime.setShotGroupSelectionMode;

const selectShotGroupRange = entryRuntime.selectShotGroupRange;

const createShotGroupFromSelection = entryRuntime.createShotGroupFromSelection;

/* ===================================================================
 *  DOM References
 * =================================================================== */
const {
  toolVideo,
  videoEmpty,
  loadVideoInput,
  saveStatus,
  undoBtn,
  redoBtn,
  saveBtn,
  editorBackBtn,
  projectTitleInput,
  homeLogo,
  videoInfoFileName,
  videoInfoFileBaseName,
  videoInfoFileExtension,
  videoInfoDuration,
  videoInfoResolution,
  videoInfoFrameRate,
  videoInfoFileSize,
  videoInfoBtn,
  headerVideoInfo,
  videoStage,
  monitorSurface,
  toolPlayer,
  loadVideoBtn,
  toggleShotTableBtn,
  workspaceRegion1,
  workspaceRegion2,
   workspaceRegion3,
   toolGrid,
   toolHorizontalSplitter,
  shotTableWrap,
  shotTableSplitter,
  shotTableBody,
  shotTableHeadRow,
  audioWaveformPanel,
  audioWaveformTrack,
  audioWaveformCanvas,
  audioWaveformEmpty,
  audioWaveformRuler,
  audioWaveformPlayhead,
  audioWaveformZoomLabel,
  audioWaveformZoomOut,
  audioWaveformZoomIn,
  audioWaveformFit,
  overlayCanvas,
  overlayBtn,
  overlayMenu,
  recordVideoBtn,
  recordingConfigModal,
  recordingConfigModalClose,
  recordingConfigCancelBtn,
  recordingConfigConfirmBtn,
  recordingConfigStats,
  recordingConfigWarning,
  recordingModal,
  recordingModalTitle,
  recordingModalClose,
  recordingStatusLine,
  recordingStatusText,
  recordingTimeText,
  recordingProgressInner,
  recordingPauseBtn,
  recordingCancelBtn,
  captureBtn,
  updateScreenshotBtn,
  autoShotBtnMeta,
  shotEditorModal,
  shotEditorTitle,
  shotEditorVideoContainer,
  shotEditorFirstImage,
  shotEditorLastImage,
  shotEditorFirstTime,
  shotEditorLastTime,
  shotEditorSplitBtn,
  shotEditorFirstControls,
  shotEditorFirstNote,
  shotEditorPrevFrame,
  shotEditorNextFrame,
  shotEditorBackSecond,
  shotEditorPlayPause,
  shotEditorForwardSecond,
  shotEditorFirstPrev,
  shotEditorFirstNext,
  shotEditorFirstBackSecond,
  shotEditorFirstForwardSecond,
  shotEditorLastPrev,
  shotEditorLastNext,
  shotEditorLastBackSecond,
  shotEditorLastForwardSecond,
  shotEditorCloseBtn,
  shotEditorCancelBtn,
  shotEditorSaveBtn,
  shotEditorPrevShotBtn,
  shotEditorNextShotBtn,
  stepBackFrameBtn,
  stepForwardFrameBtn,
  jumpBack1sBtn,
  jumpForward1sBtn,
  playPauseBtn,
  playbackRateSelect,
  playerCurrentTime,
  playerDuration,
  monitorZoomSelect,
  shotsList,
  shotGroupSelectBtn,
  shotGroupSelectionStatus,
  clearShotsBtn,
  exportExcelBtn,
  shotTableModal,
  shotTableModalClose,
  shotTableModalCancel,
  shotTableExportBtn,
  templateSelect,
  templateEditBtn,
  customTemplateBtn,
  templateMenuBtn,
  templateMenu,
  templateMenuLabel,
  templateEditorModal,
  templateEditorModalClose,
  templateFieldsList,
  templatePoolList,
  templateEditorSaveBtn,
  templateEditorCancelBtn,
  customTemplateModal,
  customTemplateModalClose,
  customTemplateNameInput,
  customTemplatePoolList,
  customTemplateFieldsList,
  customTemplateSaveBtn,
  customTemplateCancelBtn,
  fieldOptionsModal,
  fieldOptionsModalClose,
  fieldOptionsTitle,
  fieldOptionsList,
  fieldOptionInput,
  fieldOptionAddBtn,
  fieldOptionsSaveBtn,
   fieldOptionsCancelBtn,
   tableDisplayFieldList,
   tableDisplayModal,
   tableDisplayModalClose,
   tableDisplayModalDone,
   customFieldsArea,
  imageModal,
  modalImage,
  infoTime,
  infoShot,
  imageModalClose,
  rangeModal,
  rangeAutoShotDiff,
  rangeAutoShotDiffValue,
  rangeAutoShotMinGap,
  rangeClose,
  settingsExportFileName,
  settingsExportTitle,
  feedbackEmail,
  copyFeedbackEmailBtn,
  copyFeedbackEmailLabel,
  feedbackXhs,
  copyFeedbackXhsBtn,
  copyFeedbackXhsLabel,
  importUserConfigBtn,
  exportUserConfigBtn,
  importUserConfigInput,
  cacheManagerConfigStatus,
  cacheManagerProjectStatus,
  storagePersistenceStatus,
  recoveryStatus,
  recoveryProjectList,
  clearConfigCacheBtn,
  settingsBtn,
  settingsModal,
  settingsModalClose,
  settingsModalCancelBtn,
  shortcutGrid
} = bindDomElements();
const statusController = createStatusController({
  regionTargets: { waveform: audioWaveformEmpty, table: shotTableBody },
  windowTarget: window
});
statusController.bind();
statusController.set('noProject');
createHistoryControls({
  undoButton: undoBtn,
  redoButton: redoBtn,
  history: commandHistory,
  invokeAction: (id, args) => actionRegistry.invoke(id, args),
  windowTarget: window
}).bind();
createShortcutHelpController({
  container: shortcutGrid,
  definitions: ACTION_DEFINITIONS,
  platform: navigator.platform
}).render();
createTooltipController({ documentTarget: document, windowTarget: window }).bind();
createModalFocusManager({ documentTarget: document }).bind();
templateSelection = createTemplateSelectionAdapter(templateSelect);
attachShotEditorNote({ controls: shotEditorFirstControls, note: shotEditorFirstNote });

const feedbackController = createFeedbackController({
  elements: {
    email: feedbackEmail,
    emailButton: copyFeedbackEmailBtn,
    emailLabel: copyFeedbackEmailLabel,
    xhs: feedbackXhs,
    xhsButton: copyFeedbackXhsBtn,
    xhsLabel: copyFeedbackXhsLabel
  },
  clipboard: navigator.clipboard,
  windowTarget: window,
  showToast
});
feedbackController.bind();

const videoUiController = createVideoUiController({
  video: toolVideo,
  elements: {
    fileName: videoInfoFileName,
    fileBaseName: videoInfoFileBaseName,
    fileExtension: videoInfoFileExtension,
    duration: videoInfoDuration,
    resolution: videoInfoResolution,
    fileSize: videoInfoFileSize,
    frameRate: videoInfoFrameRate
  },
  getFileName: () => getCurrentVideoFileName(),
  getFileSize: () => runtimeState.currentVideoFile?.size || 0,
  formatDuration: formatVideoInfoDuration,
  formatFileSize: formatVideoInfoFileSize,
  formatFileName: formatVideoInfoFileName,
  documentTarget: document,
  buttons: [captureBtn, updateScreenshotBtn, autoShotBtnMeta, exportExcelBtn, stepBackFrameBtn, stepForwardFrameBtn, jumpBack1sBtn, jumpForward1sBtn, playPauseBtn, playbackRateSelect, recordVideoBtn]
});

createVideoInfoPopoverController({
  button: videoInfoBtn,
  panel: headerVideoInfo,
  documentTarget: document
}).bind();

const projectNavigationController = createProjectNavigationController({
  elements: {
    titleInput: projectTitleInput,
    templateMenu,
    templateMenuButton: templateMenuBtn,
    templateMenuLabel,
    templateSelect
  },
  documentTarget: document,
  escapeText: escapeTemplateText
});
projectNavigationController.bind();

const templateController = createTemplateController({
  elements: {
    templateEditButton: templateEditBtn,
    templateEditorModalClose: templateEditorModalClose,
    templateEditorSaveBtn: templateEditorSaveBtn,
    templateEditorCancelBtn: templateEditorCancelBtn,
    templateEditorModal,
    customTemplateBtn,
    customTemplateModalClose,
    customTemplateSaveBtn,
    customTemplateCancelBtn,
    customTemplateModal,
    customTemplateNameInput,
    templateMenuBtn,
    templateMenu,
    templateSelect,
    templateMenuLabel,
    templateFieldsList,
    templatePoolList,
    customTemplatePoolList,
    customTemplateFieldsList,
    fieldOptionsList,
    fieldOptionsTitle,
    fieldOptionInput,
    fieldOptionsModal,
    fieldOptionAddBtn,
    fieldOptionsSaveBtn,
    fieldOptionsCancelBtn,
    fieldOptionsModalClose,
    tableDisplayFieldList
  },
  templates: TEMPLATES,
  fixedColumns: FIXED_TABLE_COLUMNS,
  defaultFixedOrder: DEFAULT_APP_SETTINGS.tableFixedOrder,
  getTemplateName: getTemplateSelection,
  setTemplateName: name => templateSelection?.setValue(name),
  getSelectedTemplate,
  getConfiguredFields: getConfiguredTemplateFields,
  getEditorFields: getTemplateEditorFields,
  getVisibleFields: getVisibleTableFields,
  getSelectedDisplayFields: getSelectedTableDisplayFields,
  getOrderedFixedColumns: order => getOrderedFixedColumns(order),
  getCategories: getCategorizedFieldPool,
  getReferenceOptions: getFieldReferenceOptions,
  getTemplateDraft: () => runtimeState.templateEditorDraft,
  setTemplateDraft: value => { runtimeState.templateEditorDraft = value; },
  getCustomDraft: () => runtimeState.customTemplateDraft,
  setCustomDraft: value => { runtimeState.customTemplateDraft = value; },
  getFieldOptionsDraft: () => runtimeState.fieldOptionsDraft,
  setFieldOptionsDraft: value => { runtimeState.fieldOptionsDraft = value; },
  getSettings: getAppSettings,
  saveSettings: saveAppSettings,
  getFieldPool: templatePoolController.getFields,
  addFieldToPool: ensureFieldInPool,
  escapeText: escapeTemplateText,
  tableDisplayFieldLimit: TABLE_DISPLAY_FIELD_LIMIT,
  onUpdateEditorFields: fields => updateSelectedTemplateFields(fields),
  onUpdateCustomFields: fields => updateCustomTemplateDraftFields(fields),
  onOpenFieldOptions: fieldName => templateController.openFieldOptions(fieldName),
  onAddField: fieldName => updateSelectedTemplateFields([...getTemplateEditorFields(), fieldName]),
  onTemplateDisplayFieldsChanged: fields => {
    saveAppSettings({ ...getAppSettings(), tableDisplayFields: fields });
    shotTableController.updateTable();
  },
  showToast,
  documentTarget: document
});

const tableDisplayModalController = createTableDisplayModalController({
  modal: tableDisplayModal,
  closeButton: tableDisplayModalClose,
  doneButton: tableDisplayModalDone,
  renderSettings: templateRuntime.renderTableDisplaySettings,
  documentTarget: document
});
tableDisplayModalController.bind();

const updateTimelineViewState = viewState => {
  const projectId = projectContext.getId();
  if (!projectId) return;
  const normalized = normalizeTimelineViewState(viewState, toolVideo?.duration || 0);
  const previous = window.currentProjectTimelineViewState;
  const previousZoom = previous?.waveformZoom;
  const nextZoom = normalized.waveformZoom;
  const unchanged = Number(previous?.playheadTime || 0) === normalized.playheadTime
    && Number(previous?.scrollLeft || 0) === normalized.scrollLeft
    && (!previousZoom && !nextZoom
      || previousZoom && nextZoom
        && Number(previousZoom.start) === Number(nextZoom.start)
        && Number(previousZoom.end) === Number(nextZoom.end));
  if (unchanged) return;
  window.currentProjectTimelineViewState = normalized;
  markDirty();
  updateProjectRecord(projectId, { timelineViewState: normalized }).catch(error => {
    showStorageError(error, '时间轴状态保存');
  });
};

const mediaRuntime = createMediaRuntime({
  elements: {
    overlayCanvas,
    overlayBtn,
    overlayMenu,
    imageModal,
    modalImage,
    infoTime,
    infoShot,
    imageModalClose,
    rangeModal,
    rangeAutoShotDiff,
    rangeAutoShotDiffValue,
    rangeAutoShotMinGap,
    rangeClose,
    recordingConfigStats,
    recordingConfigWarning,
    captureBtn,
    updateScreenshotBtn,
    autoShotBtnMeta,
    deleteScreenshotAssets: deleteProjectScreenshotAssets,
    shotEditor: {
      modal: shotEditorModal,
      title: shotEditorTitle,
      videoContainer: shotEditorVideoContainer,
      firstImage: shotEditorFirstImage,
      lastImage: shotEditorLastImage,
      firstTime: shotEditorFirstTime,
      lastTime: shotEditorLastTime,
      splitButton: shotEditorSplitBtn,
      firstControls: shotEditorFirstControls,
      firstNote: shotEditorFirstNote,
      previousFrameButton: shotEditorPrevFrame,
      nextFrameButton: shotEditorNextFrame,
      backSecondButton: shotEditorBackSecond,
      playPauseButton: shotEditorPlayPause,
      forwardSecondButton: shotEditorForwardSecond,
      firstPreviousButton: shotEditorFirstPrev,
      firstNextButton: shotEditorFirstNext,
      firstBackSecondButton: shotEditorFirstBackSecond,
      firstForwardSecondButton: shotEditorFirstForwardSecond,
      lastPreviousButton: shotEditorLastPrev,
      lastNextButton: shotEditorLastNext,
      lastBackSecondButton: shotEditorLastBackSecond,
      lastForwardSecondButton: shotEditorLastForwardSecond,
      closeButton: shotEditorCloseBtn,
      cancelButton: shotEditorCancelBtn,
      saveButton: shotEditorSaveBtn,
      previousShotButton: shotEditorPrevShotBtn,
      nextShotButton: shotEditorNextShotBtn
    },
    audioWaveformPanel,
    audioWaveformTrack,
    audioWaveformCanvas,
    audioWaveformEmpty,
    audioWaveformRuler,
    audioWaveformPlayhead,
    audioWaveformZoomLabel,
    audioWaveformZoomOut,
    audioWaveformZoomIn,
    audioWaveformFit,
    videoEmpty,
    loadVideoInput,
    loadVideoBtn,
    recordVideoBtn,
    recordingConfigModal,
    recordingConfigModalClose,
    recordingConfigCancelBtn,
    recordingConfigConfirmBtn,
    recordingModal,
    recordingModalTitle,
    recordingStatusLine,
    recordingStatusText,
    recordingTimeText,
    recordingProgressInner,
    recordingPauseBtn,
    recordingCancelBtn,
    recordingModalClose,
    videoStage,
    monitorSurface,
    stepBackFrameBtn,
    stepForwardFrameBtn,
    jumpBack1sBtn,
    jumpForward1sBtn,
    playPauseBtn,
    playbackRateSelect,
    playerCurrentTime,
    playerDuration,
    monitorZoomSelect,
    enableVideoButtons: enableVideoButtonsRuntime,
    disableVideoButtons: disableVideoButtonsRuntime,
    waitForVideoReady: waitForVideoReadyRuntime,
    startFrameRateSampling: startVideoInfoFrameRateSamplingRuntime,
    resetFrameRateSampling: resetVideoInfoFrameRateRuntime,
    updateAutoShotCard: (...args) => updateAutoShotSegmentCard(...args),
    updateDetectionProgress: (...args) => updateDetectionProgress(...args)
  },
  video: toolVideo,
  runtimeState,
  audioWaveformState,
  autoShotSessionController,
  projectContext,
  savedPlaybackRate,
  getSettings: getAppSettings,
  saveSettings: saveAppSettings,
  formatTime,
  parseTimecode,
  showToast,
  markDirty,
  history: commandHistory,
  actionRegistry,
  createShotEntry,
  getNextShotNumber,
  getEntries: () => runtimeState.entries,
  setEntries: value => { runtimeState.entries = value; },
  getShotGroups: () => runtimeState.shotGroups,
  setShotGroups: value => { runtimeState.shotGroups = value; },
  estimateStorage: estimateScreenshotStorage,
  getCurrentProjectId: projectContext.getId,
  updateProjectRecord,
  getTimelineViewState: projectContext.getTimelineViewState,
  setTimelineViewState: updateTimelineViewState,
  restoreProjectVideo: loadProjectVideo,
  saveProjectVideo,
  setCurrentProject,
  getExportController: () => exportController,
  getShotListController: () => shotListController,
  getShotTableController: () => shotTableController,
  getRenderShots: () => renderShotsRuntime(),
  getSetActiveShot: (...args) => setActiveShotRuntime(...args),
  getUpdateDurations: () => updateDurationsRuntime(),
  getUpdateVideoInfo: () => updateVideoInfoRuntime(),
  getSyncShotTable: (...args) => syncShotTableRuntime(...args),
  getFlushShotsToDB: (...args) => flushShotsToDB(...args),
  getShowProgress: (...args) => showProgress(...args),
  getUpdateProgress: (...args) => updateProgress(...args),
  getUpdateDetectionProgress: (...args) => updateDetectionProgress(...args),
  getHideProgress: (...args) => hideProgress(...args),
  getConfiguredColumns: getHomepageShotTableColumns,
  getCellValue: getShotTableCellValue,
  documentTarget: document,
  windowTarget: window,
  localStorageTarget: localStorage,
  clearShotHeight: shotId => shotListController?.state.heights.delete(shotId),
  getCurrentVideoFile: () => runtimeState.currentVideoFile,
  setCurrentVideoFile: file => { runtimeState.currentVideoFile = file; },
});
const {
  shotModalController,
  shotAutoCorrectController,
  overlayController,
  shotEditorController,
  waveformController,
  screenshotActions,
  autoShotController,
  getCurrentVideoFileName,
  clearCurrentVideo,
  loadVideoFile,
  restoreVideoFromProjectStorage,
  recordingState,
  ensureLoadedProjectScreenshots,
  releaseLoadedProjectScreenshots,
  generateScreenshotsForAllEntries,
  updateEntryScreenshot,
  terminateImageProcessingWorker
} = mediaRuntime;
const resetAudioWaveform = waveformController.reset;
const prepareAudioWaveform = waveformController.prepare;
const renderAudioWaveform = waveformController.render;
const refreshAudioWaveformAfterSeek = waveformController.refreshAfterSeek;
const followAudioWaveformPlayback = waveformController.followPlayback;
const syncAudioWaveformPlayhead = waveformController.syncPlayhead;
const getAudioWaveformDuration = waveformController.getDuration;
const startAutoShotWithRange = (...args) => autoShotController.start(...args);

const projectSessionRuntime = createProjectSessionRuntime({
  elements: {
    videoEmpty,
    projectTitleInput
  },
  projectController,
  updateProjectRecord,
  getProjectRecord,
  getProjectContext: projectContext.getVideoContext,
  setCurrentProject,
  clearCurrentVideo,
  restoreVideoFromProjectStorage,
  restoreAutoShotSegmentState,
  runtimeState,
  syncShotGroupsWithEntries,
  renderShots: () => renderShots(),
  updateCurrentProjectButton: updateCurrentProjectBtn,
  updateCustomFieldNames: () => updateCustomFieldNames(),
  applyTemplate,
  ensureLoadedProjectScreenshots,
  releaseLoadedProjectScreenshots,
  pruneImportedScreenshotAssets: pruneProjectScreenshotAssets,
  openDatabase: openDB,
  consumePendingSave: async () => {
    const pendingSave = await dbGetSetting(PENDING_PROJECT_SAVE_KEY);
    if (pendingSave) await dbDeleteSetting(PENDING_PROJECT_SAVE_KEY);
    return pendingSave;
  },
  locationTarget: window.location,
  getTemplateName: getTemplateSelection,
  setTemplateName: name => templateSelection?.setValue(name),
  getEntries: () => runtimeState.entries,
  setEntries: value => { runtimeState.entries = value; },
  getProjectId: projectContext.getId,
  removeScreenshotAssets: deleteProjectScreenshotAssets,
  clearShotHeight: shotId => shotListController?.state.heights.delete(shotId),
  clearRecordingCache: () => recordingState?.imageCache.clear(),
  updateEntryScreenshot: entry => updateEntryScreenshot(entry),
  getActiveShotNumber: () => runtimeState.activeShotNumber,
  setActiveShot: (...args) => setActiveShot(...args),
  markDirty,
  showToast,
  commandHistory,
  getVideoDuration: () => toolVideo?.duration || 0,
  pauseAutosave: () => shotAutosaveController?.pause?.(),
  resumeAutosave: () => shotAutosaveController?.resume?.(),
  flushAutosave: () => shotAutosaveController?.flush?.()
});
const {
  projectSessionController,
  shotActions,
  loadLocalProject
} = projectSessionRuntime;

actionRegistry.register('shot.delete', entry => shotActions.deleteShot(entry), {
  metadata: getActionDefinition('shot.delete'),
  isActive: (_, entry) => !!entry?.shotId
});

actionRegistry.register('history.keyboard', event => {
  if (((!event.ctrlKey && !event.metaKey) && event.key !== 'Delete') || event.altKey) return;
  const target = event.target;
  if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    actionRegistry.invoke('project.save');
    return;
  }
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) actionRegistry.invoke('history.redo');
    else actionRegistry.invoke('history.undo');
  } else if (event.key.toLowerCase() === 'y') {
    event.preventDefault();
    actionRegistry.invoke('history.redo');
  }
  if (event.key === 'Delete') {
    const activeEntry = runtimeState.entries.find(entry => Number(entry.shotNumber) === Number(runtimeState.activeShotNumber));
    if (activeEntry) {
      event.preventDefault();
      actionRegistry.invoke('shot.delete', activeEntry);
    }
  }
});
actionRegistry.bind(document, 'keydown', 'history.keyboard');

shotRuntime = createShotRuntime({
  elements: {
    shotsList,
    loadVideoBtn,
    shotTableBody,
    shotTableHeadRow,
    shotTableWrap,
    customFieldsArea,
    getColumns: getHomepageShotTableColumns,
    shotGroupSelectBtn,
    shotGroupSelectionStatus,
    toggleShotTableBtn,
    resetWorkspaceBtn,
    workspaceRegion1,
    workspaceRegion2,
    workspaceRegion3,
    toolGrid,
    toolHorizontalSplitter,
    audioWaveformPanel,
    shotTableSplitter,
    toolPlayer,
    saveStatus,
    saveBtn
  },
  runtimeState,
  video: toolVideo,
  shotActions,
  getConfiguredFields: getConfiguredTemplateFields,
  getReferenceOptions: getFieldReferenceOptions,
  getCellValue: getShotTableCellValue,
  fixedColumns: FIXED_TABLE_COLUMNS,
  escapeText: escapeTemplateText,
  syncShotGroupsWithEntries,
  selectShotGroupRange,
  createShotGroupFromSelection,
  getAutoShotState: getAutoShotSegmentState,
  getShotEditorController: () => shotEditorController,
  getShotAutoCorrectController: () => shotAutoCorrectController,
  getShotModalController: () => shotModalController,
  getOverlayController: () => overlayController,
  getPlayback: () => mediaRuntime.segmentPlaybackController,
  getOpenImage: openImageModalRuntime,
  startAutoShot: startAutoShotWithRange,
  markDirty,
  showToast,
  updateDurations: updateDurationsRuntime,
   updateVideoInfo: updateVideoInfoRuntime,
   renderWaveform: waveformController.render,
   openTableDisplaySettings: tableDisplayModalController.open,
   setActiveShot: setActiveShotRuntime,
  onLoadVideo: () => loadVideoBtn?.click(),
  onCaptureShot: () => actionRegistry.invoke('shot.capture'),
  getHasProject: () => !!projectContext.getId(),
  invokeAction: (id, args) => actionRegistry.invoke(id, args),
  documentTarget: document,
  windowTarget: window,
  storage: localStorage
});
const shotListController = shotRuntime.shotListController;
const shotTableController = shotRuntime.shotTableController;
updateAutoShotSegmentCard = shotRuntime.updateContinuationCard;

const updateSaveStatus = updateSaveStatusRuntime;
const resetVideoInfoFrameRate = resetVideoInfoFrameRateRuntime;
const startVideoInfoFrameRateSampling = startVideoInfoFrameRateSamplingRuntime;
const updateVideoInfo = updateVideoInfoRuntime;
const startupRuntime = createStartupRuntime({
  exportOptions: {
    progress: {
      getAutoDetecting: () => runtimeState.autoDetecting,
      getPaused: () => runtimeState.screenshotPaused,
      setPaused: value => { runtimeState.screenshotPaused = value; },
      getAbortState: () => runtimeState.screenshotAbort,
      requestStop: () => requestScreenshotStop(runtimeState.screenshotAbort),
      getActiveDetector: () => runtimeState.activeSceneDetector,
      formatTime
    },
    exportController: {
      elements: {
        exportButton: exportExcelBtn,
        tableModal: shotTableModal,
        tableCancel: shotTableModalCancel,
        tableClose: shotTableModalClose,
        tableExport: shotTableExportBtn,
        recordButton: recordVideoBtn,
        fileNameInput: settingsExportFileName,
        titleInput: settingsExportTitle,
      },
      getEntries: () => runtimeState.entries,
      getShotGroups: () => runtimeState.shotGroups,
      getSettings: getAppSettings,
      saveSettings: saveAppSettings,
      getColumns: getShotTableColumns,
      getCellValue: getShotTableCellValue,
      getTemplateCellValue: getTemplateEntryValue,
      getGroupMembers: getShotGroupMembers,
      formatTime,
      hydrateScreenshots: (projectId, projectEntries) => hydrateEntryFullScreenshots(projectId, projectEntries),
      releaseScreenshots: releaseHydratedScreenshots,
      showToast,
      getTemplateTitle: () => getAppSettings().exportTitle,
      getProjectTitle: projectContext.getTitle,
      getCurrentProjectId: projectContext.getId
    }
  },
  persistenceOptions: {
    service: {
      getProjectContext: projectContext.getVideoContext,
      requestProjectTitle: windowDialogs.prompt,
      setCurrentProject,
      createProjectRecord,
      getProjectRecord,
      updateProjectRecord,
      createProjectUuid,
      getEntries: () => runtimeState.entries,
      getShotGroups: () => runtimeState.shotGroups,
      updateDurations: () => updateDurations(),
      serializeShots: serializeProjectShots,
      serializeGroups: serializeProjectGroups,
      saveShots: saveProjectShots,
      pruneScreenshotAssets: pruneProjectScreenshotAssets,
      saveShotGroups: saveProjectShotGroups,
      serializeAutoShotState: serializeAutoShotSegmentState,
      getCurrentVideoFileName,
      getTemplateName: getTemplateSelection,
      getVideoDuration: () => toolVideo?.duration || 0
    },
    controller: {
      elements: { saveButton: saveBtn },
      getProjectContext: projectContext.getVideoContext,
      showProgress: (...args) => startupRuntime?.showProgress?.(...args),
      updateProgressMessage: (...args) => startupRuntime?.updateProgressMessage?.(...args),
      hideProgress: (...args) => startupRuntime?.hideProgress?.(...args),
      updateSaveStatus: () => updateSaveStatus(),
      invokeAction: (id, args) => actionRegistry.invoke(id, args),
      showToast,
      setDirty: value => {
        window.__dirty = value;
        window.__lastSaveAt = Date.now();
      },
      flushPendingSaves: () => shotAutosaveController?.flush?.()
    }
  },
  shotClearOptions: {
    button: clearShotsBtn,
    disabledElement: exportExcelBtn,
    getEntries: () => runtimeState.entries,
    isBusy: () => runtimeState.autoDetecting || runtimeState.generatingScreenshots,
    invokeAction: (id, args) => actionRegistry.invoke(id, args),
    workflow: {
      closeEditor: shotEditorController.close,
      setEntries: value => { runtimeState.entries = value; },
      clearHeights: () => shotListController.state.heights.clear(),
      pruneScreenshots: () => pruneProjectScreenshotAssets(projectContext.getId(), []).catch(() => {}),
      clearRecordingCache: () => recordingState?.imageCache.clear(),
      resetAutoShot: resetAutoShotSegmentState,
      setGroups: value => { runtimeState.shotGroups = value; },
      setActiveGroupId: value => { runtimeState.activeShotGroupId = value; },
      setEditingTitleId: value => { runtimeState.editingShotGroupTitleId = value; },
      setEditingSummaryId: value => { runtimeState.editingShotGroupSummaryId = value; },
      setSelectedShotIds: value => { runtimeState.selectedShotIds = value; },
      setSelectionAnchorId: value => { runtimeState.shotGroupSelectionAnchorId = value; },
      setActiveShotNumber: value => { runtimeState.activeShotNumber = value; },
      setExpandedShotNumber: value => { runtimeState.expandedShotNumber = value; },
      renderShots: (...args) => renderShots(...args),
      markDirty,
      getEntries: () => runtimeState.entries,
      getGroups: () => runtimeState.shotGroups,
      history: commandHistory,
      showToast
    },
    showToast,
    windowTarget: window
  },
  terminateWorker: terminateImageProcessingWorker,
  windowTarget: window
});
const {
  showProgress,
  updateProgressMessage,
  updateDetectionProgress,
  updateProgress,
  hideProgress,
  exportController,
  serializeProjectShots: getSerializedProjectShots,
  flushShotsToDatabase: flushShotsToDB,
  saveToBrowser: saveProjectToBrowser,
  shotClearController
} = startupRuntime;

actionRegistry.register('project.save', () => {
  return saveProjectToBrowser();
}, {
  metadata: getActionDefinition('project.save'),
  isActive: () => !!projectContext.getId()
});
actionRegistry.register('shot.clearAll', () => startupRuntime.shotClearController.executeClear(), {
  metadata: getActionDefinition('shot.clearAll'),
  isActive: () => runtimeState.entries.length > 0 && !runtimeState.autoDetecting && !runtimeState.generatingScreenshots
});
actionRegistry.register('group.create', ({ selectedIds } = {}) => shotRuntime.createGroup(selectedIds || [...runtimeState.selectedShotIds]), {
  metadata: getActionDefinition('group.create'),
  isActive: () => runtimeState.selectedShotIds.size >= 2,
  getDisabledReason: () => '请选择至少两个连续分镜'
});
actionRegistry.register('group.dissolve', () => shotRuntime.dissolveGroup(), {
  metadata: getActionDefinition('group.dissolve'),
  isActive: () => !!runtimeState.activeShotGroupId,
  getDisabledReason: () => '请选择一个镜头组'
});
actionRegistry.register('group.edit', () => shotRuntime.editGroup(), {
  metadata: getActionDefinition('group.edit'),
  isActive: () => !!runtimeState.activeShotGroupId,
  getDisabledReason: () => '请选择一个镜头组'
});
actionRegistry.register('template.select', ({ name } = {}) => handleTemplateChange(name || getTemplateSelection()), {
  metadata: getActionDefinition('template.select'),
  isActive: (_, { name } = {}) => !!(name || getTemplateSelection()),
  getDisabledReason: () => '模板加载完成后可用'
});

/* ===================================================================
 *  Shot Modals
 * =================================================================== */
const openImageModal = openImageModalRuntime;

/* ===================================================================
 *  Video Loading / Button Enable
 * =================================================================== */
const disableVideoButtons = disableVideoButtonsRuntime;
const enableVideoButtons = enableVideoButtonsRuntime;

/* ===================================================================
 *  Auto Scene Detection
 * =================================================================== */
const waitForVideoReady = waitForVideoReadyRuntime;

updateShotGroupToolbar();

/* ===================================================================
 *  Composition Overlay
 * =================================================================== */
overlayController.redraw();

/* ===================================================================
 *  Capture
 * =================================================================== */

/* ===================================================================
 *  Auto Correct Cut Point
 * =================================================================== */
const updateDurations = updateDurationsRuntime;
const updateShotTable = updateShotTableRuntime;
const renderShots = renderShotsRuntime;
const setActiveShot = setActiveShotRuntime;
const updateCustomFieldNames = updateCustomFieldNamesRuntime;

/* ===================================================================
 *  Export
 * =================================================================== */
if (templateSelect) {
  const appSettings = getAppSettings();
  syncTemplateOptions(appSettings.template || getTemplateSelection() || '默认模板');
  const initialTemplateName = TEMPLATES[appSettings.template] ? appSettings.template : '默认模板';
  templateSelection.setValue(initialTemplateName);
  applyTemplate(getTemplateSelection() || '默认模板');
  updateTemplateMenuLabel();
}

const settingsRuntime = createSettingsRuntime({
  elements: {
    settingsExportFileName,
    settingsExportTitle,
    feedbackEmail,
    copyFeedbackEmailBtn,
    copyFeedbackEmailLabel,
    feedbackXhs,
    copyFeedbackXhsBtn,
    copyFeedbackXhsLabel,
    importUserConfigBtn,
    exportUserConfigBtn,
    importUserConfigInput,
    projectBackupMode,
    exportProjectBackupBtn,
    cacheManagerConfigStatus,
    cacheManagerProjectStatus,
    storagePersistenceStatus,
    recoveryStatus,
    recoveryProjectList,
    clearConfigCacheBtn,
    settingsBtn,
    settingsModal,
    settingsModalClose,
    settingsModalCancelBtn,
    templateEditButton: templateEditBtn,
    templateEditorModalClose,
    templateEditorCancelBtn,
    templateEditorSaveBtn,
    templateEditorModal,
    customTemplateBtn,
    templateMenuBtn,
    templateMenu,
    customTemplateModalClose,
    customTemplateCancelBtn,
    customTemplateSaveBtn,
    customTemplateModal,
    customTemplateNameInput
  },
  templateController,
  documentTarget: document,
  settingsKey: APP_SETTINGS_KEY,
  templateDefinitionsKey: TEMPLATE_DEFINITIONS_KEY,
  fieldPoolKey: FIELD_POOL_KEY,
  fieldPoolVersion: FIELD_POOL_VERSION,
  fieldPoolOrder: FIELD_POOL_ORDER,
  fixedFields: FIXED_TEMPLATE_FIELD_NAMES,
  getSettings: getAppSettings,
  saveSettings: saveAppSettings,
  templates: TEMPLATES,
  getFieldPool: templatePoolController.getFields,
  getFieldReferenceOptions,
  normalizeTemplateFields,
  normalizeFieldPool,
  normalizeReferenceOptions,
  writeStorage: writeJsonStorage,
  removeStorageKeys,
  openDatabase: openDB,
  closeProjectDropdown,
  closeTemplateMenu,
  download: exportController.download,
  showToast,
  onStorageError: error => showStorageError(error, '用户配置导入'),
  getTemplateName: getTemplateSelection,
  getCurrentProjectId: projectContext.getId,
  getCurrentProjectTitle: projectContext.getTitle,
  exportProjectBackup: projectBackupService.exportProject,
  getStorageEstimate: estimateScreenshotStorage,
  getStoragePersistence: () => storagePersistence,
  getConfiguredFields: getConfiguredTemplateFields,
  saveTemplateEditorDraft,
  saveCustomTemplateDraft,
  handleTemplateChange: name => actionRegistry.invoke('template.select', { name }),
  saveFieldOptions,
  openTemplateMenu,
  closeTemplateMenuState: closeTemplateMenu,
  isTemplateMenuOpen
});

const {
  openSettings: openSettingsModal,
  closeSettings: closeSettingsModal,
  isSettingsOpen: isSettingsModalOpen,
  setSettingsPanel,
  renderCacheStatus,
  importUserConfigFile,
  exportUserConfig,
  clearLocalConfigCache
} = settingsRuntime;

onDomReady(() => {
  const returnToLibrary = async () => {
    try {
      await shotAutosaveController?.flush?.();
      await flushShotsToDB();
      window.location.assign('/');
    } catch (error) {
      showStorageError(error, '返回工程库前保存');
    }
  };
  editorBackBtn?.addEventListener('click', returnToLibrary);
  homeLogo?.addEventListener('click', returnToLibrary);
});

/* ===================================================================
 *  DB Init on Load
 * =================================================================== */
const initializeStoragePersistence = async () => {
  storagePersistence = await requestStoragePersistence();
  if (isSettingsModalOpen()) renderCacheStatus();
};

void initializeStoragePersistence();
startupRuntime.start({
  projectSessionController,
  autosaveController: shotAutosaveController,
  flushTasks: async () => {
    await mediaRuntime.waitForScreenshotBatch?.();
    await flushShotsToDB();
  },
  windowTarget: window
});
