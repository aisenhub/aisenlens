export function createMonitorController({
  surface,
  zoomSelect,
  video,
  overlayCanvas = null,
  syncOverlay = () => {},
  windowTarget = window
} = {}) {
  let zoom = 1;
  let pan = { x: 0, y: 0 };
  let panSession = null;
  let suppressStageClick = false;

  const getPanLimit = () => ({
    x: Math.max(0, (surface?.clientWidth || 0) * (zoom - 1) / 2),
    y: Math.max(0, (surface?.clientHeight || 0) * (zoom - 1) / 2)
  });

  const renderViewport = () => {
    surface?.style.setProperty('--monitor-zoom', String(zoom));
    surface?.style.setProperty('--monitor-pan-x', `${pan.x}px`);
    surface?.style.setProperty('--monitor-pan-y', `${pan.y}px`);
    surface?.toggleAttribute('data-can-pan', zoom > 1);
    surface?.toggleAttribute('data-panning', !!panSession);
  };

  const clampPan = () => {
    const limit = getPanLimit();
    pan = {
      x: Math.max(-limit.x, Math.min(limit.x, pan.x)),
      y: Math.max(-limit.y, Math.min(limit.y, pan.y))
    };
  };

  const setZoom = () => {
    const nextZoom = zoomSelect?.value === 'fit' ? 1 : Number(zoomSelect?.value);
    zoom = Number.isFinite(nextZoom) && nextZoom > 0 ? nextZoom : 1;
    pan = { x: 0, y: 0 };
    renderViewport();
  };

  const sync = () => syncOverlay();

  const bind = () => {
    zoomSelect?.addEventListener('change', setZoom);
    video?.addEventListener('loadedmetadata', () => {
      pan = { x: 0, y: 0 };
      renderViewport();
      sync();
    });
    surface?.addEventListener('pointerdown', event => {
      if (event.button !== 0 || zoom <= 1 || event.target === overlayCanvas) return;
      panSession = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      surface.setPointerCapture?.(event.pointerId);
      renderViewport();
      event.preventDefault();
    });
    surface?.addEventListener('pointermove', event => {
      if (!panSession || event.pointerId !== panSession.pointerId) return;
      pan = {
        x: panSession.panX + event.clientX - panSession.x,
        y: panSession.panY + event.clientY - panSession.y
      };
      clampPan();
      suppressStageClick = true;
      renderViewport();
      event.preventDefault();
    });
    const finishPan = event => {
      if (!panSession || event.pointerId !== panSession.pointerId) return;
      if (surface?.hasPointerCapture?.(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      panSession = null;
      renderViewport();
    };
    surface?.addEventListener('pointerup', finishPan);
    surface?.addEventListener('pointercancel', finishPan);
    surface?.addEventListener('click', event => {
      if (!suppressStageClick) return;
      suppressStageClick = false;
      event.stopPropagation();
    });
    windowTarget.addEventListener('resize', () => {
      clampPan();
      renderViewport();
      sync();
    });
    if (surface && windowTarget.ResizeObserver) new windowTarget.ResizeObserver(() => {
      clampPan();
      renderViewport();
      sync();
    }).observe(surface);
    setZoom();
  };

  return { bind, sync };
}
