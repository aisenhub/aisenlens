import projectRepository from "../../project/services/projectRepository";
import type { AutoShotRunRecord, MediaSourceFingerprint } from "../../project/types";

interface RunAutoShotDetectionInput {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint;
  durationSeconds: number;
  frameRate: number;
  sensitivity: number;
  minimumShotSeconds: number;
  resumeRun?: AutoShotRunRecord | null;
  signal: AbortSignal;
  onUpdate: (run: AutoShotRunRecord) => void;
}

const SAMPLE_INTERVAL_SECONDS = 0.2;
const SAMPLE_WIDTH = 96;
const SAMPLE_HEIGHT = 54;

interface FrameSignature {
  luma: number[];
  color: number[];
  spatial: number[];
}

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
    };
    const handleSeeked = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("视频帧定位失败。"));
    };
    video.addEventListener("seeked", handleSeeked, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

async function loadVideo(sourceUrl: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.src = sourceUrl;
  await new Promise<void>((resolve, reject) => {
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("无法加载视频进行自动分镜。")), { once: true });
  });
  return video;
}

function frameSignature(context: CanvasRenderingContext2D, video: HTMLVideoElement): FrameSignature {
  context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const pixels = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
  const lumaBins = Array<number>(16).fill(0);
  const colorBins = Array<number>(64).fill(0);
  const sums = Array<number>(12).fill(0);
  const counts = Array<number>(4).fill(0);
  for (let index = 0; index < pixels.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % SAMPLE_WIDTH >= SAMPLE_WIDTH / 2 ? 1 : 0;
    const y = Math.floor(pixel / SAMPLE_WIDTH) >= SAMPLE_HEIGHT / 2 ? 1 : 0;
    const cell = y * 2 + x;
    const luma = Math.round(0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]);
    lumaBins[Math.min(15, luma >> 4)] += 1;
    const colorBin = ((pixels[index] >> 6) << 4) | ((pixels[index + 1] >> 6) << 2) | (pixels[index + 2] >> 6);
    colorBins[colorBin] += 1;
    sums[cell * 3] += pixels[index];
    sums[cell * 3 + 1] += pixels[index + 1];
    sums[cell * 3 + 2] += pixels[index + 2];
    counts[cell] += 1;
  }
  const totalPixels = Math.max(1, pixels.length / 4);
  return {
    luma: lumaBins.map((value) => value / totalPixels),
    color: colorBins.map((value) => value / totalPixels),
    spatial: sums.map((sum, index) => sum / Math.max(1, counts[Math.floor(index / 3)]) / 255),
  };
}

function sumAbsoluteDifference(previous: number[], current: number[]): number {
  return previous.reduce((score, value, index) => score + Math.abs(value - (current[index] ?? value)), 0);
}

function scoreDifference(previous: FrameSignature, current: FrameSignature): number {
  const lumaDifference = sumAbsoluteDifference(previous.luma, current.luma);
  const colorDifference = sumAbsoluteDifference(previous.color, current.color);
  const spatialDifference = sumAbsoluteDifference(previous.spatial, current.spatial) / previous.spatial.length;
  return (lumaDifference * 0.3 + colorDifference * 0.5 + spatialDifference * 0.2) * 100;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function adaptiveThreshold(differences: number[], sensitivity: number): number {
  const baseline = median(differences);
  const deviations = differences.map((difference) => Math.abs(difference - baseline));
  const robustDeviation = median(deviations);
  const multiplier = 5.5 - (Math.max(10, Math.min(100, sensitivity)) / 100) * 3.2;
  return Math.max(3, baseline + Math.max(0.6, robustDeviation) * multiplier);
}

function createRun(input: RunAutoShotDetectionInput): AutoShotRunRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    mediaFingerprint: input.mediaFingerprint,
    status: "running",
    sensitivity: input.sensitivity,
    minimumShotFrames: Math.max(1, Math.round(input.minimumShotSeconds * input.frameRate)),
    cursorFrame: 0,
    durationFrames: Math.max(1, Math.round(input.durationSeconds * input.frameRate)),
    cuts: [],
    createdAt: now,
    updatedAt: now,
    errorMessage: null,
  };
}

export async function runAutoShotDetection(input: RunAutoShotDetectionInput): Promise<AutoShotRunRecord> {
  const run: AutoShotRunRecord = input.resumeRun && input.resumeRun.status === "paused" ? { ...input.resumeRun, status: "running", errorMessage: null } : createRun(input);
  const video = await loadVideo(input.sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法创建自动分镜画布。 ");
  const stepFrames = Math.max(1, Math.round(SAMPLE_INTERVAL_SECONDS * input.frameRate));
  let cursorFrame = run.cursorFrame;
  const signatures = new Map<number, FrameSignature>();
  const signatureAt = async (frame: number): Promise<FrameSignature> => {
    const safeFrame = Math.max(0, Math.min(run.durationFrames - 1, Math.round(frame)));
    const cached = signatures.get(safeFrame);
    if (cached) return cached;
    video.currentTime = Math.min(safeFrame / input.frameRate, Math.max(0, input.durationSeconds - 0.001));
    await waitForSeek(video);
    const signature = frameSignature(context, video);
    signatures.set(safeFrame, signature);
    return signature;
  };
  let previousSignature: FrameSignature | null = null;
  let baselineSignature: FrameSignature | null = null;
  let lastCutFrame = run.cuts.at(-1)?.frame ?? 0;
  const initialDifferences: number[] = [];
  let threshold: number | null = null;
  let hardCandidate: { leftFrame: number; leftSignature: FrameSignature; frame: number; signature: FrameSignature; confidence: number; confirmations: number } | null = null;
  let gradualStartFrame: number | null = null;
  let gradualScore = 0;
  let gradualStableSamples = 0;
  const refineBoundary = async (leftFrame: number, rightFrame: number, leftSignature: FrameSignature, rightSignature: FrameSignature): Promise<number> => {
    let low = leftFrame;
    let high = rightFrame;
    for (let pass = 0; pass < 6 && high - low > 1; pass += 1) {
      if (input.signal.aborted) return high;
      const middle = Math.round((low + high) / 2);
      const middleSignature = await signatureAt(middle);
      if (scoreDifference(leftSignature, middleSignature) <= scoreDifference(middleSignature, rightSignature)) low = middle;
      else high = middle;
    }
    return high;
  };
  const addCut = (frame: number, confidence: number, kind: "hard-cut" | "gradual-transition") => {
    if (frame - lastCutFrame < run.minimumShotFrames) return false;
    run.cuts = [...run.cuts, { frame, confidence: Number(confidence.toFixed(2)), kind }];
    lastCutFrame = frame;
    return true;
  };
  try {
    while (cursorFrame < run.durationFrames) {
      if (input.signal.aborted) {
        const paused = { ...run, status: "paused" as const, cursorFrame };
        await projectRepository.saveProjectAutoShotRun(paused);
        input.onUpdate(paused);
        return paused;
      }
      const signature = await signatureAt(cursorFrame);
      if (previousSignature) {
        const stepDifference = scoreDifference(previousSignature, signature);
        if (threshold === null) {
          initialDifferences.push(stepDifference);
          if (initialDifferences.length >= 20 || cursorFrame >= Math.min(run.durationFrames, Math.round(input.frameRate * 8))) threshold = adaptiveThreshold(initialDifferences, input.sensitivity);
        } else {
          const baselineDifference = baselineSignature ? scoreDifference(baselineSignature, signature) : stepDifference;
          const suddenThreshold = threshold * 1.05;
          const gradualMinimum = Math.max(0.8, threshold * 0.08);
          const gradualMaximum = threshold * 0.65;
          if (hardCandidate) {
            const candidateAge = cursorFrame - hardCandidate.frame;
            const settled = scoreDifference(hardCandidate.signature, signature) <= Math.max(threshold * 0.75, hardCandidate.confidence * 0.7);
            const remainsChanged = scoreDifference(previousSignature, signature) >= threshold * 0.5 || scoreDifference(baselineSignature ?? previousSignature, signature) >= threshold * 0.8;
            if (candidateAge <= stepFrames * 4 && settled && remainsChanged) hardCandidate.confirmations += 1;
            else if (candidateAge > stepFrames * 4 || !remainsChanged) hardCandidate = null;
            if (hardCandidate?.confirmations && hardCandidate.confirmations >= 2) {
              const boundary = await refineBoundary(hardCandidate.leftFrame, hardCandidate.frame, hardCandidate.leftSignature, hardCandidate.signature);
              addCut(boundary, hardCandidate.confidence, "hard-cut");
              baselineSignature = signature;
              hardCandidate = null;
              gradualStartFrame = null;
              gradualScore = 0;
              gradualStableSamples = 0;
            }
          } else if (baselineDifference >= suddenThreshold && stepDifference >= threshold * 0.7) {
            hardCandidate = { leftFrame: Math.max(0, cursorFrame - stepFrames), leftSignature: previousSignature, frame: cursorFrame, signature, confidence: baselineDifference, confirmations: 0 };
            gradualStartFrame = null;
            gradualScore = 0;
            gradualStableSamples = 0;
          } else if (stepDifference >= gradualMinimum && stepDifference <= gradualMaximum) {
            gradualStartFrame ??= Math.max(0, cursorFrame - stepFrames);
            gradualScore += stepDifference;
            if (baselineDifference >= threshold && stepDifference <= gradualMinimum * 1.4) gradualStableSamples += 1;
            else gradualStableSamples = 0;
            if (gradualStartFrame !== null && gradualStableSamples >= 2 && gradualScore >= threshold * 0.85) {
              const boundary = await refineBoundary(gradualStartFrame, cursorFrame, baselineSignature ?? previousSignature, signature);
              addCut(boundary, baselineDifference, "gradual-transition");
              baselineSignature = signature;
              gradualStartFrame = null;
              gradualScore = 0;
              gradualStableSamples = 0;
            } else if (cursorFrame - gradualStartFrame > Math.round(input.frameRate * 1.5)) {
              gradualStartFrame = null;
              gradualScore = 0;
              gradualStableSamples = 0;
            }
          } else {
            gradualStartFrame = null;
            gradualScore = 0;
            gradualStableSamples = 0;
          }
        }
      }
      baselineSignature ??= signature;
      previousSignature = signature;
      cursorFrame = Math.min(run.durationFrames, cursorFrame + stepFrames);
      run.cursorFrame = cursorFrame;
      await projectRepository.saveProjectAutoShotRun(run);
      input.onUpdate({ ...run });
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    const completed = { ...run, status: "completed" as const, cursorFrame: run.durationFrames };
    await projectRepository.saveProjectAutoShotRun(completed);
    input.onUpdate(completed);
    return completed;
  } catch (error) {
    const failed = { ...run, status: "failed" as const, cursorFrame, errorMessage: error instanceof Error ? error.message : "自动分镜失败。" };
    await projectRepository.saveProjectAutoShotRun(failed);
    input.onUpdate(failed);
    return failed;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}
