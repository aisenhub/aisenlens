import { bindTemplateEvents } from '../dom/template-bindings.js';
import { createSettingsPanelController } from '../dom/settings-panel.js';
import { createProjectCacheAdapter } from '../platform/project-cache.js';
import { createCustomTemplateDraft, createTemplateEditorDraft } from '../features/templates/template-service.js';

export function createSettingsRuntime({
  elements = {},
  templateController,
  documentTarget,
  settingsKey,
  templateDefinitionsKey,
  fieldPoolKey,
  fieldPoolVersion,
  fieldPoolOrder,
  fixedFields = [],
  getSettings,
  saveSettings,
  templates = {},
  getFieldPool,
  getFieldReferenceOptions,
  normalizeTemplateFields,
  normalizeFieldPool,
  normalizeReferenceOptions,
  writeStorage,
  removeStorageKeys,
  openDatabase,
  closeProjectDropdown,
  closeTemplateMenu,
  download,
  showToast,
  onStorageError,
  onOpenPanel = () => {},
  getTemplateName,
  getStorageEstimate = async () => null,
  getConfiguredFields,
  getAppSettings = getSettings,
  saveTemplateEditorDraft,
  saveCustomTemplateDraft,
  handleTemplateChange,
  saveFieldOptions,
  openTemplateMenu,
  closeTemplateMenuState,
  isTemplateMenuOpen,
  setSettingsPanel
} = {}) {
  const projectCacheAdapter = createProjectCacheAdapter({ openDatabase });
  const settingsPanelController = createSettingsPanelController({
    elements: {
      settingsExportFileName: elements.settingsExportFileName,
      settingsExportTitle: elements.settingsExportTitle,
      feedbackEmail: elements.feedbackEmail,
      copyFeedbackEmailBtn: elements.copyFeedbackEmailBtn,
      copyFeedbackEmailLabel: elements.copyFeedbackEmailLabel,
      feedbackXhs: elements.feedbackXhs,
      copyFeedbackXhsBtn: elements.copyFeedbackXhsBtn,
      copyFeedbackXhsLabel: elements.copyFeedbackXhsLabel,
      importUserConfigBtn: elements.importUserConfigBtn,
      exportUserConfigBtn: elements.exportUserConfigBtn,
      importUserConfigInput: elements.importUserConfigInput,
      cacheManagerConfigStatus: elements.cacheManagerConfigStatus,
      cacheManagerProjectStatus: elements.cacheManagerProjectStatus,
      clearConfigCacheBtn: elements.clearConfigCacheBtn,
      clearProjectCacheBtn: elements.clearProjectCacheBtn,
      settingsBtn: elements.settingsBtn,
      settingsModal: elements.settingsModal,
      settingsModalClose: elements.settingsModalClose,
      settingsModalCancelBtn: elements.settingsModalCancelBtn
    },
    settingsKey,
    templateDefinitionsKey,
    fieldPoolKey,
    fieldPoolVersion,
    fieldPoolOrder,
    fixedFields,
    getSettings,
    saveSettings,
    getTemplates: () => templates,
    getFieldPool,
    getFieldReferenceOptions,
    normalizeTemplateFields,
    normalizeFieldPool,
    normalizeReferenceOptions,
    writeStorage,
    removeStorageKeys,
    getProjectStats: projectCacheAdapter.getStats,
    getStorageEstimate,
    clearProjectStores: projectCacheAdapter.clear,
    closeProjectDropdown,
    closeTemplateMenu,
    download,
    showToast,
    onStorageError,
    onOpenPanel
  });

  const {
    open: openSettings,
    close: closeSettings,
    isOpen: isSettingsOpen,
    setPanel: setPanel,
    renderCacheStatus,
    importConfig,
    exportConfig,
    clearConfig,
    clearProjects
  } = settingsPanelController;

  templateController.bindInteractions({
    createTemplateDraft: () => createTemplateEditorDraft(
      getTemplateName() || '默认模板',
      getConfiguredFields(),
      getSettings().tableFixedOrder
    ),
    createCustomDraft: () => createCustomTemplateDraft(
      getSettings().tableFixedOrder
    ),
    onSaveEditor: saveTemplateEditorDraft,
    onSaveCustom: saveCustomTemplateDraft,
    onTemplateChange: handleTemplateChange,
    onSaveFieldOptions: saveFieldOptions,
    onCloseSettings: closeSettings,
    onOpenMenu: openTemplateMenu,
    onCloseMenu: closeTemplateMenuState,
    isMenuOpen: isTemplateMenuOpen
  });

  bindTemplateEvents({
    elements: {
      templateEditButton: elements.templateEditButton,
      editorCloseButton: elements.templateEditorModalClose,
      editorCancelButton: elements.templateEditorCancelBtn,
      editorSaveButton: elements.templateEditorSaveBtn,
      editorModal: elements.templateEditorModal,
      customButton: elements.customTemplateBtn,
      menuButton: elements.templateMenuBtn,
      menu: elements.templateMenu,
      customCloseButton: elements.customTemplateModalClose,
      customCancelButton: elements.customTemplateCancelBtn,
      customSaveButton: elements.customTemplateSaveBtn,
      customModal: elements.customTemplateModal,
      customNameInput: elements.customTemplateNameInput,
      settingsExportFormatInputs: [...(documentTarget.querySelectorAll?.('input[name="tableExportFormat"]') || [])],
      settingsExportFileName: elements.settingsExportFileName,
      settingsExportTitle: elements.settingsExportTitle,
      importButton: elements.importUserConfigBtn,
      importInput: elements.importUserConfigInput,
      exportButton: elements.exportUserConfigBtn,
      clearConfigButton: elements.clearConfigCacheBtn,
      clearProjectButton: elements.clearProjectCacheBtn,
      settingsButton: elements.settingsBtn,
      settingsModal: elements.settingsModal,
      settingsCloseButton: elements.settingsModalClose,
      settingsCancelButton: elements.settingsModalCancelBtn
    },
    documentTarget,
    bindTemplateDialogs: false,
    bindTemplateMenu: false,
    settings: getSettings(),
    handlers: {
      closeSettings,
      getAppSettings,
      saveAppSettings: saveSettings,
      isMenuOpen: isTemplateMenuOpen,
      openMenu: openTemplateMenu,
      closeMenu: closeTemplateMenuState,
      onOpenEditor: () => {},
      onCloseEditor: () => {},
      onSaveEditor: saveTemplateEditorDraft,
      onOpenCustom: () => {},
      onCloseCustom: () => {},
      onSaveCustom: saveCustomTemplateDraft,
      onImportConfig: importConfig,
      onExportConfig: exportConfig,
      onClearConfig: clearConfig,
      onClearProject: clearProjects,
      isSettingsOpen,
      openSettings,
      setSettingsPanel: setPanel
    }
  });

  return {
    controller: settingsPanelController,
    openSettings,
    closeSettings,
    isSettingsOpen,
    setSettingsPanel: setPanel,
    renderCacheStatus,
    importUserConfigFile: importConfig,
    exportUserConfig: exportConfig,
    clearLocalConfigCache: clearConfig,
    clearLocalProjectCache: clearProjects,
    projectCacheAdapter
  };
}
