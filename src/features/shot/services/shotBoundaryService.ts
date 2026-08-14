import type { ShotFrameRange } from "../types";

export type { ShotFrameRange } from "../types";

export function moveSharedShotBoundary(
  ranges: ShotFrameRange[],
  boundaryIndex: number,
  requestedFrame: number,
): ShotFrameRange[] {
  const previous = ranges[boundaryIndex];
  const next = ranges[boundaryIndex + 1];
  if (!previous || !next) return ranges;

  const boundaryFrame = Math.max(
    previous.startFrame + 1,
    Math.min(next.endFrame - 1, Math.round(requestedFrame)),
  );
  if (boundaryFrame === previous.endFrame) return ranges;

  return ranges.map((range, index) => {
    if (index === boundaryIndex) return { ...range, endFrame: boundaryFrame };
    if (index === boundaryIndex + 1) return { ...range, startFrame: boundaryFrame };
    return range;
  });
}

export function mergeAdjacentShotRanges<T extends ShotFrameRange>(
  ranges: T[],
  firstIndex: number,
): T[] {
  const first = ranges[firstIndex];
  const second = ranges[firstIndex + 1];
  if (!first || !second || first.endFrame !== second.startFrame) return ranges;
  return [...ranges.slice(0, firstIndex), { ...first, endFrame: second.endFrame }, ...ranges.slice(firstIndex + 2)];
}
