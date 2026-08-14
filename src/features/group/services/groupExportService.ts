import type { ShotGroupRecord } from "../types";

export interface ShotGroupExportChapter<TShot extends { id: string; start: number; duration: number }> {
  id: string;
  kind: ShotGroupRecord["kind"];
  title: string;
  summary: string;
  start: number;
  end: number;
  shots: TShot[];
}

export function buildShotGroupExportChapters<TShot extends { id: string; start: number; duration: number }>(groups: ShotGroupRecord[], shots: TShot[]): ShotGroupExportChapter<TShot>[] {
  const byId = new Map(shots.map((shot) => [shot.id, shot]));
  return groups.flatMap((group) => {
    const members = group.shotIds.map((id) => byId.get(id)).filter((shot): shot is TShot => Boolean(shot));
    if (members.length < 2) return [];
    const first = members[0];
    const last = members[members.length - 1];
    return [{ id: group.id, kind: group.kind, title: group.title, summary: group.summary, start: first.start, end: last.start + last.duration, shots: members }];
  });
}
