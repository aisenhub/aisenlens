import type { AutoShotCandidate } from "../../auto-shot/types";
import type {
  CalibrationAnnotationRecord,
  CalibrationBoundaryConfidence,
  CalibrationHardCut,
  CalibrationManifest,
  CalibrationManifestEntry,
  CalibrationSplit,
  CalibrationUncertainRange,
  CalibrationValidationIssue,
  HardCutPrediction,
  HardCutScore,
  SearchSweepCandidate,
  SearchSweepResult,
} from "../types";

const MINIMUMS: Record<string, { videos: number; hardCuts: number }> = {
  "general:search": { videos: 0, hardCuts: 0 },
  "general:holdout": { videos: 12, hardCuts: 150 },
  "specialized:search": { videos: 8, hardCuts: 100 },
  "specialized:holdout": { videos: 4, hardCuts: 50 },
};

function issue(code: CalibrationValidationIssue["code"], path: string, message: string): CalibrationValidationIssue {
  return { code, path, message };
}

function validInteger(value: unknown, min = 0): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min;
}

function validateAnnotation(annotation: CalibrationAnnotationRecord, path: string): CalibrationValidationIssue[] {
  const issues: CalibrationValidationIssue[] = [];
  if (annotation.schemaVersion !== 1) issues.push(issue("INVALID_SCHEMA", `${path}.schemaVersion`, "标注 schemaVersion 必须为 1。"));
  if (!annotation.annotator.trim()) issues.push(issue("INVALID_SCHEMA", `${path}.annotator`, "必须记录标注者。"));
  if (annotation.reviewStatus === "disputed") issues.push(issue("UNRESOLVED_DISPUTE", `${path}.reviewStatus`, "未解决的标注分歧不能进入评分。"));
  for (const [index, boundary] of annotation.hardCuts.entries()) {
    if (!validInteger(boundary.timestampUs) || !validInteger(boundary.frame, 1) || boundary.timestampUs >= annotation.media.durationUs) {
      issues.push(issue("INVALID_BOUNDARY", `${path}.hardCuts[${index}]`, "hard-cut 必须是媒体内部的非负微秒时间和正帧号。"));
    }
  }
  for (const [index, range] of annotation.uncertainRanges.entries()) {
    if (!validInteger(range.startUs) || !validInteger(range.endUs) || range.startUs >= range.endUs || range.endUs > annotation.media.durationUs) {
      issues.push(issue("INVALID_BOUNDARY", `${path}.uncertainRanges[${index}]`, "不确定范围必须是媒体时长内的半开区间。"));
    }
  }
  return issues;
}

export function validateCalibrationManifests(search: CalibrationManifest, holdout: CalibrationManifest): CalibrationValidationIssue[] {
  const issues: CalibrationValidationIssue[] = [];
  const all = [...search.fixtures, ...holdout.fixtures];
  const ids = new Set<string>();
  const sourceSplits = new Map<string, CalibrationSplit>();
  for (const entry of all) {
    if (ids.has(entry.fixtureId)) issues.push(issue("DUPLICATE_FIXTURE", `fixtures.${entry.fixtureId}`, "fixtureId 不能重复。"));
    ids.add(entry.fixtureId);
    const sourceKey = `${entry.source.workId}:${entry.source.url}`;
    const previous = sourceSplits.get(sourceKey);
    if (previous && previous !== entry.split) issues.push(issue("SPLIT_LEAKAGE", `fixtures.${entry.fixtureId}.split`, "同一作品/来源不能同时出现在 search 和 holdout。"));
    sourceSplits.set(sourceKey, entry.split);
    if (entry.annotation.fixtureId !== entry.fixtureId || entry.annotation.split !== entry.split || entry.annotation.sha256 !== entry.sha256) {
      issues.push(issue("IDENTITY_MISMATCH", `fixtures.${entry.fixtureId}.annotation`, "manifest 与 annotation 的 fixture、split、checksum 必须一致。"));
    }
    issues.push(...validateAnnotation(entry.annotation, `fixtures.${entry.fixtureId}.annotation`));
  }
  const specialized = all.some((entry) => entry.fixtureId !== "general");
  for (const [name, manifest] of [["search", search], ["holdout", holdout]] as const) {
    const minimum = MINIMUMS[`${specialized ? "specialized" : "general"}:${name}`];
    const hardCuts = manifest.fixtures.reduce((sum, entry) => sum + entry.annotation.hardCuts.filter((cut) => cut.confidence === "confirmed").length, 0);
    if (manifest.fixtures.length < minimum.videos || hardCuts < minimum.hardCuts) {
      issues.push(issue("INSUFFICIENT_SAMPLES", `${name}.fixtures`, `${name} 需要至少 ${minimum.videos} 个视频和 ${minimum.hardCuts} 个 confirmed hard-cut，当前为 ${manifest.fixtures.length}/${hardCuts}。`));
    }
  }
  return issues;
}

export function assertCalibrationManifests(search: CalibrationManifest, holdout: CalibrationManifest): void {
  const issues = validateCalibrationManifests(search, holdout);
  if (issues.length) throw new Error(issues.map((item) => `${item.code} ${item.path}: ${item.message}`).join("\n"));
}

export function updateHardCutAnnotation(annotation: CalibrationAnnotationRecord, operation: "accept" | "reject" | "add" | "move" | "delete", input: { candidate?: AutoShotCandidate; id?: string; timestampUs?: number; frame?: number; confidence?: CalibrationBoundaryConfidence; note?: string }): CalibrationAnnotationRecord {
  const next = structuredClone(annotation);
  if (operation === "accept" && input.candidate?.kind === "hard-cut" && input.candidate.boundary) {
    const candidate = input.candidate;
    if (!next.hardCuts.some((cut) => cut.id === `candidate:${candidate.id}`)) next.hardCuts.push({ id: `candidate:${candidate.id}`, timestampUs: candidate.boundary?.timestampUs ?? 0, frame: candidate.startFrame, confidence: input.confidence ?? "confirmed", source: "candidate", candidateId: candidate.id, note: input.note });
  } else if (operation === "reject" && input.id) {
    next.hardCuts = next.hardCuts.filter((cut) => cut.id !== input.id);
  } else if (operation === "add" && validInteger(input.timestampUs) && validInteger(input.frame, 1)) {
    next.hardCuts.push({ id: `manual:${crypto.randomUUID()}`, timestampUs: input.timestampUs, frame: input.frame, confidence: input.confidence ?? "confirmed", source: "manual", note: input.note });
  } else if (operation === "move" && input.id && validInteger(input.timestampUs) && validInteger(input.frame, 1)) {
    next.hardCuts = next.hardCuts.map((cut) => cut.id === input.id ? { ...cut, timestampUs: input.timestampUs!, frame: input.frame! } : cut);
  } else if (operation === "delete" && input.id) {
    next.hardCuts = next.hardCuts.filter((cut) => cut.id !== input.id);
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

export function serializeCalibrationAnnotation(annotation: CalibrationAnnotationRecord): string {
  return `${JSON.stringify(annotation, null, 2)}\n`;
}

export function parseCalibrationAnnotation(value: string): CalibrationAnnotationRecord {
  const parsed = JSON.parse(value) as CalibrationAnnotationRecord;
  const issues = validateAnnotation(parsed, "annotation");
  if (issues.length) throw new Error(issues.map((item) => `${item.code} ${item.path}: ${item.message}`).join("\n"));
  return parsed;
}

export async function hashCalibrationManifest(manifest: CalibrationManifest): Promise<string> {
  const canonical = JSON.stringify(manifest);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function addUncertainRange(annotation: CalibrationAnnotationRecord, range: Omit<CalibrationUncertainRange, "id">): CalibrationAnnotationRecord {
  return { ...structuredClone(annotation), uncertainRanges: [...annotation.uncertainRanges, { ...range, id: `uncertain:${crypto.randomUUID()}` }], updatedAt: new Date().toISOString() };
}

export function scoreHardCuts(predictions: HardCutPrediction[], truth: CalibrationHardCut[], durationUs: number, toleranceFrames = 2): HardCutScore {
  const confirmed = truth.filter((boundary) => boundary.confidence === "confirmed");
  const sortedPredictions = [...predictions].sort((left, right) => left.frame - right.frame || left.id.localeCompare(right.id));
  const sortedTruth = [...confirmed].sort((left, right) => left.frame - right.frame || left.id.localeCompare(right.id));
  const used = new Set<number>();
  const offsets: number[] = [];
  let matchedCount = 0;
  for (const prediction of sortedPredictions) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    sortedTruth.forEach((target, index) => {
      if (used.has(index)) return;
      const distance = Math.abs(prediction.frame - target.frame);
      if (distance <= toleranceFrames && (distance < bestDistance || (distance === bestDistance && target.frame < (bestIndex < 0 ? Infinity : sortedTruth[bestIndex].frame)))) {
        bestIndex = index;
        bestDistance = distance;
      }
    });
    if (bestIndex >= 0) {
      used.add(bestIndex);
      offsets.push(bestDistance);
      matchedCount += 1;
    }
  }
  const predictedCount = sortedPredictions.length;
  const truthCount = sortedTruth.length;
  const precision = predictedCount ? matchedCount / predictedCount : truthCount ? 0 : 1;
  const recall = truthCount ? matchedCount / truthCount : predictedCount ? 0 : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const orderedOffsets = [...offsets].sort((left, right) => left - right);
  const p95AbsoluteOffsetFrames = orderedOffsets.length ? orderedOffsets[Math.min(orderedOffsets.length - 1, Math.ceil(orderedOffsets.length * 0.95) - 1)] : null;
  return { predictedCount, truthCount, matchedCount, precision, recall, f1, meanAbsoluteOffsetFrames: offsets.length ? offsets.reduce((sum, value) => sum + value, 0) / offsets.length : null, p95AbsoluteOffsetFrames, falsePositivesPerMinute: durationUs > 0 ? ((predictedCount - matchedCount) / durationUs) * 60_000_000 : 0 };
}

export function runSearchSweep(input: { search: CalibrationManifest; candidates: SearchSweepCandidate[]; datasetChecksum: string; evaluate: (entry: CalibrationManifestEntry, resolved: SearchSweepCandidate["resolved"]) => HardCutPrediction[] }): SearchSweepResult {
  if (input.search.fixtures.some((entry) => entry.split !== "search")) throw new Error("sweep 只能读取 search split。holdout 数据不得传入参数搜索。");
  const candidates = [...input.candidates].sort((left, right) => left.id.localeCompare(right.id));
  return {
    split: "search",
    datasetVersion: input.search.datasetVersion,
    datasetChecksum: input.datasetChecksum,
    candidates: candidates.map((candidate) => {
      const scores = input.search.fixtures.map((entry) => scoreHardCuts(input.evaluate(entry, candidate.resolved), entry.annotation.hardCuts, entry.media.durationUs));
      const aggregate = scores.reduce((current, score) => ({ ...current, predictedCount: current.predictedCount + score.predictedCount, truthCount: current.truthCount + score.truthCount, matchedCount: current.matchedCount + score.matchedCount, meanAbsoluteOffsetFrames: null, p95AbsoluteOffsetFrames: null, falsePositivesPerMinute: current.falsePositivesPerMinute + score.falsePositivesPerMinute }), { predictedCount: 0, truthCount: 0, matchedCount: 0, precision: 0, recall: 0, f1: 0, meanAbsoluteOffsetFrames: null, p95AbsoluteOffsetFrames: null, falsePositivesPerMinute: 0 } satisfies HardCutScore);
      const precision = aggregate.predictedCount ? aggregate.matchedCount / aggregate.predictedCount : 0;
      const recall = aggregate.truthCount ? aggregate.matchedCount / aggregate.truthCount : 0;
      return { id: candidate.id, configHash: candidate.resolved.configHash, canonicalConfig: candidate.resolved.canonicalConfig, score: { ...aggregate, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 } };
    }),
  };
}
