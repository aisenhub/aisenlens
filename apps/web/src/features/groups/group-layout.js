function getEntryIndexes(entries, shotIds) {
  const idSet = new Set(shotIds || []);
  return entries
    .map((entry, index) => idSet.has(entry?.shotId) ? index : -1)
    .filter(index => index >= 0);
}

export function getContiguousEntries(entries = [], shotIds = []) {
  if (!Array.isArray(entries) || !Array.isArray(shotIds) || shotIds.length < 2) return [];
  const uniqueIds = new Set(shotIds);
  if (uniqueIds.size !== shotIds.length) return [];
  const indexes = getEntryIndexes(entries, shotIds);
  if (indexes.length !== shotIds.length) return [];
  const firstIndex = Math.min(...indexes);
  const lastIndex = Math.max(...indexes);
  if (lastIndex - firstIndex + 1 !== indexes.length) return [];
  return entries.slice(firstIndex, lastIndex + 1);
}

export function getContiguousSelection(entries = [], selectedShotIds = new Set()) {
  return getContiguousEntries(entries, [...selectedShotIds]);
}

export function buildShotListItems({ entries = [], groups = [], expandedGroupId = null } = {}) {
  const groupByShotId = new Map();
  const validGroups = groups
    .map(group => ({ group, members: getContiguousEntries(entries, group?.shotIds || []) }))
    .filter(({ group, members }) => members.length >= 2 && members.every(entry => !groupByShotId.has(entry.shotId)))
    .map(({ group, members }) => {
      members.forEach(entry => groupByShotId.set(entry.shotId, group));
      return { group, members };
    });
  const groupById = new Map(validGroups.map(item => [item.group.id, item]));
  const items = [];
  let index = 0;
  while (index < entries.length) {
    const entry = entries[index];
    const group = groupByShotId.get(entry.shotId);
    if (!group) {
      items.push({ type: 'shot', key: `shot:${entry.shotId}`, entry });
      index += 1;
      continue;
    }
    const groupItem = groupById.get(group.id);
    if (groupItem.members[0].shotId !== entry.shotId) {
      items.push({ type: 'shot', key: `shot:${entry.shotId}`, entry });
      index += 1;
      continue;
    }
    items.push({
      type: 'group',
      key: `group:${group.id}`,
      group,
      members: groupItem.members,
      expanded: group.id === expandedGroupId
    });
    index += groupItem.members.length;
  }
  return items;
}
