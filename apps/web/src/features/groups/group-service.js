import {
  getShotGroupMembers as getMembers,
  reconcileShotGroups as reconcileGroups
} from '../../utils/shot-groups.js';
import { getContiguousEntries } from './group-layout.js';

export function getShotGroupMembers(group, entries) {
  return getMembers(group, entries);
}

export function reconcileShotGroups(state) {
  return reconcileGroups(state);
}

export function createShotGroup({ entries = [], selectedShotIds = new Set(), title = '', idFactory, now } = {}) {
  const orderedEntries = [...entries].sort((left, right) => (Number(left.time) || 0) - (Number(right.time) || 0));
  const members = getContiguousEntries(orderedEntries, [...selectedShotIds]);
  const normalizedTitle = String(title || '').trim();
  if (members.length < 2 || !normalizedTitle || typeof idFactory !== 'function') return null;
  const timestamp = now || new Date().toISOString();
  return {
    id: idFactory('group'),
    title: normalizedTitle,
    summary: '',
    shotIds: members.map(entry => entry.shotId),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function updateShotGroup(groups, groupId, patch = {}) {
  return groups.map(group => {
    if (group.id !== groupId) return group;
    const next = { ...group };
    if (patch.title !== undefined) next.title = String(patch.title);
    if (patch.summary !== undefined) next.summary = String(patch.summary);
    return next;
  });
}

export function removeShotGroup(groups, groupId) {
  return groups.filter(group => group.id !== groupId);
}
