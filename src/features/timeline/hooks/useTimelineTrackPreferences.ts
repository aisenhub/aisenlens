import useLocalStorage from "../../../hooks/useLocalStorage";

export const timelineTrackIds = ["primary-audio", "video-frames", "groups", "shots"] as const;

export type TimelineTrackId = (typeof timelineTrackIds)[number];

interface TimelineTrackPreference {
  visible: boolean;
  height: number;
}

export type TimelineTrackPreferences = Record<TimelineTrackId, TimelineTrackPreference>;

type StoredTimelineTrackPreferences = Partial<TimelineTrackPreferences> & { order?: TimelineTrackId[] };

const defaultTrackOrder: TimelineTrackId[] = ["primary-audio", "video-frames", "groups", "shots"];

const defaultPreferences: TimelineTrackPreferences = {
  "primary-audio": { visible: true, height: 48 },
  "video-frames": { visible: true, height: 36 },
  groups: { visible: true, height: 20 },
  shots: { visible: true, height: 32 },
};

function clampHeight(height: number): number {
  return Math.max(20, Math.min(160, Math.round(height)));
}

export default function useTimelineTrackPreferences() {
  const [storedPreferences, setStoredPreferences] = useLocalStorage<StoredTimelineTrackPreferences>("aisenlens:timeline-track-preferences", defaultPreferences);
  const preferences = timelineTrackIds.reduce((result, trackId) => {
    const stored = storedPreferences[trackId];
    result[trackId] = { visible: stored?.visible ?? defaultPreferences[trackId].visible, height: clampHeight(stored?.height ?? defaultPreferences[trackId].height) };
    return result;
  }, {} as TimelineTrackPreferences);
  const setVisible = (trackId: TimelineTrackId, visible: boolean) => setStoredPreferences((current) => ({ ...current, [trackId]: { ...preferences[trackId], visible } }));
  const setHeight = (trackId: TimelineTrackId, height: number) => setStoredPreferences((current) => ({ ...current, [trackId]: { ...preferences[trackId], height: clampHeight(height) } }));
  const storedOrder = Array.isArray(storedPreferences.order) ? storedPreferences.order.filter((trackId): trackId is TimelineTrackId => timelineTrackIds.includes(trackId as TimelineTrackId)) : [];
  const order = [...new Set([...storedOrder, ...defaultTrackOrder])];
  const setOrder = (nextOrder: TimelineTrackId[]) => setStoredPreferences((current) => ({ ...current, order: [...new Set([...nextOrder, ...defaultTrackOrder])] }));

  return { preferences, order, setVisible, setHeight, setOrder };
}
