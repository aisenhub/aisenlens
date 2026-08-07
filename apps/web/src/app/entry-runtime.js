import { updateShotDurations } from '../features/shots/shot-boundaries.js';

export function createEntryRuntime({
  getProjectContext = () => ({}),
  persistProjectDirectoryHandle = async () => {},
  warn = () => {},
  getProjectNavigationController = () => null,
  getTemplateRuntime = () => null,
  getTemplateController = () => null,
  getShotGroupController = () => null,
  getShotGroupStateController = () => null,
  getShotTableController = () => null,
  getShotRendererController = () => null,
  getShotModalController = () => null,
  getVideoUiController = () => null,
  getAutoShotController = () => null,
  getAppShellController = () => null,
  getRuntimeState = () => ({}),
  getVideo = () => null,
  createShotGroupFromSelection = () => false,
  getPrompt = () => '',
  getIdFactory = () => null,
  markDirty = () => {},
  renderShotView = () => {},
  history = null
} = {}) {
  const saveProjectDirectoryHandle = async (
    dirHandle,
    projectId = getProjectContext().id,
    projectUuid = getProjectContext().uuid
  ) => {
    if (!dirHandle || !projectId) return;
    try {
      await persistProjectDirectoryHandle(dirHandle, projectId, projectUuid);
    } catch (error) {
      warn('Unable to save the project directory handle.', error);
    }
  };

  const updateCurrentProjectButton = () => {
    getProjectNavigationController()?.updateCurrentProjectButton(getProjectContext().title);
  };

  const toggleProjectDropdown = () => getProjectNavigationController()?.toggleProjectDropdown();
  const openTemplateMenu = () => getProjectNavigationController()?.openTemplateMenu();
  const closeTemplateMenu = () => getProjectNavigationController()?.closeTemplateMenu();
  const isTemplateMenuOpen = () => !!getProjectNavigationController()?.isTemplateMenuOpen();
  const closeProjectDropdown = () => getProjectNavigationController()?.closeProjectDropdown();

  const updateTemplateMenuLabel = () => getTemplateRuntime()?.updateTemplateMenuLabel();
  const syncTemplateOptions = preferredName => getTemplateRuntime()?.syncTemplateOptions(preferredName);
  const renderTableDisplaySettings = () => getTemplateRuntime()?.renderTableDisplaySettings();
  const refreshShotTableConfiguration = () => getTemplateRuntime()?.refreshShotTableConfiguration();
  const renderTemplateEditor = () => getTemplateRuntime()?.renderTemplateEditor();
  const renderCustomTemplateEditor = () => getTemplateRuntime()?.renderCustomTemplateEditor();

  const updateShotGroupToolbar = () => getShotGroupController()?.updateToolbar();
  const focusShotGroupSummary = groupId => getShotGroupController()?.focusSummary(groupId);
  const focusShotGroupTitle = groupId => getShotGroupController()?.focusTitle(groupId);
  const setShotGroupSelectionMode = enabled => getShotGroupController()?.setSelectionMode(enabled);

  const selectShotGroupRange = entry => {
    const result = getShotGroupStateController()?.selectRange(entry);
    if (!result?.valid) {
      showToast('请选择连续且未分组的分镜', 'warning');
      return result;
    }
    updateShotGroupToolbar();
    renderShots();
    return result;
  };

  const createGroupFromSelection = (selectedIds = [...getRuntimeState().selectedShotIds]) => createShotGroupFromSelection({
    selectedIds,
    entries: getRuntimeState().entries,
    groups: getRuntimeState().shotGroups,
    prompt: getPrompt(),
    idFactory: getIdFactory(),
    getGroups: () => getRuntimeState().shotGroups,
    setActiveGroup: groupId => { getRuntimeState().activeShotGroupId = groupId; },
    setSelectionMode: setShotGroupSelectionMode,
    addGroup: group => getRuntimeState().shotGroups.push(group),
    removeGroup: groupId => { getRuntimeState().shotGroups = getRuntimeState().shotGroups.filter(group => group.id !== groupId); },
    markDirty,
    history,
    render: renderShotView,
    focusSummary: focusShotGroupSummary
  });

  const updateSaveStatus = () => getAppShellController()?.updateSaveStatus();
  const resetVideoInfoFrameRate = () => getVideoUiController()?.resetFrameRate();
  const startVideoInfoFrameRateSampling = () => getVideoUiController()?.startFrameRate();
  const updateVideoInfo = () => getVideoUiController()?.updateInfo();
  const openImageModal = (...args) => getShotModalController()?.openImage(...args);
  const disableVideoButtons = () => getVideoUiController()?.disableButtons();
  const enableVideoButtons = () => getVideoUiController()?.enableButtons();
  const waitForVideoReady = video => getVideoUiController()?.waitForReady(video);
  const startAutoShotWithRange = (startTime, endTime, options = {}) => getAutoShotController()?.start(startTime, endTime, options);

  const updateDurations = () => updateShotDurations(getRuntimeState().entries, getVideo()?.duration);
  const updateShotTable = forceStructure => getShotTableController()?.updateTable(forceStructure);
  const syncShotTable = currentTime => getShotTableController()?.sync(currentTime);
  const renderShots = () => getShotRendererController()?.render();
  const setActiveShot = (shotNumber, expand = true) => getShotTableController()?.setActiveShot(shotNumber, expand);
  const updateCustomFieldNames = () => getShotTableController()?.updateCustomFieldNames();

  return {
    saveProjectDirectoryHandle,
    updateCurrentProjectButton,
    toggleProjectDropdown,
    openTemplateMenu,
    closeTemplateMenu,
    isTemplateMenuOpen,
    closeProjectDropdown,
    updateTemplateMenuLabel,
    syncTemplateOptions,
    renderTableDisplaySettings,
    refreshShotTableConfiguration,
    renderTemplateEditor,
    renderCustomTemplateEditor,
    updateShotGroupToolbar,
    focusShotGroupSummary,
    focusShotGroupTitle,
    setShotGroupSelectionMode,
    selectShotGroupRange,
    createShotGroupFromSelection: createGroupFromSelection,
    updateSaveStatus,
    resetVideoInfoFrameRate,
    startVideoInfoFrameRateSampling,
    updateVideoInfo,
    openImageModal,
    disableVideoButtons,
    enableVideoButtons,
    waitForVideoReady,
    startAutoShotWithRange,
    updateDurations,
    updateShotTable,
    syncShotTable,
    renderShots,
    setActiveShot,
    updateCustomFieldNames
  };
}
