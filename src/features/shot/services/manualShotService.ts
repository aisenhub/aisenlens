import type { ShotFrameRange } from "../types"

export type ManualShotSplitFailureCode =
  | "media-not-ready"
  | "no-active-shot"
  | "at-start"
  | "at-end"
  | "at-boundary"
  | "range-invalid"

export type ManualShotSplitResult =
  | {
      ok: true
      originalRange: ShotFrameRange
      newRange: ShotFrameRange
    }
  | {
      ok: false
      code: ManualShotSplitFailureCode
    }

interface SplitManualShotAtFrameInput {
  ranges: ShotFrameRange[]
  targetShotId: string | null
  splitFrame: number
  createShotId: () => string
}

export function getManualShotSplitFailureMessage(
  code: ManualShotSplitFailureCode,
): string {
  const messages: Record<ManualShotSplitFailureCode, string> = {
    "media-not-ready": "视频尚未就绪，暂时不能分割分镜。",
    "no-active-shot": "当前播放头没有对应的分镜。",
    "at-start": "播放头位于视频或分镜起点，不能在此处分割。",
    "at-end": "播放头位于视频或分镜终点，不能在此处分割。",
    "at-boundary": "播放头正位于已有分镜边界，无需再次分割。",
    "range-invalid": "当前分镜范围无效，无法分割。",
  }
  return messages[code]
}

export function splitManualShotAtFrame({
  ranges,
  targetShotId,
  splitFrame,
  createShotId,
}: SplitManualShotAtFrameInput): ManualShotSplitResult {
  if (
    !Number.isInteger(splitFrame) ||
    ranges.some(
      (range) =>
        !Number.isInteger(range.startFrame) ||
        !Number.isInteger(range.endFrame) ||
        range.endFrame <= range.startFrame,
    )
  ) {
    return { ok: false, code: "range-invalid" }
  }

  if (!targetShotId) return { ok: false, code: "no-active-shot" }

  const targetIndex = ranges.findIndex((range) => range.id === targetShotId)
  const targetRange = ranges[targetIndex]
  if (!targetRange) return { ok: false, code: "no-active-shot" }

  if (splitFrame === targetRange.startFrame && targetIndex > 0) {
    return { ok: false, code: "at-boundary" }
  }
  if (splitFrame === targetRange.endFrame && targetIndex < ranges.length - 1) {
    return { ok: false, code: "at-boundary" }
  }
  if (splitFrame <= targetRange.startFrame) {
    return { ok: false, code: "at-start" }
  }
  if (splitFrame >= targetRange.endFrame) {
    return { ok: false, code: "at-end" }
  }

  return {
    ok: true,
    originalRange: { ...targetRange, endFrame: splitFrame },
    newRange: {
      id: createShotId(),
      startFrame: splitFrame,
      endFrame: targetRange.endFrame,
    },
  }
}
