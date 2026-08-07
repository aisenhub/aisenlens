export function createShotTableCellValue({
  getThumbnail = () => '',
  getTemplateValue = () => ''
} = {}) {
  return (entry, column) => {
    if (column.key === 'shotNumber') return entry.shotNumber || '';
    if (column.key === 'duration') return entry.durationText || '';
    if (column.key === 'image') return getThumbnail(entry);
    return getTemplateValue(entry, column.field);
  };
}
