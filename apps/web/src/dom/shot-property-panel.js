export function createShotPropertyPanel({
  elements = {},
  getEntries = () => [],
  getActiveShotNumber = () => null,
  getConfiguredFields = () => [],
  getShotGroups = () => [],
  getSelectedShotIds = () => new Set(),
  onUpdate = () => {},
  onBatchUpdate = null,
  onOpenEditor = () => {},
  documentTarget = document
} = {}) {
  const { panel, empty, title, fields, customFields, groupHint, editorButton } = elements;
  const inputs = [...(fields || [])];
  const drafts = new Map();
  let renderedShotId = null;
  const getActive = () => (getEntries() || []).find(entry => Number(entry.shotNumber) === Number(getActiveShotNumber()));
  const getEntryValues = active => Object.fromEntries(inputs.map(input => {
    const field = input.dataset.propertyField;
    if (field === 'duration') return [field, active.durationSec ?? active.duration ?? ''];
    return [field, field === 'timecode' ? (active.timecode || '') : (active[field] ?? '')];
  }));
  const getActiveGroup = active => (getShotGroups?.() || []).find(group => (group.shotIds || []).includes(active?.shotId));
  const getSelection = active => {
    const ids = new Set(getSelectedShotIds?.() || []);
    const selected = (getEntries() || []).filter(entry => ids.has(entry.shotId));
    return selected.length > 1 ? selected : (active ? [active] : []);
  };
  const renderCustomFields = active => {
    if (!customFields) return;
    customFields.replaceChildren();
    const fixed = new Set(['镜号', '时长', '画面截图', '景别', '运镜', '镜头分析']);
    (getConfiguredFields?.() || []).filter(field => !fixed.has(field)).forEach(field => {
      const label = documentTarget.createElement('label');
      label.textContent = field;
      const input = documentTarget.createElement('input');
      input.dataset.propertyField = `custom:${field}`;
      input.value = active?.custom?.[field] || '';
      input.addEventListener('input', () => {
        if (!active) return;
        const draft = drafts.get(active.shotId) || {};
        draft[`custom:${field}`] = input.value;
        drafts.set(active.shotId, draft);
      });
      input.addEventListener('change', () => commit(getActive()).then(render));
      input.addEventListener('blur', () => commit(getActive()).then(render));
      input.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); drafts.delete(active?.shotId); render(); }
        if (event.key === 'Enter') { event.preventDefault(); commit(getActive()).then(render); }
      });
      label.appendChild(input);
      customFields.appendChild(label);
    });
  };
  const commit = async active => {
    if (!active) return;
    const draft = drafts.get(active.shotId);
    if (!draft) return;
    const original = getEntryValues(active);
    drafts.delete(active.shotId);
    const selectedIds = new Set(getSelectedShotIds?.() || []);
    if (selectedIds.size > 1 && onBatchUpdate) {
      await onBatchUpdate([...selectedIds], draft);
      return;
    }
    for (const [field, value] of Object.entries(draft)) {
      if (field.startsWith('custom:')) {
        const name = field.slice(7);
        if (value !== active.custom?.[name]) await onUpdate(active, 'custom', { ...(active.custom || {}), [name]: value });
      } else if (value !== original[field]) await onUpdate(active, field, value);
    }
  };
  const render = () => {
    const active = getActive();
    if (!panel) return;
    panel.hidden = false;
    const activeShotId = active?.shotId || null;
    if (activeShotId !== renderedShotId) drafts.clear();
    renderedShotId = activeShotId;
    if (!active) {
      if (empty) empty.hidden = false;
      drafts.clear();
      editorButton?.toggleAttribute('disabled', true);
      return;
    }
    const selection = getSelection(active);
    const multiSelect = selection.length > 1;
    if (empty) empty.hidden = true;
    if (title) title.textContent = multiSelect ? `已选择 ${selection.length} 个分镜` : `分镜 ${active.shotNumber}`;
    const activeValues = getEntryValues(active);
    const values = Object.fromEntries(Object.keys(activeValues).map(field => {
      const fieldValues = selection.map(entry => getEntryValues(entry)[field]);
      return [field, fieldValues.every(value => value === fieldValues[0]) ? fieldValues[0] : ''];
    }));
    Object.assign(values, drafts.get(active.shotId) || {});
    inputs.forEach(input => {
      const field = input.dataset.propertyField;
      input.value = values[field] || '';
      input.placeholder = multiSelect && values[field] === '' ? '多选值不一致，输入后批量设置' : '';
      input.dataset.mixed = multiSelect && values[field] === '' ? 'true' : 'false';
    });
    editorButton?.toggleAttribute('disabled', !active);
    editorButton?.setAttribute('aria-label', `打开分镜 ${active.shotNumber} 详细编辑器`);
    if (editorButton) editorButton.onclick = () => onOpenEditor(active);
    renderCustomFields(active);
    if (groupHint) {
      const group = getActiveGroup(active);
      groupHint.textContent = group ? `${group.title || '未命名镜头组'} · ${group.summary || '暂无概括分析'}` : '未加入镜头组';
    }
  };
  const bind = () => {
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        const active = getActive();
        if (!active) return;
        const draft = drafts.get(active.shotId) || {};
        draft[input.dataset.propertyField] = input.value;
        drafts.set(active.shotId, draft);
      });
      input.addEventListener('change', () => commit(getActive()).then(render));
      input.addEventListener('blur', () => commit(getActive()).then(render));
      input.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.preventDefault();
          drafts.delete(getActive()?.shotId);
          render();
        } else if (event.key === 'Enter' && (input.tagName !== 'TEXTAREA' || event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          commit(getActive()).then(render);
        }
      });
    });
    render();
  };
  return { bind, render };
}
