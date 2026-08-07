const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(modal) {
  return [...(modal?.querySelectorAll?.(FOCUSABLE_SELECTOR) || [])]
    .filter(element => !element.hidden && element.getAttribute?.('aria-hidden') !== 'true');
}

export function createModalFocusTrap({ modal, documentTarget = globalThis.document, initialFocus = null, onClose = () => {} } = {}) {
  let previousFocus = null;
  let bound = false;

  const focusInitialElement = () => {
    const focusable = getFocusableElements(modal);
    const target = typeof initialFocus === 'function' ? initialFocus() : initialFocus;
    (target || focusable[0] || modal)?.focus?.();
  };

  const onKeydown = event => {
    if (!modal?.classList?.contains('show')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(modal);
    if (!focusable.length) {
      event.preventDefault();
      modal.focus?.();
      return;
    }
    const currentIndex = focusable.indexOf(documentTarget.activeElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    focusable[nextIndex].focus?.();
  };

  const open = () => {
    if (bound) return;
    bound = true;
    previousFocus = documentTarget.activeElement;
    if (!modal?.querySelector?.('[role="dialog"]')) {
      modal?.setAttribute?.('role', 'dialog');
      modal?.setAttribute?.('aria-modal', 'true');
    }
    if (!getFocusableElements(modal).length) modal?.setAttribute?.('tabindex', '-1');
    documentTarget.addEventListener?.('keydown', onKeydown);
    setTimeout(focusInitialElement, 0);
  };

  const close = () => {
    if (!bound) return;
    bound = false;
    documentTarget.removeEventListener?.('keydown', onKeydown);
    if (previousFocus && documentTarget.contains?.(previousFocus)) previousFocus.focus?.();
    previousFocus = null;
  };

  return { open, close, isOpen: () => bound, handleKeydown: onKeydown };
}

export function createModalFocusManager({ documentTarget = globalThis.document } = {}) {
  const traps = new Map();
  let observer = null;

  const closeModal = modal => {
    const closeButton = modal.querySelector?.('[data-modal-close], .close-modal, .btn-icon, .btn-cancel');
    if (closeButton) closeButton.click?.();
    else modal.classList.remove('show');
  };

  const sync = modal => {
    if (!modal) return;
    let trap = traps.get(modal);
    if (!trap) {
      trap = createModalFocusTrap({ modal, documentTarget, onClose: () => closeModal(modal) });
      traps.set(modal, trap);
    }
    if (modal.classList.contains('show')) trap.open();
    else trap.close();
  };

  const bind = () => {
    const modals = [...(documentTarget.querySelectorAll?.('.modal-overlay, .image-modal') || [])];
    modals.forEach(sync);
    if (typeof MutationObserver !== 'undefined' && documentTarget.body) {
      observer = new MutationObserver(records => records.forEach(record => sync(record.target)));
      modals.forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));
    }
    return manager;
  };

  const destroy = () => {
    observer?.disconnect?.();
    traps.forEach(trap => trap.close());
    traps.clear();
  };

  const manager = { bind, sync, destroy };
  return manager;
}
