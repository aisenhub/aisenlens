export type MediaTimingMode = "cfr" | "vfr"

export interface MediaFramePoint {
  frame: number
  timestamp: number
  duration: number
}

export interface MediaFrameTimeline {
  timingMode: MediaTimingMode
  frameRate: number
  totalFrames: number
  durationSeconds: number
  points: readonly MediaFramePoint[]
}

function assertPositiveRate(frameRate: number) {
  if (!Number.isFinite(frameRate) || frameRate <= 0) throw new Error("媒体帧率无效，无法建立帧时间基准。")
}

export function classifyPresentationTimestamps(timestamps: readonly number[], frameRate: number, tolerance = 0.000005): MediaTimingMode {
  assertPositiveRate(frameRate)
  if (timestamps.length < 3) return "cfr"
  const expectedDuration = 1 / frameRate
  const allowed = Math.max(tolerance, expectedDuration * 0.00025)
  return timestamps.slice(1).every((timestamp, index) => Math.abs(timestamp - timestamps[index]! - expectedDuration) <= allowed) ? "cfr" : "vfr"
}

export function frameToTimestamp(timeline: Pick<MediaFrameTimeline, "points" | "totalFrames">, frame: number): number {
  if (!timeline.totalFrames || !timeline.points.length) return 0
  const safeFrame = Math.max(0, Math.min(timeline.totalFrames, Math.round(frame)))
  if (safeFrame === timeline.totalFrames) {
    const last = timeline.points[timeline.points.length - 1]!
    return last.timestamp + last.duration
  }
  return timeline.points[safeFrame]?.timestamp ?? 0
}

export function frameToTimestampFromArrays(timestamps: readonly number[], durations: readonly number[], frame: number): number {
  if (!timestamps.length) return 0
  const safeFrame = Math.max(0, Math.min(timestamps.length, Math.round(frame)))
  if (safeFrame === timestamps.length) return timestamps[safeFrame - 1]! + (durations[safeFrame - 1] ?? 0)
  return timestamps[safeFrame]!
}

export function frameDuration(timeline: Pick<MediaFrameTimeline, "points" | "totalFrames">, frame: number): number {
  if (!timeline.totalFrames || !timeline.points.length) return 0
  const safeFrame = Math.max(0, Math.min(timeline.totalFrames - 1, Math.round(frame)))
  return timeline.points[safeFrame]?.duration ?? 0
}

export function timestampToFrame(timeline: Pick<MediaFrameTimeline, "points" | "totalFrames">, timestamp: number): number {
  if (!timeline.totalFrames || !timeline.points.length || !Number.isFinite(timestamp)) return 0
  let low = 0
  let high = timeline.points.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (timeline.points[middle]!.timestamp <= timestamp) low = middle + 1
    else high = middle - 1
  }
  return Math.max(0, Math.min(timeline.totalFrames - 1, high))
}

export function timestampToFrameIndex(timestamps: readonly number[], timestamp: number): number {
  if (!timestamps.length || !Number.isFinite(timestamp)) return 0
  let low = 0
  let high = timestamps.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (timestamps[middle]! <= timestamp) low = middle + 1
    else high = middle - 1
  }
  return Math.max(0, Math.min(timestamps.length - 1, high))
}

export async function inspectMediaFrameTimeline(sourceUrl: string, declaredFrameRate: number, signal?: AbortSignal): Promise<MediaFrameTimeline> {
  assertPositiveRate(declaredFrameRate)
  if (signal?.aborted) throw new DOMException("媒体时间基准检查已取消。", "AbortError")
  const response = await fetch(sourceUrl, { signal })
  if (!response.ok) throw new Error(`无法读取媒体以验证 PTS：${response.status}`)
  const { ALL_FORMATS, BlobSource, EncodedPacketSink, Input } = await import("mediabunny")
  const input = new Input({ source: new BlobSource(await response.blob()), formats: ALL_FORMATS })
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("媒体没有可用的视频轨道，无法验证 PTS。")
    const packets = new EncodedPacketSink(track)
    const points: MediaFramePoint[] = []
    for await (const packet of packets.packets(undefined, undefined, { metadataOnly: true })) {
      const end = packet.timestamp + packet.duration
      if (end <= 0) continue
      points.push({ frame: 0, timestamp: Math.max(0, packet.timestamp), duration: packet.duration > 0 ? packet.duration : 1 / declaredFrameRate })
      if (signal?.aborted) throw new DOMException("媒体时间基准检查已取消。", "AbortError")
    }
    points.sort((left, right) => left.timestamp - right.timestamp)
    points.forEach((point, index) => { point.frame = index })
    if (!points.length) throw new Error("没有读取到可呈现的视频帧，无法验证 PTS。")
    const timingMode = classifyPresentationTimestamps(points.map((point) => point.timestamp), declaredFrameRate)
    const last = points[points.length - 1]!
    return { timingMode, frameRate: declaredFrameRate, totalFrames: points.length, durationSeconds: last.timestamp + last.duration, points }
  } finally {
    input.dispose()
  }
}
