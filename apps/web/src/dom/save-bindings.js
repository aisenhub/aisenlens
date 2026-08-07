export function bindSaveEvents({
  saveButton,
  documentTarget = document,
  onSave = async () => {}
} = {}) {
  saveButton?.addEventListener('click', () => onSave());
  const handler = async event => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const isSaveShortcut = (isMac && event.metaKey || !isMac && event.ctrlKey) && event.key.toLowerCase() === 's';
    if (!isSaveShortcut) return;
    event.preventDefault();
    saveButton?.classList.add('pulse');
    try { await onSave(); } finally { saveButton?.classList.remove('pulse'); }
  };
  documentTarget?.addEventListener('keydown', handler);
  return () => documentTarget?.removeEventListener('keydown', handler);
}
