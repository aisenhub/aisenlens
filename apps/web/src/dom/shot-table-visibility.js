export function createShotTableVisibilityController({
  elements = {},
  storage = null,
  storageKey = 'ashenVideoShotTableVisible',
  syncOverlaySize = () => {},
  renderWaveform = () => {},
  syncLayout = () => {},
  onShowSettings = () => {},
  windowTarget = window
} = {}) {
  const {
    button,
    tableWrap,
    waveformPanel,
    splitter,
    player,
    region3
  } = elements;
  const compactLayoutQuery = windowTarget.matchMedia?.('(max-width: 1280px)') || null;
  let preferredVisible = false;

  const isCompactLayout = () => !!compactLayoutQuery?.matches;

  const setVisible = (visible, persist = true) => {
    preferredVisible = !!visible;
    const isVisible = preferredVisible && !isCompactLayout();
    if (tableWrap) tableWrap.hidden = !isVisible;
    if (waveformPanel) waveformPanel.hidden = false;
    if (splitter) splitter.hidden = !isVisible;
    if (region3) region3.hidden = !isVisible;
    if (player) {
      player.classList.toggle('shot-table-hidden', !isVisible);
      player.classList.toggle('shot-table-auto-height', isVisible);
    }
    if (isVisible && tableWrap) tableWrap.style.removeProperty('flex');
    if (button) {
      button.setAttribute('aria-pressed', String(isVisible));
      button.disabled = isCompactLayout();
      button.title = isCompactLayout()
        ? '单列布局下已自动隐藏分镜表格'
        : isVisible ? '隐藏分镜表格' : '显示分镜表格';
      button.setAttribute('aria-label', button.title);
      button.classList.toggle('active', isVisible);
    }
    if (persist && storage) {
      try { storage.setItem(storageKey, preferredVisible ? '1' : '0'); } catch (_) {}
    }
    windowTarget.requestAnimationFrame(() => {
      syncOverlaySize();
      renderWaveform();
      syncLayout();
    });
  };

  const isVisible = () => !(tableWrap && tableWrap.hidden);

  const bind = () => {
    button?.addEventListener('click', () => {
      const wasVisible = isVisible();
      setVisible(!wasVisible);
      if (!wasVisible) onShowSettings();
    });
    let storedVisible = null;
    if (storage) {
      try { storedVisible = storage.getItem(storageKey); } catch (_) {}
    }
    setVisible(storedVisible === '1', false);
    const syncCompactLayout = () => setVisible(preferredVisible, false);
    if (compactLayoutQuery?.addEventListener) compactLayoutQuery.addEventListener('change', syncCompactLayout);
    else compactLayoutQuery?.addListener?.(syncCompactLayout);
  };

  return { bind, setVisible, isVisible };
}
