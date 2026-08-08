export function createProjectNavigationController({
  elements = {},
  documentTarget = document,
  escapeText = value => String(value ?? '')
} = {}) {
  const { titleInput, templateMenu, templateMenuButton, templateMenuLabel, templateSelect } = elements;

  const closeProjectDropdown = () => {};
  const closeTemplateMenu = () => {
    templateMenu?.classList.remove('show');
    templateMenuButton?.setAttribute('aria-expanded', 'false');
  };
  const updateCurrentProjectButton = title => {
    if (!titleInput) return;
    titleInput.value = escapeText(title || '无项目');
    titleInput.title = title ? '点击编辑项目名称' : '无项目';
    titleInput.disabled = !title;
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
      if (templateMenu?.classList.contains('show') && !templateMenuButton?.contains(event.target) && !templateMenu.contains(event.target)) closeTemplateMenu();
    });
  };
  return {
    bind,
    updateCurrentProjectButton,
    openTemplateMenu,
    closeTemplateMenu,
    closeProjectDropdown,
    isTemplateMenuOpen,
    updateTemplateMenuLabel
  };
}
