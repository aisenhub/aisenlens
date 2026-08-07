import { normalizeTemplateFields } from '../../utils/templates.js';
import {
  addFieldToPool,
  createFieldPoolState,
  getCategorizedFieldPool,
  getFieldReferenceOptions,
  hasFieldPoolChanged,
  normalizeTemplateFieldsForPool,
  serializeFieldPoolState,
  setFieldReferenceOptions
} from './field-pool.js';

const defaultReadStorage = () => ({});
const defaultWriteStorage = () => {};

export function loadTemplateDefinitions(
  templates,
  { readStorage = defaultReadStorage, storageKey = '', ignoredTemplateNames = [] } = {}
) {
  const stored = readStorage(storageKey) || {};
  if (!templates || typeof templates !== 'object' || typeof stored !== 'object') return templates;
  const ignoredNames = new Set(ignoredTemplateNames);
  Object.keys(templates).forEach(name => {
    if (Array.isArray(stored[name])) templates[name].fields = normalizeTemplateFields(stored[name]);
    templates[name].suggestions = [...normalizeTemplateFields(templates[name].fields)];
  });
  Object.keys(stored).forEach(name => {
    if (!templates[name] && !ignoredNames.has(name) && Array.isArray(stored[name]) && name.trim()) {
      const fields = normalizeTemplateFields(stored[name]);
      templates[name] = { fields, suggestions: [...fields], custom: true };
    }
  });
  return templates;
}

export function saveTemplateDefinitions(
  templates,
  { writeStorage = defaultWriteStorage, storageKey = '', onStorageError = () => {} } = {}
) {
  const definitions = {};
  Object.entries(templates || {}).forEach(([name, template]) => {
    definitions[name] = normalizeTemplateFields(template.fields);
  });
  writeStorage(storageKey, definitions, onStorageError);
  return definitions;
}

export function createTemplateStorage({
  templates = {},
  readStorage = defaultReadStorage,
  writeStorage = defaultWriteStorage,
  templateStorageKey = '',
  fieldPoolStorageKey = '',
  fixedFields = [],
  ignoredTemplateNames = [],
  onStorageError = () => {}
} = {}) {
  let fieldPoolState = null;

  function loadDefinitions() {
    return loadTemplateDefinitions(templates, {
      readStorage,
      storageKey: templateStorageKey,
      ignoredTemplateNames
    });
  }

  function saveDefinitions() {
    return saveTemplateDefinitions(templates, {
      writeStorage,
      storageKey: templateStorageKey,
      onStorageError
    });
  }

  function saveFields() {
    if (!fieldPoolState) return null;
    const serialized = serializeFieldPoolState(fieldPoolState);
    writeStorage(fieldPoolStorageKey, serialized, onStorageError);
    return serialized;
  }

  function loadFields() {
    const stored = readStorage(fieldPoolStorageKey) || {};
    fieldPoolState = createFieldPoolState(stored, { fixedFields });
    const templateFieldOrder = [...fixedFields, ...fieldPoolState.fields];
    const fieldOrder = new Set(templateFieldOrder);
    let templatesChanged = false;
    Object.values(templates).forEach(template => {
      const nextFields = normalizeTemplateFieldsForPool(template.fields || [], fieldPoolState)
        .filter(fieldName => fieldOrder.has(fieldName));
      if (JSON.stringify(template.fields || []) !== JSON.stringify(nextFields)) templatesChanged = true;
      template.fields = nextFields;
      template.suggestions = [...nextFields];
    });
    if (templatesChanged) saveDefinitions();
    if (hasFieldPoolChanged(stored, fieldPoolState)) saveFields();
    return getState();
  }

  function addField(fieldName) {
    if (!fieldPoolState) return false;
    const result = addFieldToPool(fieldPoolState, fieldName);
    if (!result.added) return false;
    fieldPoolState = result.state;
    saveFields();
    return true;
  }

  function updateReferenceOptions(fieldName, options) {
    if (!fieldPoolState) return false;
    fieldPoolState = setFieldReferenceOptions(fieldPoolState, fieldName, options);
    saveFields();
    return true;
  }

  function getState() {
    return fieldPoolState
      ? {
        ...fieldPoolState,
        fields: [...fieldPoolState.fields],
        userFields: [...fieldPoolState.userFields],
        properties: { ...fieldPoolState.properties }
      }
      : { fields: [], userFields: [], properties: {} };
  }

  return {
    loadDefinitions,
    saveDefinitions,
    loadFields,
    saveFields,
    addField,
    updateReferenceOptions,
    getReferenceOptions: fieldName => getFieldReferenceOptions(fieldPoolState, fieldName),
    getCategories: () => getCategorizedFieldPool(fieldPoolState),
    getState
  };
}
