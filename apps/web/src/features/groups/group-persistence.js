export function serializeShotGroups(groups = [], updatedAt = new Date().toISOString()) {
  return (Array.isArray(groups) ? groups : []).map(group => ({
    id: group.id,
    title: String(group.title || '').trim() || '未命名镜头组',
    summary: String(group.summary || ''),
    shotIds: [...(group.shotIds || [])],
    createdAt: group.createdAt || updatedAt,
    updatedAt
  }));
}
