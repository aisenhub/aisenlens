export function createAppShellController({
  elements = {},
  getDirty = () => false,
  windowTarget = window,
  documentTarget = document
} = {}) {
  const { saveStatus, saveButton } = elements;

  const updateSaveStatus = () => {
    if (!saveStatus) return;
    const dirty = !!getDirty();
    const statusLabel = dirty ? '项目有未保存的修改' : '项目已保存';
    saveStatus.classList.toggle('saved', !dirty);
    saveStatus.setAttribute('aria-label', statusLabel);
    saveStatus.title = statusLabel;
    if (!saveButton) return;
    const buttonLabel = dirty ? '保存项目（有未保存的修改）' : '保存项目（已保存）';
    saveButton.title = buttonLabel;
    saveButton.setAttribute('aria-label', buttonLabel);
  };

  const bind = () => {
    windowTarget.addEventListener('beforeunload', event => {
      if (!getDirty()) return;
      event.preventDefault();
      event.returnValue = '';
    });
    documentTarget.querySelectorAll('.settings-collapse-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const section = toggle.closest('.collapsible-settings-section');
        if (!section) return;
        const expanded = toggle.getAttribute('aria-expanded') !== 'false';
        toggle.setAttribute('aria-expanded', String(!expanded));
        section.classList.toggle('is-collapsed', expanded);
      });
    });
  };

  return { bind, updateSaveStatus };
}
