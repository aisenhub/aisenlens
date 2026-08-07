import { createShotListController } from '../dom/shot-list-controller.js';
import { createShotTableController } from '../dom/shot-table-controller.js';
import { createShotGroupController } from '../dom/shot-group-controller.js';
import { createShotTableVisibilityController } from '../dom/shot-table-visibility.js';
import { createShotWorkspaceLayout } from '../dom/shot-workspace-layout.js';
import { createShotPropertyPanel } from '../dom/shot-property-panel.js';
import { createAppShellController } from '../dom/app-shell.js';
import { createShotRenderingController } from '../dom/shot-rendering.js';
import { formatAutoShotSegmentRange } from '../features/auto-shot/segment-runner.js';
import { AUTO_SHOT_SEGMENT_DURATION } from '../features/auto-shot/segment-runner.js';
import { normalizeShotOrder } from '../features/shots/shot-store.js';
import { getEntryThumbnail } from '../utils/shots.js';
import { removeShotGroup, updateShotGroup } from '../features/groups/group-service.js';
import { clearShotGroupSelection } from '../features/groups/group-editor.js';

export function createShotRuntime({
  elements = {},
  runtimeState,
  video,
  shotActions,
  getConfiguredFields,
  getTemplateFields = getConfiguredFields,
  getReferenceOptions = () => [],
  getCellValue,
  fixedColumns = [],
  escapeText,
  syncShotGroupsWithEntries,
  selectShotGroupRange,
  createShotGroupFromSelection,
  getThumbnail = getEntryThumbnail,
  formatAutoShotRange = formatAutoShotSegmentRange,
  autoShotSegmentDuration = AUTO_SHOT_SEGMENT_DURATION,
  getAutoShotState,
  getShotEditorController,
  getShotAutoCorrectController,
  getShotModalController,
  getOverlayController,
  getPlayback,
  getOpenImage,
  startAutoShot,
  markDirty,
  showToast,
  updateDurations,
  updateVideoInfo,
  renderWaveform,
  openTableDisplaySettings = () => {},
  setActiveShot,
  onLoadVideo = () => {},
  onCaptureShot = () => {},
  getHasProject = () => true,
  onNewProject = () => {},
  onImportProject = () => {},
  invokeAction = null,
  history = null,
  documentTarget = document,
  windowTarget = window,
  storage = localStorage
} = {}) {
  let shotGroupController = null;
  let shotRendererController = null;

  const shotListController = createShotListController({
    list: elements.shotsList,
    getEntries: () => runtimeState.entries,
    getShotGroups: () => runtimeState.shotGroups,
    getActiveShotNumber: () => runtimeState.activeShotNumber,
    getSelectedShotIds: () => runtimeState.selectedShotIds,
    isSelectionMode: () => runtimeState.shotGroupSelectionMode,
    getExpandedShotNumber: () => runtimeState.expandedShotNumber,
    getActiveGroupId: () => runtimeState.activeShotGroupId,
    getEditingGroupTitleId: () => runtimeState.editingShotGroupTitleId,
    getEditingGroupSummaryId: () => runtimeState.editingShotGroupSummaryId,
    getDetailSignature: () => getConfiguredFields().join('\u001f'),
    getThumbnail,
    getConfiguredFields,
    renderCustomFields: (...args) => shotTableController.renderCustomFieldsFor(...args),
    getCurrentVideo: () => video,
    getAutoShotState,
    isAutoDetecting: () => runtimeState.autoDetecting,
    isGeneratingScreenshots: () => runtimeState.generatingScreenshots,
    formatAutoShotRange,
    autoShotSegmentDuration,
    onContinueAutoShot: (start, end) => startAutoShot(start, end),
    onContinueAllAutoShot: (start, end) => startAutoShot(start, end, { runAll: true }),
    onPlayShot: entry => getPlayback()?.play?.(entry),
    onEditShot: entry => getShotEditorController()?.open?.(entry),
    onDeleteShot: entry => invokeAction ? invokeAction('shot.delete', entry) : shotActions.deleteShot(entry),
    onCorrectTime: (entry, item, timeInput, button) => getShotAutoCorrectController()?.schedule?.(entry, item, timeInput, button),
    onSaveTime: shotActions.saveTime,
    onOpenImage: (source, timecode, shotNumber) => getOpenImage(source, timecode, shotNumber),
    onSelectGroupRange: entry => selectShotGroupRange?.(entry),
    onToggleGroup: (groupId, expanded) => {
      runtimeState.activeShotGroupId = expanded ? groupId : null;
      if (!expanded) {
        if (runtimeState.editingShotGroupTitleId === groupId) runtimeState.editingShotGroupTitleId = null;
        if (runtimeState.editingShotGroupSummaryId === groupId) runtimeState.editingShotGroupSummaryId = null;
      }
      shotListController.render();
    },
    onEditGroupTitle: (groupId, editing) => {
      runtimeState.activeShotGroupId = groupId;
      runtimeState.editingShotGroupTitleId = editing ? groupId : null;
      if (editing) runtimeState.editingShotGroupSummaryId = null;
      shotListController.render();
      if (editing) shotListController.focusGroupTitle(groupId);
    },
    onEditGroupSummary: (groupId, editing) => {
      runtimeState.activeShotGroupId = groupId;
      runtimeState.editingShotGroupSummaryId = editing ? groupId : null;
      if (editing) runtimeState.editingShotGroupTitleId = null;
      shotListController.render();
      if (editing) shotListController.focusGroupSummary(groupId);
    },
    onDeleteGroup: groupId => {
      const before = runtimeState.shotGroups.map(group => ({ ...group, shotIds: [...group.shotIds] }));
      const after = removeShotGroup(before, groupId);
      const apply = next => {
        runtimeState.shotGroups = next;
        if (runtimeState.activeShotGroupId === groupId) runtimeState.activeShotGroupId = null;
        if (runtimeState.editingShotGroupTitleId === groupId) runtimeState.editingShotGroupTitleId = null;
        if (runtimeState.editingShotGroupSummaryId === groupId) runtimeState.editingShotGroupSummaryId = null;
        shotListController.render();
        markDirty();
      };
      if (history) history.execute(history.createSnapshotCommand({ before, after, apply, label: '解散镜头组' }));
      else apply(after);
    },
    onGroupTitleChange: (groupId, title) => {
      const before = runtimeState.shotGroups.map(group => ({ ...group, shotIds: [...group.shotIds] }));
      const after = updateShotGroup(before, groupId, { title });
      const apply = next => { runtimeState.shotGroups = next; shotListController.render(); markDirty(); };
      if (history) history.execute(history.createSnapshotCommand({ before, after, apply, label: '编辑镜头组标题' }));
      else apply(after);
    },
    onGroupSummaryChange: (groupId, summary) => {
      const before = runtimeState.shotGroups.map(group => ({ ...group, shotIds: [...group.shotIds] }));
      const after = updateShotGroup(before, groupId, { summary });
      const apply = next => { runtimeState.shotGroups = next; shotListController.render(); markDirty(); };
      if (history) history.execute(history.createSnapshotCommand({ before, after, apply, label: '编辑镜头组概括' }));
      else apply(after);
    },
    onSetActiveShot: (shotNumber, expand) => setActiveShot(shotNumber, expand),
    onEmptyAction: () => {
      if (video?.src) onCaptureShot();
      else onLoadVideo();
    },
    getHasProject,
    onEmptyNewProject: () => onNewProject(),
    onEmptyImportProject: () => onImportProject(),
    onCloseDetail: () => { runtimeState.expandedShotNumber = null; }
  });

  const shotTableController = createShotTableController({
    elements: {
      tableBody: elements.shotTableBody,
      tableHeadRow: elements.shotTableHeadRow,
      tableWrap: elements.shotTableWrap,
      customFieldsArea: elements.customFieldsArea
    },
    getEntries: () => runtimeState.entries,
    getColumns: elements.getColumns,
    getCellValue,
    getThumbnail,
    getTemplateFields,
    getReferenceOptions,
    fixedColumns,
    escapeText,
    getActiveShotNumber: () => runtimeState.activeShotNumber,
    setActiveShotNumber: value => { runtimeState.activeShotNumber = value; },
    getExpandedShotNumber: () => runtimeState.expandedShotNumber,
    setExpandedShotNumber: value => { runtimeState.expandedShotNumber = value; },
    getShotsList: () => elements.shotsList,
    ensureVirtualList: shotListController.ensure,
    scheduleVirtualRender: shotListController.scheduleRender,
    renderVirtualList: shotListController.render,
    scrollVirtualIntoView: shotListController.scrollIntoView,
    getVideo: () => video,
    clampTime: (...args) => getPlayback()?.clampTime?.(...args) ?? args[0],
    stopSegmentPlayback: shouldPause => getPlayback()?.stop?.(shouldPause),
    renderWaveform,
    markDirty,
    windowTarget,
    documentTarget,
    setCustomFieldNames: value => { runtimeState.customFieldNames = value; },
    onActiveShotChanged: () => shotPropertyPanel?.render(),
    updateShotField: (entry, patch) => shotActions.updateFields?.(entry, patch)
  });

  const shotPropertyPanel = createShotPropertyPanel({
    elements: {
      panel: elements.shotPropertyPanel,
      empty: elements.shotPropertyEmpty,
      title: elements.shotPropertyTitle,
      fields: elements.shotPropertyFields,
      customFields: elements.shotPropertyCustomFields,
      groupHint: elements.shotPropertyGroupHint,
      editorButton: elements.shotPropertyEditorBtn
    },
    getEntries: () => runtimeState.entries,
    getActiveShotNumber: () => runtimeState.activeShotNumber,
    getConfiguredFields,
    getShotGroups: () => runtimeState.shotGroups,
    getSelectedShotIds: () => runtimeState.selectedShotIds,
    onUpdate: async (entry, field, value) => {
      if (field === 'timecode') await shotActions.saveTime(entry, value);
      else if (field === 'duration') {
        const duration = Math.max(0, Number(value) || 0);
        await shotActions.updateFields?.(entry, { segmentEnd: Number(entry.time) + duration });
      }
      else {
        await shotActions.updateFields?.(entry, { [field]: value });
      }
      shotPropertyPanel.render();
    },
    onBatchUpdate: async (shotIds, draft) => {
      const patches = [];
      for (const shotId of shotIds) {
        const entry = runtimeState.entries.find(item => item.shotId === shotId);
        if (!entry) continue;
        const patch = {};
        for (const [field, value] of Object.entries(draft)) {
          if (field === 'shotNumber' || field === 'timecode' || field === 'duration') continue;
          if (field.startsWith('custom:')) {
            const name = field.slice(7);
            patch.custom = { ...(patch.custom || entry.custom || {}), [name]: value };
          } else patch[field] = value;
        }
        if (Object.keys(patch).length) patches.push({ shotId, patch });
      }
      await shotActions.updateFieldsBatch?.(patches, '批量编辑分镜属性');
    },
    onOpenEditor: entry => getShotEditorController()?.open?.(entry),
    documentTarget
  });
  shotPropertyPanel.bind();

  shotGroupController = createShotGroupController({
    elements: {
      selectButton: elements.shotGroupSelectBtn,
      selectionStatus: elements.shotGroupSelectionStatus,
      shotsList: elements.shotsList
    },
    getGroups: () => runtimeState.shotGroups,
    getActiveGroupId: () => runtimeState.activeShotGroupId,
    getEditingTitleId: () => runtimeState.editingShotGroupTitleId,
    getSelectedShotIds: () => runtimeState.selectedShotIds,
    isSelectionMode: () => runtimeState.shotGroupSelectionMode,
    setActiveGroupId: value => { runtimeState.activeShotGroupId = value; },
    setEditingTitleId: value => { runtimeState.editingShotGroupTitleId = value; },
    onSetSelectionMode: enabled => {
      runtimeState.shotGroupSelectionMode = enabled;
      if (enabled) runtimeState.expandedShotNumber = null;
      if (!enabled) {
        runtimeState.selectedShotIds = clearShotGroupSelection();
        runtimeState.shotGroupSelectionAnchorId = null;
      }
    },
    onCreateFromSelection: selectedIds => invokeAction
      ? invokeAction('group.create', { selectedIds })
      : createShotGroupFromSelection(selectedIds),
    renderShots: () => shotRendererController?.render(),
    showToast,
    documentTarget,
    windowTarget
  });
  shotGroupController.bind();

  shotRendererController = createShotRenderingController({
    getEntries: () => runtimeState.entries,
    setEntries: value => { runtimeState.entries = value; },
    normalizeEntries: normalizeShotOrder,
    getHeights: () => shotListController.state.heights,
    updateDurations,
    updateVideoInfo,
    updateTable: () => shotTableController.updateTable(),
    renderWaveform,
    renderGroups: () => {
      syncShotGroupsWithEntries?.();
      shotGroupController?.render();
    },
    hasList: () => !!elements.shotsList,
    syncSelectionMode: () => shotGroupController.syncSelectionMode(),
    ensureList: shotListController.ensure,
    renderList: shotListController.render
  });

  let workspaceLayout = null;
  const shotTableVisibilityController = createShotTableVisibilityController({
    elements: {
      button: elements.toggleShotTableBtn,
      tableWrap: elements.shotTableWrap,
      waveformPanel: elements.audioWaveformPanel,
      splitter: elements.shotTableSplitter,
      player: elements.toolPlayer,
      region3: elements.workspaceRegion3
    },
    storage,
    syncOverlaySize: () => getOverlayController()?.syncSize?.(),
    renderWaveform,
    syncLayout: () => workspaceLayout?.syncAutoLayout?.(),
    onShowSettings: openTableDisplaySettings,
    windowTarget
  });
  workspaceLayout = createShotWorkspaceLayout({
    elements: {
      grid: elements.toolGrid,
      horizontalSplitter: elements.toolHorizontalSplitter,
      verticalSplitter: elements.shotTableSplitter,
      tableWrap: elements.shotTableWrap,
      player: elements.toolPlayer,
      region1: elements.workspaceRegion1,
      region2: elements.workspaceRegion2,
      region3: elements.workspaceRegion3
    },
    storage,
    onLayoutChange: () => {
      getOverlayController()?.syncSize?.();
      renderWaveform?.();
    }
  });
  workspaceLayout.bind();
  elements.resetWorkspaceBtn?.addEventListener('click', workspaceLayout.restoreDefaults);
  shotTableVisibilityController.bind();

  const dissolveGroup = (groupId = runtimeState.activeShotGroupId) => {
    const target = (runtimeState.shotGroups || []).find(group => group.id === groupId);
    if (!target) return false;
    const before = (runtimeState.shotGroups || []).map(group => ({ ...group, shotIds: [...(group.shotIds || [])] }));
    const after = removeShotGroup(before, groupId);
    const apply = next => {
      runtimeState.shotGroups = next;
      if (runtimeState.activeShotGroupId === groupId) runtimeState.activeShotGroupId = null;
      shotListController.render();
      markDirty();
    };
    if (history) return history.execute(history.createSnapshotCommand({ before, after, apply, label: '解散镜头组' }));
    apply(after);
    return true;
  };

  const editGroup = (groupId = runtimeState.activeShotGroupId) => {
    if (!groupId || !(runtimeState.shotGroups || []).some(group => group.id === groupId)) return false;
    runtimeState.activeShotGroupId = groupId;
    runtimeState.editingShotGroupTitleId = groupId;
    shotListController.render();
    shotListController.focusTitle(groupId);
    return true;
  };

  const appShellController = createAppShellController({
    elements: { saveStatus: elements.saveStatus, saveButton: elements.saveBtn },
    getDirty: () => windowTarget.__dirty,
    windowTarget,
    documentTarget
  });
  appShellController.bind();
  appShellController.updateSaveStatus();

  return {
    shotListController,
    shotTableController,
    shotGroupController,
    shotRendererController,
    shotTableVisibilityController,
    workspaceLayout,
    shotPropertyPanel,
    appShellController,
    createGroup: selectedIds => createShotGroupFromSelection?.(selectedIds),
    dissolveGroup,
    editGroup,
    updateContinuationCard: shotListController.updateContinuationCard
  };
}
