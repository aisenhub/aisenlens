export function createProjectNavigationController({
  elements = {},
  getCurrentProjectId = () => null,
  showGuide = () => {},
  documentTarget = document,
  escapeText = value => String(value ?? '')
} = {}) {
  const { currentButton, dropdown, templateMenu, templateMenuButton, templateMenuLabel, templateSelect } = elements;
  const folderIcon = '<svg class="header-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h5l1.7 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 .5-2Z"/></svg>';

  const closeProjectDropdown = () => dropdown?.classList.remove('show');
  const closeTemplateMenu = () => {
    templateMenu?.classList.remove('show');
    templateMenuButton?.setAttribute('aria-expanded', 'false');
  };
  const updateCurrentProjectButton = title => {
    if (currentButton) currentButton.innerHTML = `${folderIcon}<span class="project-current-label">${escapeText(title || '无项目')}</span>`;
  };
  const toggleProjectDropdown = () => {
    if (!getCurrentProjectId()) { showGuide(); return; }
    if (!dropdown) return;
    if (!dropdown.classList.contains('show')) closeTemplateMenu();
    dropdown.classList.toggle('show');
  };
  const openTemplateMenu = () => {
    if (!templateMenu) return;
    closeProjectDropdown();
    templateMenu.classList.add('show');
    templateMenuButton?.setAttribute('aria-expanded', 'true');
  };
  const isTemplateMenuOpen = () => !!templateMenu?.classList.contains('show');
  const updateTemplateMenuLabel = () => {
    if (!templateMenuLabel || !templateSelect) return;
    const option = templateSelect.options[templateSelect.selectedIndex];
    templateMenuLabel.textContent = option ? option.textContent : '未选择模板';
  };
  const bind = () => {
    documentTarget.addEventListener('click', event => {
      if (dropdown?.classList.contains('show') && !currentButton?.contains(event.target) && !dropdown.contains(event.target)) closeProjectDropdown();
      if (templateMenu?.classList.contains('show') && !templateMenuButton?.contains(event.target) && !templateMenu.contains(event.target)) closeTemplateMenu();
    });
  };
  return {
    bind,
    updateCurrentProjectButton,
    toggleProjectDropdown,
    openTemplateMenu,
    closeTemplateMenu,
    closeProjectDropdown,
    isTemplateMenuOpen,
    updateTemplateMenuLabel
  };
}
