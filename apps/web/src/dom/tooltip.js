export function createTooltipController({ documentTarget = document, windowTarget = window } = {}) {
  let tooltip = null;
  let activeTarget = null;
  let observer = null;

  const ensureTooltip = () => {
    if (tooltip) return tooltip;
    tooltip = documentTarget.createElement('div');
    tooltip.className = 'app-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    documentTarget.body?.appendChild(tooltip);
    return tooltip;
  };

  const normalizeTitle = element => {
    if (!element || !element.getAttribute('title')) return;
    element.dataset.tooltip = element.getAttribute('title');
    element.removeAttribute('title');
  };

  const position = event => {
    if (!tooltip || tooltip.hidden) return;
    const rect = activeTarget?.getBoundingClientRect?.();
    const x = event?.clientX ?? (rect ? rect.left + rect.width / 2 : 0);
    const y = event?.clientY ?? (rect ? rect.top : 0);
    tooltip.style.left = `${Math.max(8, Math.min(windowTarget.innerWidth - tooltip.offsetWidth - 8, x + 10))}px`;
    tooltip.style.top = `${Math.max(8, y - tooltip.offsetHeight - 10)}px`;
  };

  const hide = () => {
    if (!tooltip) return;
    tooltip.hidden = true;
    if (activeTarget) activeTarget.removeAttribute('aria-describedby');
    activeTarget = null;
  };

  const show = (target, event) => {
    normalizeTitle(target);
    const text = target?.dataset.tooltip;
    if (!text || (event?.type === 'pointerover' && event.pointerType === 'touch')) return;
    const next = ensureTooltip();
    activeTarget = target;
    next.textContent = text;
    next.hidden = false;
    next.id = 'appTooltip';
    target.setAttribute('aria-describedby', 'appTooltip');
    position(event);
  };

  const bind = () => {
    documentTarget.querySelectorAll?.('[title]').forEach(normalizeTitle);
    documentTarget.addEventListener('pointerover', event => {
      const target = event.target?.closest?.('[data-tooltip]');
      if (target) show(target, event);
    });
    documentTarget.addEventListener('pointermove', position);
    documentTarget.addEventListener('pointerout', event => {
      if (activeTarget && !activeTarget.contains(event.relatedTarget)) hide();
    });
    documentTarget.addEventListener('focusin', event => show(event.target, event));
    documentTarget.addEventListener('focusout', hide);
    const MutationObserverCtor = windowTarget.MutationObserver;
    if (MutationObserverCtor) {
      observer = new MutationObserverCtor(records => records.forEach(record => {
        if (record.type === 'attributes' && record.attributeName === 'title') normalizeTitle(record.target);
      }));
      observer.observe(documentTarget.body || documentTarget, { subtree: true, attributes: true, attributeFilter: ['title'] });
    }
    return hide;
  };

  return { bind, show, hide };
}
