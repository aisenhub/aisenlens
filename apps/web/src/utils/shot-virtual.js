export function getVirtualShotHeight(entry, heights, estimatedHeight) {
  return heights?.get(entry && entry.shotId) || estimatedHeight;
}

export function getVirtualShotOffset(entries = [], index = 0, heights, estimatedHeight, gap = 0) {
  const end = Math.max(0, Math.min(entries.length, Number(index) || 0));
  let offset = 0;
  for (let entryIndex = 0; entryIndex < end; entryIndex++) {
    offset += getVirtualShotHeight(entries[entryIndex], heights, estimatedHeight) + gap;
  }
  return offset;
}

export function getVirtualShotTotalHeight(entries = [], heights, estimatedHeight, gap = 0) {
  if (!entries.length) return 0;
  return getVirtualShotOffset(entries, entries.length, heights, estimatedHeight, gap) - gap;
}

export function getVirtualShotRange({
  entries = [],
  heights,
  estimatedHeight,
  gap = 0,
  scrollTop = 0,
  viewportHeight = 0,
  overscan = null
} = {}) {
  const safeViewportHeight = Math.max(1, Number(viewportHeight) || estimatedHeight || 1);
  const safeScrollTop = Math.max(0, Number(scrollTop) || 0);
  const safeOverscan = Math.max(400, Number(overscan) || safeViewportHeight * 1.5);
  const startBoundary = Math.max(0, safeScrollTop - safeOverscan);
  const endBoundary = safeScrollTop + safeViewportHeight + safeOverscan;

  let start = 0;
  while (
    start < entries.length
    && getVirtualShotOffset(entries, start, heights, estimatedHeight, gap)
      + getVirtualShotHeight(entries[start], heights, estimatedHeight) < startBoundary
  ) start++;

  let end = start;
  while (
    end < entries.length
    && getVirtualShotOffset(entries, end, heights, estimatedHeight, gap) < endBoundary
  ) end++;
  if (end <= start && start < entries.length) end = start + 1;
  return { start, end };
}
