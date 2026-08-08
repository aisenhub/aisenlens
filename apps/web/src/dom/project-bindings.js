export function bindProjectEvents({
  elements = {},
  onRename = async () => false
} = {}) {
  const { titleInput } = elements;
  if (!titleInput) return;

  let originalTitle = titleInput.value;
  const finish = async save => {
    if (titleInput.readOnly) return;
    const title = titleInput.value.trim();
    titleInput.readOnly = true;
    if (!save || !title || title === originalTitle) {
      titleInput.value = originalTitle;
      return;
    }
    const renamed = await onRename(title);
    if (!renamed) titleInput.value = originalTitle;
  };

  titleInput.addEventListener('click', () => {
    if (titleInput.readOnly) {
      originalTitle = titleInput.value;
      titleInput.readOnly = false;
      titleInput.select();
    }
  });
  titleInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      titleInput.blur();
    }
    if (event.key === 'Escape') {
      titleInput.value = originalTitle;
      void finish(false);
    }
  });
  titleInput.addEventListener('blur', () => { void finish(true); });
}
