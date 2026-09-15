import projectRepository from "../../project/services/projectRepository";
import type { ShotGroupKind, ShotGroupRecord } from "../types";
export { getContiguousShotIds, reconcileShotGroups } from "./reconcileShotGroups";
import { getContiguousShotIds } from "./reconcileShotGroups";
import { createStructureFromSelection, resizeStructureEdge } from "./structureCommands";

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
  if (operation === "shrink" && group.shotIds.length <= 1) return groups;
  const targetIndex = operation === "extend"
    ? edge === "start" ? indexes.first - 1 : indexes.last + 1
    : edge === "start" ? indexes.first + 1 : indexes.last - 1;
  const targetShotId = shotIds[targetIndex];
  if (!targetShotId) return groups;
  const result = resizeStructureEdge({ projectId: group.projectId, kind: group.kind, groupId, edge, targetShotId, orderedShots: shotIds.map((id) => ({ id })), existingGroups: groups, now: new Date().toISOString() });
  return result.ok ? result.groups : groups;
}

export function createShotGroup({ projectId, kind, title, selectedShotIds, shotIds, existingGroups = [] }: { projectId: string; kind: ShotGroupKind; title: string; selectedShotIds: string[]; shotIds: string[]; existingGroups?: ShotGroupRecord[] }): ShotGroupRecord | null {
  const result = createStructureFromSelection({ projectId, kind, title, selectedShotIds, orderedShots: shotIds.map((id) => ({ id })), existingGroups, now: new Date().toISOString() });
  if (!result.ok || !result.changes.createdGroupIds.length) return null;
  return result.groups.find((group) => result.changes.createdGroupIds.includes(group.id)) ?? null;
}

export async function loadProjectShotGroups(projectId: string): Promise<ShotGroupRecord[]> {
  return projectRepository.listProjectShotGroups(projectId);
}

export async function saveProjectShotGroups(projectId: string, groups: ShotGroupRecord[]): Promise<void> {
  await projectRepository.replaceProjectShotGroups(projectId, groups);
}
