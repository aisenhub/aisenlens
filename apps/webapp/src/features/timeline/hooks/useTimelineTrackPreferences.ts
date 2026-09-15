import useLocalStorage from "../../../hooks/useLocalStorage";
import {
  timelineStructureTrackIds,
  timelineTrackDefinitionById,
  timelineTrackIds,
  timelineTrackRegistry,
  type TimelineTrackId,
} from "../trackRegistry";

export { timelineTrackIds, type TimelineTrackId } from "../trackRegistry";

interface TimelineTrackPreference {
  visible: boolean;
  height: number;
}

export type TimelineTrackPreferences = Record<TimelineTrackId, TimelineTrackPreference>;
type StoredTimelineTrackPreferences = Partial<Record<TimelineTrackId, Partial<TimelineTrackPreference>>> & { order?: unknown[] };

const STORAGE_KEY = "aisenlens:timeline-track-preferences:v2";
const LEGACY_STORAGE_KEY = "aisenlens:timeline-track-preferences";

const defaultOrder: TimelineTrackId[] = ["section", "sequence", "scene", "visual", "markers", "primary-audio"];
const defaultPreferences: TimelineTrackPreferences = Object.fromEntries(
  timelineTrackRegistry.map((track) => [track.id, { visible: track.defaultVisible, height: track.defaultHeight }]),
) as TimelineTrackPreferences;

function readStored(key: string): StoredTimelineTrackPreferences | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown;
    return value && typeof value === "object" ? value as StoredTimelineTrackPreferences : null;
  } catch {
    return null;
  }
}

function normalizeOrder(order: readonly unknown[]): TimelineTrackId[] {
  const flexible = order.filter((id): id is TimelineTrackId => id === "markers");
  return [...timelineStructureTrackIds, ...new Set(flexible), "primary-audio"];
}

function initialStoredPreferences(): StoredTimelineTrackPreferences {
  const current = readStored(STORAGE_KEY);
  if (current) return current;
  const legacy = readStored(LEGACY_STORAGE_KEY);
  if (!legacy) return defaultPreferences;
  const legacyRecord = legacy as StoredTimelineTrackPreferences & Record<string, unknown>;
  const oldVideo = legacyRecord["video-frames"] as Partial<TimelineTrackPreference> | undefined;
  const oldShots = legacyRecord.shots as Partial<TimelineTrackPreference> | undefined;
  const oldGroups = legacyRecord.groups as Partial<TimelineTrackPreference> | undefined;
  return {
    section: { ...defaultPreferences.section },
    sequence: { ...defaultPreferences.sequence },
    scene: { visible: oldGroups?.visible ?? defaultPreferences.scene.visible, height: Math.max(defaultPreferences.scene.height, oldGroups?.height ?? defaultPreferences.scene.height) },
    visual: { visible: Boolean(oldVideo?.visible || oldShots?.visible), height: Math.max(48, oldVideo?.height ?? 0, oldShots?.height ?? 0) },
    markers: { ...defaultPreferences.markers },
    "primary-audio": { ...defaultPreferences["primary-audio"], ...(legacyRecord["primary-audio"] as Partial<TimelineTrackPreference> | undefined) },
    order: normalizeOrder((legacyRecord.order as unknown[] | undefined) ?? []),
  };
}

function clampHeight(trackId: TimelineTrackId, height: number): number {
  const definition = timelineTrackDefinitionById[trackId];
  return Math.max(definition.minHeight, Math.min(definition.maxHeight, Math.round(height)));
}

export default function useTimelineTrackPreferences() {
  const [storedPreferences, setStoredPreferences] = useLocalStorage<StoredTimelineTrackPreferences>(STORAGE_KEY, initialStoredPreferences());
  const preferences = timelineTrackIds.reduce((result, trackId) => {
    const stored = storedPreferences[trackId];
    result[trackId] = {
      visible: typeof stored?.visible === "boolean" ? stored.visible : defaultPreferences[trackId].visible,
      height: clampHeight(trackId, typeof stored?.height === "number" ? stored.height : defaultPreferences[trackId].height),
    };
    return result;
  }, {} as TimelineTrackPreferences);
  const setVisible = (trackId: TimelineTrackId, visible: boolean) => setStoredPreferences((current) => ({ ...current, [trackId]: { ...preferences[trackId], visible } }));
  const setHeight = (trackId: TimelineTrackId, height: number) => setStoredPreferences((current) => ({ ...current, [trackId]: { ...preferences[trackId], height: clampHeight(trackId, height) } }));
  const order = normalizeOrder(storedPreferences.order ?? defaultOrder);
  const setOrder = (nextOrder: TimelineTrackId[]) => setStoredPreferences((current) => ({ ...current, order: normalizeOrder(nextOrder) }));

  return { preferences, order, setVisible, setHeight, setOrder };
}
