export const IMAGE_WORKER_SOURCE = String.raw`
function getFrameStep(frameRate) {
  const rate = Number(frameRate);
  return 1 / (Number.isFinite(rate) && rate > 0 ? rate : 25);
}

function buildSignature(buffer, width, height) {
  const data = new Uint8ClampedArray(buffer);
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

function diffScore(first, second) {
  if (!first || !second) return 0;
  const lumaDiff = first.luma.reduce((sum, value, index) => sum + Math.abs(value - second.luma[index]), 0);
  const colorDiff = first.color.reduce((sum, value, index) => sum + Math.abs(value - second.color[index]), 0);
  const spatialDiff = first.spatial.reduce((sum, value, index) => sum + Math.abs(value - second.spatial[index]), 0) / first.spatial.length;
  return (lumaDiff * 0.3 + colorDiff * 0.45 + spatialDiff * 0.25) * 100;
}

function detectCuts(samples, fps, options) {
  const ordered = samples.filter(sample => sample && sample.signature).sort((first, second) => first.time - second.time);
  if (!ordered.length) return [];
  const frameStep = getFrameStep(fps);
  const start = Number(options.start) || ordered[0].time;
  const end = Number(options.end) || ordered[ordered.length - 1].time;
  const threshold = Number(options.diff) || 28;
  const minGap = Number(options.minGap) || 0.35;
  const nearestSignature = time => {
    let nearest = ordered[0];
    let nearestDistance = Math.abs(nearest.time - time);
    for (let index = 1; index < ordered.length; index += 1) {
      const distance = Math.abs(ordered[index].time - time);
      if (distance < nearestDistance) {
        nearest = ordered[index];
        nearestDistance = distance;
      }
    }
    return nearest.signature;
  };
  const cuts = [];
  let lastSig = nearestSignature(start);
  let baselineSig = lastSig;
  let previousTime = ordered[0].time;
  let lastCutTime = start;
  let suddenCandidate = null;
  let gradualStartTime = null;
  let gradualStartSig = null;
  let gradualAccumulation = 0;
  let gradualCrossTime = null;
  let gradualStableSamples = 0;
  const suddenThreshold = Math.max(threshold * 1.05, 24);
  const suddenConfirmThreshold = Math.max(threshold * 0.9, 20);
  const gradualStepMinimum = Math.max(1.2, threshold * 0.06);
  const gradualStepLimit = Math.max(6, threshold * 0.45);
  const gradualStableLimit = Math.max(3, threshold * 0.18);
  const gradualMaxDuration = 1.5;
  const addCut = (time, score, kind) => {
    const cutTime = Math.max(start + frameStep, Math.min(end, time));
    const highConfidence = kind === 'hard' && score >= threshold * 1.75;
    if (cutTime - lastCutTime < minGap && !highConfidence) return false;
    if (cutTime - lastCutTime < frameStep * 0.5) return false;
    cuts.push({ time: cutTime, score, kind });
    lastCutTime = cutTime;
    return true;
  };
  for (const sample of ordered) {
    const time = sample.time;
    if (time <= start || time > end) continue;
    const signature = sample.signature;
    const stepDiff = diffScore(lastSig, signature);
    const baselineDiff = diffScore(baselineSig, signature);
    if (suddenCandidate) {
      const candidateAge = time - suddenCandidate.time;
      const postBaselineDiff = diffScore(suddenCandidate.leftSignature, signature);
      const postDiff = diffScore(suddenCandidate.signature, signature);
      const postHasSettled = postDiff <= Math.max(suddenThreshold * 1.1, suddenCandidate.score * 0.85)
        || suddenCandidate.score >= threshold * 1.75;
      if (candidateAge <= (time - previousTime) * 4 && postBaselineDiff >= suddenConfirmThreshold && postHasSettled) {
        suddenCandidate.stableSamples += 1;
        if (suddenCandidate.stableSamples >= 2) {
          addCut(suddenCandidate.time, suddenCandidate.score, 'hard');
          baselineSig = signature;
          suddenCandidate = null;
          gradualStartTime = null;
          gradualStartSig = null;
          gradualAccumulation = 0;
          gradualCrossTime = null;
          gradualStableSamples = 0;
          lastSig = signature;
          previousTime = time;
          continue;
        }
      } else if (candidateAge > (time - previousTime) * 4 || postBaselineDiff < suddenConfirmThreshold) {
        suddenCandidate = null;
      }
    }
    if (!suddenCandidate && baselineDiff > suddenThreshold && stepDiff > suddenThreshold * 0.8) {
      suddenCandidate = {
        leftTime: previousTime,
        leftSignature: lastSig,
        time,
        signature,
        score: baselineDiff,
        stableSamples: 0
      };
      gradualStartTime = null;
      gradualStartSig = null;
      gradualAccumulation = 0;
      gradualCrossTime = null;
      gradualStableSamples = 0;
    } else if (!suddenCandidate && stepDiff >= gradualStepMinimum && stepDiff <= gradualStepLimit) {
      if (gradualStartTime === null) {
        gradualStartTime = previousTime;
        gradualStartSig = lastSig;
      }
      gradualAccumulation += stepDiff;
      if (baselineDiff >= threshold && gradualCrossTime === null) gradualCrossTime = time;
      if (gradualCrossTime !== null && stepDiff <= gradualStableLimit) gradualStableSamples += 1;
      else if (gradualCrossTime !== null) gradualStableSamples = 0;
      if (gradualCrossTime !== null && gradualStableSamples >= 2 && gradualAccumulation >= threshold * 0.75) {
        addCut(time, baselineDiff, 'gradual');
        baselineSig = signature;
        gradualStartTime = null;
        gradualStartSig = null;
        gradualAccumulation = 0;
        gradualCrossTime = null;
        gradualStableSamples = 0;
      }
      if (gradualStartTime !== null && time - gradualStartTime > gradualMaxDuration) {
        gradualStartTime = null;
        gradualStartSig = null;
        gradualAccumulation = 0;
        gradualCrossTime = null;
        gradualStableSamples = 0;
      }
    } else {
      gradualStartTime = null;
      gradualStartSig = null;
      gradualAccumulation = 0;
      gradualCrossTime = null;
      gradualStableSamples = 0;
    }
    lastSig = signature;
    previousTime = time;
  }
  return cuts;
}

async function compressScreenshot(payload) {
  if (typeof OffscreenCanvas === 'undefined') throw new Error('褰撳墠娴忚鍣ㄤ笉鏀寔 OffscreenCanvas');
  const fullCanvas = new OffscreenCanvas(payload.width, payload.height);
  fullCanvas.getContext('2d').drawImage(payload.bitmap, 0, 0, payload.width, payload.height);
  const thumbnailCanvas = new OffscreenCanvas(payload.thumbnailWidth, payload.thumbnailHeight);
  thumbnailCanvas.getContext('2d').drawImage(fullCanvas, 0, 0, payload.thumbnailWidth, payload.thumbnailHeight);
  const [fullBlob, thumbnailBlob] = await Promise.all([
    fullCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 }),
    thumbnailCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 })
  ]);
  const reader = new FileReaderSync();
  const result = {
    image: reader.readAsDataURL(fullBlob),
    thumbnail: reader.readAsDataURL(thumbnailBlob),
    width: payload.width,
    height: payload.height
  };
  if (payload.bitmap && typeof payload.bitmap.close === 'function') payload.bitmap.close();
  return result;
}

self.onmessage = async event => {
  const { id, type, payload } = event.data || {};
  try {
    let result;
    if (type === 'signature') result = buildSignature(payload.data, payload.width, payload.height);
    else if (type === 'detect') result = detectCuts(payload.samples, payload.fps, payload.options);
    else if (type === 'compress') result = await compressScreenshot(payload);
    else throw new Error('鏈煡鍥惧儚 Worker 浠诲姟');
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error && error.message ? error.message : String(error) });
  }
};
`;
