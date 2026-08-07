import { getEditableTemplateFields, updateTemplateFields } from '../features/templates/template-editor.js';
import { buildTemplateDefinition } from '../features/templates/template-service.js';
import { normalizeTemplateFields } from '../utils/templates.js';

export function createTemplateWorkflow({
  templates = {},
  defaultTemplateName = '默认模板',
  fixedFields = [],
  getTemplateName = () => '',
  setTemplateName = () => {},
  getConfiguredFields = () => [],
  getSelectedTemplate = () => null,
  getEditorDraft = () => null,
  getCustomDraft = () => null,
  saveDefinitions = () => {},
  setCustomFieldNames = () => {},
  updateMenuLabel = () => {},
  renderEditor = () => {},
  renderCustomEditor = () => {},
  renderShots = () => {},
  refreshTable = () => {},
  markDirty = () => {},
  getSettings = () => ({}),
  saveSettings = () => {},
  syncTemplateOptions = () => {},
  showToast = () => {},
  updateReferenceOptions = () => {},
  syncStorageState = () => {}
} = {}) {
  const applyTemplate = name => {
    const templateName = templates[name] ? name : defaultTemplateName;
    if (getTemplateName() !== templateName) setTemplateName(templateName);
    updateMenuLabel();
    setCustomFieldNames(getConfiguredFields());
    renderEditor();
    renderShots();
    refreshTable();
  };

  const updateSelectedTemplateFields = (fields, shouldRender = true) => {
    const nextFields = updateTemplateFields(fields, fixedFields).fields;
    const draft = getEditorDraft();
    if (draft) {
      draft.fields = nextFields;
      if (shouldRender) renderEditor();
      return;
    }
    const template = getSelectedTemplate();
    if (!template) return;
    template.fields = nextFields;
    template.suggestions = [...template.fields];
    setCustomFieldNames([...template.fields]);
    saveDefinitions();
    if (shouldRender) {
      renderEditor();
      renderShots();
    }
    markDirty();
  };

  const saveTemplateEditorDraft = (draft = null) => {
    if (!draft) return false;
    const template = templates[draft.sourceName];
    if (!template) {
      showToast('当前未使用模板，请先选择模板', 'warning');
      return false;
    }
    const updatedTemplate = updateTemplateFields(draft.fields, fixedFields);
    template.fields = updatedTemplate.fields;
    template.suggestions = updatedTemplate.suggestions;
    saveDefinitions();
    setCustomFieldNames([...template.fields]);
    applyTemplate(draft.sourceName);
    saveSettings({ ...getSettings(), template: draft.sourceName, tableFixedOrder: draft.tableFixedOrder });
    refreshTable();
    markDirty();
    showToast('模板字段已保存', 'success');
    return true;
  };

  const saveCustomTemplateDraft = (draft = null, name = '') => {
    if (!draft) return false;
    const fields = getEditableTemplateFields(draft.fields, fixedFields);
    if (!name) {
      showToast('请输入模板名称', 'warning');
      return false;
    }
    if (templates[name]) {
      showToast('模板名称已存在，请换一个名称', 'warning');
      return false;
    }
    if (!fields.length) {
      showToast('请至少选择一个字段', 'warning');
      return false;
    }
    templates[name] = buildTemplateDefinition(fields);
    saveDefinitions();
    syncTemplateOptions(name);
    saveSettings({ ...getSettings(), template: name, tableFixedOrder: draft.tableFixedOrder });
    applyTemplate(name);
    refreshTable();
    markDirty();
    showToast('自定义模板已创建', 'success');
    return true;
  };

  const handleTemplateChange = name => {
    applyTemplate(name);
    saveSettings({ ...getSettings(), template: name });
    updateMenuLabel();
    markDirty();
  };

  const saveFieldOptions = draft => {
    updateReferenceOptions(draft.fieldName, draft.options);
    syncStorageState();
    renderShots();
    renderEditor();
    renderCustomEditor();
  };

  const getEditorFields = () => {
    const draft = getEditorDraft();
    const fields = draft ? normalizeTemplateFields(draft.fields) : getConfiguredFields();
    return getEditableTemplateFields(fields, fixedFields);
  };

  const updateCustomDraftFields = (fields, shouldRender = true) => {
    const draft = getCustomDraft();
    if (!draft) return;
    draft.fields = updateTemplateFields(fields, fixedFields).fields;
    if (shouldRender) renderCustomEditor();
  };

  return {
    applyTemplate,
    updateSelectedTemplateFields,
    saveTemplateEditorDraft,
    saveCustomTemplateDraft,
    handleTemplateChange,
    saveFieldOptions,
    getEditorFields,
    updateCustomDraftFields
  };
}
