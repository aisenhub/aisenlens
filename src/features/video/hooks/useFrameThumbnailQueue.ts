import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaSourceFingerprint } from "../../project/types";
import { createFrameThumbnailDecoder, loadCachedFrameThumbnail, type FrameThumbnailResource } from "../services/frameThumbnailService";

const REQUEST_DEBOUNCE_MS = 150;
const UNMOUNT_GRACE_MS = 1_500;
const MAX_INACTIVE_THUMBNAILS = 32;

interface SessionThumbnailResource {
  resource: FrameThumbnailResource;
  lastUsedAt: number;
}

const sessionResources = new Map<string, SessionThumbnailResource>();
const activeResourceKeysByConsumer = new Map<number, Set<string>>();
let consumerSequence = 0;
let pruneTimer: number | null = null;

interface UseFrameThumbnailQueueOptions {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint;
  durationSeconds: number;
  frameRate: number;
  frames: number[];
  priorityFrames: number[];
}

function orderedFrames(frames: number[], priorityFrames: number[]): number[] {
  const requested = new Set(frames);
  return [...new Set([...priorityFrames.filter((frame) => requested.has(frame)), ...frames])];
}

function resourceKey(mediaKey: string, frame: number): string {
  return `${mediaKey}:${frame}`;
}

function getSessionResource(mediaKey: string, frame: number): FrameThumbnailResource | undefined {
  const cached = sessionResources.get(resourceKey(mediaKey, frame));
  if (!cached) return undefined;
  cached.lastUsedAt = Date.now();
  return cached.resource;
}

function cacheSessionResource(mediaKey: string, resource: FrameThumbnailResource): void {
  const key = resourceKey(mediaKey, resource.frame);
  const previous = sessionResources.get(key);
  if (previous && previous.resource.url !== resource.url) URL.revokeObjectURL(previous.resource.url);
  sessionResources.delete(key);
  sessionResources.set(key, { resource, lastUsedAt: Date.now() });
  scheduleSessionPrune();
}

function activeResourceKeys(): Set<string> {
  return new Set([...activeResourceKeysByConsumer.values()].flatMap((keys) => [...keys]));
}

function pruneSessionResources(): void {
  pruneTimer = null;
  const now = Date.now();
  const activeKeys = activeResourceKeys();
  const inactive = [...sessionResources.entries()]
    .filter(([key]) => !activeKeys.has(key))
    .sort(([, left], [, right]) => left.lastUsedAt - right.lastUsedAt);
  let remainingInactive = inactive.length;

  for (const [key, cached] of inactive) {
    if (remainingInactive <= MAX_INACTIVE_THUMBNAILS && now - cached.lastUsedAt < UNMOUNT_GRACE_MS) break;
    sessionResources.delete(key);
    URL.revokeObjectURL(cached.resource.url);
    remainingInactive -= 1;
  }

  scheduleSessionPrune();
}

function scheduleSessionPrune(): void {
  if (pruneTimer !== null) window.clearTimeout(pruneTimer);
  if (!sessionResources.size) {
    pruneTimer = null;
    return;
  }
  const activeKeys = activeResourceKeys();
  const nextExpiry = [...sessionResources.entries()]
    .filter(([key]) => !activeKeys.has(key))
    .reduce<number | null>((soonest, [, cached]) => {
      const expiry = cached.lastUsedAt + UNMOUNT_GRACE_MS;
      return soonest === null || expiry < soonest ? expiry : soonest;
    }, null);
  if (nextExpiry === null) {
    pruneTimer = null;
    return;
  }
  pruneTimer = window.setTimeout(pruneSessionResources, Math.max(0, nextExpiry - Date.now()));
}

function updateActiveResources(consumerId: number, mediaKey: string, frames: number[]): void {
  const activeKeys = new Set(frames.map((frame) => resourceKey(mediaKey, frame)));
  activeResourceKeysByConsumer.set(consumerId, activeKeys);
  for (const key of activeKeys) {
    const cached = sessionResources.get(key);
    if (cached) cached.lastUsedAt = Date.now();
  }
  scheduleSessionPrune();
}

export default function useFrameThumbnailQueue({ projectId, sourceUrl, mediaFingerprint, durationSeconds, frameRate, frames, priorityFrames }: UseFrameThumbnailQueueOptions) {
  const [cacheVersion, setCacheVersion] = useState(0);
  const consumerIdRef = useRef(++consumerSequence);
  const requestVersionRef = useRef(0);
  const mediaKey = useMemo(() => JSON.stringify([projectId, mediaFingerprint.name, mediaFingerprint.size, mediaFingerprint.lastModified, mediaFingerprint.mimeType]), [mediaFingerprint.lastModified, mediaFingerprint.mimeType, mediaFingerprint.name, mediaFingerprint.size, projectId]);
  const frameKey = useMemo(() => frames.join(","), [frames]);
  const priorityKey = useMemo(() => priorityFrames.join(","), [priorityFrames]);
  const thumbnails = useMemo(() => frames.flatMap((frame) => {
    const resource = getSessionResource(mediaKey, frame);
    return resource ? [resource] : [];
  }), [cacheVersion, frameKey, mediaKey]);

  useEffect(() => {
    const consumerId = consumerIdRef.current;
    updateActiveResources(consumerId, mediaKey, frames);
    return () => {
      activeResourceKeysByConsumer.delete(consumerId);
      scheduleSessionPrune();
    };
  }, [frameKey, mediaKey]);

  useEffect(() => {
    const version = ++requestVersionRef.current;
    const publish = (resource: FrameThumbnailResource) => {
      if (requestVersionRef.current !== version) {
        URL.revokeObjectURL(resource.url);
        return;
      }
      cacheSessionResource(mediaKey, resource);
      setCacheVersion((current) => current + 1);
    };
    const timer = window.setTimeout(() => {
      void (async () => {
        const requested = orderedFrames(frames, priorityFrames);
        const missing: number[] = [];
        for (const frame of requested) {
          if (requestVersionRef.current !== version) return;
          if (getSessionResource(mediaKey, frame)) continue;
          const cached = await loadCachedFrameThumbnail(projectId, mediaFingerprint, frame);
          if (requestVersionRef.current !== version) {
            if (cached) URL.revokeObjectURL(cached.url);
            return;
          }
          if (cached) publish(cached);
          else missing.push(frame);
        }
        if (!missing.length || requestVersionRef.current !== version) return;
        const decoder = await createFrameThumbnailDecoder({ projectId, sourceUrl, mediaFingerprint, durationSeconds, frameRate });
        try {
          for (const frame of missing) {
            if (requestVersionRef.current !== version) return;
            try {
              const resource = await decoder.capture(frame, () => requestVersionRef.current === version);
              publish(resource);
            } catch {
              if (requestVersionRef.current !== version) return;
            }
          }
        } finally {
          decoder.dispose();
        }
      })();
    }, REQUEST_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      if (requestVersionRef.current === version) requestVersionRef.current += 1;
    };
  // The frame arrays are recomputed by the timeline render; the serialized keys
  // keep identical viewport requests from restarting the decoder.
  }, [durationSeconds, frameKey, frameRate, mediaFingerprint, mediaKey, priorityKey, projectId, sourceUrl]);

  return thumbnails;
}
