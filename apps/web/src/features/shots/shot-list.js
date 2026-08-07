import {
  getVirtualShotOffset,
  getVirtualShotRange,
  getVirtualShotTotalHeight
} from '../../utils/shot-virtual.js';

export function getShotListLayout({
  entries = [],
  heights,
  estimatedHeight,
  gap,
  scrollTop = 0,
  viewportHeight = estimatedHeight * 5
} = {}) {
  const range = getVirtualShotRange({
    entries,
    heights,
    estimatedHeight,
    gap,
    scrollTop,
    viewportHeight
  });
  const totalHeight = getVirtualShotTotalHeight(entries, heights, estimatedHeight, gap);
  return {
    ...range,
    topOffset: getVirtualShotOffset(entries, range.start, heights, estimatedHeight, gap),
    bottomOffset: Math.max(0, totalHeight - getVirtualShotOffset(entries, range.end, heights, estimatedHeight, gap)),
    totalHeight
  };
}
