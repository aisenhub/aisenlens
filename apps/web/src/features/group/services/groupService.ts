import projectRepository from "../../project/services/projectRepository";
import type { ShotGroupKind, ShotGroupRecord } from "../types";
export { getContiguousShotIds, reconcileShotGroups } from "./reconcileShotGroups";
import { getContiguousShotIds } from "./reconcileShotGroups";

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
