export function createVideoInfoPopoverController({
  button = null,
  panel = null,
  documentTarget = document
} = {}) {
  let bound = false;

  const isOpen = () => !!panel?.classList.contains('show');
  const close = () => {
    panel?.classList.remove('show');
    button?.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    if (!panel) return;
    panel.classList.add('show');
    button?.setAttribute('aria-expanded', 'true');
  };
  const toggle = () => { if (isOpen()) close(); else open(); };

  const bind = () => {
    if (bound || !button || !panel) return;
    bound = true;
    button.addEventListener('click', event => {
      event.stopPropagation();
      toggle();
    });
    panel.addEventListener('click', event => event.stopPropagation());
    documentTarget.addEventListener('click', event => {
      if (!button.contains(event.target) && !panel.contains(event.target)) close();
    });
    documentTarget.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isOpen()) {
        close();
        button.focus({ preventScroll: true });
      }
    });
  };

  return { bind, open, close, toggle, isOpen };
}
