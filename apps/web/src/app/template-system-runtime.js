import { createTemplateStorage } from '../features/templates/template-storage.js';
import { createTemplatePoolController } from './template-pool.js';
import { createShotTableConfigController } from './shot-table-config.js';
import { createTemplateWorkflow } from './template-workflow.js';

export function createTemplateSystemRuntime({
  templates = {},
  fixedFields = [],
  fixedColumns = [],
  defaultTemplateName = '',
  defaultFixedOrder = [],
  tableDisplayFieldLimit = 8,
  templateStorageKey,
  fieldPoolStorageKey,
  fieldPoolVersion,
  fieldPoolOrder,
  ignoredTemplateNames = [],
  onStorageError,
  readStorage,
  writeStorage,
  getSettings,
  saveSettings,
  getTemplateName,
  setTemplateName,
  getSelectedTemplate,
  getConfiguredFields,
  getTemplateDraft,
  setTemplateDraft,
  getCustomDraft,
  setCustomDraft,
  getFieldOptionsDraft,
  setFieldOptionsDraft,
  getEditorFields,
  getVisibleFields,
  getSelectedDisplayFields,
  getOrderedFixedColumns,
  getCategories,
  getReferenceOptions,
  setCustomFieldNames,
  addFieldToPool,
  escapeText,
  updateEditorFields,
  updateCustomFields,
  openFieldOptions,
  renderTableDisplaySettings,
  renderTemplateEditor,
  renderCustomTemplateEditor,
  updateTemplateMenuLabel,
  renderShots,
  refreshTable,
  markDirty,
  syncTemplateOptions,
  showToast,
  updateReferenceOptions,
  syncStorageState
} = {}) {
  const templateStorage = createTemplateStorage({
    templates,
    readStorage,
    writeStorage,
    templateStorageKey,
    fieldPoolStorageKey,
    fieldPoolVersion,
    fieldPoolOrder,
    fixedFields,
    ignoredTemplateNames,
    onStorageError
  });
  const templatePoolController = createTemplatePoolController({ storage: templateStorage });
  templatePoolController.loadDefinitions();
  templatePoolController.loadFields();

  const shotTableConfig = createShotTableConfigController({
    getConfiguredFields,
    fixedColumns,
    getSettings,
    saveSettings,
    displayFieldLimit: tableDisplayFieldLimit
  });

  const templateWorkflowController = createTemplateWorkflow({
    templates,
    defaultTemplateName,
    fixedFields: fixedColumns.map(column => column.label),
    getTemplateName,
    setTemplateName,
    getConfiguredFields,
    getSelectedTemplate,
    getEditorDraft: getTemplateDraft,
    getCustomDraft,
    saveDefinitions: templatePoolController.saveDefinitions,
    setCustomFieldNames,
    updateMenuLabel: updateTemplateMenuLabel,
    renderEditor: renderTemplateEditor,
    renderCustomEditor: renderCustomTemplateEditor,
    renderShots,
    refreshTable,
    markDirty,
    getSettings,
    saveSettings,
    syncTemplateOptions,
    showToast,
    updateReferenceOptions: templatePoolController.updateReferenceOptions,
    syncStorageState: templatePoolController.sync
  });

  return {
    templateStorage,
    templatePoolController,
    shotTableConfig,
    templateWorkflowController,
    syncTemplateStorageState: templatePoolController.sync,
    loadTemplateDefinitions: templatePoolController.loadDefinitions,
    saveTemplateDefinitions: templatePoolController.saveDefinitions,
    loadFieldPool: templatePoolController.loadFields,
    ensureFieldInPool: templatePoolController.addField,
    getFieldReferenceOptions: templatePoolController.getReferenceOptions,
    getCategorizedFieldPool: templatePoolController.getCategories,
    getVisibleTableFields: shotTableConfig.getVisibleFields,
    getSelectedTableDisplayFields: shotTableConfig.getSelectedFields,
    getShotTableColumns: shotTableConfig.getColumns,
    getHomepageShotTableColumns: shotTableConfig.getHomepageColumns,
    getOrderedFixedColumns: shotTableConfig.getOrderedColumns,
    applyTemplate: templateWorkflowController.applyTemplate,
    updateSelectedTemplateFields: (fields, shouldRender) => {
      templateWorkflowController.updateSelectedTemplateFields(fields, shouldRender);
    },
    saveTemplateEditorDraft: templateWorkflowController.saveTemplateEditorDraft,
    saveCustomTemplateDraft: templateWorkflowController.saveCustomTemplateDraft,
    handleTemplateChange: templateWorkflowController.handleTemplateChange,
    saveFieldOptions: templateWorkflowController.saveFieldOptions,
    getTemplateEditorFields: templateWorkflowController.getEditorFields,
    updateCustomTemplateDraftFields: templateWorkflowController.updateCustomDraftFields
  };
}
