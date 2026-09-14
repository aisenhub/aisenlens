import projectRepository from "../../project/services/projectRepository"
import { inspectMediaFrameTimeline } from "../../video/services/mediaFrameTimeService"
import type { CalibrationDraftSeed } from "../types"
import { createDetectionCalibrationDraft } from "./calibrationDraftService"

export default async function prepareDetectionCalibration(sourceUrl: string, seed: Omit<CalibrationDraftSeed, "totalFrames">) {
  const timeline = await inspectMediaFrameTimeline(sourceUrl, seed.frameRate)
  const stored = await projectRepository.getCalibrationDraft(seed.projectId, seed.mediaIdentity)
  const draft = createDetectionCalibrationDraft({
    ...seed,
    totalFrames: timeline.totalFrames,
    timingMode: timeline.timingMode,
    presentationTimestamps: timeline.points.map((point) => point.timestamp),
    presentationDurations: timeline.points.map((point) => point.duration),
  }, stored)
  await projectRepository.saveCalibrationDraft(draft, stored?.revision)
}
