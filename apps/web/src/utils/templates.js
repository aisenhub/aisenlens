export function normalizeFieldNames(fields, limit) {
  if (!Array.isArray(fields)) return [];
  const seen = new Set();
  return fields.map(field => String(field || '').trim()).filter(field => {
    if (!field || seen.has(field)) return false;
    seen.add(field);
    return true;
  }).slice(0, limit);
}

export function normalizeTemplateFields(fields) {
  return normalizeFieldNames(fields, 40);
}

export function normalizeFieldPool(fields) {
  return normalizeFieldNames(fields, 120);
}

export function normalizeReferenceOptions(options) {
  if (!Array.isArray(options)) return [];
  const seen = new Set();
  return options.map(option => String(option || '').trim()).filter(option => {
    if (!option || seen.has(option)) return false;
    seen.add(option);
    return true;
  }).slice(0, 80);
}

export function getTemplateEntryValue(entry, fieldName) {
  if (!entry) return '';
  if (fieldName === '景别') return entry.shotSize || '';
  if (fieldName === '运镜') return entry.cameraMove || '';
  if (fieldName === '镜头分析') return entry.analysis || '';
  return entry.custom && entry.custom[fieldName] || '';
}
