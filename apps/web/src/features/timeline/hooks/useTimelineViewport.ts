import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { RefObject } from "react";

interface UseTimelineViewportOptions {
  durationSeconds: number;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export default function useTimelineViewport({ durationSeconds, scrollRef }: UseTimelineViewportOptions) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoom, setZoom] = useState(1);
  const safeDuration = Math.max(durationSeconds, 1);
  const pixelsPerSecond = Math.max(1, viewportWidth / safeDuration) * zoom;
  const contentWidth = Math.max(viewportWidth, safeDuration * pixelsPerSecond);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateWidth = () => setViewportWidth(element.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateScroll = () => setScrollLeft(element.scrollLeft);
    updateScroll();
    element.addEventListener("scroll", updateScroll, { passive: true });
    return () => element.removeEventListener("scroll", updateScroll);
  }, [scrollRef]);

  const timeToPx = useCallback((time: number) => Math.max(0, time) * pixelsPerSecond, [pixelsPerSecond]);
  const pxToTime = useCallback((pixels: number) => Math.max(0, pixels) / pixelsPerSecond, [pixelsPerSecond]);
  const visibleRange = useMemo(() => ({ start: pxToTime(scrollLeft), end: pxToTime(scrollLeft + viewportWidth) }), [pxToTime, scrollLeft, viewportWidth]);
  const setZoomClamped = useCallback((updater: number | ((current: number) => number)) => setZoom((current) => Math.max(1, Math.min(20, typeof updater === "function" ? updater(current) : updater))), []);
  const zoomAt = useCallback((anchorTime: number, nextZoom: number | ((current: number) => number), anchorViewportOffset: number) => {
    const targetZoom = Math.max(1, Math.min(20, typeof nextZoom === "function" ? nextZoom(zoom) : nextZoom));
    const targetPixelsPerSecond = Math.max(1, viewportWidth / safeDuration) * targetZoom;
    const targetScrollLeft = Math.max(0, anchorTime * targetPixelsPerSecond - anchorViewportOffset);
    setZoom(targetZoom);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: targetScrollLeft }));
  }, [safeDuration, scrollRef, viewportWidth, zoom]);
  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, setZoom: setZoomClamped, zoomAt, resetZoom, pixelsPerSecond, contentWidth, scrollLeft, viewportWidth, visibleRange, timeToPx, pxToTime };
}
