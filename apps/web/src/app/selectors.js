import { normalizeTemplateFields } from '../utils/templates.js';

export function getSelectedTemplate(templates = {}, selectedName = '', fallbackName = '') {
  return templates[selectedName] || templates[fallbackName] || null;
}

export function getConfiguredTemplateFields(templates = {}, selectedName = '', fallbackName = '') {
  const template = getSelectedTemplate(templates, selectedName, fallbackName);
  return template ? normalizeTemplateFields(template.fields) : [];
}

export function getVisibleTableFields(templateFields = [], fixedColumns = []) {
  const fixedNames = new Set(fixedColumns.map(column => column.label));
  return templateFields.filter(field => !fixedNames.has(field));
}

export function getOrderedFixedTableColumns(fixedColumns = []) {
  return fixedColumns.map(column => ({ ...column }));
}

export function getSelectedTableDisplayFields(availableFields = [], savedFields, limit = 6) {
  if (!Array.isArray(savedFields)) return availableFields.slice(0, limit);
  return availableFields.filter(field => savedFields.includes(field)).slice(0, limit);
}
