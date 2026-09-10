import type { AutoShotCandidate, AutoShotTaskRecord } from "../../auto-shot/types.ts"
import type { StoredShotRecord } from "../../project/types.ts"
import type {
  CalibrationBoundary,
  CalibrationDraft,
  CalibrationDraftRecord,
  CalibrationDraftSeed,
  CalibrationSegment,
} from "../types.ts"
import { CALIBRATION_DRAFT_SCHEMA_VERSION } from "../types.ts"

function now() {
  return new Date().toISOString()
}

function assertInteger(value: number, label: string, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`${label} 无效。`)
}

export function formalShotsSignature(shots: readonly StoredShotRecord[]): string {
  // The editor creates a transient full-length placeholder before the first
  // formal save. It has no stable identity and must not invalidate a draft
  // merely because the page was refreshed.
  const meaningfulShots = shots.length === 1 && shots[0]?.startFrame === 0 ? [] : shots
  return JSON.stringify(meaningfulShots.map((shot) => [shot.order, shot.startFrame, shot.endFrame, shot.status, shot.detection, shot.primaryScreenshotId, shot.screenshotIds, shot.firstFrameScreenshotId, shot.lastFrameScreenshotId, shot.analysisFields, shot.description, shot.notes]))
}

export function isTransientFullFilmPlaceholder(shots: readonly StoredShotRecord[]): boolean {
  const [shot] = shots
  const hasMeaningfulAnalysisValue = (value: StoredShotRecord["analysisFields"][string]) => {
    if (value === null || value === undefined) return false
    if (typeof value === "string") return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  }
  return shots.length === 1 && shot?.startFrame === 0 && shot.endFrame > 0 && shot.status === "draft" && (shot.detection === null || shot.detection.source === "manual") && shot.primaryScreenshotId === null && shot.screenshotIds.length === 0 && shot.firstFrameScreenshotId === null && shot.lastFrameScreenshotId === null && Object.values(shot.analysisFields).every((value) => !hasMeaningfulAnalysisValue(value)) && shot.description.trim() === "" && shot.notes.trim() === ""
}

export function shouldSeedCalibrationFromDetection(task: AutoShotTaskRecord | null, shots: readonly StoredShotRecord[]): boolean {
  return task?.status === "completed" && task.candidates.length > 0 && isTransientFullFilmPlaceholder(shots)
}

export function deriveCalibrationSegments(
  totalFrames: number,
  boundaries: readonly CalibrationBoundary[],
  sourceShots: readonly StoredShotRecord[] = [],
  sourceCandidates: readonly AutoShotCandidate[] = [],
  previousSegments: readonly CalibrationSegment[] = [],
): CalibrationSegment[] {
  const sorted = [...boundaries].sort((a, b) => a.frame - b.frame)
  const previousLookup = new Map<string, number[]>()
  const addPreviousIndex = (key: string, index: number) => {
    const indexes = previousLookup.get(key) ?? []
    indexes.push(index)
    previousLookup.set(key, indexes)
  }
  previousSegments.forEach((segment, index) => {
    addPreviousIndex(`start:${segment.startFrame}`, index)
    addPreviousIndex(`end:${segment.endFrame}`, index)
    if (segment.sourceShotId) addPreviousIndex(`shot:${segment.sourceShotId}`, index)
    if (segment.sourceCandidateId) addPreviousIndex(`candidate:${segment.sourceCandidateId}`, index)
  })
  const usedPrevious = new Set<number>()
  return Array.from({ length: sorted.length + 1 }, (_, index) => {
    const start = index === 0 ? 0 : sorted[index - 1]!.frame
    const end = index === sorted.length ? totalFrames : sorted[index]!.frame
    const sourceShot = sourceShots.find((shot) => shot.startFrame === start && shot.endFrame === end)
    const sourceCandidate = sourceCandidates.find((candidate) => candidate.startFrame === start && candidate.endFrame === end)
    const candidateIndexes = new Set<number>([
      ...(previousLookup.get(`start:${start}`) ?? []),
      ...(previousLookup.get(`end:${end}`) ?? []),
      ...(sourceShot ? previousLookup.get(`shot:${sourceShot.id}`) ?? [] : []),
      ...(sourceCandidate ? previousLookup.get(`candidate:${sourceCandidate.id}`) ?? [] : []),
    ])
    const previousIndex = [...candidateIndexes].sort((left, right) => left - right).find((candidate) => !usedPrevious.has(candidate))
    const previous = previousIndex === undefined ? undefined : previousSegments[previousIndex]
    if (previousIndex !== undefined) usedPrevious.add(previousIndex)
    return {
      id: previous?.id ?? sourceShot?.id ?? sourceCandidate?.id ?? `calibration-segment:${crypto.randomUUID()}`,
      startBoundaryId: index === 0 ? null : sorted[index - 1]!.id,
      endBoundaryId: index === sorted.length ? null : sorted[index]!.id,
      startFrame: start,
      endFrame: end,
      sourceShotId: sourceShot?.id ?? null,
      sourceCandidateId: sourceCandidate?.id ?? null,
    }
  })
}

function boundariesFromTask(task: AutoShotTaskRecord | null, totalFrames: number): CalibrationBoundary[] {
  if (!task?.candidates.length) return []
  return task.candidates.filter((candidate) => candidate.endFrame < totalFrames).map((candidate) => ({
    id: `detected-boundary:${candidate.id}`,
    frame: candidate.endFrame,
    source: "detected" as const,
    candidateId: candidate.id,
    originalFrame: candidate.endFrame,
    wasManuallyAdjusted: false,
    transitionRange: candidate.transitionRange,
  })).filter((boundary) => boundary.frame > 0 && boundary.frame < totalFrames)
}

function boundariesFromShots(shots: readonly StoredShotRecord[], totalFrames: number): CalibrationBoundary[] {
  return shots.slice(0, -1).map((shot) => {
    const source: CalibrationBoundary["source"] = shot.detection?.source === "auto-shot" ? "detected" : "manual"
    return {
    id: `shot-boundary:${shot.id}`,
    frame: shot.endFrame,
    source,
    candidateId: shot.detection?.source === "auto-shot" ? shot.detection.candidateId : null,
    originalFrame: shot.endFrame,
    wasManuallyAdjusted: false,
    transitionRange: null,
    }
  }).filter((boundary) => boundary.frame > 0 && boundary.frame < totalFrames)
}

export function createCalibrationDraft(seed: CalibrationDraftSeed): CalibrationDraft {
  assertInteger(seed.totalFrames, "视频总帧数", 1)
  if (!Number.isFinite(seed.frameRate) || seed.frameRate <= 0) throw new Error("帧率无效。")
  const taskBoundaries = boundariesFromTask(seed.task, seed.totalFrames)
  const boundaries = taskBoundaries.length ? taskBoundaries : boundariesFromShots(seed.shots, seed.totalFrames)
  const presentationTimestamps = seed.presentationTimestamps?.length === seed.totalFrames
    ? [...seed.presentationTimestamps]
    : Array.from({ length: seed.totalFrames }, (_, frame) => frame / seed.frameRate)
  const presentationDurations = seed.presentationDurations?.length === seed.totalFrames
    ? [...seed.presentationDurations]
    : presentationTimestamps.map(() => 1 / seed.frameRate)
  const createdAt = now()
  const draft: CalibrationDraft = {
    schemaVersion: CALIBRATION_DRAFT_SCHEMA_VERSION,
    id: `calibration-draft:${seed.projectId}:${seed.mediaIdentity.mediaIdentityDigest}`,
    projectId: seed.projectId,
    mediaIdentity: structuredClone(seed.mediaIdentity),
    mediaSource: seed.mediaSource ? structuredClone(seed.mediaSource) : null,
    timebase: { kind: "frame", timingMode: seed.timingMode ?? "cfr", frameRate: seed.frameRate, totalFrames: seed.totalFrames, exact: true, presentationTimestamps, presentationDurations },
    baseProjectUpdatedAt: seed.baseProjectUpdatedAt,
    baseTaskId: seed.task?.id ?? null,
    baseTaskUpdatedAt: seed.task?.updatedAt ?? null,
    baseFormalShotsSignature: formalShotsSignature(seed.shots),
    initialSource: taskBoundaries.length ? "detection" : "formal-shots",
    revision: 0,
    status: "editing",
    boundaries,
    segments: deriveCalibrationSegments(seed.totalFrames, boundaries, seed.shots, seed.task?.candidates),
    reviewRanges: [],
    issues: [],
    applyReceipt: null,
    createdAt,
    updatedAt: createdAt,
  }
  validateCalibrationDraft(draft)
  return draft
}

export function validateCalibrationDraft(draft: CalibrationDraft): void {
  if (draft.schemaVersion !== CALIBRATION_DRAFT_SCHEMA_VERSION) throw new Error("不支持的校准草稿版本。")
  assertInteger(draft.timebase.totalFrames, "视频总帧数", 1)
  if (!Number.isFinite(draft.timebase.frameRate) || draft.timebase.frameRate <= 0) throw new Error("草稿帧率无效。")
  if (!draft.baseFormalShotsSignature) throw new Error("草稿缺少正式镜头基线。")
  if (draft.timebase.timingMode !== "cfr" && draft.timebase.timingMode !== "vfr") throw new Error("草稿时间基准类型无效。")
  if (draft.timebase.presentationTimestamps.length !== draft.timebase.totalFrames || draft.timebase.presentationDurations.length !== draft.timebase.totalFrames) throw new Error("草稿 PTS 映射不完整。")
  let previousTimestamp = -Infinity
  draft.timebase.presentationTimestamps.forEach((timestamp, index) => {
    if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp <= previousTimestamp) throw new Error("草稿 PTS 必须严格递增。")
    const duration = draft.timebase.presentationDurations[index]!
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("草稿帧时长无效。")
    previousTimestamp = timestamp
  })
  const boundaries = [...draft.boundaries].sort((a, b) => a.frame - b.frame)
  let previous = 0
  for (const boundary of boundaries) {
    assertInteger(boundary.frame, "切点帧号")
    if (boundary.frame <= previous || boundary.frame >= draft.timebase.totalFrames) throw new Error("校准切点必须严格位于视频内部且递增。")
    previous = boundary.frame
  }
  const expectedSegments = deriveCalibrationSegments(draft.timebase.totalFrames, boundaries, [], [], draft.segments)
  if (draft.segments.length !== expectedSegments.length || draft.segments.some((segment, index) => segment.startFrame !== expectedSegments[index]!.startFrame || segment.endFrame !== expectedSegments[index]!.endFrame)) {
    throw new Error("校准草稿区段未覆盖完整视频。")
  }
  for (const range of draft.reviewRanges) {
    if (range.startFrame < 0 || range.endFrame <= range.startFrame || range.endFrame > draft.timebase.totalFrames) throw new Error("巡视范围无效。")
  }
}

export function toCalibrationDraftRecord(draft: CalibrationDraft): CalibrationDraftRecord {
  validateCalibrationDraft(draft)
  return { ...structuredClone(draft), projectMediaKey: [draft.projectId, draft.mediaIdentity.mediaIdentityDigest] }
}

export function fromCalibrationDraftRecord(record: CalibrationDraftRecord): CalibrationDraft {
  const draft = structuredClone(record)
  delete (draft as Partial<CalibrationDraftRecord>).projectMediaKey
  validateCalibrationDraft(draft)
  return draft
}
