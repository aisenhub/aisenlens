import {
  renderCategorizedFieldPool,
  renderFieldOptionsEditor,
  renderTemplateFieldRows
} from './template-editor.js';

export function createTemplateController({
  elements = {},
  templates = {},
  fixedColumns = [],
  defaultFixedOrder = [],
  getTemplateName = () => '',
  setTemplateName = () => {},
  getSelectedTemplate = () => null,
  getConfiguredFields = () => [],
  getEditorFields = () => [],
  getVisibleFields = () => [],
  getSelectedDisplayFields = () => [],
  getOrderedFixedColumns = () => [],
  getCategories = () => [],
  getReferenceOptions = () => [],
  getTemplateDraft = () => null,
  setTemplateDraft = () => {},
  getCustomDraft = () => null,
  setCustomDraft = () => {},
  getFieldOptionsDraft = () => null,
  setFieldOptionsDraft = () => {},
  getSettings = () => ({}),
  saveSettings = () => {},
  getFieldPool = () => [],
  addFieldToPool = () => false,
  escapeText = value => String(value ?? ''),
  tableDisplayFieldLimit = 8,
  onUpdateEditorFields = () => {},
  onUpdateCustomFields = () => {},
  onOpenFieldOptions = () => {},
  onAddField = () => {},
  onTemplateDisplayFieldsChanged = () => {},
  showToast = () => {},
  documentTarget = document
} = {}) {
  const {
    templateEditButton,
    templateEditorModalClose,
    templateEditorSaveBtn,
    templateEditorCancelBtn,
    templateEditorModal,
    customTemplateBtn,
    customTemplateModalClose,
    customTemplateSaveBtn,
    customTemplateCancelBtn,
    customTemplateModal,
    customTemplateNameInput,
    templateMenuBtn,
    templateMenu,
    templateSelect,
    templateMenuLabel,
    templateFieldsList,
    templatePoolList,
    customTemplatePoolList,
    customTemplateFieldsList,
    fieldOptionsList,
    fieldOptionsTitle,
    fieldOptionInput,
    fieldOptionsModal,
    fieldOptionAddBtn,
    fieldOptionsSaveBtn,
    fieldOptionsCancelBtn,
    fieldOptionsModalClose,
    tableDisplayFieldList
  } = elements;

  const bindFixedColumnDrag = (row, list, dragState, onOrderChange) => {
    row.addEventListener('dragstart', event => {
      dragState.row = row;
      row.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', row.dataset.tableColumnKey || '');
      }
    });
    row.addEventListener('dragend', () => { row.classList.remove('dragging'); dragState.row = null; });
    row.addEventListener('dragover', event => {
      event.preventDefault();
      if (!dragState.row || dragState.row === row) return;
      const rect = row.getBoundingClientRect();
      list.insertBefore(dragState.row, event.clientY > rect.top + rect.height / 2 ? row.nextSibling : row);
    });
    row.addEventListener('drop', event => {
      event.preventDefault();
      if (!dragState.row) return;
      onOrderChange([...list.querySelectorAll('[data-table-column-key]')]
        .map(item => item.dataset.tableColumnKey)
        .filter(key => key === 'duration' || key === 'image'));
    });
  };

  const renderFieldPool = (container, selectedFields, onToggle) => {
    renderCategorizedFieldPool(container, getCategories(), selectedFields, {
      onToggle,
      onReference: onOpenFieldOptions,
      onAddField: category => {
        const fieldName = String(window.prompt(`添加字段到${category.key === 'user' ? '用户字段' : '参考字段'}：`, '') || '').trim();
        if (!fieldName) return;
        if (fixedColumns.some(column => column.label === fieldName)) {
          showToast('镜号、时长和画面截图由表格固定管理', 'warning');
          return;
        }
        if (getFieldPool().includes(fieldName)) {
          showToast('该字段已存在于字段池', 'warning');
          return;
        }
        addFieldToPool(fieldName);
        onAddField(fieldName, true);
        showToast('已添加到用户字段', 'success');
      }
    });
  };

  const renderFixedRows = (container, fixedOrder, onOrderChange, dragIcon = '☷') => {
    const dragState = { row: null };
    getOrderedFixedColumns(fixedOrder).forEach(column => {
      const row = documentTarget.createElement('div');
      row.className = 'template-field-row template-table-fixed-row locked';
      row.dataset.tableColumnKey = column.key;
      row.draggable = false;
      row.innerHTML = `<span class="template-fixed-label">${escapeText(column.label)}</span><span class="template-fixed-status">固定</span>`;
      if (row.draggable) bindFixedColumnDrag(row, container, dragState, onOrderChange);
      container.appendChild(row);
    });
  };

  const renderTemplateEditor = () => {
    if (!templateFieldsList) return;
    const template = getSelectedTemplate();
    templateFieldsList.innerHTML = '';
    if (templatePoolList) templatePoolList.innerHTML = '';
    if (!template) {
      const empty = documentTarget.createElement('div');
      empty.className = 'form-hint';
      empty.textContent = '当前未使用模板，请先选择一个模板。';
      templateFieldsList.appendChild(empty);
      if (templatePoolList) templatePoolList.innerHTML = '<div class="form-hint">当前未使用模板。</div>';
      return;
    }
    const draft = getTemplateDraft();
    const fields = getEditorFields();
    renderFixedRows(templateFieldsList, draft?.tableFixedOrder, order => { if (draft) draft.tableFixedOrder = order; });
    renderTemplateFieldRows(templateFieldsList, fields, {
      onReference: onOpenFieldOptions,
      onRemove: (_, index) => onUpdateEditorFields(fields.filter((__, fieldIndex) => fieldIndex !== index)),
      onReorder: onUpdateEditorFields
    });
    renderFieldPool(templatePoolList, fields, (fieldName, checked) => onUpdateEditorFields([...fields.filter(field => field !== fieldName), ...(checked ? [fieldName] : [])]));
  };

  const renderCustomTemplateEditor = () => {
    const draft = getCustomDraft();
    if (!draft || !customTemplatePoolList || !customTemplateFieldsList) return;
    const fields = [...draft.fields];
    customTemplatePoolList.innerHTML = '';
    customTemplateFieldsList.innerHTML = '';
    renderFixedRows(customTemplateFieldsList, Array.isArray(draft.tableFixedOrder) ? draft.tableFixedOrder : defaultFixedOrder, order => { draft.tableFixedOrder = order; }, '⋮⋮');
    renderTemplateFieldRows(customTemplateFieldsList, fields, {
      rowClass: 'template-field-row custom-template-field-row',
      emptyText: '暂未选择字段，请从左侧字段池勾选。',
      onReference: onOpenFieldOptions,
      onRemove: (_, index) => onUpdateCustomFields(fields.filter((__, fieldIndex) => fieldIndex !== index)),
      onReorder: onUpdateCustomFields
    });
    renderFieldPool(customTemplatePoolList, fields, (fieldName, checked) => onUpdateCustomFields([...fields.filter(field => field !== fieldName), ...(checked ? [fieldName] : [])]));
  };

  const renderOptions = () => {
    const draft = getFieldOptionsDraft();
    if (!draft) return;
    if (fieldOptionsTitle) fieldOptionsTitle.textContent = `编辑“${draft.fieldName}”参考`;
    renderFieldOptionsEditor(fieldOptionsList, draft, {
      onInput: (index, value) => { draft.options[index] = value; },
      onRemove: index => { draft.options.splice(index, 1); renderOptions(); }
    });
  };

  const openOptions = fieldName => {
    setFieldOptionsDraft({ fieldName, options: [...getReferenceOptions(fieldName)] });
    if (fieldOptionInput) fieldOptionInput.value = '';
    renderOptions();
    fieldOptionsModal?.classList.add('show');
  };

  const closeOptions = () => {
    setFieldOptionsDraft(null);
    fieldOptionsModal?.classList.remove('show');
  };

  const renderTableDisplaySettings = () => {
    if (!tableDisplayFieldList) return;
    tableDisplayFieldList.innerHTML = '';
    getOrderedFixedColumns().forEach(column => {
      const option = documentTarget.createElement('label');
      option.className = 'table-display-option fixed';
      option.innerHTML = `<input type="checkbox" checked disabled><span>${escapeText(column.label)}</span><small>固定显示</small>`;
      tableDisplayFieldList.appendChild(option);
    });
    const selectedFields = getSelectedDisplayFields();
    getVisibleFields().forEach(field => {
      const option = documentTarget.createElement('label');
      option.className = 'table-display-option';
      const input = documentTarget.createElement('input');
      input.type = 'checkbox';
      input.checked = selectedFields.includes(field);
      input.dataset.tableDisplayField = field;
      const label = documentTarget.createElement('span');
      label.textContent = field;
      option.append(input, label);
      input.addEventListener('change', () => {
        const fields = [...tableDisplayFieldList.querySelectorAll('input[data-table-display-field]:checked')].map(item => item.dataset.tableDisplayField);
        if (fields.length > tableDisplayFieldLimit) {
          input.checked = false;
          showToast(`主页表格最多选择 ${tableDisplayFieldLimit} 个自定义字段`, 'warning');
          return;
        }
        onTemplateDisplayFieldsChanged(fields);
      });
      tableDisplayFieldList.appendChild(option);
    });
    if (!getVisibleFields().length) {
      const empty = documentTarget.createElement('div');
      empty.className = 'form-hint';
      empty.textContent = '当前模板没有可选的自定义字段。';
      tableDisplayFieldList.appendChild(empty);
    }
  };

  const syncTemplateOptions = preferredName => {
    if (!templateSelect) return;
    const selected = preferredName || getTemplateName();
    templateSelect.innerHTML = Object.keys(templates).map(name => `<option value="${escapeText(name)}">${escapeText(name)}</option>`).join('');
    setTemplateName(templates[selected] ? selected : '默认模板');
  };

  const updateTemplateMenuLabel = () => {
    if (!templateMenuLabel || !templateSelect) return;
    const selected = templateSelect.options[templateSelect.selectedIndex];
    templateMenuLabel.textContent = selected ? selected.textContent : '未选择模板';
  };

  const closeTemplateEditor = () => {
    setTemplateDraft(null);
    if (templateSelect) templateSelect.disabled = false;
    templateEditorModal?.classList.remove('show');
    renderTemplateEditor();
  };

  const openTemplateEditor = draft => {
    setTemplateDraft(draft);
    if (templateSelect) templateSelect.disabled = true;
    renderTemplateEditor();
    templateEditorModal?.classList.add('show');
  };

  const closeCustomTemplateEditor = () => {
    setCustomDraft(null);
    customTemplateModal?.classList.remove('show');
  };

  const openCustomTemplateEditor = draft => {
    setCustomDraft(draft);
    if (customTemplateNameInput) customTemplateNameInput.value = '';
    renderCustomTemplateEditor();
    customTemplateModal?.classList.add('show');
    customTemplateNameInput?.focus();
  };

  const bindInteractions = ({
    createTemplateDraft = () => null,
    createCustomDraft = () => null,
    onOpenEditor = () => {},
    onCloseEditor = () => {},
    onSaveEditor = () => true,
    onOpenCustom = () => {},
    onCloseCustom = () => {},
    onSaveCustom = () => true,
    onTemplateChange = () => {},
    onSaveFieldOptions = () => {},
    onCloseSettings = () => {},
    onOpenMenu = () => {},
    onCloseMenu = () => {},
    isMenuOpen = () => false
  } = {}) => {
    templateEditButton?.addEventListener('click', () => {
      onCloseSettings();
      openTemplateEditor(createTemplateDraft());
      onOpenEditor();
    });
    templateEditorModalClose?.addEventListener('click', () => { closeTemplateEditor(); onCloseEditor(); });
    templateEditorCancelBtn?.addEventListener('click', () => { closeTemplateEditor(); onCloseEditor(); });
    templateEditorSaveBtn?.addEventListener('click', () => {
      const draft = getTemplateDraft();
      if (draft && onSaveEditor(draft) !== false) closeTemplateEditor();
    });
    templateEditorModal?.addEventListener('click', event => {
      if (event.target === templateEditorModal) { closeTemplateEditor(); onCloseEditor(); }
    });
    customTemplateBtn?.addEventListener('click', () => {
      onCloseSettings();
      openCustomTemplateEditor(createCustomDraft());
      onOpenCustom();
    });
    customTemplateModalClose?.addEventListener('click', () => { closeCustomTemplateEditor(); onCloseCustom(); });
    customTemplateCancelBtn?.addEventListener('click', () => { closeCustomTemplateEditor(); onCloseCustom(); });
    customTemplateSaveBtn?.addEventListener('click', () => {
      const draft = getCustomDraft();
      const name = customTemplateNameInput?.value.trim() || '';
      if (draft && onSaveCustom(draft, name) !== false) closeCustomTemplateEditor();
    });
    customTemplateModal?.addEventListener('click', event => {
      if (event.target === customTemplateModal) { closeCustomTemplateEditor(); onCloseCustom(); }
    });
    templateSelect?.addEventListener('change', () => onTemplateChange(templateSelect.value));
    fieldOptionAddBtn?.addEventListener('click', () => {
      const draft = getFieldOptionsDraft();
      const value = fieldOptionInput?.value.trim() || '';
      if (!draft || !value) return;
      if (draft.options.includes(value)) {
        showToast('参考选项已存在', 'warning');
        return;
      }
      draft.options.push(value);
      if (fieldOptionInput) fieldOptionInput.value = '';
      renderOptions();
      fieldOptionInput?.focus();
    });
    fieldOptionInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') fieldOptionAddBtn?.click();
    });
    fieldOptionsSaveBtn?.addEventListener('click', () => {
      const draft = getFieldOptionsDraft();
      if (!draft) return;
      onSaveFieldOptions(draft);
      closeOptions();
    });
    fieldOptionsCancelBtn?.addEventListener('click', closeOptions);
    fieldOptionsModalClose?.addEventListener('click', closeOptions);
    fieldOptionsModal?.addEventListener('click', event => {
      if (event.target === fieldOptionsModal) closeOptions();
    });
    documentTarget?.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (fieldOptionsModal?.classList.contains('show')) closeOptions();
      if (templateEditorModal?.classList.contains('show')) { closeTemplateEditor(); onCloseEditor(); }
      if (customTemplateModal?.classList.contains('show')) { closeCustomTemplateEditor(); onCloseCustom(); }
      if (isMenuOpen()) onCloseMenu();
    });
    templateMenuBtn?.addEventListener('click', event => {
      event.stopPropagation();
      if (isMenuOpen()) onCloseMenu(); else onOpenMenu();
    });
    templateMenu?.addEventListener('click', event => event.stopPropagation());
    documentTarget?.addEventListener('click', event => {
      if (isMenuOpen() && !templateMenuBtn?.contains(event.target) && !templateMenu?.contains(event.target)) onCloseMenu();
    });
  };

  return {
    renderTemplateEditor,
    renderCustomTemplateEditor,
    renderFieldOptions: renderOptions,
    openFieldOptions: openOptions,
    closeFieldOptions: closeOptions,
    renderTableDisplaySettings,
    syncTemplateOptions,
    updateTemplateMenuLabel,
    closeTemplateEditor,
    openTemplateEditor,
    closeCustomTemplateEditor,
    openCustomTemplateEditor,
    bindInteractions
  };
}
