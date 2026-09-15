import type { ShotGroupRecord } from "../types";
import { validateStructureChange } from "./structureValidation.ts";

export function getContiguousShotIds(shotIds: string[], selectedShotIds: string[]): string[] {
  const selected = new Set(selectedShotIds);
  const indexes = shotIds.map((id, index) => selected.has(id) ? index : -1).filter((index) => index >= 0);
  if (!indexes.length) return [];
  const first = Math.min(...indexes);
  const last = Math.max(...indexes);
  return last - first + 1 === indexes.length ? shotIds.slice(first, last + 1) : [];
}

export function reconcileShotGroups(groups: ShotGroupRecord[], shotIds: string[]): ShotGroupRecord[] {
  return groups.map((group) => {
    const members = getContiguousShotIds(shotIds, group.shotIds);
    const hasMissingMembers = group.shotIds.some((id) => !shotIds.includes(id));
    const hasNonContiguousMembers = !hasMissingMembers && members.length !== group.shotIds.length;
    const next = {
      ...group,
      // Keep broken references intact for diagnosis and recovery. Only normalize a fully
      // resolvable range into the project's chronological order.
      shotIds: hasMissingMembers || hasNonContiguousMembers ? [...group.shotIds] : members,
    };
    const validity = hasMissingMembers
      ? { valid: false, reason: "结构中的部分正式镜头已不存在或被移除。" }
      : hasNonContiguousMembers
        ? { valid: false, reason: "结构中的正式镜头已不再形成连续片段。" }
        : validateStructureChange(next, groups, shotIds);
    return { ...next, validity: { status: validity.valid ? "valid" : "needs-review", reason: validity.reason } };
  });
}
