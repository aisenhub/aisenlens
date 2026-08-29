import type { ShotGroupRecord } from "../types";

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
