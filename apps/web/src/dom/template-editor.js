export function renderCategorizedFieldPool(container, categories, selectedFields, {
  onToggle = () => {},
  onReference = () => {},
  onAddField = () => {},
  labels = { reference: '参考字段', user: '用户字段' }
} = {}) {
  if (!container) return;
  container.innerHTML = '';
  const selected = new Set(selectedFields || []);
  categories.forEach(category => {
    const section = document.createElement('section');
    section.className = 'template-pool-category';
    section.dataset.category = category.key;

    const title = document.createElement('div');
    title.className = 'template-pool-category-title';
    const titleText = document.createElement('span');
    titleText.textContent = labels[category.key] || category.key;
    const count = document.createElement('small');
    count.textContent = `${category.fields.length} 项`;
    const titleActions = document.createElement('div');
    titleActions.className = 'template-pool-category-actions';
    if (category.key === 'user') {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'template-pool-category-add';
      addButton.textContent = '+';
      addButton.title = `添加字段到${titleText.textContent}`;
      addButton.setAttribute('aria-label', addButton.title);
      addButton.addEventListener('click', () => onAddField(category));
      titleActions.appendChild(addButton);
    }
    titleActions.prepend(count);
    title.appendChild(titleText);
    title.appendChild(titleActions);

    const options = document.createElement('div');
    options.className = 'template-pool-category-options';
    category.fields.forEach(fieldName => {
      const option = document.createElement('div');
      option.className = 'template-pool-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(fieldName);
      checkbox.setAttribute('aria-label', fieldName);
      const label = document.createElement('span');
      label.textContent = fieldName;
      label.title = fieldName;
      const referenceButton = document.createElement('button');
      referenceButton.type = 'button';
      referenceButton.textContent = '参考';
      referenceButton.title = `编辑“${fieldName}”的参考选项`;
      referenceButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        onReference(fieldName);
      });
      checkbox.addEventListener('change', () => onToggle(fieldName, checkbox.checked));
      option.appendChild(checkbox);
      option.appendChild(label);
      option.appendChild(referenceButton);
      options.appendChild(option);
    });
    section.appendChild(title);
    section.appendChild(options);
    container.appendChild(section);
  });
}

export function renderTemplateFieldRows(container, fields, {
  rowClass = 'template-field-row',
  emptyText = '暂无字段，可在下方添加。',
  onReference = () => {},
  onRemove = () => {},
  onReorder = () => {}
} = {}) {
  if (!container) return;
  if (!fields.length) {
    const empty = document.createElement('div');
    empty.className = 'form-hint';
    empty.textContent = emptyText;
    container.appendChild(empty);
  }
  let draggedIndex = null;
  fields.forEach((fieldName, index) => {
    const row = document.createElement('div');
    row.className = rowClass;
    row.draggable = true;
    row.dataset.index = String(index);
    const drag = document.createElement('span');
    drag.className = 'template-field-drag';
    drag.title = '拖动排序';
    drag.textContent = '☷';
    const label = document.createElement('span');
    label.className = 'template-fixed-label';
    label.textContent = fieldName;
    label.title = fieldName;
    const referenceButton = document.createElement('button');
    referenceButton.type = 'button';
    referenceButton.className = 'template-reference-btn';
    referenceButton.textContent = '参考';
    referenceButton.title = `编辑“${fieldName}”的参考选项`;
    referenceButton.addEventListener('click', event => {
      event.stopPropagation();
      onReference(fieldName);
    });
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'template-remove-field';
    removeButton.textContent = '移除';
    removeButton.addEventListener('click', event => {
      event.stopPropagation();
      onRemove(fieldName, index);
    });
    row.appendChild(drag);
    row.appendChild(label);
    row.appendChild(referenceButton);
    row.appendChild(removeButton);
    row.addEventListener('dragstart', event => {
      draggedIndex = index;
      row.classList.add('dragging');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      draggedIndex = null;
      row.classList.remove('dragging');
      container.querySelectorAll('.drag-over').forEach(item => item.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', event => {
      event.preventDefault();
      if (draggedIndex !== null && draggedIndex !== index) row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', event => {
      event.preventDefault();
      row.classList.remove('drag-over');
      if (draggedIndex === null || draggedIndex === index) return;
      const nextFields = [...fields];
      const [moved] = nextFields.splice(draggedIndex, 1);
      nextFields.splice(index, 0, moved);
      onReorder(nextFields);
    });
    container.appendChild(row);
  });
}

export function renderFieldOptionsEditor(container, draft, { onInput = () => {}, onRemove = () => {} } = {}) {
  if (!container || !draft) return;
  container.innerHTML = '';
  draft.options.forEach((option, index) => {
    const row = document.createElement('div');
    row.className = 'field-option-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 40;
    input.value = option;
    input.addEventListener('input', () => onInput(index, input.value));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '删除';
    remove.addEventListener('click', () => onRemove(index));
    row.appendChild(input);
    row.appendChild(remove);
    container.appendChild(row);
  });
}
