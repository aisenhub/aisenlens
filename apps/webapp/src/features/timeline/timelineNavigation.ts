import type { ShotData } from "../editor/constants/editorData";
import type { ShotGroupKind, ShotGroupRecord } from "../group/types";

export type TimelineNavigationFocus = { kind: "film" } | { kind: "section" | "sequence" | "scene" | "shot"; id: string };

export interface TimelineNavigationItem {
  kind: TimelineNavigationFocus["kind"];
  id: string | null;
  label: string;
  start: number;
  end: number;
}

const rank: Record<Exclude<TimelineNavigationFocus["kind"], "film" | "shot">, number> = { scene: 1, sequence: 2, section: 3 };

function rangeForIds(ids: readonly string[], shots: readonly ShotData[]) {
  const members = ids.map((id) => shots.find((shot) => shot.id === id));
  if (!members.length || members.some((shot) => !shot)) return null;
  const sorted = [...members].sort((left, right) => left!.start - right!.start);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return { start: first.start, end: last.start + last.duration };
}

export function getGroupTimeRange(group: ShotGroupRecord, shots: readonly ShotData[]) {
  return rangeForIds(group.shotIds, shots);
}

export function resolveNavigationBreadcrumb(input: { focus: TimelineNavigationFocus; groups: readonly ShotGroupRecord[]; shots: readonly ShotData[]; durationSeconds: number }): TimelineNavigationItem[] {
  const { focus, groups, shots } = input;
  if (focus.kind === "film") return [{ kind: "film", id: null, label: "全片", start: 0, end: input.durationSeconds }];
  const targetGroup = focus.kind === "shot" ? null : groups.find((group) => group.id === focus.id) ?? null;
  const targetRange = focus.kind === "shot" ? (() => { const shot = shots.find((item) => item.id === focus.id); return shot ? { start: shot.start, end: shot.start + shot.duration } : null })() : targetGroup ? getGroupTimeRange(targetGroup, shots) : null;
  if (!targetRange) return [{ kind: "film", id: null, label: "全片", start: 0, end: input.durationSeconds }];
  const hierarchy = groups.flatMap((group) => {
    const range = getGroupTimeRange(group, shots);
    return range ? [{ group, range }] : [];
  }).filter(({ group, range }) => group.id === focus.id || (focus.kind !== "shot" && rank[group.kind] > rank[focus.kind as Exclude<TimelineNavigationFocus["kind"], "film" | "shot">] && range.start <= targetRange.start && range.end >= targetRange.end) || focus.kind === "shot" && range.start <= targetRange.start && range.end >= targetRange.end);
  const items: TimelineNavigationItem[] = [{ kind: "film", id: null, label: "全片", start: 0, end: input.durationSeconds }];
  const ancestors = hierarchy.sort((left, right) => rank[left.group.kind] - rank[right.group.kind]);
  for (const { group, range } of ancestors) items.push({ kind: group.kind, id: group.id, label: group.title, start: range.start, end: range.end });
  if (focus.kind === "shot") items.push({ kind: "shot", id: focus.id, label: `镜头 ${String(shots.findIndex((shot) => shot.id === focus.id) + 1).padStart(2, "0")}`, start: targetRange.start, end: targetRange.end });
  return items.filter((item, index, all) => index === 0 || item.id !== all[index - 1]?.id);
}

export function isStructureFocus(focus: TimelineNavigationFocus): focus is Exclude<TimelineNavigationFocus, { kind: "film" }> {
  return focus.kind !== "film";
}

export function structureKindLabel(kind: ShotGroupKind): string {
  return kind === "scene" ? "场景" : kind === "sequence" ? "序列" : "段落";
}
