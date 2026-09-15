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
  // Calibration only depends on the formal structure. Notes, analysis fields,
  // screenshots and status are edited in other workflow surfaces and must not
  // invalidate a calibration draft when those surfaces autosave.
  return JSON.stringify(meaningfulShots.map((shot) => [shot.id, shot.order, shot.startFrame, shot.endFrame]))
}

export function isTransientFullFilmPlaceholder(shots: readonly StoredShotRecord[]): boolean {
  const [shot] = shots
  const hasMeaningfulAnalysisValue = (value: StoredShotRecord["analysisFields"][string]) => {
    if (!value) return false
    if (value.state !== "set") return true
    if (typeof value.value === "string") return value.value.trim().length > 0
    if (Array.isArray(value.value)) return value.value.length > 0
    return true
  }
  return shots.length === 1 && shot?.startFrame === 0 && shot.endFrame > 0 && shot.status === "draft" && (shot.detection === null || shot.detection.source === "manual") && shot.primaryScreenshotId === null && shot.screenshotIds.length === 0 && shot.firstFrameScreenshotId === null && shot.lastFrameScreenshotId === null && Object.values(shot.analysisFields).every((value) => !hasMeaningfulAnalysisValue(value)) && shot.description.trim() === "" && shot.notes.trim() === ""
}

export function shouldSeedCalibrationFromDetection(task: AutoShotTaskRecord | null, shots: readonly StoredShotRecord[]): boolean {
  return task?.status === "completed" && task.candidates.length > 0 && isTransientFullFilmPlaceholder(shots)
}

// An explicit Apply action selects the completed task, regardless of whether
// the editor's full-film shot already has screenshots or analysis fields.
export function createDetectionCalibrationDraft(seed: CalibrationDraftSeed, stored: CalibrationDraft | null): CalibrationDraft {
  const task = seed.task
  if (!task || task.status !== "completed" || task.candidates.length === 0) throw new Error("请先完成自动分镜扫描。")
  if (task.projectId !== seed.projectId || task.mediaIdentity.mediaIdentityDigest !== seed.mediaIdentity.mediaIdentityDigest) throw new Error("检测结果与当前素材不匹配。")
  const sameDetectionTask = stored?.status === "editing" && stored.initialSource === "detection" && stored.baseTaskId === task.id && stored.baseTaskUpdatedAt === task.updatedAt
  if (sameDetectionTask) return reconcileCalibrationDraftWithFormalShots(stored, seed)
  return { ...createCalibrationDraft(seed), revision: (stored?.revision ?? -1) + 1 }
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

function isCalibrationBoundaryUserOwned(boundary: CalibrationBoundary): boolean {
  return boundary.source === "manual" || boundary.wasManuallyAdjusted
}

function boundarySourceShotIds(draft: CalibrationDraft): Map<string, string> {
  const sourceShotIds = new Map<string, string>()
  draft.segments.forEach((segment) => {
    if (segment.endBoundaryId && segment.sourceShotId) sourceShotIds.set(segment.endBoundaryId, segment.sourceShotId)
  })
  return sourceShotIds
}

function boundaryShotId(boundary: CalibrationBoundary): string | null {
  return boundary.id.startsWith("shot-boundary:") ? boundary.id.slice("shot-boundary:".length) : null
}

/**
 * Rebase an editing draft onto the latest formal shot structure.
 *
 * A calibration draft and the editor are intentionally separate working
 * copies. The editor may still receive a structural edit while the draft is
 * open (for example, a split made during deep analysis). The latest formal
 * boundaries are therefore merged into the draft instead of turning the
 * whole page into a dead-end conflict. Manual calibration boundaries remain
 * authoritative; formal-source boundaries are updated/removed by stable shot
 * identity, and detection-source boundaries are retained because they are the
 * user's current calibration baseline.
 */
export function reconcileCalibrationDraftWithFormalShots(
  draft: CalibrationDraft,
  input: Pick<CalibrationDraftSeed, "baseProjectUpdatedAt" | "shots" | "task">,
): CalibrationDraft {
  const nextSignature = formalShotsSignature(input.shots)
  const hasMeaningfulFormalShots = !isTransientFullFilmPlaceholder(input.shots)
  const currentFormalBoundaries = hasMeaningfulFormalShots
    ? boundariesFromShots(input.shots, draft.timebase.totalFrames)
    : []
  const previousSourceShotIds = boundarySourceShotIds(draft)
  const previousById = new Map(draft.boundaries.map((boundary) => [boundary.id, boundary]))
  const previousByCandidate = new Map(
    draft.boundaries
      .filter((boundary) => boundary.candidateId)
      .map((boundary) => [boundary.candidateId!, boundary]),
  )
  const previousBySourceShot = new Map(
    draft.boundaries
      .map((boundary) => [previousSourceShotIds.get(boundary.id), boundary] as const)
      .filter((entry): entry is readonly [string, CalibrationBoundary] => Boolean(entry[0])),
  )
  const merged: CalibrationBoundary[] = []
  const usedPrevious = new Set<string>()

  const addBoundary = (boundary: CalibrationBoundary) => {
    const existingIndex = merged.findIndex((item) => item.frame === boundary.frame)
    if (existingIndex >= 0) {
      // User-owned calibration edits win when they occupy the same frame as a
      // formal boundary added by another workflow surface.
      if (isCalibrationBoundaryUserOwned(boundary) && !isCalibrationBoundaryUserOwned(merged[existingIndex]!)) merged[existingIndex] = boundary
      return
    }
    merged.push(boundary)
  }

  if (draft.initialSource === "detection" || !hasMeaningfulFormalShots) {
    // Detection drafts do not have a reliable formal-shot identity for every
    // segment. Keeping their existing boundaries preserves calibration work;
    // the latest formal boundaries are added below.
    draft.boundaries.forEach((boundary) => {
      addBoundary(boundary)
      usedPrevious.add(boundary.id)
    })
  } else {
    // For drafts seeded from formal shots, a non-manual boundary can safely be
    // moved or removed by matching the stable source shot at its left edge.
    currentFormalBoundaries.forEach((currentBoundary) => {
      const sourceShotId = boundaryShotId(currentBoundary)
      const previous = previousById.get(currentBoundary.id)
        ?? (currentBoundary.candidateId ? previousByCandidate.get(currentBoundary.candidateId) : undefined)
        ?? (sourceShotId ? previousBySourceShot.get(sourceShotId) : undefined)
      if (previous) {
        usedPrevious.add(previous.id)
        if (isCalibrationBoundaryUserOwned(previous)) addBoundary(previous)
        else addBoundary({ ...currentBoundary, id: previous.id })
      } else {
        addBoundary(currentBoundary)
      }
    })
    draft.boundaries.filter((boundary) => isCalibrationBoundaryUserOwned(boundary)).forEach((boundary) => {
      if (!usedPrevious.has(boundary.id)) addBoundary(boundary)
    })
  }

  if (draft.initialSource === "detection" && hasMeaningfulFormalShots) {
    currentFormalBoundaries.forEach((boundary) => {
      const previous = boundary.candidateId ? previousByCandidate.get(boundary.candidateId) : undefined
      addBoundary(previous && !isCalibrationBoundaryUserOwned(previous) ? { ...boundary, id: previous.id } : boundary)
    })
  }

  merged.sort((left, right) => left.frame - right.frame)
  const boundariesChanged = JSON.stringify(merged) !== JSON.stringify([...draft.boundaries].sort((left, right) => left.frame - right.frame))
  const metadataChanged = draft.baseProjectUpdatedAt !== input.baseProjectUpdatedAt || draft.baseFormalShotsSignature !== nextSignature
  if (!boundariesChanged && !metadataChanged) return draft

  const next: CalibrationDraft = {
    ...structuredClone(draft),
    baseProjectUpdatedAt: input.baseProjectUpdatedAt,
    baseFormalShotsSignature: nextSignature,
    boundaries: merged,
    segments: deriveCalibrationSegments(draft.timebase.totalFrames, merged, input.shots, input.task?.candidates ?? [], draft.segments),
    revision: draft.revision + 1,
    updatedAt: now(),
  }
  validateCalibrationDraft(next)
  return next
}

export function createCalibrationDraft(seed: CalibrationDraftSeed): CalibrationDraft {
  assertInteger(seed.totalFrames, "视频总帧数", 1)
  if (!Number.isFinite(seed.frameRate) || seed.frameRate <= 0) throw new Error("帧率无效。")
  const taskBoundaries = boundariesFromTask(seed.task, seed.totalFrames)
  const fromDetection = seed.task?.status === "completed" && seed.task.candidates.length > 0
  const boundaries = fromDetection ? taskBoundaries : boundariesFromShots(seed.shots, seed.totalFrames)
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
    initialSource: fromDetection ? "detection" : "formal-shots",
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
