export function createShotWorkspaceLayout({
  elements = {},
  storage = null,
  storageKey = 'ashenVideoShotTableHeight',
  widthStorageKey = 'ashenVideoShotsPanelWidth',
  layoutVersionKey = 'ashenVideoWorkspaceLayoutVersion',
  layoutVersion = 2,
  onLayoutChange = () => {},
  windowTarget = globalThis
} = {}) {
  const { grid, horizontalSplitter, verticalSplitter, tableWrap, player } = elements;
  const minTableHeight = 180;
  const maxTableHeight = 560;
  const defaultTableHeight = 240;
  const minPanelWidth = 320;
  const minPlayerWidth = 496;
  const gridGaps = 24;
  const videoStage = elements.videoStage || player?.querySelector?.('.video-stage');
  const playerControls = elements.playerControls || player?.querySelector?.('.player-controls');
  const region2 = elements.region2;

  const getMaxPanelWidth = () => Math.max(minPanelWidth, (grid?.getBoundingClientRect().width || 0) - minPlayerWidth - gridGaps);

  const clearAutoLayout = () => {
    videoStage?.style.removeProperty('height');
    videoStage?.style.removeProperty('aspect-ratio');
  };

  const syncAutoLayout = () => {
    if (!player?.classList.contains('shot-table-auto-height') || !videoStage || !tableWrap) return;
    const playerHeight = player.getBoundingClientRect().height;
    const videoWidth = videoStage.getBoundingClientRect().width;
    const controlsHeight = playerControls?.getBoundingClientRect().height || 0;
    const waveformHeight = region2?.getBoundingClientRect().height || 0;
    const splitterHeight = verticalSplitter?.getBoundingClientRect().height || 0;
    const reservedHeight = controlsHeight + waveformHeight + splitterHeight + minTableHeight + 2;
    const naturalVideoHeight = videoWidth * 9 / 16;
    const maxVideoHeight = Math.max(0, playerHeight - reservedHeight);
    videoStage.style.aspectRatio = 'auto';
    videoStage.style.height = `${Math.round(Math.min(naturalVideoHeight, maxVideoHeight))}px`;
  };

  const notifyLayoutChange = () => windowTarget.requestAnimationFrame?.(() => onLayoutChange());

  const setTableHeight = (value, persist = true) => {
    const height = Math.max(minTableHeight, Math.min(maxTableHeight, Number(value) || minTableHeight));
    player?.classList.remove('shot-table-auto-height');
    clearAutoLayout();
    if (tableWrap) tableWrap.style.flex = `0 0 ${height}px`;
    verticalSplitter?.setAttribute('aria-valuenow', String(Math.round(height)));
    if (persist && storage) {
      try { storage.setItem(storageKey, String(height)); } catch (_) {}
    }
    notifyLayoutChange();
    return height;
  };

  const setPanelWidth = (value, persist = true) => {
    if (!grid) return minPanelWidth;
    const maxWidth = getMaxPanelWidth();
    const width = Math.max(minPanelWidth, Math.min(maxWidth, Number(value) || minPanelWidth));
    grid.style.setProperty('--shots-panel-width', `${width}px`);
    horizontalSplitter?.setAttribute('aria-valuenow', String(Math.round(width)));
    if (persist && storage) {
      try { storage.setItem(widthStorageKey, String(Math.round(width))); } catch (_) {}
    }
    notifyLayoutChange();
    return width;
  };

  const bindDrag = (target, onMove, onEnd, onCancel) => {
    if (!target) return;
    let start = null;
    target.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      start = {
        x: event.clientX,
        y: event.clientY,
        width: grid?.getBoundingClientRect().width,
        panelWidth: grid ? parseFloat(getComputedStyle(grid).getPropertyValue('--shots-panel-width')) : 0,
        tableHeight: tableWrap?.getBoundingClientRect().height
      };
      target.setPointerCapture?.(event.pointerId);
      windowTarget.document?.body?.classList.add('is-resizing-workspace');
      event.preventDefault();
    });
    target.addEventListener('pointermove', event => {
      if (!start) return;
      onMove(event, start);
      event.preventDefault();
    });
    const stop = event => {
      if (!start) return;
      if (event?.type === 'pointercancel') onCancel?.(start);
      else onEnd?.(event, start);
      start = null;
      windowTarget.document?.body?.classList.remove('is-resizing-workspace');
      if (event && target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    };
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
    windowTarget.addEventListener?.('blur', () => {
      if (!start) return;
      onCancel?.(start);
      start = null;
      windowTarget.document?.body?.classList.remove('is-resizing-workspace');
    });
    target.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !start) return;
      event.preventDefault();
      onCancel?.(start);
      start = null;
      windowTarget.document?.body?.classList.remove('is-resizing-workspace');
    });
  };

  const restoreDefaults = () => {
    if (grid) grid.style.removeProperty('--shots-panel-width');
    setTableHeight(defaultTableHeight);
    if (player && tableWrap && !tableWrap.hidden) {
      player.classList.add('shot-table-auto-height');
      tableWrap.style.removeProperty('flex');
      syncAutoLayout();
    }
    try {
      storage?.removeItem(storageKey);
      storage?.removeItem(widthStorageKey);
    } catch (_) {}
  };

  const bind = () => {
    if (grid && horizontalSplitter) {
      bindDrag(horizontalSplitter, event => {
        const rect = grid.getBoundingClientRect();
        const maxWidth = getMaxPanelWidth();
        const rightWidth = Math.max(minPanelWidth, Math.min(maxWidth, rect.right - event.clientX));
        setPanelWidth(rightWidth, false);
      }, (_, start) => {
        const width = parseFloat(getComputedStyle(grid).getPropertyValue('--shots-panel-width'));
        if (Number.isFinite(width)) setPanelWidth(width, true);
      }, start => {
        if (start.panelWidth) setPanelWidth(start.panelWidth, false);
        else grid.style.removeProperty('--shots-panel-width');
        try {
          if (start.panelWidth) storage?.setItem(widthStorageKey, String(Math.round(start.panelWidth)));
          else storage?.removeItem(widthStorageKey);
        } catch (_) {}
      });
      horizontalSplitter.addEventListener('keydown', event => {
        const current = parseFloat(getComputedStyle(grid).getPropertyValue('--shots-panel-width')) || 480;
        const step = event.shiftKey ? 40 : 10;
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const maxWidth = getMaxPanelWidth();
          const width = event.key === 'Home'
            ? minPanelWidth
            : event.key === 'End'
              ? maxWidth
              : current + (event.key === 'ArrowLeft' ? -step : step);
          setPanelWidth(width);
        }
      });
    }
    if (verticalSplitter && tableWrap) {
      bindDrag(verticalSplitter, (event, start) => {
        setTableHeight(start.tableHeight - (event.clientY - start.y), false);
      }, () => {
        const height = tableWrap.getBoundingClientRect().height;
        setTableHeight(height, true);
      }, start => setTableHeight(start.tableHeight || defaultTableHeight, true));
      verticalSplitter.addEventListener('keydown', event => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = tableWrap.getBoundingClientRect().height;
        const step = event.shiftKey ? 40 : 10;
        const height = event.key === 'Home'
          ? minTableHeight
          : event.key === 'End'
            ? maxTableHeight
            : current + (event.key === 'ArrowUp' ? step : -step);
        setTableHeight(height);
      });
    }
    let savedHeight = null;
    try { savedHeight = storage?.getItem(storageKey); } catch (_) {}
    if (savedHeight) setTableHeight(savedHeight);
    let savedWidth = null;
    try { savedWidth = storage?.getItem(widthStorageKey); } catch (_) {}
    if (savedWidth && grid) setPanelWidth(savedWidth, false);
    try {
      if (storage?.getItem(layoutVersionKey) !== String(layoutVersion)) storage?.setItem(layoutVersionKey, String(layoutVersion));
    } catch (_) {}
    horizontalSplitter?.setAttribute('aria-valuemin', String(minPanelWidth));
    horizontalSplitter?.setAttribute('aria-valuemax', String(getMaxPanelWidth()));
    horizontalSplitter?.setAttribute('aria-valuenow', String(Math.round(parseFloat(getComputedStyle(grid || document.documentElement).getPropertyValue('--shots-panel-width')) || 480)));
    verticalSplitter?.setAttribute('aria-valuemin', String(minTableHeight));
    verticalSplitter?.setAttribute('aria-valuemax', String(maxTableHeight));
    windowTarget.addEventListener('resize', () => {
      if (!grid) return;
      const width = parseFloat(getComputedStyle(grid).getPropertyValue('--shots-panel-width'));
      if (Number.isFinite(width)) setPanelWidth(width, false);
      horizontalSplitter?.setAttribute('aria-valuemax', String(getMaxPanelWidth()));
      syncAutoLayout();
      notifyLayoutChange();
    });
  };

  return { bind, setTableHeight, restoreDefaults, syncAutoLayout };
}
