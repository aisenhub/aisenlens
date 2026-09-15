export type TimelineDetailLevel = "overview" | "coarse" | "medium" | "fine" | "frame-detail";

export function resolveTimelineDetailLevel(pixelsPerSecond: number): TimelineDetailLevel {
  if (pixelsPerSecond >= 240) return "frame-detail";
  if (pixelsPerSecond >= 100) return "fine";
  if (pixelsPerSecond >= 48) return "medium";
  if (pixelsPerSecond >= 20) return "coarse";
  return "overview";
}

export function resolveShotLabel(input: { index: number; durationSeconds: number; pixelsPerSecond: number; detail: TimelineDetailLevel; incomplete: boolean }): string {
  const number = String(input.index + 1).padStart(2, "0");
  if (input.detail === "overview") return "";
  if (input.detail === "coarse") return number;
  if (input.detail === "medium") return `${number} · ${input.durationSeconds.toFixed(1)}s`;
  return `${number} · ${input.durationSeconds.toFixed(2)}s${input.incomplete ? " · 待补" : ""}`;
}

export function clusterTimelinePoints<T extends { frame: number }>(points: readonly T[], frameRate: number, pixelsPerSecond: number, visibleStart: number, visibleEnd: number, options: { maxFrameDistance?: number } = {}): Array<{ key: string; frame: number; items: T[] }> {
  const pixelDistance = 18;
  const secondsPerCluster = pixelDistance / Math.max(1, pixelsPerSecond);
  const frameWindow = options.maxFrameDistance ?? Math.max(1, Math.ceil(secondsPerCluster * Math.max(1, frameRate)));
  const visible = [...points].filter((point) => point.frame / Math.max(1, frameRate) >= visibleStart && point.frame / Math.max(1, frameRate) <= visibleEnd).sort((left, right) => left.frame - right.frame);
  const clusters: Array<{ key: string; frame: number; items: T[] }> = [];
  for (const point of visible) {
    const last = clusters[clusters.length - 1];
    if (last && point.frame - last.frame <= frameWindow) {
      last.items.push(point);
      last.frame = Math.round(last.items.reduce((sum, item) => sum + item.frame, 0) / last.items.length);
    } else {
      clusters.push({ key: `${point.frame}-${clusters.length}`, frame: point.frame, items: [point] });
    }
  }
  return clusters;
}
