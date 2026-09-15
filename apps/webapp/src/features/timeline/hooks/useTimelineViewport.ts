import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { RefObject } from "react";

interface UseTimelineViewportOptions {
  durationSeconds: number;
  frameRate: number;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export default function useTimelineViewport({ durationSeconds, frameRate, scrollRef }: UseTimelineViewportOptions) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoom, setZoom] = useState(1);
  const safeDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1;
  const safeFrameRate = Number.isFinite(frameRate) && frameRate > 0 ? frameRate : 24;
  const minPixelsPerSecond = viewportWidth > 0 ? viewportWidth / safeDuration : 1;
  const maxPixelsPerSecond = Math.max(240, safeFrameRate * 8);
  const maxZoom = Math.max(1, maxPixelsPerSecond / Math.max(0.001, minPixelsPerSecond));
  const pixelsPerSecond = Math.min(maxPixelsPerSecond, Math.max(minPixelsPerSecond, minPixelsPerSecond * zoom));
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

  const timeToPx = useCallback((time: number) => Math.max(0, Number.isFinite(time) ? time : 0) * pixelsPerSecond, [pixelsPerSecond]);
  const pxToTime = useCallback((pixels: number) => Math.max(0, Number.isFinite(pixels) ? pixels : 0) / Math.max(0.001, pixelsPerSecond), [pixelsPerSecond]);
  const visibleRange = useMemo(() => ({ start: pxToTime(scrollLeft), end: pxToTime(scrollLeft + viewportWidth) }), [pxToTime, scrollLeft, viewportWidth]);
  const setZoomClamped = useCallback((updater: number | ((current: number) => number)) => setZoom((current) => Math.max(1, Math.min(maxZoom, typeof updater === "function" ? updater(current) : updater))), [maxZoom]);
  const zoomAt = useCallback((anchorTime: number, nextZoom: number | ((current: number) => number), anchorViewportOffset: number) => {
    const targetZoom = Math.max(1, Math.min(maxZoom, typeof nextZoom === "function" ? nextZoom(zoom) : nextZoom));
    const targetPixelsPerSecond = Math.min(maxPixelsPerSecond, Math.max(minPixelsPerSecond, minPixelsPerSecond * targetZoom));
    const targetScrollLeft = Math.max(0, anchorTime * targetPixelsPerSecond - anchorViewportOffset);
    setZoom(targetZoom);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: targetScrollLeft }));
  }, [maxPixelsPerSecond, maxZoom, minPixelsPerSecond, scrollRef, zoom]);
  const fitRange = useCallback((startSeconds: number, endSeconds: number, options: { paddingPx?: number } = {}) => {
    if (viewportWidth <= 0) return;
    const start = Math.max(0, Math.min(safeDuration, Math.min(startSeconds, endSeconds)));
    const end = Math.max(start, Math.min(safeDuration, Math.max(startSeconds, endSeconds)));
    const padding = Math.max(0, Math.min(viewportWidth / 2, options.paddingPx ?? 32));
    const rangeDuration = Math.max(1 / safeFrameRate, end - start);
    const targetPixelsPerSecond = Math.min(maxPixelsPerSecond, Math.max(minPixelsPerSecond, (viewportWidth - padding * 2) / rangeDuration));
    const targetZoom = Math.max(1, Math.min(maxZoom, targetPixelsPerSecond / Math.max(0.001, minPixelsPerSecond)));
    const targetScrollLeft = Math.max(0, start * targetPixelsPerSecond - padding);
    setZoom(targetZoom);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: targetScrollLeft, behavior: "smooth" }));
  }, [maxPixelsPerSecond, maxZoom, minPixelsPerSecond, safeDuration, safeFrameRate, scrollRef, viewportWidth]);
  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, maxZoom, setZoom: setZoomClamped, zoomAt, fitRange, resetZoom, pixelsPerSecond, minPixelsPerSecond, maxPixelsPerSecond, contentWidth, scrollLeft, viewportWidth, visibleRange, timeToPx, pxToTime };
}
