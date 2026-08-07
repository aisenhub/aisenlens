export function sortExportEntries(entries = []) {
  return [...entries].sort((first, second) => (Number(first.shotNumber) || 0) - (Number(second.shotNumber) || 0));
}

export function buildShotGroupExportRows(groups = [], entries = [], {
  getMembers,
  formatTime
} = {}) {
  if (typeof getMembers !== 'function' || typeof formatTime !== 'function') return [];
  return groups.map(group => {
    const members = getMembers(group, entries);
    if (members.length < 2) return null;
    const first = members[0];
    const last = members[members.length - 1];
    const endTime = (Number(last.time) || 0) + (Number(last.durationSec) || Number(last.duration) || 0);
    return {
      title: group.title || '未命名镜头组',
      shotRange: first.shotNumber === last.shotNumber ? `#${first.shotNumber}` : `#${first.shotNumber}–#${last.shotNumber}`,
      timeRange: `${first.timecode || formatTime(first.time)} – ${formatTime(endTime)}`,
      count: members.length,
      summary: group.summary || ''
    };
  }).filter(Boolean);
}

export function getExportCellValue(entry, column, { getThumbnail, getTemplateValue } = {}) {
  if (column.key === 'shotNumber') return entry.shotNumber ?? '';
  if (column.key === 'duration') return entry.durationSec ?? 0;
  if (column.key === 'image') return typeof getThumbnail === 'function' ? getThumbnail(entry) : '';
  return typeof getTemplateValue === 'function' ? getTemplateValue(entry, column.field) : '';
}
