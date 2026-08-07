export function createTableDisplayModalController({
  modal,
  closeButton,
  doneButton,
  renderSettings = () => {},
  documentTarget = document
} = {}) {
  const close = () => modal?.classList.remove('show');

  const open = () => {
    renderSettings();
    modal?.classList.add('show');
  };

  const bind = () => {
    closeButton?.addEventListener('click', close);
    doneButton?.addEventListener('click', close);
    modal?.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    documentTarget?.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal?.classList.contains('show')) close();
    });
  };

  return { bind, open, close };
}
