import { getFrameStep } from '../../utils/player.js';

function computeSceneSignature(data, width, height) {
  const lumaBins = new Array(16).fill(0);
  const colorBins = new Array(64).fill(0);
  const spatialSums = new Array(16).fill(0);
  const spatialCounts = new Array(4).fill(0);
  for (let index = 0; index < data.length; index += 4) {
    const luma = (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) | 0;
    lumaBins[Math.min(15, Math.max(0, luma >> 4))] += 1;
    const redBin = data[index] >> 6;
    const greenBin = data[index + 1] >> 6;
    const blueBin = data[index + 2] >> 6;
    colorBins[(redBin << 4) | (greenBin << 2) | blueBin] += 1;
    const pixelIndex = index / 4;
    const cellX = pixelIndex % width >= width / 2 ? 1 : 0;
    const cellY = Math.floor(pixelIndex / width) >= height / 2 ? 1 : 0;
    const cellIndex = cellY * 2 + cellX;
    const spatialOffset = cellIndex * 4;
    spatialCounts[cellIndex] += 1;
    spatialSums[spatialOffset] += data[index] / 255;
    spatialSums[spatialOffset + 1] += data[index + 1] / 255;
    spatialSums[spatialOffset + 2] += data[index + 2] / 255;
    spatialSums[spatialOffset + 3] += luma / 255;
  }
  const total = Math.max(1, data.length / 4);
  return {
    luma: lumaBins.map(value => value / total),
    color: colorBins.map(value => value / total),
    spatial: spatialSums.map((value, index) => value / Math.max(1, spatialCounts[Math.floor(index / 4)]))
  };
}

function createFallbackDetector(video, fps, options, signatureAt) {
  const abort = options.abort;
  const diffScore = (first, second) => {
    if (!first || !second) return 0;
    const lumaDiff = first.luma.reduce((sum, value, index) => sum + Math.abs(value - second.luma[index]), 0);
    const colorDiff = first.color.reduce((sum, value, index) => sum + Math.abs(value - second.color[index]), 0);
    const spatialDiff = first.spatial.reduce((sum, value, index) => sum + Math.abs(value - second.spatial[index]), 0) / first.spatial.length;
    return (lumaDiff * 0.3 + colorDiff * 0.45 + spatialDiff * 0.25) * 100;
  };

  async function runBetween(start, end) {
    const frameStep = getFrameStep(fps);
    const step = Math.max(0.12, Math.min(0.2, frameStep * 5));
    const cuts = [];
    let time = Math.max(0, Math.min(video.duration, start));
    const endTime = Math.max(0, Math.min(video.duration, end));
    let lastCutTime = time;
    let lastSignature = await signatureAt(time);
    let baselineSignature = lastSignature;
    let previousTime = time;
    let suddenCandidate = null;
    let gradualStartTime = null;
    let gradualStartSignature = null;
    let gradualAccumulation = 0;
    let gradualCrossTime = null;
    let gradualStableSamples = 0;
    const threshold = Number(options.diff) || 28;
    const minGap = Number(options.minGap) || 0.35;
    const suddenThreshold = Math.max(threshold * 1.05, 24);
    const suddenConfirmThreshold = Math.max(threshold * 0.9, 20);
    const gradualStepMinimum = Math.max(1.2, threshold * 0.06);
    const gradualStepLimit = Math.max(6, threshold * 0.45);
    const gradualStableLimit = Math.max(3, threshold * 0.18);
    const gradualMaxDuration = 1.5;
    const addCut = (cutTime, score, kind) => {
      const boundedTime = Math.max(start + frameStep, Math.min(endTime, cutTime));
      const highConfidence = kind === 'hard' && score >= threshold * 1.75;
      if (boundedTime - lastCutTime < minGap && !highConfidence) return false;
      if (boundedTime - lastCutTime < frameStep * 0.5) return false;
      cuts.push({ time: boundedTime, score, kind });
      lastCutTime = boundedTime;
      return true;
    };
    const refineBoundary = async (leftTime, rightTime, leftSignature, rightSignature) => {
      let low = leftTime;
      let high = rightTime;
      for (let pass = 0; pass < 5 && high - low > frameStep / 2; pass += 1) {
        if (abort.stop) throw new Error('自动分镜已停止');
        const middle = (low + high) / 2;
        const middleSignature = await signatureAt(middle);
        if (diffScore(leftSignature, middleSignature) <= diffScore(middleSignature, rightSignature)) low = middle;
        else high = middle;
      }
      return high;
    };

    if (typeof options.onProgress === 'function') options.onProgress(time, endTime);
    while (time < endTime && !abort.stop) {
      time = Math.min(time + step, endTime);
      const signature = await signatureAt(time);
      if (typeof options.onProgress === 'function') options.onProgress(time, endTime);
      if (abort.stop) break;
      const stepDiff = diffScore(lastSignature, signature);
      const baselineDiff = diffScore(baselineSignature, signature);
      if (suddenCandidate) {
        const candidateAge = time - suddenCandidate.time;
        const postBaselineDiff = diffScore(suddenCandidate.leftSignature, signature);
        const postDiff = diffScore(suddenCandidate.signature, signature);
        const postHasSettled = postDiff <= Math.max(suddenThreshold * 1.1, suddenCandidate.score * 0.85)
          || suddenCandidate.score >= threshold * 1.75;
        if (candidateAge <= step * 4 && postBaselineDiff >= suddenConfirmThreshold && postHasSettled) {
          suddenCandidate.stableSamples += 1;
          if (suddenCandidate.stableSamples >= 2) {
            const boundary = await refineBoundary(
              suddenCandidate.leftTime,
              suddenCandidate.time,
              suddenCandidate.leftSignature,
              suddenCandidate.signature
            );
            addCut(boundary, suddenCandidate.score, 'hard');
            baselineSignature = signature;
            suddenCandidate = null;
            gradualStartTime = null;
            gradualStartSignature = null;
            gradualAccumulation = 0;
            gradualCrossTime = null;
            gradualStableSamples = 0;
            lastSignature = signature;
            previousTime = time;
            continue;
          }
        } else if (candidateAge > step * 4 || postBaselineDiff < suddenConfirmThreshold) {
          suddenCandidate = null;
        }
      }
      if (!suddenCandidate && baselineDiff > suddenThreshold && stepDiff > suddenThreshold * 0.8) {
        suddenCandidate = {
          leftTime: previousTime,
          leftSignature: lastSignature,
          time,
          signature,
          score: baselineDiff,
          stableSamples: 0
        };
        gradualStartTime = null;
        gradualStartSignature = null;
        gradualAccumulation = 0;
        gradualCrossTime = null;
        gradualStableSamples = 0;
      } else if (!suddenCandidate && stepDiff >= gradualStepMinimum && stepDiff <= gradualStepLimit) {
        if (gradualStartTime === null) {
          gradualStartTime = previousTime;
          gradualStartSignature = lastSignature;
        }
        gradualAccumulation += stepDiff;
        if (baselineDiff >= threshold && gradualCrossTime === null) gradualCrossTime = time;
        if (gradualCrossTime !== null && stepDiff <= gradualStableLimit) gradualStableSamples += 1;
        else if (gradualCrossTime !== null) gradualStableSamples = 0;
        if (gradualCrossTime !== null && gradualStableSamples >= 2 && gradualAccumulation >= threshold * 0.75) {
          const boundary = await refineBoundary(gradualStartTime, time, gradualStartSignature, signature);
          addCut(boundary, baselineDiff, 'gradual');
          baselineSignature = signature;
          gradualStartTime = null;
          gradualStartSignature = null;
          gradualAccumulation = 0;
          gradualCrossTime = null;
          gradualStableSamples = 0;
        }
        if (gradualStartTime !== null && time - gradualStartTime > gradualMaxDuration) {
          gradualStartTime = null;
          gradualStartSignature = null;
          gradualAccumulation = 0;
          gradualCrossTime = null;
          gradualStableSamples = 0;
        }
      } else {
        gradualStartTime = null;
        gradualStartSignature = null;
        gradualAccumulation = 0;
        gradualCrossTime = null;
        gradualStableSamples = 0;
      }
      lastSignature = signature;
      previousTime = time;
    }
    return cuts;
  }

  return { runBetween, abort };
}

export function createSceneDetector(video, fps, options = {}) {
  const abort = { stop: false };
  const canvas = options.createCanvas?.();
  if (!canvas) throw new Error('Scene detector requires a canvas adapter');
  canvas.width = 160;
  canvas.height = 90;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const getCacheKey = options.getCacheKey || (time => String(time));
  const cache = options.signatureCache || new Map();
  const signatureAt = async time => {
    if (abort.stop) throw new Error('自动分镜已停止');
    const targetTime = Math.min(Math.max(time, 0), video.duration);
    const cacheKey = getCacheKey(targetTime);
    const cached = cache.get(cacheKey);
    if (cached) return cached.signature;
    if (!await options.waitForSeek(video, targetTime)) throw new Error('视频画面跳转失败');
    await (options.waitForFrame?.() || Promise.resolve());
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let signature;
    if (options.runWorkerTask && options.getWorker && options.getWorker()) {
      try {
        signature = await options.runWorkerTask('signature', {
          data: pixels.buffer,
          width: canvas.width,
          height: canvas.height
        }, [pixels.buffer]);
      } catch (_) {
        signature = computeSceneSignature(pixels, canvas.width, canvas.height);
      }
    } else {
      signature = computeSceneSignature(pixels, canvas.width, canvas.height);
    }
    cache.set(cacheKey, { time: targetTime, signature });
    return signature;
  };
  const fallback = createFallbackDetector(video, fps, { ...options, abort }, signatureAt);
  if (!options.runWorkerTask || !options.getWorker || !options.getWorker()) return fallback;
  const runBetween = async (start, end) => {
    const frameStep = getFrameStep(fps);
    const boundedStart = Math.max(0, Math.min(video.duration, start));
    const boundedEnd = Math.max(0, Math.min(video.duration, end));
    try {
      const samples = [];
      let time = boundedStart;
      while (time <= boundedEnd && !abort.stop) {
        samples.push({ time, signature: await signatureAt(time) });
        if (typeof options.onProgress === 'function') options.onProgress(time, boundedEnd);
        time = Math.min(time + Math.max(0.12, Math.min(0.2, frameStep * 5)), boundedEnd);
        if (time === boundedEnd && samples[samples.length - 1].time === boundedEnd) break;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (abort.stop) return [];
      return await options.runWorkerTask('detect', {
        samples,
        fps,
        options: { start: boundedStart, end: boundedEnd, diff: options.diff, minGap: options.minGap }
      });
    } catch (_) {
      return fallback.runBetween(boundedStart, boundedEnd);
    }
  };
  return { runBetween, abort };
}
