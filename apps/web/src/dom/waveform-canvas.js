import { formatShortTime } from '../utils/time.js';

export const WAVEFORM_RULER_HEIGHT = 28;
export const WAVEFORM_DB_GUIDES = Object.freeze([0, -6, -12, -24]);
const WAVEFORM_DB_FLOOR = -36;
const VOLUME_MIN_DB = -60;
const VOLUME_MAX_DB = 6;

function getDbHeightFraction(db) {
  const normalizedDb = Math.max(WAVEFORM_DB_FLOOR, Math.min(0, Number(db) || WAVEFORM_DB_FLOOR));
  return Math.pow(10, normalizedDb / 20);
}

function getVolumeLineFraction(db = 0) {
  const minGain = Math.pow(10, VOLUME_MIN_DB / 20);
  const maxGain = Math.pow(10, VOLUME_MAX_DB / 20);
  const gain = Math.max(minGain, Math.min(maxGain, Math.pow(10, (Number(db) || 0) / 20)));
  const normalizedGain = (gain - minGain) / (maxGain - minGain);
  return 1 - Math.sqrt(normalizedGain);
}

const SECOND_INTERVALS = [1, 2, 3, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
const LABEL_FRAME_INTERVALS = [2, 3, 5, 10, 15];
const TICK_FRAME_INTERVALS = [1, 2, 3, 5, 10, 15];

function findFrameInterval(pixelsPerFrame, intervals, minimumSpacing) {
  return intervals.find(frames => pixelsPerFrame * frames >= minimumSpacing);
}

function findSecondInterval(pixelsPerSecond, minimumSpacing) {
  return SECOND_INTERVALS.find(seconds => pixelsPerSecond * seconds >= minimumSpacing) || SECOND_INTERVALS.at(-1);
}

function getRulerConfig(viewDuration, width, frameRate = 25) {
  const pixelsPerSecond = Math.max(0.001, width / Math.max(0.001, viewDuration));
  const normalizedFrameRate = Math.max(1, Number(frameRate) || 25);
  const pixelsPerFrame = pixelsPerSecond / normalizedFrameRate;
  const labelFrameInterval = findFrameInterval(pixelsPerFrame, LABEL_FRAME_INTERVALS, 96);
  const tickFrameInterval = findFrameInterval(pixelsPerFrame, TICK_FRAME_INTERVALS, 18);
  const labelIntervalSeconds = labelFrameInterval
    ? labelFrameInterval / normalizedFrameRate
    : findSecondInterval(pixelsPerSecond, 96);
  let tickIntervalSeconds = tickFrameInterval
    ? tickFrameInterval / normalizedFrameRate
    : findSecondInterval(pixelsPerSecond, 18);

  const labelFrames = Math.max(1, Math.round(labelIntervalSeconds * normalizedFrameRate));
  const tickFrames = Math.max(1, Math.round(tickIntervalSeconds * normalizedFrameRate));
  if (labelFrames % tickFrames !== 0) {
    const compatibleFrameInterval = TICK_FRAME_INTERVALS.find(frames => (
      labelFrames % frames === 0 && pixelsPerFrame * frames >= 18
    ));
    if (compatibleFrameInterval) tickIntervalSeconds = compatibleFrameInterval / normalizedFrameRate;
    else {
      const compatibleSecondInterval = SECOND_INTERVALS.find(seconds => (
        Math.abs(labelIntervalSeconds / seconds - Math.round(labelIntervalSeconds / seconds)) < 0.0001
        && pixelsPerSecond * seconds >= 18
      ));
      if (compatibleSecondInterval) tickIntervalSeconds = compatibleSecondInterval;
      else tickIntervalSeconds = labelIntervalSeconds;
    }
  }
  return { labelIntervalSeconds, tickIntervalSeconds, frameRate: normalizedFrameRate };
}

function isAligned(time, interval) {
  const remainder = time % interval;
  return remainder < 0.0001 || interval - remainder < 0.0001;
}

function formatRulerLabel(time, frameRate) {
  const normalizedTime = Math.max(0, Number(time) || 0);
  if (isAligned(normalizedTime, 1)) return formatShortTime(normalizedTime);
  const frame = Math.round((normalizedTime - Math.floor(normalizedTime)) * frameRate);
  return `${frame}f`;
}

export { formatRulerLabel, getRulerConfig };

export function renderWaveformCanvas(context, {
  width,
  height,
  duration,
  bins = [],
  view,
  entries = [],
  shotGroups = [],
  currentTime = 0,
  maxPeak = 0,
  volumeDb = 0,
  frameRate = 25,
  colors = {},
  getCurrentEntry,
  getShotRange
} = {}) {
  if (!context || !duration || !view) return;
  const viewDuration = view.end - view.start;
  if (!(viewDuration > 0) || width <= 0 || height <= 0) return;

  const rulerHeight = Math.min(WAVEFORM_RULER_HEIGHT, Math.max(18, height - 12));
  const waveformTop = rulerHeight + 1;
  const waveformBottom = Math.max(waveformTop + 8, height - 5);
  const waveformHeight = Math.max(8, waveformBottom - waveformTop);
  const { labelIntervalSeconds, tickIntervalSeconds, frameRate: normalizedFrameRate } = getRulerConfig(viewDuration, width, frameRate);
  const firstTickIndex = Math.max(0, Math.ceil(view.start / tickIntervalSeconds - 0.0001));

  context.save();
  context.fillStyle = colors.rulerBackground || 'rgba(13, 13, 13, 0.28)';
  context.fillRect(0, 0, width, rulerHeight);
  context.font = '10px system-ui, sans-serif';
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  context.lineWidth = 1;
  const playheadX = Number.isFinite(Number(currentTime))
    ? ((Number(currentTime) - view.start) / viewDuration) * width
    : null;
  let lastLabelRight = -Infinity;
  for (let tickIndex = firstTickIndex; tickIndex * tickIntervalSeconds <= view.end + tickIntervalSeconds / 2; tickIndex += 1) {
    const time = tickIndex * tickIntervalSeconds;
    const x = Math.round((time - view.start) / viewDuration * width) + 0.5;
    const isMajor = isAligned(time, labelIntervalSeconds);
    if (x < 0 || x > width) continue;
    context.strokeStyle = isMajor
      ? colors.ruler || 'rgba(128, 128, 128, 0.46)'
      : colors.rulerMinor || colors.ruler || 'rgba(128, 128, 128, 0.22)';
    context.beginPath();
    context.moveTo(x, isMajor ? 3 : 7);
    context.lineTo(x, isMajor ? 18 : 14);
    context.stroke();
    if (isMajor) {
      context.fillStyle = colors.rulerText || 'rgba(222, 222, 222, 0.68)';
      const label = formatRulerLabel(time, normalizedFrameRate);
      const labelWidth = typeof context.measureText === 'function'
        ? context.measureText(label).width
        : label.length * 6;
      let labelX = x + 3;
      if (labelX < lastLabelRight + 8) continue;
      if (playheadX !== null && playheadX >= 0 && playheadX <= width
        && playheadX >= labelX - 4 && playheadX <= labelX + labelWidth + 4) {
        const shiftedRight = playheadX + 10;
        const shiftedLeft = playheadX - labelWidth - 10;
        if (shiftedRight + labelWidth <= width) labelX = shiftedRight;
        else if (shiftedLeft >= 0) labelX = shiftedLeft;
        else continue;
      }
      context.fillText(label, labelX, 13);
      lastLabelRight = labelX + labelWidth;
    }
  }
  context.restore();

  context.save();
  context.font = '9px system-ui, sans-serif';
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  context.lineWidth = 1;
  if (typeof context.setLineDash === 'function') context.setLineDash([3, 3]);
  WAVEFORM_DB_GUIDES.forEach(db => {
    const y = waveformBottom - getDbHeightFraction(db) * waveformHeight;
    context.strokeStyle = colors.dbGuide || 'rgba(148, 163, 184, 0.24)';
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
    context.stroke();
    context.fillStyle = colors.dbText || 'rgba(148, 163, 184, 0.72)';
    context.fillText(`${db} dB`, width - 4, Math.max(waveformTop + 5, y));
  });
  if (typeof context.setLineDash === 'function') context.setLineDash([]);
  context.strokeStyle = colors.dbBase || 'rgba(226, 232, 240, 0.56)';
  context.beginPath();
  context.moveTo(0, waveformBottom + 0.5);
  context.lineTo(width, waveformBottom + 0.5);
  context.stroke();
  context.restore();

  const sortedEntries = [...entries].sort((first, second) => (Number(first.time) || 0) - (Number(second.time) || 0));
  const entryById = new Map(sortedEntries.map(entry => [entry.shotId, entry]));
  context.save();
  context.fillStyle = colors.group || 'rgba(124, 58, 237, 0.25)';
  shotGroups.forEach(group => {
    const members = (group.shotIds || []).map(id => entryById.get(id)).filter(Boolean);
    if (members.length < 2) return;
    const start = Math.max(view.start, Math.min(view.end, Number(members[0].time) || 0));
    const next = sortedEntries.find(entry => (Number(entry.time) || 0) > (Number(members[members.length - 1].time) || 0));
    const end = Math.min(view.end, next ? Number(next.time) || view.end : duration);
    if (end > start) context.fillRect((start - view.start) / viewDuration * width, waveformTop, Math.max(1, (end - start) / viewDuration * width), 3);
  });
  context.restore();

  const currentEntry = typeof getCurrentEntry === 'function'
    ? getCurrentEntry(sortedEntries, duration, currentTime)
    : null;
  if (currentEntry && typeof getShotRange === 'function') {
    const range = getShotRange(currentEntry, sortedEntries, duration);
    const selectionStart = Math.max(view.start, range.start);
    const selectionEnd = Math.min(view.end, range.end);
    if (selectionEnd > selectionStart) {
      context.fillStyle = colors.selection || 'rgba(22, 169, 243, 0.12)';
      context.fillRect(
        ((selectionStart - view.start) / viewDuration) * width,
        waveformTop,
        Math.max(1, ((selectionEnd - selectionStart) / viewDuration) * width),
        waveformHeight
      );
    }
  }

  const peak = maxPeak || Math.max(...bins.map(bin => bin.peak), 0);
  const normalization = peak > 0.0001 ? 1 / peak : 1;
  const firstVisibleBin = Math.max(0, Math.floor(view.start / duration * bins.length) - 1);
  const lastVisibleBin = Math.min(bins.length - 1, Math.ceil(view.end / duration * bins.length));
  if (bins.length) {
    context.save();
    context.fillStyle = colors.peak || '#61C8F7';
    context.globalAlpha = 0.5;
    for (let index = firstVisibleBin; index <= lastVisibleBin; index++) {
      const bin = bins[index];
      if (!bin) continue;
      const binStart = index * duration / bins.length;
      const binEnd = (index + 1) * duration / bins.length;
      if (binEnd < view.start || binStart > view.end) continue;
      const x = Math.max(0, (binStart - view.start) / viewDuration * width);
      const barWidth = Math.max(1, (binEnd - binStart) / viewDuration * width * 0.62);
      const peakHeight = Math.max(1, Math.min(waveformHeight, bin.peak * normalization * waveformHeight));
      context.fillRect(x, waveformBottom - peakHeight, barWidth, peakHeight);
    }
    context.globalAlpha = 0.96;
    context.fillStyle = colors.rms || '#16A9F3';
    for (let index = firstVisibleBin; index <= lastVisibleBin; index++) {
      const bin = bins[index];
      if (!bin) continue;
      const binStart = index * duration / bins.length;
      const binEnd = (index + 1) * duration / bins.length;
      if (binEnd < view.start || binStart > view.end) continue;
      const x = Math.max(0, (binStart - view.start) / viewDuration * width);
      const barWidth = Math.max(1, (binEnd - binStart) / viewDuration * width * 0.38);
      const rmsHeight = Math.max(1, Math.min(waveformHeight, bin.rms * normalization * waveformHeight));
      const peakBarWidth = Math.max(1, (binEnd - binStart) / viewDuration * width * 0.62);
      context.fillRect(x + Math.max(0, (peakBarWidth - barWidth) / 2), waveformBottom - rmsHeight, barWidth, rmsHeight);
    }
    context.restore();
  }

  context.save();
  const volumeY = waveformTop + getVolumeLineFraction(volumeDb) * waveformHeight;
  context.strokeStyle = colors.volumeLine || 'rgba(255, 255, 255, 0.86)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, volumeY + 0.5);
  context.lineTo(width, volumeY + 0.5);
  context.stroke();
  context.font = '9px system-ui, sans-serif';
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  context.fillStyle = colors.volumeText || 'rgba(255, 255, 255, 0.88)';
  context.fillText(`${Number(volumeDb) || 0} dB`, width - 4, Math.max(waveformTop + 6, volumeY - 6));
  context.restore();

  context.save();
  context.strokeStyle = colors.marker || 'rgba(71, 85, 105, 0.58)';
  context.lineWidth = 1;
  context.globalAlpha = 0.9;
  sortedEntries.forEach(entry => {
    const start = Math.max(0, Math.min(duration, Number(entry.time) || 0));
    if (start < view.start || start > view.end) return;
    const x = Math.round((start - view.start) / viewDuration * width) + 0.5;
    context.beginPath();
    context.moveTo(x, rulerHeight);
    context.lineTo(x, height);
    context.stroke();
  });
  context.restore();
}
