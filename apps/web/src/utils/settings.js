export const TABLE_DISPLAY_FIELD_LIMIT = 6;

export const DEFAULT_APP_SETTINGS = {
  template: '默认模板',
  exportFormat: 'xlsx',
  exportFileName: '拉片',
  exportTitle: '拉片表格',
  tableFixedOrder: ['duration', 'image'],
  tableDisplayFields: null,
  autoShotDiff: 28,
  autoShotMinGap: 0.35,
  recordingFormat: 'mp4',
  recordingQuality: 'medium',
  recordingFrameRate: 30
};

export function normalizeRecordingFrameRate(value) {
  const frameRate = Number(value);
  return frameRate === 24 || frameRate === 30 || frameRate === 60
    ? frameRate
    : DEFAULT_APP_SETTINGS.recordingFrameRate;
}

export function normalizeExportFileName(name) {
  const normalized = String(name || '')
    .replace(/\.(?:xlsx|html?|pdf)$/i, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || DEFAULT_APP_SETTINGS.exportFileName;
}

export function normalizeExportTitle(title) {
  return String(title || '').replace(/[<>]/g, '').trim().slice(0, 80) || DEFAULT_APP_SETTINGS.exportTitle;
}

export function normalizeAppSettings(settings = {}) {
  const stored = settings && typeof settings === 'object' ? settings : {};
  const autoShotDiff = Number(stored.autoShotDiff);
  const autoShotMinGap = Number(stored.autoShotMinGap);
  const tableFixedOrder = Array.isArray(stored.tableFixedOrder)
    ? stored.tableFixedOrder.filter(key => key === 'duration' || key === 'image')
    : DEFAULT_APP_SETTINGS.tableFixedOrder;
  const tableDisplayFields = Array.isArray(stored.tableDisplayFields)
    ? [...new Set(stored.tableDisplayFields.map(field => String(field).trim()).filter(Boolean))].slice(0, TABLE_DISPLAY_FIELD_LIMIT)
    : DEFAULT_APP_SETTINGS.tableDisplayFields;

  return {
    template: stored.template || DEFAULT_APP_SETTINGS.template,
    exportFormat: stored.exportFormat === 'html' || stored.exportFormat === 'pdf' ? stored.exportFormat : DEFAULT_APP_SETTINGS.exportFormat,
    exportFileName: normalizeExportFileName(stored.exportFileName || DEFAULT_APP_SETTINGS.exportFileName),
    exportTitle: normalizeExportTitle(stored.exportTitle || DEFAULT_APP_SETTINGS.exportTitle),
    tableFixedOrder: [...new Set([...tableFixedOrder, ...DEFAULT_APP_SETTINGS.tableFixedOrder])],
    tableDisplayFields,
    autoShotDiff: Number.isFinite(autoShotDiff) ? Math.min(80, Math.max(10, autoShotDiff)) : DEFAULT_APP_SETTINGS.autoShotDiff,
    autoShotMinGap: Number.isFinite(autoShotMinGap) ? Math.min(10, Math.max(0.2, autoShotMinGap)) : DEFAULT_APP_SETTINGS.autoShotMinGap,
    recordingFormat: stored.recordingFormat === 'mp4' || stored.recordingFormat === 'webm' ? stored.recordingFormat : DEFAULT_APP_SETTINGS.recordingFormat,
    recordingQuality: stored.recordingQuality === 'low' || stored.recordingQuality === 'medium' || stored.recordingQuality === 'high' ? stored.recordingQuality : DEFAULT_APP_SETTINGS.recordingQuality,
    recordingFrameRate: normalizeRecordingFrameRate(stored.recordingFrameRate)
  };
}
