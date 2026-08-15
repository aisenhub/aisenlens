import projectRepository from "../../project/services/projectRepository";
import type { ShotGroupKind, ShotGroupRecord } from "../types";

export function getContiguousShotIds(shotIds: string[], selectedShotIds: string[]): string[] {
  const selected = new Set(selectedShotIds);
  const indexes = shotIds.map((id, index) => selected.has(id) ? index : -1).filter((index) => index >= 0);
  if (indexes.length < 2) return [];
  const first = Math.min(...indexes);
  const last = Math.max(...indexes);
  return last - first + 1 === indexes.length ? shotIds.slice(first, last + 1) : [];
}

export function reconcileShotGroups(groups: ShotGroupRecord[], shotIds: string[]): ShotGroupRecord[] {
  const occupied = new Set<string>();
  return groups.flatMap((group) => {
    const members = getContiguousShotIds(shotIds, group.shotIds);
    if (members.length < 2 || members.some((shotId) => occupied.has(shotId))) return [];
    members.forEach((shotId) => occupied.add(shotId));
    return [{ ...group, shotIds: members }];
  });
}

export function getShotGroupIndexes(group: ShotGroupRecord, shotIds: string[]): { first: number; last: number } | null {
  const members = getContiguousShotIds(shotIds, group.shotIds);
  if (members.length !== group.shotIds.length) return null;
  const first = shotIds.indexOf(members[0]);
  return first >= 0 ? { first, last: first + members.length - 1 } : null;
}

export function adjustShotGroupRange({ groups, groupId, shotIds, edge, operation }: { groups: ShotGroupRecord[]; groupId: string; shotIds: string[]; edge: "start" | "end"; operation: "extend" | "shrink" }): ShotGroupRecord[] {
  const group = groups.find((item) => item.id === groupId);
  if (!group) return groups;
  const indexes = getShotGroupIndexes(group, shotIds);
  if (!indexes) return groups;
  const otherMembers = new Set(groups.filter((item) => item.id !== groupId).flatMap((item) => item.shotIds));
  let members = group.shotIds;
  if (operation === "shrink") {
    if (members.length <= 2) return groups;
    members = edge === "start" ? members.slice(1) : members.slice(0, -1);
  } else {
    const candidateIndex = edge === "start" ? indexes.first - 1 : indexes.last + 1;
    const candidate = shotIds[candidateIndex];
    if (!candidate || otherMembers.has(candidate)) return groups;
    members = edge === "start" ? [candidate, ...members] : [...members, candidate];
  }
  return groups.map((item) => item.id === groupId ? { ...item, shotIds: members, updatedAt: new Date().toISOString() } : item);
}

export function createShotGroup({ projectId, kind, title, selectedShotIds, shotIds, existingGroups = [] }: { projectId: string; kind: ShotGroupKind; title: string; selectedShotIds: string[]; shotIds: string[]; existingGroups?: ShotGroupRecord[] }): ShotGroupRecord | null {
  const members = getContiguousShotIds(shotIds, selectedShotIds);
  const normalizedTitle = title.trim();
  const occupiedShotIds = new Set(existingGroups.flatMap((group) => group.shotIds));
  if (!normalizedTitle || members.length < 2 || members.some((shotId) => occupiedShotIds.has(shotId))) return null;
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), projectId, kind, title: normalizedTitle, summary: "", shotIds: members, createdAt: now, updatedAt: now };
}

export async function loadProjectShotGroups(projectId: string): Promise<ShotGroupRecord[]> {
  return projectRepository.listProjectShotGroups(projectId);
}

export async function saveProjectShotGroups(projectId: string, groups: ShotGroupRecord[]): Promise<void> {
  await projectRepository.replaceProjectShotGroups(projectId, groups);
}
