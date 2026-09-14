import type { AutoShotCandidate } from "./types";
import type { ShotData } from "../editor/constants/editorData";
import type { ShotGroupRecord } from "../group/types";
import { reconcileShotGroups } from "../group/services/reconcileShotGroups.ts";

export interface AutoShotApplyInput {
  candidates: readonly AutoShotCandidate[];
  excludedCandidateIds?: readonly string[];
  totalFrames: number;
  frameRate: number;
  currentShots: readonly ShotData[];
  currentShotFrames: Readonly<Record<string, { first: number; last: number }>>;
  currentGroups?: readonly ShotGroupRecord[];
}

export interface AutoShotReviewSummary {
  candidateCount: number;
  createdCount: number;
  preservedCount: number;
  changedCount: number;
  removedCount: number;
  changedGroupCount: number;
  removedGroupCount: number;
}

export interface AutoShotApplyOutput {
  shots: ShotData[];
  shotFrames: Record<string, { first: number; last: number }>;
  groups: ShotGroupRecord[];
  summary: AutoShotReviewSummary;
}

/** Prefer the detector's exact covered range over a rounded HTMLMediaElement duration. */
export function resolveAutoShotTotalFrames(candidates: readonly AutoShotCandidate[], durationSeconds: number, frameRate: number): number {
  const detectedTotalFrames = candidates.reduce(
    (maximum, candidate) => Math.max(maximum, candidate.endFrame),
    0,
  )
  return detectedTotalFrames > 0
    ? detectedTotalFrames
    : Math.max(1, Math.round(durationSeconds * frameRate))
}

function validBoundary(frame: number, totalFrames: number): boolean {
  return Number.isSafeInteger(frame) && frame >= 0 && frame <= totalFrames;
}

function assertCandidates(candidates: readonly AutoShotCandidate[], totalFrames: number): void {
  if (!Number.isSafeInteger(totalFrames) || totalFrames <= 0) throw new Error("视频总帧数无效。");
  let expectedStart = 0;
  for (const candidate of candidates) {
    if (!validBoundary(candidate.startFrame, totalFrames) || !validBoundary(candidate.endFrame, totalFrames) || candidate.startFrame !== expectedStart || candidate.endFrame <= candidate.startFrame) {
      throw new Error("自动分镜候选区间必须连续且使用半开区间。");
    }
    expectedStart = candidate.endFrame;
  }
  if (expectedStart !== totalFrames) throw new Error("自动分镜候选区间未覆盖完整视频。");
}

function previousShotForRange(shots: readonly ShotData[], ranges: Readonly<Record<string, { first: number; last: number }>>, startFrame: number, endFrame: number): ShotData | null {
  return shots.find((shot) => {
    const range = ranges[shot.id];
    return range?.first === startFrame && range.last === endFrame - 1;
  }) ?? null;
}

export function applyAutoShotCandidates(input: AutoShotApplyInput): AutoShotApplyOutput {
  const excluded = new Set(input.excludedCandidateIds ?? []);
  const selected = input.candidates.filter((candidate) => !excluded.has(candidate.id));
  if (selected.length === 0) throw new Error("至少需要保留一个自动分镜候选区间。");
  const normalized = selected.map((candidate) => ({ ...candidate }));
  if (excluded.size > 0) {
    normalized[0]!.startFrame = 0;
    for (let index = 0; index < normalized.length - 1; index += 1) {
      normalized[index]!.endFrame = normalized[index + 1]!.startFrame;
    }
    normalized[normalized.length - 1]!.endFrame = input.totalFrames;
  }
  assertCandidates(normalized, input.totalFrames);
  if (!Number.isFinite(input.frameRate) || input.frameRate <= 0) throw new Error("帧率无效。");
  const shots: ShotData[] = [];
  const shotFrames: Record<string, { first: number; last: number }> = {};
  let preservedCount = 0;
  let changedCount = 0;
  for (const candidate of normalized) {
    const previous = previousShotForRange(input.currentShots, input.currentShotFrames, candidate.startFrame, candidate.endFrame);
    const id = previous?.id ?? crypto.randomUUID();
    if (previous) preservedCount += 1;
    else changedCount += 1;
    shots.push(previous ? { ...previous, start: candidate.startFrame / input.frameRate, duration: (candidate.endFrame - candidate.startFrame) / input.frameRate } : {
      id,
      start: candidate.startFrame / input.frameRate,
      duration: (candidate.endFrame - candidate.startFrame) / input.frameRate,
      type: "未分析",
      motion: "未分析",
      color: "未分析",
    });
    shotFrames[id] = { first: candidate.startFrame, last: candidate.endFrame - 1 };
  }
  const previousGroups = input.currentGroups ? [...input.currentGroups] : [];
  const groups = reconcileShotGroups(previousGroups, shots.map((shot) => shot.id));
  const previousById = new Map(previousGroups.map((group) => [group.id, group]));
  const nextById = new Map(groups.map((group) => [group.id, group]));
  const changedGroupCount = groups.filter((group) => JSON.stringify(group) !== JSON.stringify(previousById.get(group.id))).length;
  const removedGroupCount = previousGroups.filter((group) => !nextById.has(group.id)).length;
  return {
    shots,
    shotFrames,
    groups,
    summary: {
      candidateCount: input.candidates.length,
      createdCount: changedCount,
      preservedCount,
      changedCount,
      removedCount: Math.max(0, input.currentShots.length - preservedCount),
      changedGroupCount,
      removedGroupCount,
    },
  };
}
