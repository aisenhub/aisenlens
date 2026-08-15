import type { AnnotationMarker } from "../../annotation/types";
import type { ShotGroupKind, ShotGroupRecord } from "../../group/types";
import type { AnalysisFieldValue } from "../../template/types";
import type { ShotData } from "../../editor/constants/editorData";

export type ShotSearchStatus = "all" | "with-notes" | "with-screenshot" | "marked";

export interface ShotSearchFilters {
  query: string;
  groupKind: "all" | ShotGroupKind;
  status: ShotSearchStatus;
}

interface SearchableShotContext {
  shots: ShotData[];
  groups: ShotGroupRecord[];
  notesByShotId: Record<string, { content: string; analysis: string }>;
  fieldsByShotId: Record<string, Record<string, AnalysisFieldValue>>;
  screenshotIdsByShotId: Record<string, string[]>;
  primaryScreenshotIdsByShotId: Record<string, string | null>;
  markers: AnnotationMarker[];
}

function valueToSearchText(value: AnalysisFieldValue): string {
  if (Array.isArray(value)) return value.join(" ");
  return value === null ? "" : String(value);
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function findMatchingShotIds(context: SearchableShotContext, filters: ShotSearchFilters): Set<string> {
  const query = normalized(filters.query);
  const groupsByShotId = new Map(context.groups.flatMap((group) => group.shotIds.map((shotId) => [shotId, group] as const)));
  const markerTextByShotId = new Map<string, string[]>();
  context.markers.forEach((marker) => {
    if (!marker.shotId) return;
    markerTextByShotId.set(marker.shotId, [...(markerTextByShotId.get(marker.shotId) ?? []), marker.label, marker.note]);
  });

  return new Set(context.shots.flatMap((shot, index) => {
    const group = groupsByShotId.get(shot.id);
    const notes = context.notesByShotId[shot.id];
    const hasNotes = Boolean(notes?.content.trim() || notes?.analysis.trim());
    const hasScreenshot = Boolean(context.primaryScreenshotIdsByShotId[shot.id] || context.screenshotIdsByShotId[shot.id]?.length);
    const isMarked = markerTextByShotId.has(shot.id);
    const fields = Object.values(context.fieldsByShotId[shot.id] ?? {}).map(valueToSearchText);
    const searchText = normalized([
      String(index + 1),
      `#${String(index + 1).padStart(2, "0")}`,
      shot.type,
      shot.motion,
      shot.color,
      notes?.content ?? "",
      notes?.analysis ?? "",
      group?.title ?? "",
      group?.summary ?? "",
      ...fields,
      ...(markerTextByShotId.get(shot.id) ?? []),
    ].join(" "));
    const matchesQuery = !query || searchText.includes(query);
    const matchesGroup = filters.groupKind === "all" || group?.kind === filters.groupKind;
    const matchesStatus = filters.status === "all" || filters.status === "with-notes" && hasNotes || filters.status === "with-screenshot" && hasScreenshot || filters.status === "marked" && isMarked;
    return matchesQuery && matchesGroup && matchesStatus ? [shot.id] : [];
  }));
}
