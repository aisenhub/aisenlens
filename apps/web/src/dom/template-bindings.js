export function bindTemplateEvents({
  elements = {},
  documentTarget = null,
  settings = {},
  handlers = {},
  bindTemplateDialogs = true,
  bindTemplateMenu = true
} = {}) {
  const {
    templateEditButton,
    editorCloseButton,
    editorCancelButton,
    editorSaveButton,
    editorModal,
    customButton,
    menuButton,
    menu,
    customCloseButton,
    customCancelButton,
    customSaveButton,
    customModal,
    settingsExportFormatInputs = [],
    settingsExportFileName,
    settingsExportTitle,
    importButton,
    importInput,
    exportButton,
    clearConfigButton,
    settingsButton,
    settingsModal,
    settingsCloseButton,
    settingsCancelButton
  } = elements;
  const {
    closeSettings,
    getAppSettings = () => ({}),
    saveAppSettings = () => {},
    isMenuOpen = () => false,
    openMenu = () => {},
    closeMenu = () => {},
    onOpenEditor = () => {},
    onCloseEditor = () => {},
    onSaveEditor = () => {},
    onOpenCustom = () => {},
    onCloseCustom = () => {},
    onSaveCustom = () => {},
    onImportConfig = () => {},
    onExportConfig = () => {},
    onClearConfig = () => {},
    isSettingsOpen = () => false,
    openSettings = () => {},
    setSettingsPanel = () => {}
  } = handlers;

  if (bindTemplateDialogs) {
    templateEditButton?.addEventListener('click', onOpenEditor);
    editorCloseButton?.addEventListener('click', onCloseEditor);
    editorCancelButton?.addEventListener('click', onCloseEditor);
    editorSaveButton?.addEventListener('click', onSaveEditor);
    editorModal?.addEventListener('click', event => { if (event.target === editorModal) onCloseEditor(); });
    customButton?.addEventListener('click', onOpenCustom);
    customCloseButton?.addEventListener('click', onCloseCustom);
    customCancelButton?.addEventListener('click', onCloseCustom);
    customSaveButton?.addEventListener('click', onSaveCustom);
    customModal?.addEventListener('click', event => { if (event.target === customModal) onCloseCustom(); });
  }
  if (bindTemplateMenu) {
    menuButton?.addEventListener('click', event => {
      event.stopPropagation();
      if (isMenuOpen()) closeMenu(); else openMenu();
    });
    menu?.addEventListener('click', event => event.stopPropagation());
    templateEditButton?.addEventListener('click', closeMenu);
    customButton?.addEventListener('click', closeMenu);
  }
  documentTarget?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (bindTemplateDialogs && editorModal?.classList.contains('show')) onCloseEditor();
      if (bindTemplateDialogs && customModal?.classList.contains('show')) onCloseCustom();
      if (isMenuOpen()) closeMenu();
      if (isSettingsOpen()) closeSettings();
    }
  });

  settingsExportFormatInputs.forEach(input => {
    input.checked = input.value === settings.exportFormat;
    input.addEventListener('change', () => {
      if (input.checked) saveAppSettings({ ...getAppSettings(), exportFormat: input.value });
    });
  });
  if (settingsExportFileName) {
    settingsExportFileName.value = settings.exportFileName;
    settingsExportFileName.addEventListener('input', () => saveAppSettings({ ...getAppSettings(), exportFileName: settingsExportFileName.value }));
  }
  if (settingsExportTitle) {
    settingsExportTitle.value = settings.exportTitle;
    settingsExportTitle.addEventListener('input', () => saveAppSettings({ ...getAppSettings(), exportTitle: settingsExportTitle.value }));
  }
  importButton?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', event => {
    onImportConfig(event.target.files?.[0]);
    event.target.value = '';
  });
  exportButton?.addEventListener('click', onExportConfig);
  clearConfigButton?.addEventListener('click', onClearConfig);
  settingsButton?.addEventListener('click', () => {
    if (isSettingsOpen()) closeSettings(); else openSettings();
  });
  settingsModal?.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => setSettingsPanel(item.dataset.settingsPanel));
  });
  settingsCloseButton?.addEventListener('click', closeSettings);
  settingsCancelButton?.addEventListener('click', closeSettings);
  settingsModal?.addEventListener('click', event => { if (event.target === settingsModal) closeSettings(); });
}
