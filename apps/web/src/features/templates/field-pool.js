import {
  DEFAULT_FIELD_REFERENCE_OPTIONS,
  FIELD_POOL_ORDER,
  FIELD_POOL_REFERENCE_SET,
  FIELD_POOL_VERSION
} from '../../utils/template-config.js';
import { normalizeFieldPool, normalizeReferenceOptions, normalizeTemplateFields } from '../../utils/templates.js';

function getStoredProperties(stored) {
  return stored && typeof stored.properties === 'object' && stored.properties
    ? stored.properties
    : {};
}

export function createFieldPoolState(stored = {}, {
  fixedFields = [],
  referenceFields = FIELD_POOL_ORDER,
  referenceSet = FIELD_POOL_REFERENCE_SET,
  defaultReferenceOptions = DEFAULT_FIELD_REFERENCE_OPTIONS
} = {}) {
  const fixedFieldSet = new Set(fixedFields);
  const referenceFieldList = [...referenceFields];
  const storedUserFields = Array.isArray(stored.userFields) ? stored.userFields : [];
  const userFields = normalizeFieldPool(storedUserFields).filter(fieldName => (
    !referenceSet.has(fieldName) && !fixedFieldSet.has(fieldName)
  ));
  const fields = [...referenceFieldList, ...userFields];
  const storedProperties = getStoredProperties(stored);
  const properties = {};
  fields.forEach(fieldName => {
    if (Object.hasOwn(storedProperties, fieldName)) {
      properties[fieldName] = normalizeReferenceOptions(storedProperties[fieldName]);
    }
  });

  return {
    version: FIELD_POOL_VERSION,
    fields,
    userFields,
    properties,
    fixedFields: [...fixedFieldSet],
    referenceFields: referenceFieldList,
    referenceSet,
    defaultReferenceOptions
  };
}

export function serializeFieldPoolState(state) {
  const properties = {};
  state.fields.forEach(fieldName => {
    if (Object.hasOwn(state.properties, fieldName)) {
      properties[fieldName] = normalizeReferenceOptions(state.properties[fieldName]);
    }
  });
  return {
    version: state.version || FIELD_POOL_VERSION,
    userFields: [...state.userFields],
    properties
  };
}

export function addFieldToPool(state, fieldName) {
  const name = String(fieldName || '').trim();
  if (!name || state.fields.includes(name) || state.referenceSet.has(name) || state.fixedFields.includes(name)) {
    return { state, added: false };
  }
  const userFields = [...state.userFields, name];
  return {
    state: { ...state, userFields, fields: [...state.referenceFields, ...userFields] },
    added: true
  };
}

export function setFieldReferenceOptions(state, fieldName, options) {
  const name = String(fieldName || '').trim();
  if (!name || !state.fields.includes(name)) return state;
  return {
    ...state,
    properties: {
      ...state.properties,
      [name]: normalizeReferenceOptions(options)
    }
  };
}

export function getFieldReferenceOptions(state, fieldName) {
  const name = String(fieldName || '').trim();
  const options = Object.hasOwn(state.properties, name)
    ? state.properties[name]
    : state.defaultReferenceOptions[name];
  return normalizeReferenceOptions(options || []);
}

export function getCategorizedFieldPool(state) {
  return [
    { key: 'reference', fields: [...state.referenceFields] },
    { key: 'user', fields: [...state.userFields] }
  ];
}

export function normalizeTemplateFieldsForPool(fields, state) {
  const allowedFields = new Set([...state.fixedFields, ...state.fields]);
  return normalizeTemplateFields(fields).filter(fieldName => allowedFields.has(fieldName));
}

export function hasFieldPoolChanged(stored, state) {
  return stored?.version !== state.version
    || JSON.stringify(stored?.userFields || []) !== JSON.stringify(state.userFields);
}
