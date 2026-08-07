import { normalizeTemplateFields } from '../../utils/templates.js';

export function createTemplateEditorDraft(sourceName, fields, tableFixedOrder = []) {
  return {
    sourceName: String(sourceName || '默认模板'),
    fields: normalizeTemplateFields(fields),
    tableFixedOrder: [...tableFixedOrder]
  };
}

export function createCustomTemplateDraft(tableFixedOrder = []) {
  return { fields: [], tableFixedOrder: [...tableFixedOrder] };
}

export function buildTemplateDefinition(fields) {
  const normalizedFields = normalizeTemplateFields(fields);
  return { fields: normalizedFields, suggestions: [...normalizedFields], custom: true };
}
