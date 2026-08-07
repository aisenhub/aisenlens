export function createShotGroupController({
  elements = {},
  getGroups = () => [],
  getSelectedShotIds = () => new Set(),
  isSelectionMode = () => false,
  onSetSelectionMode = () => {},
  onCreateFromSelection = () => {},
  renderShots = () => {},
  showToast = () => {},
  documentTarget = document,
  windowTarget = window
} = {}) {
  const { selectButton, selectionStatus, shotsList } = elements;

  const updateToolbar = () => {
    const groups = getGroups();
    const selectedCount = getSelectedShotIds().size;
    if (selectButton) {
      const selecting = isSelectionMode();
      selectButton.classList.toggle('active', selecting);
      const label = selectButton.querySelector('[data-shot-group-label]');
      if (label) label.textContent = selecting ? '确认' : '镜头组';
      else selectButton.textContent = selecting ? '确认' : '镜头组';
    }
    if (selectionStatus) {
      selectionStatus.textContent = isSelectionMode()
        ? (selectedCount ? `已选择 ${selectedCount} 个镜头` : '请选择至少两个镜头')
        : '';
    }
  };

  const focusInput = (groupId, selector, select = false) => {
    windowTarget.requestAnimationFrame(() => {
      const card = [...(shotsList?.querySelectorAll('.shot-group-block') || [])]
        .find(item => item.dataset.groupId === groupId);
      const input = card?.querySelector(selector);
      if (!input) return;
      card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      input.focus({ preventScroll: true });
      if (select) input.select();
    });
  };

  const render = () => {
    updateToolbar();
  };

  const setSelectionMode = enabled => {
    onSetSelectionMode(enabled);
    syncSelectionMode(enabled);
    updateToolbar();
    renderShots();
    if (enabled) windowTarget.requestAnimationFrame(() => shotsList?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  };

  const syncSelectionMode = enabled => {
    if (shotsList) shotsList.classList.toggle('shot-group-selection-mode', !!enabled);
  };

  const handleSelectButton = () => {
    if (!isSelectionMode()) {
      setSelectionMode(true);
      return;
    }
    if (getSelectedShotIds().size < 2) {
      setSelectionMode(false);
      return;
    }
    onCreateFromSelection([...getSelectedShotIds()]);
  };

  const bind = () => {
    selectButton?.addEventListener('click', handleSelectButton);
  };

  return {
    bind,
    render,
    updateToolbar,
    setSelectionMode,
    syncSelectionMode: () => syncSelectionMode(isSelectionMode()),
    syncEntrySelection: (shotNumber, checked) => {
      const item = shotsList?.querySelector(`[data-shot="${shotNumber}"]`);
      if (item) item.classList.toggle('group-selected', !!checked);
    },
    focusSummary: groupId => focusInput(groupId, '[data-group-summary]'),
    focusTitle: groupId => focusInput(groupId, '[data-group-title]', true)
  };
}
