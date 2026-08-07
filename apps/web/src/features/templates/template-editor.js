import { normalizeTemplateFields } from '../../utils/templates.js';

export function getEditableTemplateFields(fields, fixedFields = []) {
  const fixedFieldSet = new Set(fixedFields);
  return normalizeTemplateFields(fields).filter(fieldName => !fixedFieldSet.has(fieldName));
}

export function updateTemplateFields(fields, fixedFields = []) {
  const nextFields = getEditableTemplateFields(fields, fixedFields);
  return {
    fields: nextFields,
    suggestions: [...nextFields]
  };
}

export function reorderTemplateFields(fields, fromIndex, toIndex) {
  const nextFields = [...fields];
  if (
    !Number.isInteger(fromIndex)
    || !Number.isInteger(toIndex)
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= nextFields.length
    || toIndex >= nextFields.length
    || fromIndex === toIndex
  ) return nextFields;
  const [movedField] = nextFields.splice(fromIndex, 1);
  nextFields.splice(toIndex, 0, movedField);
  return nextFields;
}

export function toggleTemplateField(fields, fieldName, selected, fixedFields = []) {
  const currentFields = getEditableTemplateFields(fields, fixedFields);
  const name = String(fieldName || '').trim();
  const nextFields = selected
    ? [...currentFields, name]
    : currentFields.filter(field => field !== name);
  return getEditableTemplateFields(nextFields, fixedFields);
}
