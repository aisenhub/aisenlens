export function bindProjectEvents({
  elements = {},
  documentTarget = null,
  locationTarget = null,
  onToggle = () => {},
  onNew = () => {},
  onImport = () => {},
  onFolderImport = () => {},
  onDelete = () => {},
  onCloseDropdown = () => {},
  onProjectId = () => {},
  onReady = () => {}
} = {}) {
  const {
    currentButton,
    newButton,
    logo,
    importButton,
    secondaryImportButton,
    deleteButton,
    dropdown
  } = elements;
  currentButton?.addEventListener('click', event => {
    event.stopPropagation();
    onToggle();
  });
  newButton?.addEventListener('click', () => {
    onCloseDropdown();
    onNew();
  });
  secondaryImportButton?.addEventListener('click', () => {
    onCloseDropdown();
    onImport();
  });
  deleteButton?.addEventListener('click', () => {
    onCloseDropdown();
    onDelete();
  });
  logo?.addEventListener('click', onToggle);
  importButton?.addEventListener('click', onFolderImport);
  documentTarget?.addEventListener('click', event => {
    if (dropdown?.classList.contains('show')
      && !currentButton?.contains(event.target)
      && !dropdown.contains(event.target)) onCloseDropdown();
  });
  const query = locationTarget?.search || '';
  const projectId = new URLSearchParams(query).get('project_id');
  if (projectId) setTimeout(() => onProjectId(projectId), 300);
  onReady();
}
